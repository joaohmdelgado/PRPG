// Fase A.8 (G4, PLANO.md): repositórios de ato_series/atos/ato_referencias/
// documentos. Infraestrutura nova, sem consumidor nesta fase — portarias,
// resolucoes, formularios e camara_atos continuam servindo o painel como
// antes até a Fase B migrar as telas.
import crypto from 'crypto';
import { query } from './pool.js';

export const atoSeriesRepo = {
  async getAll() {
    const { rows } = await query('SELECT * FROM ato_series ORDER BY ordem ASC, nome ASC');
    return rows;
  },
  async getById(id) {
    const { rows } = await query('SELECT * FROM ato_series WHERE id = $1', [id]);
    return rows[0] || null;
  },
};

const atoFromRow = (r) => ({
  id: r.id, serieId: r.serie_id, ano: r.ano, sequencial: r.sequencial,
  numeroExibicao: r.numero_exibicao, situacao: r.situacao, situacaoMotivo: r.situacao_motivo,
  data: r.data, titulo: r.titulo, assunto: r.assunto, ementa: r.ementa,
  solicitantePessoaId: r.solicitante_pessoa_id, unidadeOrigemId: r.unidade_origem_id,
  destinatarioUnidadeId: r.destinatario_unidade_id, destinatarioTexto: r.destinatario_texto,
  interessadoPessoaId: r.interessado_pessoa_id, processoId: r.processo_id,
  programaId: r.programa_id, arquivoId: r.arquivo_id, linkExterno: r.link_externo,
  vigenciaInicio: r.vigencia_inicio, vigenciaFim: r.vigencia_fim, publicado: r.publicado,
  secao: r.secao, categoria: r.categoria, observacoes: r.observacoes, obsOriginal: r.obs_original,
});

export const atosRepo = {
  async getById(id) {
    const { rows } = await query('SELECT * FROM atos WHERE id = $1', [id]);
    return rows[0] ? atoFromRow(rows[0]) : null;
  },
  // Reserva o proximo numero da serie/ano de forma atomica (ver proximo_sequencial()
  // no schema.sql) e cria o ato em situacao RESERVADO.
  async reservar({ serieId, ano, assunto, titulo, programaId }, actor) {
    const id = crypto.randomUUID();
    const { rows } = await query(
      `INSERT INTO atos (id, serie_id, ano, sequencial, situacao, assunto, titulo, programa_id, criado_por, atualizado_por)
       VALUES ($1, $2, $3, proximo_sequencial($2, $3), 'RESERVADO', $4, $5, $6, $7, $7)
       RETURNING *`,
      [id, serieId, ano, assunto, titulo || null, programaId || null, actor || null]
    );
    return atoFromRow(rows[0]);
  },
};

export const atoReferenciasRepo = {
  async listByAto(atoId) {
    const { rows } = await query('SELECT * FROM ato_referencias WHERE ato_id = $1 ORDER BY criado_em ASC', [atoId]);
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
};

export const documentosRepo = {
  async getAll() {
    const { rows } = await query('SELECT * FROM documentos ORDER BY ordem ASC, titulo ASC');
    return rows;
  },
};
