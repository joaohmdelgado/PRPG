// Fase O.2/O.3 (docs/revisao-portal-conteudo-2026-09-24.md): núcleo comum aos
// importadores das quatro planilhas (Contatos, Expedientes, Câmara, PNPD).
//
// Três garantias, iguais para todos:
//  1. Simulação = a importação de verdade, numa transação desfeita no fim. O
//     relatório da simulação é exatamente o que a gravação faria (inclusive o
//     casamento entre linhas da mesma planilha), sem um segundo caminho de
//     código "só para prever".
//  2. Fidelidade: cada registro guarda a linha de origem (importacao_origens);
//     o que depende de decisão vira pendência (importacao_pendencias) — nunca
//     uma interpretação calada.
//  3. Reexecução segura: a chave natural de cada registro é registrada; na
//     próxima rodada, chave conhecida com o mesmo hash é "inalterado", com hash
//     diferente é "divergente" (a planilha mudou depois — só relatado, nunca
//     sobrescreve o que foi corrigido no sistema).
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { pool } from '../../db/pool.js';
import { TIPOS_PENDENCIA } from './pendencias.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_ARQUIVOS = () => process.env.IMPORTACOES_DIR
  || path.join(__dirname, '../../private-uploads/importacoes');

// ------------------------------------------------------------ texto ----------
// Limpeza que não muda o sentido: espaço de largura zero (U+200B, o do PPGECI),
// NBSP, quebras de linha e espaços repetidos.
export const limpar = (v) => {
  if (v == null) return '';
  return String(v).replace(/[​-‍﻿]/g, '').replace(/ /g, ' ')
    .replace(/\s+/g, ' ').trim();
};

// Forma de comparação: sem acento, minúscula, só letras/dígitos separados por espaço.
export const chaveTexto = (v) => limpar(v).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const hashDe = (obj) => crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');

// ------------------------------------------------------------ planilha -------
// cellStyles: a situação dos processos da Câmara é a cor de fundo da linha — o
// SheetJS da edição comunitária lê o preenchimento sólido (fgColor.rgb).
export const lerPlanilha = (buffer) => {
  try {
    return XLSX.read(buffer, { cellStyles: true, cellDates: false });
  } catch {
    throw Object.assign(new Error('Arquivo não reconhecido como planilha (.xlsx).'), { status: 400, expose: true });
  }
};

// Linhas da aba como matriz de textos exibidos (raw:false: '07969994490' vira
// '07969994490', datas saem como a pessoa as vê).
export const linhasDaAba = (ws) => XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false, blankrows: true });

// Cor de fundo da célula (hex sem '#', maiúsculo) ou null.
export const corDaCelula = (ws, linha, coluna = 0) => {
  const c = ws[XLSX.utils.encode_cell({ r: linha, c: coluna })];
  const s = c?.s;
  if (!s || s.patternType !== 'solid') return null;
  const rgb = s.fgColor?.rgb || null;
  return rgb ? String(rgb).slice(-6).toUpperCase() : null;
};

// Índice de coluna pelo cabeçalho (comparação sem acento/caixa/espaço) — o
// layout muda entre abas (coluna "Ano" a mais, "Destino" × "Localização").
export const indiceColunas = (cabecalho, nomes) => {
  const cab = (cabecalho || []).map(chaveTexto);
  const out = {};
  for (const [campo, candidatos] of Object.entries(nomes)) {
    const lista = (Array.isArray(candidatos) ? candidatos : [candidatos]).map(chaveTexto);
    out[campo] = cab.findIndex((h) => lista.includes(h));
  }
  return out;
};

// ------------------------------------------------------------ contexto -------
const criarContexto = ({ client, fonte, importacaoId, simulacao, actor }) => {
  const relatorio = [];
  const resumo = { criado: 0, inalterado: 0, divergente: 0, conflito: 0, ignorado: 0, erro: 0, pendencias: 0 };
  const avisos = [];
  const cacheDepara = new Map();

  const ctx = {
    fonte, importacaoId, simulacao, actor,
    relatorio, resumo, avisos,
    q: (sql, params) => client.query(sql, params),

    // Um item do relatório. acao: criado|inalterado|divergente|conflito|ignorado|erro.
    item(it) {
      relatorio.push(it);
      resumo[it.acao] = (resumo[it.acao] || 0) + 1;
    },
    aviso(msg) { avisos.push(msg); },
    contar(chave, n = 1) { resumo[chave] = (resumo[chave] || 0) + n; },

    async origem(chave) {
      const { rows } = await client.query('SELECT * FROM importacao_origens WHERE fonte = $1 AND chave = $2', [fonte, chave]);
      return rows[0] || null;
    },
    async registrarOrigem({ chave, entidade, entidadeId, dados }) {
      await client.query(
        `INSERT INTO importacao_origens (fonte, chave, entidade, entidade_id, hash, dados, importacao_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (fonte, chave) DO NOTHING`,
        [fonte, chave, entidade, entidadeId, hashDe(dados), dados, importacaoId]
      );
    },

    // Chave já importada? Resolve o item do relatório (inalterado/divergente)
    // e devolve true — o chamador não cria nada. Divergente lista as colunas
    // que mudaram na planilha desde a importação.
    async jaImportado({ chave, dados, rotulo }) {
      const o = await ctx.origem(chave);
      if (!o) return false;
      if (o.hash === hashDe(dados)) {
        ctx.item({ acao: 'inalterado', chave, rotulo, entidade: o.entidade, entidadeId: o.entidade_id });
      } else {
        const antes = o.dados || {};
        const mudou = [...new Set([...Object.keys(antes), ...Object.keys(dados)])]
          .filter((k) => JSON.stringify(antes[k] ?? null) !== JSON.stringify(dados[k] ?? null))
          .map((k) => ({ campo: k, antes: antes[k] ?? null, agora: dados[k] ?? null }));
        ctx.item({ acao: 'divergente', chave, rotulo, entidade: o.entidade, entidadeId: o.entidade_id, mudou });
      }
      return true;
    },

    // Pendência de revisão. Reimportar atualiza a pendência aberta (mesma
    // origem, mesmo tipo e campo) e nunca reabre uma resolvida.
    async pendencia({ chave, tipo, campo = '', entidade = null, entidadeId = null, valorOriginal = null, sugestao = null, mensagem = null }) {
      const def = TIPOS_PENDENCIA[tipo];
      if (!def) throw new Error(`Tipo de pendência desconhecido: ${tipo}`);
      await client.query(
        `INSERT INTO importacao_pendencias
           (id, fonte, chave, tipo, campo, entidade, entidade_id, valor_original, sugestao, decisao, mensagem, importacao_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (fonte, chave, tipo, campo) DO UPDATE
           SET valor_original = EXCLUDED.valor_original, sugestao = EXCLUDED.sugestao,
               mensagem = EXCLUDED.mensagem, entidade = EXCLUDED.entidade,
               entidade_id = EXCLUDED.entidade_id, importacao_id = EXCLUDED.importacao_id
           WHERE importacao_pendencias.situacao = 'ABERTA'`,
        [crypto.randomUUID(), fonte, chave, tipo, campo, entidade, entidadeId,
         valorOriginal == null ? null : String(valorOriginal), sugestao == null ? null : JSON.stringify(sugestao),
         def.decisao || null, mensagem, importacaoId]
      );
      resumo.pendencias += 1;
    },

    // De-para já respondido na revisão (ex.: 'ECOLOGIA' -> programa).
    async depara(dominio, valor) {
      const k = `${dominio}|${valor}`;
      if (!cacheDepara.has(k)) {
        const { rows } = await client.query(
          'SELECT destino FROM importacao_depara WHERE fonte = $1 AND dominio = $2 AND valor = $3',
          [fonte, dominio, valor]
        );
        cacheDepara.set(k, rows[0]?.destino || null);
      }
      return cacheDepara.get(k);
    },
  };
  return ctx;
};

// ------------------------------------------------------------ execução -------
const guardarArquivo = async (buffer, sha) => {
  const dir = DIR_ARQUIVOS();
  await fs.mkdir(dir, { recursive: true });
  const caminho = path.join(dir, `${sha}.xlsx`);
  try { await fs.access(caminho); } catch { await fs.writeFile(caminho, buffer, { flag: 'wx' }).catch(() => {}); }
  return caminho;
};

export const lerArquivoGuardado = (caminho) => fs.readFile(caminho);

// Roda um importador ({ fonte, importar(ctx, workbook) }) sobre o arquivo.
// Devolve { id, fonte, simulacao, resumo, relatorio, avisos }.
export async function executarImportacao({ importador, buffer, arquivoNome = null, simulacao = true, actor = null, guardar = true }) {
  const workbook = lerPlanilha(buffer);
  const sha = crypto.createHash('sha256').update(buffer).digest('hex');
  const caminho = guardar ? await guardarArquivo(buffer, sha) : null;
  const id = crypto.randomUUID();
  const fonte = importador.fonte;

  // A linha da execução fica fora da transação: existe mesmo na simulação
  // (histórico das conferências do ciclo em paralelo, O.4) e é a FK das
  // origens/pendências gravadas dentro dela.
  await pool.query(
    `INSERT INTO importacoes (id, fonte, simulacao, arquivo_nome, arquivo_sha256, arquivo_caminho, executado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, fonte, simulacao, arquivoNome, sha, caminho, actor]
  );

  const client = await pool.connect();
  const ctx = criarContexto({ client, fonte, importacaoId: id, simulacao, actor });
  let erro = null;
  try {
    await client.query('BEGIN');
    await importador.importar(ctx, workbook);
    await client.query(simulacao ? 'ROLLBACK' : 'COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    erro = e;
  } finally {
    client.release();
  }

  const resultado = { id, fonte, simulacao, resumo: ctx.resumo, relatorio: ctx.relatorio, avisos: ctx.avisos };
  await pool.query(
    'UPDATE importacoes SET resumo = $2, relatorio = $3, erro = $4 WHERE id = $1',
    [id, { ...ctx.resumo, avisos: ctx.avisos }, JSON.stringify(ctx.relatorio), erro ? erro.message : null]
  );
  if (erro) throw erro;
  return resultado;
}
