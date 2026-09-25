// Fase O.3 (C.5): importador da planilha "PNPD Voluntário.xlsx"
// (requisitos-pnpd.md §13). 95 registros → 95 estágios: não há deduplicação
// por pessoa (os CPFs repetidos são estágios distintos).
//
// - Chave natural = CPF + período como escrito (sem CPF: nome + período).
// - CPF normalizado (zeros à esquerda), DV conferido; inválido é aviso
//   (cpf_valido = false), nunca bloqueio.
// - Período: cinco gramáticas; mês/ano vira 1º/último dia com "aprox"; dia
//   inexistente (31/04) vira o último dia real do mês, com pendência. Vazio ou
//   em aberto (D-C8) entra sem as datas que faltam — e com situação manual
//   EM_ANALISE para não ser contado como vigente (as datas vazias
//   derivariam "vigente").
// - Programa sem correspondência (ECOLOGIA, D-C3) entra sem programa, com a
//   grafia em programa_original; a revisão liga todos de uma vez.
// - Supervisor casa por nome com o cadastro; sem cadastro fica só o texto.
// - Processo: texto em processo_original; liga ao processo da Câmara quando o
//   número existe (a Câmara é importada antes).
// - Renovação (D-C9) e sobreposição são só sugeridas.
import crypto from 'crypto';
import { limpar, chaveTexto, linhasDaAba, indiceColunas } from './nucleo.js';
import { carregarProgramas, carregarPessoas, lerPeriodo, religarProcessos, sugerirPrograma } from './cadastro.js';
import { normalizarCpf, cpfValido } from '../../utils/cpf.js';
import { derivarSituacao } from '../../utils/vigencia.js';

const COLUNAS = {
  nome: 'NOME', cpf: 'CPF', periodo: ['PERÍODO', 'PERIODO'], programa: 'PROGRAMA', orientador: ['ORIENTADOR', 'SUPERVISOR'],
  projeto: 'PROJETO', processo: 'PROCESSO', ativo: ['Ativo?', 'Ativo'],
};
const CPF_FORMATOS = [/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, /^\d{9,11}$/];

const diasEntre = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

export default {
  fonte: 'pnpd',
  rotulo: 'Pós-doutorado (PNPD voluntário)',

  async importar(ctx, wb) {
    const nomeAba = wb.SheetNames[0];
    const linhas = linhasDaAba(wb.Sheets[nomeAba]);
    const cab = linhas[0] || [];
    const col = indiceColunas(cab, COLUNAS);
    if (col.nome < 0 || col.periodo < 0) throw Object.assign(new Error('Planilha sem as colunas NOME e PERÍODO.'), { status: 400, expose: true });
    const cel = (r, k) => (col[k] >= 0 ? r[col[k]] : null);

    const programas = await carregarProgramas(ctx);
    const pessoas = await carregarPessoas(ctx);
    const semPrograma = new Map(); // grafia -> ids
    const estagios = []; // para renovação/sobreposição
    const chavesVistas = new Map();

    for (let i = 1; i < linhas.length; i++) {
      const r = linhas[i] || [];
      const nome = limpar(cel(r, 'nome'));
      if (!nome) continue;
      const cpfBruto = limpar(cel(r, 'cpf'));
      const periodoBruto = limpar(cel(r, 'periodo'));
      const cpf = normalizarCpf(cpfBruto);
      let chave = cpf ? `cpf:${cpf}|${chaveTexto(periodoBruto)}` : `nome:${chaveTexto(nome)}|${chaveTexto(periodoBruto)}`;
      const n = (chavesVistas.get(chave) || 0) + 1;
      chavesVistas.set(chave, n);
      if (n > 1) chave += `#${n}`;

      const colunas = Object.fromEntries(cab.map((h, j) => [limpar(h) || `col${j + 1}`, r[j] ?? null]).filter(([k, v]) => v != null || !k.startsWith('col')));
      const dados = { aba: nomeAba, linha: i + 1, colunas };
      const rotulo = `${nome} (${periodoBruto || 'sem período'})`;
      if (await ctx.jaImportado({ chave, dados, rotulo })) continue;

      const id = crypto.randomUUID();
      const vinculoId = crypto.randomUUID();

      // --- pessoa
      let pessoaId = cpf ? pessoas.porCpf(cpf) : null;
      if (!pessoaId && !cpf) pessoaId = pessoas.porNome(nome);
      if (!pessoaId) pessoaId = await pessoas.criar({ nome, cpf });
      if (!cpfBruto) {
        await ctx.pendencia({ chave, tipo: 'CPF_AUSENTE', entidade: 'pos_doutorado', entidadeId: id, valorOriginal: nome,
          mensagem: `${nome}: sem CPF na planilha.` });
      } else if (!CPF_FORMATOS.some((f) => f.test(cpfBruto)) || !cpfValido(cpf)) {
        await ctx.pendencia({ chave, tipo: 'CPF_INVALIDO', entidade: 'pos_doutorado', entidadeId: id, valorOriginal: cpfBruto,
          mensagem: `${nome}: CPF "${cpfBruto}" ${cpfValido(cpf) ? 'fora do formato' : 'com dígito verificador inválido'} (gravado ${cpf}).` });
      }

      // --- período
      const p = lerPeriodo(periodoBruto);
      if (!p.completo) {
        await ctx.pendencia({ chave, tipo: 'PERIODO_NAO_INTERPRETADO', entidade: 'pos_doutorado', entidadeId: id,
          valorOriginal: periodoBruto || '(vazio)', mensagem: `${nome}: período "${periodoBruto || 'vazio'}" — início ${p.inicio || '?'}, fim ${p.fim || '?'}.` });
      }
      if (p.ajustada) {
        await ctx.pendencia({ chave, tipo: 'DATA_AJUSTADA', entidade: 'pos_doutorado', entidadeId: id, valorOriginal: periodoBruto,
          mensagem: `${nome}: "${periodoBruto}" tem dia inexistente; gravado ${p.inicio} a ${p.fim}.` });
      }

      // --- programa
      const programaTexto = limpar(cel(r, 'programa'));
      const depara = programaTexto ? await ctx.depara('programa', chaveTexto(programaTexto)) : null;
      const programa = depara ? programas.porId(depara) : (programaTexto ? programas.casar(programaTexto, programaTexto) : null);
      if (!programa) {
        const k = chaveTexto(programaTexto);
        if (!semPrograma.has(k)) semPrograma.set(k, { grafia: programaTexto || '', ids: [] });
        semPrograma.get(k).ids.push(id);
      }

      // --- supervisão ("A e B" = supervisor + cossupervisor)
      const orientador = limpar(cel(r, 'orientador'));
      const partes = orientador.split(/\s+e\s+/i).map(limpar).filter((x) => x.split(' ').length >= 2);
      const [sup, cos] = partes.length === 2 ? partes : [orientador, null];
      const supervisorId = sup ? pessoas.porNome(sup) : null;
      const cossupervisorId = cos ? pessoas.porNome(cos) : null;

      // --- processo
      const processoTexto = limpar(cel(r, 'processo')) || null;

      // --- situação: "Ativo?" é conferido contra as datas; datas incompletas
      // não podem derivar "vigente".
      const situacaoManual = p.completo || (p.inicio && p.fim) ? null : 'EM_ANALISE';
      const derivada = derivarSituacao({ dataInicio: p.inicio, dataFim: p.fim, situacaoManual });
      const ativoTexto = chaveTexto(cel(r, 'ativo'));
      if ((ativoTexto === 'sim' || ativoTexto === 'nao') && p.completo) {
        const ativoDatas = derivada === 'VIGENTE' || derivada === 'FUTURO';
        if ((ativoTexto === 'sim') !== ativoDatas) {
          await ctx.pendencia({ chave, tipo: 'ATIVO_DIVERGENTE', entidade: 'pos_doutorado', entidadeId: id, valorOriginal: limpar(cel(r, 'ativo')),
            mensagem: `${nome}: planilha diz "${limpar(cel(r, 'ativo'))}", as datas dizem ${ativoDatas ? 'vigente' : 'encerrado'}.` });
        }
      }

      await ctx.q(
        `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, data_inicio_mandato, data_fim_mandato, situacao_manual, ativo, criado_em)
         VALUES ($1,$2,$3,'POS_DOUTORANDO',$4,$5,$6,$7,now())`,
        [vinculoId, programa?.id || null, pessoaId, p.inicio, p.fim, situacaoManual, derivada !== 'ENCERRADO']);
      await ctx.q(
        `INSERT INTO pos_doutorados (id, vinculo_id, supervisor_id, cossupervisor_id, projeto_titulo, modalidade,
           periodo_original, programa_original, supervisor_original, processo_original,
           data_inicio_aprox, data_fim_aprox, observacoes, criado_por)
         VALUES ($1,$2,$3,$4,$5,'VOLUNTARIO',$6,$7,$8,$9,$10,$11,$12,$13)`,
        [id, vinculoId, supervisorId, cossupervisorId, limpar(cel(r, 'projeto')) || '(sem título na planilha)',
         periodoBruto || null, programaTexto || null, orientador || null, processoTexto,
         p.inicioAprox, p.fimAprox,
         situacaoManual ? 'Importado com período incompleto — situação "em análise" até completar as datas (D-C8).' : null,
         ctx.actor]);
      estagios.push({ id, pessoaId, programaId: programa?.id || null, inicio: p.inicio, fim: p.fim, nome, processoTexto });

      await ctx.registrarOrigem({ chave, entidade: 'pos_doutorado', entidadeId: id, dados });
      ctx.item({ acao: 'criado', chave, rotulo, entidade: 'pos_doutorado', entidadeId: id,
        avisos: [!programa && 'sem programa', !supervisorId && sup && 'supervisor sem cadastro'].filter(Boolean) });
    }

    for (const { grafia, ids } of semPrograma.values()) {
      const sug = grafia ? sugerirPrograma(programas, grafia) : null;
      await ctx.pendencia({
        chave: `valor:programa:${chaveTexto(grafia) || 'vazio'}`, tipo: 'PROGRAMA_PNPD_SEM_CORRESPONDENCIA',
        valorOriginal: grafia || null, sugestao: { ids, provavel: sug ? { id: sug.id, nome: sug.nome } : null },
        mensagem: `${grafia ? `"${grafia}"` : 'Sem programa'} em ${ids.length} estágio(s)${sug ? ` — provável: ${sug.nome}` : ''}.`,
      });
    }

    // Mesma pessoa em mais de um estágio: sobreposição (D-C9) ou renovação.
    const porPessoa = new Map();
    for (const e of estagios) if (e.inicio) porPessoa.set(e.pessoaId, [...(porPessoa.get(e.pessoaId) || []), e]);
    for (const lista of porPessoa.values()) {
      lista.sort((a, b) => a.inicio.localeCompare(b.inicio));
      for (let k = 1; k < lista.length; k++) {
        const [a, b] = [lista[k - 1], lista[k]];
        if (a.fim && b.inicio <= a.fim) {
          await ctx.pendencia({ chave: `sobreposicao:${b.id}`, tipo: 'PERIODO_SOBREPOSTO', entidade: 'pos_doutorado', entidadeId: b.id,
            valorOriginal: b.nome, sugestao: { anteriorId: a.id },
            mensagem: `${b.nome}: estágio de ${b.inicio} começa antes do fim do anterior (${a.fim}) — erro ou prorrogação?` });
        } else if (a.fim && diasEntre(a.fim, b.inicio) <= 45) {
          await ctx.pendencia({ chave: `renovacao:${b.id}`, tipo: 'RENOVACAO_SUGERIDA', entidade: 'pos_doutorado', entidadeId: b.id,
            valorOriginal: b.nome, sugestao: { anteriorId: a.id },
            mensagem: `${b.nome}: começa ${diasEntre(a.fim, b.inicio)} dia(s) depois do fim do estágio anterior${a.programaId === b.programaId ? ', no mesmo programa' : ', em outro programa'}.` });
        }
      }
    }

    const lig = await religarProcessos(ctx);
    const comNup = estagios.filter((e) => /\d{5}\.\d{6}\/\d{4}-\d{2}/.test(e.processoTexto || '')).length;
    ctx.aviso(`${comNup} estágio(s) com NUP; ${lig.posdocs} ligado(s) a processo já cadastrado.`);
  },
};
