// Fase O.3 (E.5): importador da planilha "OFÍCIOS_EDITAIS_PORTARIAS_PRPG.xlsx"
// (requisitos-expedientes.md §10). Uma aba por (tipo × ano), pré-numerada.
//
// - Aba → (série, ano) por uma tabela explícita (MAPA_ABAS), nunca adivinhada
//   pelo nome; aba fora da tabela é relatada e não importada.
// - Colunas lidas pelo cabeçalho (a aba " EDITAIS PRPG 2025" tem "Ano" a mais).
// - Números importados como estão (chave natural série:ano:número), nunca
//   realocados. A grade pré-numerada DEPOIS do último número usado não é
//   importada — senão o próximo ofício sairia com o número errado. Buracos
//   ENTRE números usados e linhas só com traço são a D-E3: ficam como
//   pendência, e a revisão os cria como CANCELADO se for essa a resposta.
// - Quem expediu e destinatário: a grafia fica no texto; a ligação com
//   pessoa/unidade é de-para da revisão (40 grafias de 12 pessoas; 88 de ~25
//   unidades).
// - Texto íntegro da linha em obs_original; referências a outros atos
//   ("Tornar sem efeito a Portaria 44/2026") viram ato_referencias.
import crypto from 'crypto';
import { limpar, chaveTexto, linhasDaAba, indiceColunas } from './nucleo.js';
import { carregarUnidades, lerDataBr, religarProcessos, NUP_NO_TEXTO } from './cadastro.js';

export const MAPA_ABAS = {
  '2026 ofícios': { serie: 'OFICIO', ano: 2026 },
  '2025 - Ofícios': { serie: 'OFICIO', ano: 2025 },
  'OFÍCIOS - 2024': { serie: 'OFICIO', ano: 2024 },
  '2026 - Portarias': { serie: 'PORTARIA_PRPG', ano: 2026 },
  'Portarias - 2025': { serie: 'PORTARIA_PRPG', ano: 2025 },
  '2026 Editais': { serie: 'EDITAL_PRPG', ano: 2026 },
  'EDITAIS PRPG 2025': { serie: 'EDITAL_PRPG', ano: null }, // coluna "Ano" (2022-2025)
  'EDITAIS PRPG': { serie: 'EDITAL_PRPG', ano: 2024 },
  'EDITAIS PRINT': { serie: 'EDITAL_PRINT', ano: 2024 },
  'EDITAIS LATO SENSU': { serie: 'EDITAL_LATO_SENSU', ano: 2024 },
  'EDITAIS PROFICIÊNCIA': { serie: 'EDITAL_PROFICIENCIA', ano: 2024 },
};

const COLUNAS = {
  data: 'Data', ano: 'Ano', usuario: ['Usuário', 'Usuario'], coordenacao: ['Coordenação', 'Coordenacao'],
  assunto: ['Assunto/Detalhes', 'Assunto'], destinatario: ['Destinatário', 'Destinatario'],
  obs: ['Observações', 'Observacoes'], link: ['Link publicação', 'Link publicacao'],
};

// Grafias de "quem expediu" que são setor, não pessoa.
const SETORES = new Set(['cppg', 'cippg', 'clase', 'cgf', 'lato sensu', 'prpg', 'dadm', 'secretaria', 'cbg']);
const UNIDADES_EXTRAS = { 'lato sensu': 'prpg-lato-sensu', 'secretaria': 'prpg-secretaria-camara', 'dadm': 'prpg-dadm' };

const TRACO = (v) => /^[-–—\s]*$/.test(String(v ?? '')) && /[-–—]/.test(String(v ?? ''));
const vazio = (v) => limpar(v) === '' || TRACO(v);

const ESPECIE_SERIE = { portaria: 'PORTARIA_PRPG', oficio: 'OFICIO', edital: 'EDITAL_PRPG' };
const REF = /(portaria|of[ií]cio|edital)\s*(?:prpg\/ufrpe\s*)?(?:n[º°o.]*\s*)?(\d{1,4})\s*\/\s*(\d{4})/gi;
const tipoReferencia = (texto) => {
  if (/tornar?\s+sem\s+efeito|torna\s+sem\s+efeito/i.test(texto)) return 'TORNA_SEM_EFEITO';
  if (/revog/i.test(texto)) return 'REVOGA';
  if (/retific/i.test(texto)) return 'RETIFICA';
  if (/publica/i.test(texto)) return 'PUBLICA';
  if (/encaminh/i.test(texto)) return 'ENCAMINHA';
  return 'FUNDAMENTA';
};

export default {
  fonte: 'expedientes',
  rotulo: 'Ofícios, editais e portarias',

  async importar(ctx, wb) {
    const { rows: series } = await ctx.q('SELECT id FROM ato_series');
    const seriesExistentes = new Set(series.map((s) => s.id));
    const unidades = await carregarUnidades(ctx, UNIDADES_EXTRAS);
    const porValor = new Map(); // pendências por grafia: chave -> { tipo, valorOriginal, ids }
    const criados = []; // { id, serie, ano, sequencial, texto }
    const editaisSemPagina = new Map();
    const vistas = new Map(); // chave natural -> primeira linha que a usou nesta planilha
    let nupsCitados = 0;

    const acumular = (tipo, grafia, id) => {
      const k = `${tipo}|${chaveTexto(grafia)}`;
      if (!porValor.has(k)) porValor.set(k, { tipo, valorOriginal: limpar(grafia), ids: [] });
      porValor.get(k).ids.push(id);
    };

    for (const nomeAba of wb.SheetNames) {
      const mapa = MAPA_ABAS[limpar(nomeAba)];
      if (!mapa) { ctx.aviso(`Aba "${nomeAba}" fora do mapa aba → série; não importada.`); continue; }
      if (!seriesExistentes.has(mapa.serie)) { ctx.aviso(`Série ${mapa.serie} não cadastrada; aba "${nomeAba}" não importada.`); continue; }

      const linhas = linhasDaAba(wb.Sheets[nomeAba]);
      const cab = linhas[0] || [];
      const col = indiceColunas(cab, COLUNAS);
      const cel = (r, k) => (col[k] >= 0 ? r[col[k]] : null);
      const semConteudo = new Map(); // ano -> [{ numero, traco }]
      const maiorUsado = new Map();

      for (let i = 1; i < linhas.length; i++) {
        const r = linhas[i] || [];
        const numero = Number(limpar(r[0]));
        if (!Number.isInteger(numero) || numero <= 0) {
          if (r.some((v) => limpar(v))) ctx.item({ acao: 'ignorado', chave: `${nomeAba}:linha${i + 1}`, rotulo: `aba "${nomeAba}", linha ${i + 1}`, motivo: 'sem número' });
          continue;
        }
        const campos = ['data', 'usuario', 'coordenacao', 'assunto', 'destinatario', 'obs', 'link'];
        const temConteudo = campos.some((k) => !vazio(cel(r, k)));
        const anoColuna = Number(limpar(cel(r, 'ano'))) || null;
        const ano = anoColuna || mapa.ano;
        if (!temConteudo) {
          if (!ano) continue;
          if (!semConteudo.has(ano)) semConteudo.set(ano, []);
          semConteudo.get(ano).push({ numero, traco: campos.some((k) => TRACO(cel(r, k))) });
          continue;
        }
        if (!ano) {
          ctx.item({ acao: 'erro', chave: `${nomeAba}:${numero}`, rotulo: `aba "${nomeAba}" nº ${numero}`, motivo: 'sem ano (coluna Ano vazia)' });
          continue;
        }
        maiorUsado.set(ano, Math.max(maiorUsado.get(ano) || 0, numero));

        const colunas = Object.fromEntries(cab.map((h, j) => [limpar(h) || (j === 0 ? 'Nº' : `col${j + 1}`), r[j] ?? null]));
        const dados = { aba: nomeAba, linha: i + 1, colunas };
        const chave = `${mapa.serie}:${ano}:${numero}`;
        const rotulo = `${mapa.serie} ${numero}/${ano}`;
        // Mesmo número duas vezes na planilha (a aba " EDITAIS PRPG 2025"
        // repete editais de 2024 da aba "EDITAIS PRPG" e tem um 11/2025 do
        // Lato Sensu e outro da CPPG): a primeira linha entra; a outra fica
        // para a revisão, sem ser gravada.
        const vista = vistas.get(chave);
        if (vista) {
          const coordenacoes = [vista.coordenacao, limpar(cel(r, 'coordenacao'))];
          await ctx.pendencia({ chave, tipo: 'NUMERO_REPETIDO', campo: `${nomeAba}:${i + 1}`, valorOriginal: rotulo,
            sugestao: { primeira: { aba: vista.aba, linha: vista.linha }, repetida: { aba: nomeAba, linha: i + 1, colunas } },
            mensagem: `${rotulo} aparece em "${vista.aba}" linha ${vista.linha} e em "${nomeAba}" linha ${i + 1}`
              + ` ("${vista.assunto}" × "${limpar(cel(r, 'assunto'))}")`
              + (coordenacoes.every(Boolean) && new Set(coordenacoes.map(chaveTexto)).size > 1 ? ` — coordenações diferentes (${coordenacoes.join(' × ')}): outra série?` : '.') });
          ctx.item({ acao: 'conflito', chave: `${chave}#${nomeAba}:${i + 1}`, rotulo, motivo: `número repetido na planilha (primeira: aba "${vista.aba}", linha ${vista.linha})` });
          continue;
        }
        vistas.set(chave, { aba: nomeAba, linha: i + 1, assunto: limpar(cel(r, 'assunto')), coordenacao: limpar(cel(r, 'coordenacao')) });
        if (await ctx.jaImportado({ chave, dados, rotulo })) continue;

        const assunto = limpar(cel(r, 'assunto'));
        const obs = limpar(cel(r, 'obs'));
        const texto = `${assunto} ${obs}`;

        // Mesmo número já no sistema (reservado/emitido lá): liga, não duplica;
        // assunto diferente é conflito — nada é sobrescrito.
        const { rows: existentes } = await ctx.q('SELECT id, assunto FROM atos WHERE serie_id = $1 AND ano = $2 AND sequencial = $3', [mapa.serie, ano, numero]);
        if (existentes[0]) {
          const mesmo = chaveTexto(existentes[0].assunto) === chaveTexto(assunto);
          if (mesmo) await ctx.registrarOrigem({ chave, entidade: 'ato', entidadeId: existentes[0].id, dados });
          ctx.item({ acao: mesmo ? 'existente' : 'conflito', chave, rotulo, entidade: 'ato', entidadeId: existentes[0].id,
            motivo: mesmo ? 'já estava no sistema' : `no sistema: "${existentes[0].assunto}"; na planilha: "${assunto}"` });
          continue;
        }

        const id = crypto.randomUUID();
        const avisos = [];
        const dataTexto = limpar(cel(r, 'data'));
        const lida = dataTexto ? lerDataBr(dataTexto, ano) : null;
        const data = lida?.data || null;
        if (dataTexto && !lida) {
          await ctx.pendencia({ chave, tipo: 'DATA_INVALIDA', campo: 'data', entidade: 'ato', entidadeId: id,
            valorOriginal: dataTexto, mensagem: `${rotulo}: data "${dataTexto}" — entrou sem data.` });
        } else if (data && Number(data.slice(0, 4)) !== ano) {
          await ctx.pendencia({ chave, tipo: 'ANO_DIVERGENTE', campo: 'data', entidade: 'ato', entidadeId: id,
            valorOriginal: dataTexto, mensagem: `${rotulo}: data de ${data.slice(0, 4)} na numeração de ${ano}.` });
        }

        // Quem expediu: setor (unidade de origem) ou pessoa (solicitante).
        const quem = limpar(cel(r, 'usuario')) || limpar(cel(r, 'coordenacao'));
        let unidadeOrigemId = null;
        let solicitante = null;
        if (quem && !TRACO(quem)) {
          const k = chaveTexto(quem);
          const unidade = unidades.casar(quem);
          if (SETORES.has(k) || unidade) {
            unidadeOrigemId = unidade || (await ctx.depara('unidade', k));
            if (!unidadeOrigemId) acumular('SETOR_SEM_UNIDADE', quem, id);
          } else {
            solicitante = await ctx.depara('pessoa', k);
            if (!solicitante) acumular('USUARIO_SEM_PESSOA', quem, id);
          }
        }

        const destTexto = limpar(cel(r, 'destinatario')) || null;
        let destinatarioId = null;
        if (destTexto) {
          destinatarioId = unidades.casar(destTexto) || (await ctx.depara('unidade', chaveTexto(destTexto)));
          if (!destinatarioId) acumular('DESTINATARIO_SEM_UNIDADE', destTexto, id);
        }

        const link = limpar(cel(r, 'link')) || null;
        const cancelado = /\bcancelad[oa]\b/i.test(texto);
        const situacao = cancelado ? 'CANCELADO' : (link ? 'PUBLICADO' : 'EMITIDO');
        const obsOriginal = [`Planilha: aba "${nomeAba}", linha ${i + 1}`,
          ...Object.entries(colunas).filter(([, v]) => limpar(v)).map(([k, v]) => `${k}: ${String(v).trim()}`)].join('\n');
        if ((texto.match(NUP_NO_TEXTO) || []).length) nupsCitados++;

        await ctx.q(
          `INSERT INTO atos (id, serie_id, ano, sequencial, situacao, situacao_motivo, data, assunto,
             solicitante_pessoa_id, unidade_origem_id, destinatario_unidade_id, destinatario_texto,
             link_externo, publicado, observacoes, obs_original, criado_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          [id, mapa.serie, ano, numero, situacao, cancelado ? 'marcado como cancelado na planilha' : null, data,
           assunto || '(sem assunto na planilha)', solicitante, unidadeOrigemId, destinatarioId, destTexto,
           link, !!link, obs || null, obsOriginal, ctx.actor]);
        criados.push({ id, serie: mapa.serie, ano, sequencial: numero, texto });

        // Edital com link: liga ao edital do site que tem o mesmo link (D-E5 é
        // se TODOS devem ir ao site; ligar o que já está lá não decide isso).
        if (mapa.serie.startsWith('EDITAL')) {
          const { rowCount } = link
            ? await ctx.q('UPDATE editais SET ato_id = $1 WHERE ato_id IS NULL AND (details_link = $2 OR download_link = $2)', [id, link])
            : { rowCount: 0 };
          if (!rowCount) {
            const k = `${mapa.serie}:${ano}`;
            if (!editaisSemPagina.has(k)) editaisSemPagina.set(k, { serieId: mapa.serie, ano, numeros: [], ids: [] });
            editaisSemPagina.get(k).numeros.push(numero);
            editaisSemPagina.get(k).ids.push(id);
          } else avisos.push('ligado ao edital do site');
        }

        await ctx.registrarOrigem({ chave, entidade: 'ato', entidadeId: id, dados });
        ctx.item({ acao: 'criado', chave, rotulo, entidade: 'ato', entidadeId: id, avisos });
      }

      // D-E3: sem conteúdo ENTRE números usados; D-E2: aba abandonada cedo.
      for (const [ano, lista] of semConteudo) {
        const max = maiorUsado.get(ano) || 0;
        const buracos = lista.filter((b) => b.numero < max);
        const grade = lista.length - buracos.length;
        if (grade) ctx.aviso(`${mapa.serie} ${ano} (aba "${nomeAba}"): ${grade} número(s) pré-numerado(s) depois do último usado (${max}) — não importados.`);
        if (buracos.length) {
          const tracos = buracos.filter((b) => b.traco).length;
          await ctx.pendencia({
            chave: `${mapa.serie}:${ano}`, tipo: 'RESERVAS_EM_BRANCO', valorOriginal: `${mapa.serie} ${ano}`,
            sugestao: { serieId: mapa.serie, ano, numeros: buracos.map((b) => b.numero) },
            mensagem: `${buracos.length} número(s) sem conteúdo antes do ${max}${tracos ? ` (${tracos} só com traço)` : ''}: ${buracos.map((b) => b.numero).join(', ')}.`,
          });
        }
        const usados = criados.filter((c) => c.serie === mapa.serie && c.ano === ano).length;
        if (grade > 5 * Math.max(usados, 1) && grade >= 50) {
          await ctx.pendencia({
            chave: `${mapa.serie}:${ano}`, tipo: 'SERIE_INCOMPLETA', valorOriginal: `${mapa.serie} ${ano}`,
            mensagem: `Aba "${nomeAba}" pré-numerada até ${max + grade}, com só ${max} número(s) usado(s) — sub-registro ou outra fonte?`,
          });
        }
      }
    }

    // Referências entre atos, no texto (depois de todas as abas: a portaria
    // citada pode estar numa aba lida depois).
    let refs = 0; let refsTexto = 0;
    for (const a of criados) {
      for (const m of a.texto.matchAll(REF)) {
        const serie = ESPECIE_SERIE[chaveTexto(m[1])];
        const [seq, ano] = [Number(m[2]), Number(m[3])];
        if (serie === a.serie && seq === a.sequencial && ano === a.ano) continue;
        const { rows } = await ctx.q('SELECT id FROM atos WHERE serie_id = $1 AND ano = $2 AND sequencial = $3', [serie, ano, seq]);
        const tipo = tipoReferencia(a.texto);
        const refTexto = limpar(m[0]);
        const { rows: ja } = await ctx.q(
          'SELECT 1 FROM ato_referencias WHERE ato_id = $1 AND (ato_ref_id = $2 OR ato_ref_texto = $3)', [a.id, rows[0]?.id || null, refTexto]);
        if (ja.length) continue;
        await ctx.q('INSERT INTO ato_referencias (id, ato_id, ato_ref_id, ato_ref_texto, tipo, criado_por) VALUES ($1,$2,$3,$4,$5,$6)',
          [crypto.randomUUID(), a.id, rows[0]?.id || null, rows[0] ? null : refTexto, tipo, ctx.actor]);
        if (rows[0]) refs++; else refsTexto++;
      }
    }
    ctx.contar('referenciasLigadas', refs);
    ctx.contar('referenciasSoTexto', refsTexto);

    for (const { tipo, valorOriginal, ids } of porValor.values()) {
      await ctx.pendencia({
        chave: `valor:${tipo}:${chaveTexto(valorOriginal)}`, tipo, valorOriginal, sugestao: { ids },
        mensagem: `"${valorOriginal}" em ${ids.length} ato(s).`,
      });
    }
    for (const [k, e] of editaisSemPagina) {
      await ctx.pendencia({
        chave: k, tipo: 'EDITAL_A_CONCILIAR', valorOriginal: `${e.serieId} ${e.ano}`, sugestao: { ids: e.ids, numeros: e.numeros },
        mensagem: `${e.numeros.length} edital(is) do livro sem página ligada no site: ${e.numeros.join(', ')}.`,
      });
    }

    const lig = await religarProcessos(ctx);
    if (nupsCitados) ctx.aviso(`${nupsCitados} ato(s) citam número de processo; ${lig.atos} ligado(s) a processo já cadastrado (o resto se liga quando a Câmara for importada).`);
  },
};
