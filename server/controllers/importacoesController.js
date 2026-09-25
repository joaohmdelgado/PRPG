// Fase O.2/O.3/O.4 (docs/revisao-portal-conteudo-2026-09-24.md): importação
// das planilhas com revisão posterior. A interpretação do que a planilha não
// diz acontece aqui (tela "Revisão da importação"), não no importador.
import { pool, query } from '../db/pool.js';
import { TIPOS_PENDENCIA, HANDLERS, DOMINIO_DEPARA, SITUACOES } from '../services/planilhas/pendencias.js';
import { chaveTexto, executarImportacao, lerArquivoGuardado } from '../services/planilhas/nucleo.js';
import { getImportadorPlanilha, IMPORTADORES, ORDEM, ARQUIVOS_PADRAO } from '../services/planilhas/index.js';
import { STATUS_PROCESSO } from './camaraController.js';

const pendenciaFromRow = (r) => ({
  id: r.id, fonte: r.fonte, chave: r.chave, tipo: r.tipo, campo: r.campo,
  entidade: r.entidade, entidadeId: r.entidade_id, valorOriginal: r.valor_original,
  sugestao: r.sugestao, decisao: r.decisao, mensagem: r.mensagem, situacao: r.situacao,
  resolucao: r.resolucao, resolvidoEm: r.resolvido_em, resolvidoPor: r.resolvido_por,
  criadoEm: r.criado_em,
});

const tiposParaTela = () => Object.fromEntries(Object.entries(TIPOS_PENDENCIA).map(([k, v]) => [k, {
  rotulo: v.rotulo, decisao: v.decisao, destino: v.destino, ajuda: v.ajuda || null, opcoes: v.opcoes || null,
}]));

// GET /api/importacoes/pendencias?fonte=&situacao=ABERTA&tipo=
// Devolve os itens e os grupos (mesma fonte + tipo + grafia): um grupo é o
// que uma única resposta resolve de uma vez.
export const getPendencias = async (req, res) => {
  const situacao = SITUACOES.includes(req.query.situacao) ? req.query.situacao : 'ABERTA';
  const params = [situacao];
  const where = ['situacao = $1'];
  if (req.query.fonte) { params.push(req.query.fonte); where.push(`fonte = $${params.length}`); }
  if (req.query.tipo) { params.push(req.query.tipo); where.push(`tipo = $${params.length}`); }
  const { rows } = await query(
    `SELECT * FROM importacao_pendencias WHERE ${where.join(' AND ')}
     ORDER BY fonte, tipo, valor_original NULLS LAST, chave`, params);
  const { rows: contagem } = await query(
    `SELECT fonte, situacao, count(*)::int AS n FROM importacao_pendencias GROUP BY fonte, situacao`);
  res.json({ itens: rows.map(pendenciaFromRow), contagem, tipos: tiposParaTela() });
};

// Resolve uma lista de pendências numa transação só. acao: aplicar|conferido|descartar.
const resolver = async (pendencias, { acao, destino, nota }, actor) => {
  if (!['aplicar', 'conferido', 'descartar'].includes(acao)) {
    throw Object.assign(new Error('Ação inválida (aplicar, conferido ou descartar).'), { status: 400, expose: true });
  }
  const client = await pool.connect();
  const q = (sql, params) => client.query(sql, params);
  let alterados = 0;
  try {
    await client.query('BEGIN');
    for (const p of pendencias) {
      if (p.situacao !== 'ABERTA') continue;
      if (acao === 'aplicar') {
        const handler = HANDLERS[p.tipo];
        if (!handler) throw Object.assign(new Error('Esta pendência não tem o que aplicar — marque como conferida.'), { status: 400, expose: true });
        if (!destino) throw Object.assign(new Error('Escolha o valor a aplicar.'), { status: 400, expose: true });
        await validarDestino(q, TIPOS_PENDENCIA[p.tipo].destino, destino);
        alterados += await handler(q, p, destino, actor);
        const dominio = DOMINIO_DEPARA[p.tipo];
        if (dominio && p.valor_original) {
          await q(
            `INSERT INTO importacao_depara (fonte, dominio, valor, destino, definido_por) VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (fonte, dominio, valor) DO UPDATE SET destino = EXCLUDED.destino, definido_em = now(), definido_por = EXCLUDED.definido_por`,
            [p.fonte, dominio, dominio === 'cor' ? p.valor_original : chaveTexto(p.valor_original), destino, actor]);
        }
      }
      await q(
        `UPDATE importacao_pendencias SET situacao = $2, resolucao = $3, resolvido_em = now(), resolvido_por = $4
         WHERE id = $1 AND situacao = 'ABERTA'`,
        [p.id, acao === 'descartar' ? 'DESCARTADA' : 'RESOLVIDA', { acao, destino: destino || null, nota: nota || null }, actor]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  return alterados;
};

const validarDestino = async (q, tipoDestino, destino) => {
  const invalido = () => { throw Object.assign(new Error('Valor escolhido não existe.'), { status: 400, expose: true }); };
  if (tipoDestino === 'programa') {
    if (!(await q('SELECT 1 FROM programas WHERE id = $1', [destino])).rowCount) invalido();
  } else if (tipoDestino === 'unidade') {
    if (!(await q('SELECT 1 FROM unidades WHERE id = $1', [destino])).rowCount) invalido();
  } else if (tipoDestino === 'pessoa') {
    if (!(await q('SELECT 1 FROM pessoas WHERE id = $1', [destino])).rowCount) invalido();
  } else if (tipoDestino === 'status_processo') {
    if (!STATUS_PROCESSO.includes(destino) || destino === 'A_CLASSIFICAR') invalido();
  } else if (tipoDestino === 'confirmar') {
    if (!['sim', 'nao'].includes(destino)) invalido();
  }
};

// POST /api/importacoes/pendencias/:id/resolver  { acao, destino?, nota? }
export const resolverPendencia = async (req, res) => {
  const { rows } = await query('SELECT * FROM importacao_pendencias WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Pendência não encontrada.' });
  if (rows[0].situacao !== 'ABERTA') return res.status(409).json({ message: 'Pendência já resolvida.' });
  const alterados = await resolver(rows, req.body || {}, req.user?.id);
  res.json({ resolvidas: 1, alterados });
};

// POST /api/importacoes/pendencias/lote  { fonte, tipo, valorOriginal, acao, destino?, nota? }
// Todas as pendências abertas do mesmo grupo — uma resposta da oficina fecha o lote.
export const resolverLote = async (req, res) => {
  const { fonte, tipo, valorOriginal } = req.body || {};
  if (!fonte || !tipo) return res.status(400).json({ message: 'Informe fonte e tipo.' });
  const { rows } = await query(
    `SELECT * FROM importacao_pendencias
     WHERE situacao = 'ABERTA' AND fonte = $1 AND tipo = $2 AND valor_original IS NOT DISTINCT FROM $3`,
    [fonte, tipo, valorOriginal ?? null]);
  if (!rows.length) return res.status(404).json({ message: 'Nenhuma pendência aberta neste grupo.' });
  const alterados = await resolver(rows, req.body, req.user?.id);
  res.json({ resolvidas: rows.length, alterados });
};

// GET /api/importacoes/opcoes?destino=programa|unidade|pessoa|status_processo&q=
export const getOpcoes = async (req, res) => {
  const { destino } = req.query;
  const q = `%${String(req.query.q || '').trim()}%`;
  if (destino === 'programa') {
    const { rows } = await query(
      `SELECT id AS valor, COALESCE(NULLIF(sigla, 'S/SIGLA') || ' — ', '') || nome AS rotulo FROM programas
       WHERE nome ILIKE $1 OR sigla ILIKE $1 ORDER BY nome LIMIT 60`, [q]);
    return res.json(rows);
  }
  if (destino === 'unidade') {
    const { rows } = await query(
      `SELECT id AS valor, sigla || ' — ' || nome AS rotulo FROM unidades
       WHERE ativo AND (nome ILIKE $1 OR sigla ILIKE $1) ORDER BY sigla LIMIT 60`, [q]);
    return res.json(rows);
  }
  if (destino === 'pessoa') {
    const { rows } = await query(
      `SELECT id AS valor, nome AS rotulo FROM pessoas WHERE nome ILIKE $1 ORDER BY nome LIMIT 30`, [q]);
    return res.json(rows);
  }
  if (destino === 'status_processo') {
    const { rows } = await query(
      `SELECT valor, rotulo FROM vocabularios WHERE dominio = 'processo.situacao' AND valor <> 'A_CLASSIFICAR'
       ORDER BY ordem`);
    return res.json(rows);
  }
  res.status(400).json({ message: 'Destino inválido.' });
};

// GET /api/importacoes/origem/:entidade/:entidadeId — de onde veio um
// registro (linha da planilha como estava) e suas pendências.
export const getOrigem = async (req, res) => {
  const { entidade, entidadeId } = req.params;
  const { rows: origens } = await query(
    `SELECT fonte, chave, dados, importado_em FROM importacao_origens
     WHERE entidade = $1 AND entidade_id = $2 ORDER BY importado_em`, [entidade, entidadeId]);
  const { rows: pend } = await query(
    `SELECT * FROM importacao_pendencias
     WHERE (entidade = $1 AND entidade_id = $2) OR (sugestao->'ids') ? $2
     ORDER BY situacao, criado_em`, [entidade, entidadeId]);
  res.json({
    origens: origens.map((o) => ({ fonte: o.fonte, chave: o.chave, dados: o.dados, importadoEm: o.importado_em })),
    pendencias: pend.map(pendenciaFromRow),
  });
};

// GET /api/importacoes?fonte= — histórico de execuções (sem o relatório).
export const getImportacoes = async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.fonte) { params.push(req.query.fonte); where = 'WHERE i.fonte = $1'; }
  const { rows } = await query(
    `SELECT i.id, i.fonte, i.simulacao, i.arquivo_nome, i.arquivo_sha256, i.resumo, i.erro, i.executado_em,
            u.perfil_nome AS executado_por_nome
     FROM importacoes i LEFT JOIN users u ON u.id = i.executado_por
     ${where} ORDER BY i.executado_em DESC LIMIT 50`, params);
  res.json(rows.map((r) => ({
    id: r.id, fonte: r.fonte, simulacao: r.simulacao, arquivoNome: r.arquivo_nome,
    arquivoSha256: r.arquivo_sha256, resumo: r.resumo, erro: r.erro, executadoEm: r.executado_em,
    executadoPorNome: r.executado_por_nome,
  })));
};

// GET /api/importacoes/:id — uma execução com o relatório completo.
export const getImportacao = async (req, res) => {
  const { rows } = await query('SELECT * FROM importacoes WHERE id = $1', [req.params.id]);
  const r = rows[0];
  if (!r) return res.status(404).json({ message: 'Importação não encontrada.' });
  res.json({
    id: r.id, fonte: r.fonte, simulacao: r.simulacao, arquivoNome: r.arquivo_nome,
    arquivoSha256: r.arquivo_sha256, resumo: r.resumo, relatorio: r.relatorio, erro: r.erro,
    executadoEm: r.executado_em,
  });
};

// ============================ Execução (O.3) ============================
const resumirResultado = (r) => ({
  id: r.id, fonte: r.fonte, simulacao: r.simulacao, resumo: r.resumo, avisos: r.avisos,
  // O relatório completo fica em GET /api/importacoes/:id; aqui só o que
  // pede atenção (conflito, divergência, erro, ignorado) e as pendências.
  itens: r.relatorio.filter((i) => ['conflito', 'divergente', 'erro', 'ignorado'].includes(i.acao)),
  pendencias: r.pendencias,
});

// POST /api/importacoes/planilhas/:fonte   multipart: file, simulacao ('true' padrão)
export const importarPlanilha = async (req, res) => {
  const importador = getImportadorPlanilha(req.params.fonte);
  if (!importador) return res.status(404).json({ message: 'Planilha desconhecida.' });
  if (!req.file) return res.status(400).json({ message: 'Envie o arquivo .xlsx.' });
  const r = await executarImportacao({
    importador, buffer: req.file.buffer, arquivoNome: req.file.originalname,
    simulacao: String(req.body?.simulacao ?? 'true') !== 'false', actor: req.user?.id,
  });
  res.json(resumirResultado(r));
};

// POST /api/importacoes/planilhas/:fonte/reexecutar  { simulacao }
// Roda de novo o último arquivo guardado desta planilha (depois de responder
// um de-para na revisão, por exemplo).
export const reexecutarPlanilha = async (req, res) => {
  const importador = getImportadorPlanilha(req.params.fonte);
  if (!importador) return res.status(404).json({ message: 'Planilha desconhecida.' });
  const { rows } = await query(
    `SELECT arquivo_nome, arquivo_caminho FROM importacoes
     WHERE fonte = $1 AND arquivo_caminho IS NOT NULL ORDER BY executado_em DESC LIMIT 1`, [req.params.fonte]);
  if (!rows[0]) return res.status(404).json({ message: 'Nenhum arquivo desta planilha foi enviado ainda.' });
  let buffer;
  try { buffer = await lerArquivoGuardado(rows[0].arquivo_caminho); } catch {
    return res.status(410).json({ message: 'O arquivo guardado não está mais disponível no servidor. Envie de novo.' });
  }
  const r = await executarImportacao({
    importador, buffer, arquivoNome: rows[0].arquivo_nome,
    simulacao: req.body?.simulacao !== false && req.body?.simulacao !== 'false', actor: req.user?.id,
  });
  res.json(resumirResultado(r));
};

// GET /api/importacoes/planilhas — uma linha por planilha, na ordem de importação.
export const getPlanilhas = async (_req, res) => {
  const { rows: ultimas } = await query(`
    SELECT DISTINCT ON (fonte, simulacao) fonte, simulacao, id, arquivo_nome, resumo, erro, executado_em
      FROM importacoes ORDER BY fonte, simulacao, executado_em DESC`);
  const { rows: pend } = await query(
    `SELECT fonte, count(*) FILTER (WHERE situacao = 'ABERTA')::int AS abertas, count(*)::int AS total
       FROM importacao_pendencias GROUP BY fonte`);
  const { rows: origens } = await query('SELECT fonte, count(*)::int AS n FROM importacao_origens GROUP BY fonte');
  const execucao = (r) => (r ? { id: r.id, arquivoNome: r.arquivo_nome, resumo: r.resumo, erro: r.erro, executadoEm: r.executado_em } : null);
  res.json(ORDEM.map((fonte) => ({
    fonte, rotulo: IMPORTADORES[fonte].rotulo, arquivoPadrao: ARQUIVOS_PADRAO[fonte],
    ultimaSimulacao: execucao(ultimas.find((u) => u.fonte === fonte && u.simulacao)),
    ultimaImportacao: execucao(ultimas.find((u) => u.fonte === fonte && !u.simulacao)),
    registrosImportados: origens.find((o) => o.fonte === fonte)?.n || 0,
    pendenciasAbertas: pend.find((p) => p.fonte === fonte)?.abertas || 0,
  })));
};
