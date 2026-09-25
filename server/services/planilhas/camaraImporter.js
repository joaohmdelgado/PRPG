// Fase O.3 (B.8): importador da planilha "Processos - Câmara de Pós
// Graduação.xlsx" (requisitos-camara.md §12). Uma aba por reunião (a data está
// na célula A1, não no nome da aba — metade se chama "PáginaNN"), mais o
// acervo "Processos finalizados".
//
// - Chave natural = NUP normalizado. As 102 linhas viram 80 processos; cada
//   aparição numa aba de reunião vira um item de pauta e um evento de
//   tramitação — a recópia que apagava o histórico passa a reconstruí-lo.
// - D-B1 (o que cada cor significa) não tem resposta: o processo entra como
//   A_CLASSIFICAR, com a cor guardada e uma pendência por cor. A resposta, na
//   revisão, muda de uma vez todos os processos daquela cor (e fica como
//   de-para: a próxima importação já aplica).
// - D-G8: a aba "Relatores" (celulares de coordenadores) não é lida.
// - Obs. inteira em obs_original; "Relator(a): Nome" vira relatoria.
import crypto from 'crypto';
import { limpar, chaveTexto, linhasDaAba, indiceColunas, corDaCelula } from './nucleo.js';
import { carregarUnidades, carregarPessoas, lerDataBr, religarProcessos } from './cadastro.js';
import { NUP_REGEX } from '../../utils/nup.js';
import { hojeISO } from '../../utils/datas.js';

const COLUNAS = {
  nup: ['Número de processo', 'Numero de processo'], link: 'Link direto', responsavel: ['Responsável', 'Responsavel'],
  assunto: 'Assunto', local: ['Localização', 'Localizacao', 'Destino'], obs: ['Obs.', 'Obs', 'Observações'],
};
// "Responsável" = setor da PRPG que instrui (requisitos-camara.md §1.3).
const RESPONSAVEIS = {
  secretaria: 'prpg-secretaria-camara', internacionalizacao: 'prpg-internacionalizacao',
  'lato sensu': 'prpg-lato-sensu', dadm: 'prpg-dadm',
};
const NUP_SOLTO = /\d{5}\.\d{5,6}\/\d{4}-\d{2}/;
const RELATOR = /(novo\s+)?relator(?:a|\(a\))?\s*:\s*([A-Za-zÀ-ÿ'][A-Za-zÀ-ÿ'\s.]+?)(?=\s*(?:[-,;.]\s|\.$|$|\s+obs\b|\s+-|,)|\s+[OA]\s+[a-zà-ÿ])/gi;

export const lerRelatores = (obs) => [...String(obs || '').matchAll(RELATOR)]
  .map((m) => ({ nome: limpar(m[2]).replace(/\.$/, '').replace(/^prof(?:essora?|a)?\.?\s+/i, ''), novo: !!m[1] }))
  .filter((r) => r.nome.split(' ').length >= 2);

const dataDoTitulo = (titulo) => lerDataBr((String(titulo || '').match(/(\d{1,2}\/\d{1,2}\/\d{4})/) || [])[1] || '')?.data || null;

export default {
  fonte: 'camara',
  rotulo: 'Processos da Câmara de Pós-Graduação',

  async importar(ctx, wb) {
    const unidades = await carregarUnidades(ctx, RESPONSAVEIS);
    const pessoas = await carregarPessoas(ctx);
    const processos = new Map(); // numero -> { numero, valido, aparicoes: [] }

    for (const nomeAba of wb.SheetNames) {
      const ws = wb.Sheets[nomeAba];
      if (chaveTexto(nomeAba) === 'relatores') {
        await ctx.pendencia({ chave: `aba:${nomeAba}`, tipo: 'ABA_NAO_IMPORTADA', valorOriginal: nomeAba,
          mensagem: 'Aba "Relatores" (coordenadores e celulares) não importada: a agenda de contatos é a fonte (D-G8).' });
        continue;
      }
      if (!ws || !ws['!ref']) continue;
      const linhas = linhasDaAba(ws);
      const iCab = linhas.findIndex((r) => chaveTexto(r?.[0]).startsWith('numero de processo'));
      if (iCab < 0) { ctx.aviso(`Aba "${nomeAba}" sem cabeçalho "Número de processo"; não importada.`); continue; }
      const cab = linhas[iCab];
      const col = indiceColunas(cab, COLUNAS);
      const titulo = linhas.slice(0, iCab).map((r) => limpar(r?.[0])).filter(Boolean).join(' ');
      const dataReuniao = dataDoTitulo(titulo);
      const cel = (r, k) => (col[k] >= 0 ? r[col[k]] : null);

      for (let i = iCab + 1; i < linhas.length; i++) {
        const r = linhas[i] || [];
        const bruto = limpar(cel(r, 'nup'));
        if (!bruto) continue;
        const achado = bruto.match(NUP_SOLTO)?.[0];
        const numero = achado || bruto;
        const colunas = Object.fromEntries(cab.map((h, j) => [limpar(h) || `col${j + 1}`, r[j] ?? null]));
        const ap = {
          aba: nomeAba, linha: i + 1, dataReuniao, titulo, cor: corDaCelula(ws, i, 0), bruto,
          link: limpar(cel(r, 'link')) || null, responsavel: limpar(cel(r, 'responsavel')) || null,
          assunto: String(cel(r, 'assunto') ?? '').trim() || null, local: limpar(cel(r, 'local')) || null,
          obs: String(cel(r, 'obs') ?? '').trim() || null, colunas: Object.fromEntries(Object.entries(colunas).filter(([, v]) => v != null)),
        };
        if (!processos.has(numero)) processos.set(numero, { numero, valido: NUP_REGEX.test(numero), aparicoes: [] });
        processos.get(numero).aparicoes.push(ap);
      }
    }

    // A aparição mais recente manda na situação/assunto: reuniões por data, e
    // o acervo "finalizados" (sem data) por último — é para onde o processo vai
    // depois de resolvido.
    const ordem = (a) => a.dataReuniao || '9999-99-99';
    const hoje = hojeISO();
    const reunioes = new Map();
    const responsaveis = new Map(); // grafia sem unidade -> ids de processo

    for (const p of [...processos.values()].sort((a, b) => a.numero.localeCompare(b.numero))) {
      p.aparicoes.sort((a, b) => ordem(a).localeCompare(ordem(b)) || a.linha - b.linha);
      const ultima = p.aparicoes[p.aparicoes.length - 1];
      const primeira = p.aparicoes[0];
      const chave = `nup:${p.numero}`;
      const rotulo = p.numero;
      // Origem do processo = o que não muda entre recópias (número e assunto
      // da primeira aparição). Cada aparição tem a sua origem, abaixo.
      const dados = { aba: primeira.aba, linha: primeira.linha, colunas: { 'Número de processo': primeira.bruto, Assunto: primeira.assunto } };

      let processoId;
      const conhecido = await ctx.origem(chave);
      if (conhecido) {
        processoId = conhecido.entidade_id;
        await ctx.jaImportado({ chave, dados, rotulo });
      } else {
        const { rows: existente } = await ctx.q('SELECT id FROM processos WHERE numero = $1', [p.numero]);
        if (existente[0]) {
          processoId = existente[0].id;
          await ctx.registrarOrigem({ chave, entidade: 'processo', entidadeId: processoId, dados });
          ctx.item({ acao: 'existente', chave, rotulo, entidade: 'processo', entidadeId: processoId, motivo: 'processo já cadastrado — só a pauta/histórico da planilha foram acrescentados' });
        } else {
          processoId = crypto.randomUUID();
          const cores = [...new Set(p.aparicoes.map((a) => a.cor || 'SEM_COR'))];
          const cor = ultima.cor || 'SEM_COR';
          const status = (await ctx.depara('cor', cor)) || 'A_CLASSIFICAR';
          const responsavel = [...p.aparicoes].reverse().find((a) => a.responsavel)?.responsavel || null;
          const unidadeResp = responsavel ? (unidades.casar(responsavel) || (await ctx.depara('unidade', chaveTexto(responsavel)))) : null;
          const assunto = [...p.aparicoes].reverse().find((a) => a.assunto)?.assunto || '(sem assunto na planilha)';
          const link = p.aparicoes.find((a) => a.link)?.link || null;
          const obsOriginal = p.aparicoes.map((a) => {
            const cab = `[${a.aba}${a.dataReuniao ? ` — reunião de ${a.dataReuniao.split('-').reverse().join('/')}` : ''}, linha ${a.linha}${a.cor ? `, cor #${a.cor}` : ''}]`;
            return [cab, a.local && `Localização: ${a.local}`, a.responsavel && `Responsável: ${a.responsavel}`, a.obs && `Obs.: ${a.obs}`]
              .filter(Boolean).join('\n');
          }).join('\n\n');
          const ultimaData = [...p.aparicoes].reverse().find((a) => a.dataReuniao)?.dataReuniao || null;

          await ctx.q(
            `INSERT INTO processos (id, numero, numero_valido, link_sipac, assunto, unidade_responsavel_id, status,
               status_motivo, localizacao_em, obs_original, criado_por)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [processoId, p.numero, p.valido, link, assunto, unidadeResp, status,
             status === 'A_CLASSIFICAR' ? `Importado da planilha; cor da linha #${cor} (D-B1).` : null,
             ultimaData, obsOriginal, ctx.actor]);
          if (status === 'A_CLASSIFICAR') {
            await ctx.pendencia({ chave, tipo: 'COR_SEM_LEGENDA', entidade: 'processo', entidadeId: processoId, valorOriginal: cor,
              sugestao: { cores }, mensagem: `${p.numero}: ${assunto.slice(0, 90)}${cores.length > 1 ? ` (cores nas abas: ${cores.join(', ')})` : ''}` });
          }
          if (responsavel && !unidadeResp) {
            const k = chaveTexto(responsavel);
            if (!responsaveis.has(k)) responsaveis.set(k, { grafia: responsavel, ids: [] });
            responsaveis.get(k).ids.push(processoId);
          }
          const colado = p.aparicoes.map((a) => a.bruto).find((b) => b !== p.numero);
          if (!p.valido || colado) {
            await ctx.pendencia({ chave, tipo: 'NUP_FORA_DO_PADRAO', entidade: 'processo', entidadeId: processoId,
              valorOriginal: colado || p.numero,
              mensagem: p.valido ? `Texto colado ao número removido; gravado "${p.numero}".`
                : `Fora do padrão NNNNN.NNNNNN/AAAA-DD; gravado "${p.numero}".` });
          }
          await ctx.registrarOrigem({ chave, entidade: 'processo', entidadeId: processoId, dados });
          ctx.item({ acao: 'criado', chave, rotulo, entidade: 'processo', entidadeId: processoId,
            detalhe: `${p.aparicoes.length} aparição(ões) na planilha` });

          // Relatorias citadas na Obs. ("Novo Relator" substitui o anterior).
          const relatores = [];
          for (const a of p.aparicoes) for (const rel of lerRelatores(a.obs)) {
            if (!relatores.some((x) => chaveTexto(x.nome) === chaveTexto(rel.nome))) relatores.push({ ...rel, data: a.dataReuniao });
          }
          for (const [k, rel] of relatores.entries()) {
            const ativa = k === relatores.length - 1;
            await ctx.q(
              `INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, ativa, motivo_substituicao, criado_por)
               VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [crypto.randomUUID(), processoId, pessoas.porNome(rel.nome), rel.nome, ativa,
               ativa ? null : 'substituído (planilha)', ctx.actor]);
            ctx.contar('relatorias');
          }
        }
      }

      // Cada aparição numa aba de reunião = item de pauta + evento de tramitação.
      const vistasAp = new Map();
      for (const a of p.aparicoes) {
        // Duas linhas do mesmo processo na mesma aba (acontece no acervo): chaves #2, #3...
        const baseAp = `aparicao:${p.numero}|${a.dataReuniao || chaveTexto(a.aba)}`;
        const nAp = (vistasAp.get(baseAp) || 0) + 1;
        vistasAp.set(baseAp, nAp);
        const chaveAp = nAp > 1 ? `${baseAp}#${nAp}` : baseAp;
        const dadosAp = { aba: a.aba, linha: a.linha, cor: a.cor, colunas: a.colunas };
        if (await ctx.origem(chaveAp)) { await ctx.jaImportado({ chave: chaveAp, dados: dadosAp, rotulo: `${p.numero} em "${a.aba}"` }); continue; }
        let reuniaoId = null;
        if (a.dataReuniao) {
          if (!reunioes.has(a.dataReuniao)) {
            const { rows } = await ctx.q('SELECT id FROM camara_reunioes WHERE data = $1 ORDER BY criado_em LIMIT 1', [a.dataReuniao]);
            let id = rows[0]?.id;
            if (!id) {
              id = crypto.randomUUID();
              await ctx.q(
                `INSERT INTO camara_reunioes (id, data, status, observacoes, criado_por) VALUES ($1,$2,$3,$4,$5)`,
                [id, a.dataReuniao, a.dataReuniao < hoje ? 'REALIZADA' : 'CONVOCADA',
                 `Importada da planilha (aba "${a.aba}": ${a.titulo}).`, ctx.actor]);
              ctx.contar('reunioesCriadas');
            }
            reunioes.set(a.dataReuniao, id);
          }
          reuniaoId = reunioes.get(a.dataReuniao);
          const { rowCount } = await ctx.q(
            `INSERT INTO camara_pauta_itens (id, reuniao_id, processo_id, ordem, criado_por) VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (reuniao_id, processo_id) DO NOTHING`,
            [crypto.randomUUID(), reuniaoId, processoId, a.linha, ctx.actor]);
          if (rowCount) ctx.contar('itensDePauta');
        }
        const dataEvento = a.dataReuniao || lerDataBr((a.local?.match(/(\d{1,2}\/\d{1,2}\/\d{4})/) || [])[1] || '')?.data || null;
        if (dataEvento && (a.local || a.obs)) {
          await ctx.q(
            `INSERT INTO eventos (id, entidade, entidade_id, tipo, data, descricao, origem_tipo, origem_id, dados, criado_por)
             VALUES ($1,'processo',$2,'TRAMITACAO',$3,$4,$5,$6,$7,$8)`,
            [crypto.randomUUID(), processoId, dataEvento,
             `Planilha, aba "${a.aba}": ${a.local || '(sem localização)'}`,
             reuniaoId ? 'reuniao' : null, reuniaoId, { aba: a.aba, linha: a.linha, cor: a.cor, obs: a.obs, importado: true }, ctx.actor]);
          ctx.contar('eventos');
        }
        await ctx.registrarOrigem({ chave: chaveAp, entidade: 'processo', entidadeId: processoId, dados: dadosAp });
      }
    }

    for (const { grafia, ids } of responsaveis.values()) {
      await ctx.pendencia({ chave: `valor:responsavel:${chaveTexto(grafia)}`, tipo: 'RESPONSAVEL_SEM_UNIDADE',
        valorOriginal: grafia, sugestao: { ids }, mensagem: `Responsável "${grafia}" em ${ids.length} processo(s).` });
    }

    const lig = await religarProcessos(ctx);
    if (lig.atos || lig.posdocs) ctx.aviso(`Ligados aos processos pelo número citado: ${lig.atos} ato(s), ${lig.posdocs} estágio(s) de pós-doc.`);
  },
};
