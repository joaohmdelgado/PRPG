// Fase O.3 (G.4): importador da planilha "Contatos - Coordenações de PG.xlsx"
// (requisitos-contatos.md §7). Uma linha = um programa: coordenação, vice,
// secretaria, e-mails e telefones misturados em células de texto livre.
//
// Regras que dependem de decisão ainda sem resposta seguem o caminho
// "importar fielmente + marcar para revisão":
//  - D-G5/D-G6: programa sem correspondência não é criado; a linha fica
//    guardada como pendência e entra quando alguém ligar a um programa;
//  - D-G2: a coluna VICE-COORDENADOR(A) entra como VICE_COORDENADOR, com
//    pendência "papel a confirmar" (uma resposta troca os 30 de uma vez);
//  - D-G3: nota 'A' entra como texto, sem conversão;
//  - D-G1: todo contato entra como NÃO público;
//  - D-G4: programa do cadastro ausente da planilha é só listado.
// Nada do cadastro é sobrescrito: sigla/nota/campus só preenchem o vazio;
// outra pessoa já no mesmo papel vira pendência, sem encerrar o vínculo atual.
import crypto from 'crypto';
import { limpar, chaveTexto, linhasDaAba, indiceColunas } from './nucleo.js';
import { carregarProgramas, carregarPessoas, parentesesDoNome, religarProcessos, sugerirPrograma } from './cadastro.js';
import { normalizarEmail, formatarTelefone } from '../../utils/contato.js';
import { joinPessoa, pessoaReal } from '../../db/identidadeVinculo.js';

const COLUNAS = {
  programa: 'PROGRAMA', sigla: 'SIGLA', nota: 'NOTA CAPES',
  coord: 'COORDENADOR(A)', coordTel: 'COORD TEL', vice: 'VICE-COORDENADOR(A)', viceTel: 'VICE TEL',
  emails: 'E-MAIL', secretario: ['SECRETÁRIO(A)', 'SECRETARIO(A)'], secEmail: 'EMAIL', secTel: 'TELEFONE',
  obs: ['observações', 'observacoes'],
};

const DOMINIOS_INSTITUCIONAIS = /(@|\.)(ufrpe\.br|ufape\.edu\.br|[a-z0-9-]+\.gov\.br|[a-z0-9-]+\.edu\.br|fundaj\.gov\.br)$/i;
const FUNCIONAL = /^(coordenacao|coord|secretaria|secretariado|sec|secretaria[a-z]*|coordenacao[a-z]*)[._-]/i;

// ---- pessoas na célula: "(Pro tempore)" é caráter do mandato, não nome.
export const lerNomePessoa = (texto) => {
  const bruto = limpar(texto);
  if (!bruto) return null;
  const proTempore = /pro\s*tempore/i.test(bruto);
  const nome = limpar(bruto.replace(/\([^)]*\)/g, ' ').replace(/pro\s*tempore/ig, ' '));
  return nome ? { nome, carater: proTempore ? 'PRO_TEMPORE' : 'EFETIVO', parenteses: parentesesDoNome(bruto) } : null;
};

// ---- e-mails: separados por ';', ',', espaço ou quebra de linha.
export const lerEmails = (texto) => [...new Set(String(texto || '').split(/[\s;,]+/)
  .map((e) => normalizarEmail(e.replace(/^[<(]+|[>).]+$/g, '')))
  .filter((e) => e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))];

// O e-mail parece da pessoa? A parte local, só letras, precisa se decompor em
// pedaços que são palavras do nome (inteiras ou iniciais), na ordem do nome, com
// ao menos uma palavra inteira de 4+ letras: 'renataoliveira' (Renata +
// Oliveira), 'marcos.sobral', 'pjduarteneto' (P. J. Duarte Neto).
export const emailDaPessoa = (email, nome) => {
  const local = email.split('@')[0].toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  const palavras = chaveTexto(nome).split(' ').filter((p) => p.length >= 2 && !['de', 'da', 'do', 'dos', 'das', 'e'].includes(p));
  if (local.length < 3 || !palavras.length) return false;
  const memo = new Map();
  // pode(i, j, inteira): local[i..] se decompõe usando palavras[j..]
  const pode = (i, j, inteira) => {
    if (i === local.length) return inteira;
    if (j === palavras.length) return false;
    const k = `${i}|${j}|${inteira}`;
    if (memo.has(k)) return memo.get(k);
    const w = palavras[j];
    let ok = pode(i, j + 1, inteira); // pula a palavra
    if (!ok && local.startsWith(w, i)) ok = pode(i + w.length, j + 1, inteira || w.length >= 4);
    if (!ok && local[i] === w[0]) ok = pode(i + 1, j + 1, inteira); // inicial
    memo.set(k, ok);
    return ok;
  };
  return pode(0, 0, false);
};

// ---- telefones: "3320.6460 / 99611.6668", "(81) 33206079 (fixo/whatsapp); 98827-0595".
// Nunca presume DDD. Devolve [{ digitos, tipos: ['TELEFONE'|'CELULAR'|'WHATSAPP'], semDdd, original }].
export const lerTelefones = (texto) => {
  const s = String(texto || '').replace(/\(([^)0-9]*[a-zà-ú][^)0-9]*)\)/gi, (_, t) => ` [${t.replace(/\//g, '+')}] `);
  const pedacos = s.split(/\s*(?:\/|;|\n|\s{3,})\s*/).map((p) => p.trim()).filter(Boolean)
    // Dois números separados só por espaço ("81 988079584  81 33206317"):
    // pedaço com dígitos demais é relido número a número.
    .flatMap((p) => {
      const digitos = p.replace(/\[[^\]]*\]/g, '').replace(/\D/g, '');
      if (digitos.length <= 13) return [p];
      const achados = [...p.matchAll(/(?:\(?\d{2}\)?[\s.]*)?(?:9\s?)?\d{4}[\s.-]?\d{4}/g)].map((m) => m[0]);
      return achados.length ? achados : [p];
    });
  const out = [];
  for (const p of pedacos) {
    const anotacao = (p.match(/\[([^\]]*)\]/)?.[1] || '').toLowerCase();
    let d = p.replace(/\[[^\]]*\]/g, '').replace(/\D/g, '');
    if (!d) continue;
    if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
    let tipo;
    let semDdd = false;
    if (d.length === 11) tipo = 'CELULAR';
    else if (d.length === 10) tipo = /^[2-5]/.test(d.slice(2)) ? 'TELEFONE' : 'CELULAR';
    else if (d.length === 9) { tipo = 'CELULAR'; semDdd = true; }
    else if (d.length === 8) { tipo = /^[2-5]/.test(d) ? 'TELEFONE' : 'CELULAR'; semDdd = true; }
    else { out.push({ digitos: d, tipos: [], semDdd: false, invalido: true, original: p }); continue; }
    const tipos = [tipo];
    if (/fixo/.test(anotacao)) tipos[0] = 'TELEFONE';
    if (/whats|zap/.test(anotacao)) tipos.push('WHATSAPP');
    out.push({ digitos: d, tipos, semDdd, original: limpar(p.replace(/\[[^\]]*\]/g, '')) });
  }
  return out;
};

const PAPEIS = [
  { coluna: 'coord', tel: 'coordTel', papel: 'COORDENADOR', rotulo: 'coordenador(a)' },
  { coluna: 'vice', tel: 'viceTel', papel: 'VICE_COORDENADOR', rotulo: 'vice-coordenador(a)' },
  { coluna: 'secretario', tel: 'secTel', papel: 'SECRETARIO', rotulo: 'secretário(a)' },
];
// Papéis antigos que o cadastro ainda usa para o mesmo cargo.
const PAPEIS_EQUIVALENTES = {
  COORDENADOR: ['COORDENADOR', 'COORDENADOR_ATUAL'],
  VICE_COORDENADOR: ['VICE_COORDENADOR', 'SUBSTITUTO', 'SUBSTITUTO_EVENTUAL'],
  SECRETARIO: ['SECRETARIO'],
};

const inserirContato = async (ctx, { entidade, entidadeId, tipo, valor, exibicao, rotulo, vinculoId = null, observacao = null }) => {
  const { rows } = await ctx.q(
    'SELECT 1 FROM contatos WHERE entidade = $1 AND entidade_id = $2 AND tipo = $3 AND valor = $4',
    [entidade, entidadeId, tipo, valor]);
  if (rows.length) return false;
  await ctx.q(
    `INSERT INTO contatos (id, entidade, entidade_id, tipo, valor, valor_exibicao, rotulo, vinculo_id, publico, observacao, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9,$10)`,
    [crypto.randomUUID(), entidade, entidadeId, tipo, valor, exibicao || valor, rotulo, vinculoId, observacao, ctx.actor]);
  return true;
};

export default {
  fonte: 'contatos',
  rotulo: 'Contatos das coordenações',

  async importar(ctx, wb) {
    const nomeAba = wb.SheetNames.find((n) => chaveTexto(n) === 'base') || wb.SheetNames[0];
    const linhas = linhasDaAba(wb.Sheets[nomeAba]);
    const cab = linhas[0] || [];
    const col = indiceColunas(cab, COLUNAS);
    if (col.programa < 0 || col.coord < 0) throw Object.assign(new Error('Planilha sem as colunas PROGRAMA e COORDENADOR(A).'), { status: 400, expose: true });

    const programas = await carregarProgramas(ctx);
    const pessoas = await carregarPessoas(ctx);
    const casados = new Set();
    const cel = (r, k) => (col[k] >= 0 ? r[col[k]] : null);

    for (let i = 1; i < linhas.length; i++) {
      const r = linhas[i] || [];
      const nomePrograma = limpar(cel(r, 'programa'));
      const sigla = limpar(cel(r, 'sigla'));
      if (!nomePrograma && !sigla) continue;

      const colunas = Object.fromEntries(cab.map((h, j) => [limpar(h) || `col${j + 1}`, r[j] ?? null]));
      const dados = { aba: nomeAba, linha: i + 1, colunas };
      const chave = `programa:${chaveTexto(nomePrograma) || chaveTexto(sigla)}`;
      const rotulo = `${sigla || '—'} · ${nomePrograma}`;

      // Programa: de-para respondido na revisão, senão nome/sigla.
      const valorPrograma = `${sigla} — ${nomePrograma}`;
      const depara = await ctx.depara('programa', chaveTexto(valorPrograma));
      const programa = depara ? programas.porId(depara) : programas.casar(nomePrograma, sigla);
      if (programa) casados.add(programa.id);

      if (await ctx.jaImportado({ chave, dados, rotulo })) continue;

      if (!programa) {
        const ufape = /ufape/i.test(nomePrograma);
        const provavel = sugerirPrograma(programas, nomePrograma);
        await ctx.pendencia({
          chave, tipo: 'PROGRAMA_SEM_CORRESPONDENCIA', valorOriginal: valorPrograma,
          sugestao: { nome: nomePrograma, sigla, parenteses: parentesesDoNome(nomePrograma), provavel: provavel ? { id: provavel.id, nome: provavel.nome } : null },
          mensagem: (ufape
            ? 'Programa da UFAPE — continua sob a Câmara da PRPG? (D-G5)'
            : 'Programa novo ou nome antigo de um existente? (D-G6)') + (provavel ? ` Provável: ${provavel.nome}.` : ''),
        });
        ctx.item({ acao: 'ignorado', chave, rotulo, motivo: 'programa sem correspondência — linha guardada para revisão' });
        continue;
      }

      const avisos = [];
      // --- sigla, campus e nota: só preenchem o vazio.
      const siglaAtual = limpar(programa.sigla);
      if (sigla && (!siglaAtual || siglaAtual === 'S/SIGLA')) {
        await ctx.q('UPDATE programas SET sigla = $2 WHERE id = $1', [programa.id, sigla]);
        ctx.contar('siglasPreenchidas');
      } else if (sigla && chaveTexto(siglaAtual) !== chaveTexto(sigla)) {
        await ctx.pendencia({ chave, tipo: 'SIGLA_DIVERGENTE', entidade: 'programa', entidadeId: programa.id,
          valorOriginal: sigla, mensagem: `Cadastro: ${siglaAtual} · planilha: ${sigla}` });
      }
      const campus = parentesesDoNome(nomePrograma).join(' / ');
      if (campus && !limpar(programa.campus)) {
        await ctx.q('UPDATE programas SET campus = $2 WHERE id = $1', [programa.id, campus]);
        avisos.push(`campus "${campus}" (do nome)`);
      }
      const nota = limpar(cel(r, 'nota'));
      if (nota) {
        const { rows: mods } = await ctx.q('SELECT id, nota_capes FROM modalidades WHERE programa_id = $1', [programa.id]);
        if (!mods.length) avisos.push(`nota CAPES "${nota}" sem modalidade cadastrada para gravar`);
        for (const m of mods) {
          if (!limpar(m.nota_capes)) await ctx.q('UPDATE modalidades SET nota_capes = $2 WHERE id = $1', [m.id, nota]);
          else if (limpar(m.nota_capes) !== nota) {
            await ctx.pendencia({ chave, tipo: 'NOTA_CAPES_DIVERGENTE', campo: m.id, entidade: 'programa', entidadeId: programa.id,
              valorOriginal: nota, mensagem: `Cadastro: ${m.nota_capes} · planilha: ${nota}` });
          }
        }
        if (!/^[1-7]$/.test(nota)) {
          await ctx.pendencia({ chave, tipo: 'NOTA_CAPES_A_CONFIRMAR', entidade: 'programa', entidadeId: programa.id,
            valorOriginal: nota, mensagem: `Nota "${nota}" gravada como veio.` });
        }
      }

      // --- e-mails: funcionais vão para o programa; os demais, para a pessoa
      // cujo nome combina com o endereço. O resto fica sem dono (revisão).
      const pessoasDaLinha = PAPEIS.map((p) => ({ ...p, pessoa: lerNomePessoa(cel(r, p.coluna)) }));
      const classificados = [];
      const semDono = [];
      const emailsGerais = lerEmails(cel(r, 'emails'));
      const emailsSec = lerEmails(cel(r, 'secEmail'));
      // Regra estrita primeiro; depois a solta (começa pelo primeiro nome, ou
      // contém os dois últimos sobrenomes colados) — só entre as pessoas da
      // mesma linha, e só quando uma única casa. Tudo vai para conferência.
      const donoDoEmail = (email, candidatos) => {
        const validos = candidatos.filter((c) => c.pessoa);
        const estrito = validos.filter((c) => emailDaPessoa(email, c.pessoa.nome));
        if (estrito.length === 1) return estrito[0];
        const local = email.split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
        const solto = validos.filter((c) => {
          const palavras = chaveTexto(c.pessoa.nome).split(' ').filter((p) => p.length >= 2);
          const primeiro = palavras[0] || '';
          const ultimos = palavras.slice(-2).join('');
          return (primeiro.length >= 3 && local.startsWith(primeiro)) || (ultimos.length >= 6 && local.includes(ultimos));
        });
        return solto.length === 1 ? solto[0] : null;
      };
      const siglaMin = chaveTexto(sigla).replace(/ /g, '');
      const ehFuncional = (e) => FUNCIONAL.test(e) || (siglaMin.length >= 3 && e.split('@')[0].replace(/[^a-z]/g, '').includes(siglaMin));
      const emailsPorPessoa = new Map(PAPEIS.map((p) => [p.papel, []]));
      const emailsPrograma = [];
      for (const [email, origemCol] of [...emailsGerais.map((e) => [e, 'emails']), ...emailsSec.map((e) => [e, 'secEmail'])]) {
        if (ehFuncional(email)) {
          emailsPrograma.push({ email, rotulo: /^sec|secretaria/i.test(email) || origemCol === 'secEmail' ? 'secretaria' : 'coordenacao' });
          classificados.push({ valor: email, dono: 'programa' });
          continue;
        }
        const candidatos = origemCol === 'secEmail' ? pessoasDaLinha.filter((p) => p.papel === 'SECRETARIO') : pessoasDaLinha;
        const dono = donoDoEmail(email, candidatos)
          || (origemCol === 'secEmail' && pessoasDaLinha[2].pessoa ? pessoasDaLinha[2] : null);
        if (dono) {
          emailsPorPessoa.get(dono.papel).push(email);
          classificados.push({ valor: email, dono: dono.rotulo });
        } else semDono.push(email);
      }

      // --- pessoas e vínculos.
      let criadosVinculos = 0;
      for (const p of pessoasDaLinha) {
        if (!p.pessoa) continue;
        const emails = emailsPorPessoa.get(p.papel);
        const institucional = emails.find((e) => DOMINIOS_INSTITUCIONAIS.test(e)) || null;
        let pessoaId = emails.map((e) => pessoas.porEmail(e)).find(Boolean) || pessoas.porNome(p.pessoa.nome);
        if (!pessoaId) pessoaId = await pessoas.criar({ nome: p.pessoa.nome, email: institucional });
        else if (institucional) {
          await ctx.q(`UPDATE pessoas SET email_institucional = $2 WHERE id = $1 AND COALESCE(email_institucional, '') = ''`, [pessoaId, institucional]);
        }

        // Mesmo papel já ocupado no cadastro? Mesma pessoa = nada a fazer;
        // outra pessoa = pendência (o vínculo atual não é encerrado).
        const { rows: atuais } = await ctx.q(`
          SELECT v.id, v.pessoa_id, COALESCE(p.nome, u.perfil_nome) AS nome,
                 ${pessoaReal('v.pessoa_id')} AS pessoa_real
            FROM vinculos v
            ${joinPessoa('v.pessoa_id')}
           WHERE v.programa_id = $1 AND v.papel = ANY($2) AND v.ativo
             AND (v.data_fim_mandato IS NULL OR v.data_fim_mandato >= CURRENT_DATE)`,
          [programa.id, PAPEIS_EQUIVALENTES[p.papel]]);
        let vinculoId = atuais.find((v) => v.pessoa_real === pessoaId)?.id || null;
        if (!vinculoId && atuais.length && p.papel !== 'SECRETARIO') {
          await ctx.pendencia({ chave, tipo: 'VINCULO_DIVERGENTE', campo: p.papel, entidade: 'vinculo', entidadeId: atuais[0].id,
            valorOriginal: p.pessoa.nome, sugestao: { programaId: programa.id },
            mensagem: `${p.rotulo}: cadastro tem ${atuais.map((v) => v.nome || v.pessoa_id).join(', ')}; planilha tem ${p.pessoa.nome}.` });
        } else if (!vinculoId) {
          vinculoId = crypto.randomUUID();
          await ctx.q(
            `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, carater, ativo, criado_em) VALUES ($1,$2,$3,$4,$5,TRUE,now())`,
            [vinculoId, programa.id, pessoaId, p.papel, p.pessoa.carater]);
          criadosVinculos++;
          if (p.papel === 'VICE_COORDENADOR') {
            await ctx.pendencia({ chave: `valor:vice`, tipo: 'PAPEL_A_CONFIRMAR', campo: vinculoId, entidade: 'vinculo', entidadeId: vinculoId,
              valorOriginal: 'VICE-COORDENADOR(A)', sugestao: { programaId: programa.id },
              mensagem: `${sigla || nomePrograma}: ${p.pessoa.nome}` });
          }
        }

        for (const email of emails) {
          const pessoal = !DOMINIOS_INSTITUCIONAIS.test(email);
          if (await inserirContato(ctx, { entidade: 'pessoa', entidadeId: pessoaId, tipo: 'EMAIL', valor: email,
            rotulo: pessoal ? 'pessoal' : 'institucional' })) ctx.contar('contatosCriados');
        }
        // Celular do cargo = da pessoa (pessoal, nunca público); fixo = do programa.
        for (const t of lerTelefones(cel(r, p.tel))) {
          if (t.invalido) { semDono.push(`${t.original} (telefone incompleto)`); continue; }
          const dono = t.tipos[0] === 'TELEFONE' ? { entidade: 'programa', entidadeId: programa.id, rotulo: p.papel === 'SECRETARIO' ? 'secretaria' : 'coordenacao' }
            : { entidade: 'pessoa', entidadeId: pessoaId, rotulo: 'pessoal' };
          for (const tipo of t.tipos) {
            if (await inserirContato(ctx, { ...dono, tipo, valor: t.digitos, exibicao: formatarTelefone(t.digitos),
              vinculoId: dono.entidade === 'pessoa' ? vinculoId : null, observacao: t.semDdd ? 'sem DDD (planilha)' : null })) ctx.contar('contatosCriados');
          }
          classificados.push({ valor: t.original, tipo: t.tipos.join('+'), dono: dono.entidade === 'programa' ? 'programa' : p.rotulo });
          if (t.semDdd) {
            await ctx.pendencia({ chave, tipo: 'TELEFONE_SEM_DDD', campo: t.digitos, entidade: 'programa', entidadeId: programa.id,
              valorOriginal: t.original, mensagem: `${p.rotulo}: ${t.original}` });
          }
        }
      }
      for (const { email, rotulo: rot } of emailsPrograma) {
        if (await inserirContato(ctx, { entidade: 'programa', entidadeId: programa.id, tipo: 'EMAIL', valor: email, rotulo: rot })) ctx.contar('contatosCriados');
      }

      await ctx.pendencia({
        chave, tipo: 'CONTATOS_A_CONFERIR', entidade: 'programa', entidadeId: programa.id, valorOriginal: sigla || nomePrograma,
        sugestao: { classificados, semDono },
        mensagem: `${classificados.length} contato(s) classificado(s)${semDono.length ? `, ${semDono.length} sem dono (não gravado): ${semDono.join(', ')}` : ''}.`,
      });
      await ctx.registrarOrigem({ chave, entidade: 'programa', entidadeId: programa.id, dados });
      ctx.item({ acao: 'criado', chave, rotulo, entidade: 'programa', entidadeId: programa.id,
        detalhe: `${criadosVinculos} vínculo(s), ${classificados.length} contato(s)`, avisos });
    }

    // D-G4: programa cadastrado que a planilha não cita.
    for (const p of programas.todos) {
      if (casados.has(p.id)) continue;
      ctx.aviso(`Programa do cadastro ausente da planilha: ${p.sigla && p.sigla !== 'S/SIGLA' ? p.sigla + ' — ' : ''}${p.nome} (D-G4).`);
    }
    await religarProcessos(ctx);
  },
};
