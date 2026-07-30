// Fase E (Expedientes, PLANO.md): repositório de ato_series/atos/ato_referencias/
// documentos. Ver requisitos-expedientes.md §5/§7 para o modelo e a máquina de
// numeração (alocação atômica via proximo_sequencial(), com pg_advisory_xact_lock
// na mesma transação do INSERT — a UNIQUE (serie_id, ano, sequencial) é a rede
// de segurança final).
import crypto from 'crypto';
import { query } from './pool.js';

const serieFromRow = (r) => ({
  id: r.id, nome: r.nome, especie: r.especie, sigla: r.sigla, formato: r.formato,
  unidadeId: r.unidade_id, reiniciaPorAno: r.reinicia_por_ano,
  exigeDestinatario: r.exige_destinatario, publicaNoSite: r.publica_no_site,
  ativo: r.ativo, ordem: r.ordem,
});

export const atoSeriesRepo = {
  async getAll() {
    const { rows } = await query('SELECT * FROM ato_series ORDER BY ordem ASC, nome ASC');
    return rows.map(serieFromRow);
  },
  async getById(id) {
    const { rows } = await query('SELECT * FROM ato_series WHERE id = $1', [id]);
    return rows[0] ? serieFromRow(rows[0]) : null;
  },
  // Próximo número de cada série ativa, para a barra do livro de expedientes
  // (§9.1). Apenas leitura (MAX+1 sem lock) — a alocação real e atômica só
  // acontece dentro de atosRepo.reservar()/create().
  async getAllComProximoNumero(ano) {
    const { rows } = await query(
      `SELECT s.*, COALESCE(MAX(a.sequencial) FILTER (WHERE a.ano = $1), 0) + 1 AS proximo_sequencial
         FROM ato_series s
         LEFT JOIN atos a ON a.serie_id = s.id AND a.ano = $1
        WHERE s.ativo = TRUE
        GROUP BY s.id
        ORDER BY s.ordem ASC, s.nome ASC`,
      [ano]
    );
    return rows.map((r) => ({ ...serieFromRow(r), proximoSequencial: Number(r.proximo_sequencial) }));
  },
  async create(data) {
    const id = data.id || String(data.nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().trim().replace(/[^A-Z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    const { rows } = await query(
      `INSERT INTO ato_series (id, nome, especie, sigla, formato, unidade_id, reinicia_por_ano, exige_destinatario, publica_no_site, ativo, ordem)
       VALUES ($1,$2,$3,$4,COALESCE($5, DEFAULT),$6,COALESCE($7,TRUE),COALESCE($8,FALSE),COALESCE($9,FALSE),COALESCE($10,TRUE),COALESCE($11,0))
       RETURNING *`,
      [id, data.nome, data.especie, data.sigla, data.formato || null, data.unidadeId || null,
       data.reiniciaPorAno, data.exigeDestinatario, data.publicaNoSite, data.ativo, data.ordem || 0]
    );
    return serieFromRow(rows[0]);
  },
  async update(id, data) {
    const { rows } = await query(
      `UPDATE ato_series SET nome = COALESCE($2, nome), especie = COALESCE($3, especie),
         sigla = COALESCE($4, sigla), formato = COALESCE($5, formato), unidade_id = $6,
         reinicia_por_ano = COALESCE($7, reinicia_por_ano), exige_destinatario = COALESCE($8, exige_destinatario),
         publica_no_site = COALESCE($9, publica_no_site), ativo = COALESCE($10, ativo), ordem = COALESCE($11, ordem)
       WHERE id = $1 RETURNING *`,
      [id, data.nome, data.especie, data.sigla, data.formato, data.unidadeId ?? null,
       data.reiniciaPorAno, data.exigeDestinatario, data.publicaNoSite, data.ativo, data.ordem]
    );
    return rows[0] ? serieFromRow(rows[0]) : null;
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM ato_series WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

const buildNumeroExibicao = (formato, sigla, sequencial, ano) => String(formato || '{sigla} Nº {sequencial}/{ano}')
  .replace('{sigla}', sigla || '').replace('{sequencial}', String(sequencial)).replace('{ano}', String(ano));

const atoFromRow = (r) => ({
  id: r.id, serieId: r.serie_id, ano: r.ano, sequencial: r.sequencial,
  numeroExibicao: buildNumeroExibicao(r.serie_formato, r.serie_sigla, r.sequencial, r.ano),
  situacao: r.situacao, situacaoMotivo: r.situacao_motivo,
  data: r.data, titulo: r.titulo, assunto: r.assunto, ementa: r.ementa,
  solicitantePessoaId: r.solicitante_pessoa_id, unidadeOrigemId: r.unidade_origem_id,
  destinatarioUnidadeId: r.destinatario_unidade_id, destinatarioTexto: r.destinatario_texto,
  interessadoPessoaId: r.interessado_pessoa_id, processoId: r.processo_id,
  programaId: r.programa_id, arquivoId: r.arquivo_id, linkExterno: r.link_externo,
  vigenciaInicio: r.vigencia_inicio, vigenciaFim: r.vigencia_fim, publicado: r.publicado,
  secao: r.secao, categoria: r.categoria, observacoes: r.observacoes, obsOriginal: r.obs_original,
  criadoEm: r.criado_em, atualizadoEm: r.atualizado_em, criadoPor: r.criado_por, atualizadoPor: r.atualizado_por,
  // Campos derivados de JOIN, presentes apenas na listagem/ficha (ver getAll/getById).
  serieNome: r.serie_nome, serieSigla: r.serie_sigla, serieEspecie: r.serie_especie,
  unidadeOrigemNome: r.unidade_origem_nome, destinatarioUnidadeNome: r.destinatario_unidade_nome,
  solicitanteNome: r.solicitante_nome, interessadoNome: r.interessado_nome,
  processoNumero: r.processo_numero, programaSigla: r.programa_sigla,
});

const ATO_JOIN_SELECT = `
  SELECT a.*, s.nome AS serie_nome, s.sigla AS serie_sigla, s.especie AS serie_especie, s.formato AS serie_formato,
    uo.nome AS unidade_origem_nome, ud.nome AS destinatario_unidade_nome,
    sp.nome AS solicitante_nome, ip.nome AS interessado_nome,
    p.numero AS processo_numero, pr.sigla AS programa_sigla
  FROM atos a
  JOIN ato_series s ON s.id = a.serie_id
  LEFT JOIN unidades uo ON uo.id = a.unidade_origem_id
  LEFT JOIN unidades ud ON ud.id = a.destinatario_unidade_id
  LEFT JOIN pessoas sp ON sp.id = a.solicitante_pessoa_id
  LEFT JOIN pessoas ip ON ip.id = a.interessado_pessoa_id
  LEFT JOIN processos p ON p.id = a.processo_id
  LEFT JOIN programas pr ON pr.id = a.programa_id
`;

export const atosRepo = {
  async getById(id) {
    const { rows } = await query(`${ATO_JOIN_SELECT} WHERE a.id = $1`, [id]);
    return rows[0] ? atoFromRow(rows[0]) : null;
  },
  async getAll({ serie, ano, situacao, destinatario, solicitante, processo, programa, q } = {}) {
    const where = [];
    const params = [];
    if (serie) { params.push(serie); where.push(`a.serie_id = $${params.length}`); }
    if (ano) { params.push(Number(ano)); where.push(`a.ano = $${params.length}`); }
    if (situacao) { params.push(situacao); where.push(`a.situacao = $${params.length}`); }
    if (destinatario) { params.push(destinatario); where.push(`a.destinatario_unidade_id = $${params.length}`); }
    if (solicitante) { params.push(solicitante); where.push(`a.solicitante_pessoa_id = $${params.length}`); }
    if (processo) { params.push(processo); where.push(`a.processo_id = $${params.length}`); }
    if (programa) { params.push(programa); where.push(`a.programa_id = $${params.length}`); }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(a.assunto ILIKE $${params.length} OR a.titulo ILIKE $${params.length} OR a.destinatario_texto ILIKE $${params.length})`);
    }
    const sql = `${ATO_JOIN_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY a.ano DESC, a.sequencial DESC`;
    const { rows } = await query(sql, params);
    return rows.map(atoFromRow);
  },
  // Reserva o próximo número da série/ano de forma atômica (proximo_sequencial()
  // roda dentro da mesma transação do INSERT) e cria o ato em situação RESERVADO.
  async reservar({ serieId, ano, assunto, titulo, programaId, destinatarioUnidadeId, destinatarioTexto }, actor) {
    // solicitante_pessoa_id tem FK real para pessoas(id); `actor` é users.id
    // (nem sempre ligado a uma pessoa) — não usar como fallback aqui (mesmo
    // bug de FK já corrigido em B.2/declaracoes: ver PLANO.md).
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO atos (id, serie_id, ano, sequencial, situacao, assunto, titulo, programa_id,
         destinatario_unidade_id, destinatario_texto, criado_por, atualizado_por)
       VALUES ($1, $2, $3, proximo_sequencial($2, $3), 'RESERVADO', $4, $5, $6, $7, $8, $9, $9)`,
      [id, serieId, ano, assunto, titulo || null, programaId || null,
       destinatarioUnidadeId || null, destinatarioTexto || null, actor || null]
    );
    return this.getById(id);
  },
  // Cria já emitido (reserva + preenchimento num só passo — ver requisitos-expedientes.md §8).
  async create(data, actor) {
    const id = crypto.randomUUID();
    const ano = data.ano || new Date().getFullYear();
    await query(
      `INSERT INTO atos (id, serie_id, ano, sequencial, situacao, data, titulo, assunto, ementa,
         solicitante_pessoa_id, unidade_origem_id, destinatario_unidade_id, destinatario_texto,
         interessado_pessoa_id, processo_id, programa_id, arquivo_id, link_externo,
         vigencia_inicio, vigencia_fim, observacoes, criado_por, atualizado_por)
       VALUES ($1, $2, $3, proximo_sequencial($2, $3), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $21)`,
      [id, data.serieId, ano, data.situacao || 'EMITIDO', data.data || new Date().toISOString().slice(0, 10),
       data.titulo || null, data.assunto, data.ementa || null,
       data.solicitantePessoaId || null, data.unidadeOrigemId || null,
       data.destinatarioUnidadeId || null, data.destinatarioTexto || null,
       data.interessadoPessoaId || null, data.processoId || null, data.programaId || null,
       data.arquivoId || null, data.linkExterno || null,
       data.vigenciaInicio || null, data.vigenciaFim || null, data.observacoes || null, actor || null]
    );
    return this.getById(id);
  },
  async update(id, data, actor) {
    const { rows } = await query(
      `UPDATE atos SET
         data = COALESCE($2, data), titulo = COALESCE($3, titulo), assunto = COALESCE($4, assunto),
         ementa = COALESCE($5, ementa), solicitante_pessoa_id = $6, unidade_origem_id = $7,
         destinatario_unidade_id = $8, destinatario_texto = $9, interessado_pessoa_id = $10,
         processo_id = $11, programa_id = $12, arquivo_id = $13, link_externo = $14,
         vigencia_inicio = $15, vigencia_fim = $16, observacoes = $17,
         atualizado_em = now(), atualizado_por = $18
       WHERE id = $1 RETURNING id`,
      [id, data.data, data.titulo, data.assunto, data.ementa,
       data.solicitantePessoaId ?? null, data.unidadeOrigemId ?? null,
       data.destinatarioUnidadeId ?? null, data.destinatarioTexto ?? null, data.interessadoPessoaId ?? null,
       data.processoId ?? null, data.programaId ?? null, data.arquivoId ?? null, data.linkExterno ?? null,
       data.vigenciaInicio ?? null, data.vigenciaFim ?? null, data.observacoes ?? null, actor || null]
    );
    return rows[0] ? this.getById(id) : null;
  },
  async updateSituacao(id, { situacao, situacaoMotivo, publicado, data }, actor) {
    const { rows } = await query(
      `UPDATE atos SET situacao = $2, situacao_motivo = $3,
         data = COALESCE($4, data), publicado = COALESCE($5, publicado),
         atualizado_em = now(), atualizado_por = $6
       WHERE id = $1 RETURNING id`,
      [id, situacao, situacaoMotivo || null, data || null, publicado, actor || null]
    );
    return rows[0] ? this.getById(id) : null;
  },
  // Regra de negócio explícita (requisitos-expedientes.md §8): só se apaga um
  // RESERVADO. Um ato emitido nunca é apagado — é CANCELADO ou SEM_EFEITO.
  async remove(id) {
    const { rowCount } = await query(`DELETE FROM atos WHERE id = $1 AND situacao = 'RESERVADO'`, [id]);
    return rowCount > 0;
  },
  async getPublicados() {
    const { rows } = await query(`${ATO_JOIN_SELECT} WHERE a.publicado = TRUE ORDER BY a.ano DESC, a.sequencial DESC`);
    return rows.map(atoFromRow);
  },
};

export const atoReferenciasRepo = {
  async listByAto(atoId) {
    const { rows } = await query(
      `SELECT r.*, a.assunto AS ato_ref_assunto, a.ano AS ato_ref_ano, a.sequencial AS ato_ref_sequencial,
         s.sigla AS ato_ref_serie_sigla
       FROM ato_referencias r
       LEFT JOIN atos a ON a.id = r.ato_ref_id
       LEFT JOIN ato_series s ON s.id = a.serie_id
       WHERE r.ato_id = $1 ORDER BY r.criado_em ASC`,
      [atoId]
    );
    return rows;
  },
  // "É referenciado por" (§9.2) — derivada, ninguém digita: o mesmo vínculo,
  // lido no sentido inverso.
  async listByAtoRef(atoId) {
    const { rows } = await query(
      `SELECT r.*, a.assunto AS ato_assunto, a.ano AS ato_ano, a.sequencial AS ato_sequencial,
         s.sigla AS ato_serie_sigla
       FROM ato_referencias r
       JOIN atos a ON a.id = r.ato_id
       JOIN ato_series s ON s.id = a.serie_id
       WHERE r.ato_ref_id = $1 ORDER BY r.criado_em ASC`,
      [atoId]
    );
    return rows;
  },
  async create({ atoId, atoRefId, atoRefTexto, tipo }, actor) {
    const id = crypto.randomUUID();
    const { rows } = await query(
      `INSERT INTO ato_referencias (id, ato_id, ato_ref_id, ato_ref_texto, tipo, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, atoId, atoRefId || null, atoRefTexto || null, tipo, actor || null]
    );
    return rows[0];
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM ato_referencias WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

// Fase M (Expedição de diplomas em lote, requisitos-expedientes.md §9.4,
// caminho 2): a lista de concluintes cobertos por um único ofício.
export const diplomasRepo = {
  async listByAto(atoId) {
    const { rows } = await query(
      'SELECT id, ato_id, nome_concluinte, livro, ordem FROM ato_diplomas WHERE ato_id = $1 ORDER BY ordem ASC, id ASC',
      [atoId]
    );
    return rows.map((r) => ({ id: r.id, atoId: r.ato_id, nomeConcluinte: r.nome_concluinte, livro: r.livro, ordem: r.ordem }));
  },
  // Substitui a lista inteira (edição em lote é sempre "a lista de novo", não item a item).
  async setLista(atoId, lista) {
    await query('DELETE FROM ato_diplomas WHERE ato_id = $1', [atoId]);
    let ordem = 0;
    for (const item of lista ?? []) {
      if (!item?.nomeConcluinte || !String(item.nomeConcluinte).trim()) continue;
      await query(
        'INSERT INTO ato_diplomas (ato_id, nome_concluinte, livro, ordem) VALUES ($1,$2,$3,$4)',
        [atoId, item.nomeConcluinte.trim(), item.livro || null, ordem++]
      );
    }
    return this.listByAto(atoId);
  },
};

export const documentosRepo = {
  async getAll() {
    const { rows } = await query('SELECT * FROM documentos ORDER BY ordem ASC, titulo ASC');
    return rows;
  },
};
