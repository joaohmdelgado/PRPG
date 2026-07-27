// Repositório manual do módulo Câmara de Pós-Graduação para as entidades que
// não são CRUD de tabela única (agregações e joins próprios) — ver
// requisitos-camara.md §7.1. As entidades de tabela única (processos,
// reuniões, unidades, atos) usam a fábrica createRepository em repositories.js.
import crypto from 'crypto';
import { query } from './pool.js';

const genId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

// Histórico append-only de tramitação do processo (§4, §7). Nunca é
// atualizado ou apagado — cada evento é um fato datado e imutável.
export const camaraEventosRepo = {
  async listByProcesso(processoId) {
    const { rows } = await query(
      'SELECT * FROM camara_eventos WHERE processo_id = $1 ORDER BY data ASC, criado_em ASC',
      [processoId]
    );
    return rows;
  },
  async create(data, actor) {
    const id = data.id || genId('cev');
    const { rows } = await query(
      `INSERT INTO camara_eventos
         (id, processo_id, tipo, data, unidade_id, descricao, reuniao_id, relatoria_id, anexo_url, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, data.processoId, data.tipo, data.data, data.unidadeId || null, data.descricao || null,
       data.reuniaoId || null, data.relatoriaId || null, data.anexoUrl || null, actor || null]
    );
    return rows[0];
  },
};

// Relação N:N processo <-> reunião (pauta). Substitui a cópia manual entre
// abas da planilha: repautar vira criar um vínculo, não recopiar o processo.
export const camaraPautaItensRepo = {
  async listByReuniao(reuniaoId) {
    const { rows } = await query(
      `SELECT pi.*, p.numero, p.assunto, p.status
         FROM camara_pauta_itens pi
         JOIN processos p ON p.id = pi.processo_id
        WHERE pi.reuniao_id = $1
        ORDER BY pi.ordem ASC, pi.criado_em ASC`,
      [reuniaoId]
    );
    return rows;
  },
  async listByProcesso(processoId) {
    const { rows } = await query(
      `SELECT pi.*, r.data AS reuniao_data, r.numero AS reuniao_numero
         FROM camara_pauta_itens pi
         JOIN camara_reunioes r ON r.id = pi.reuniao_id
        WHERE pi.processo_id = $1
        ORDER BY r.data DESC`,
      [processoId]
    );
    return rows;
  },
  async create(data, actor) {
    const id = data.id || genId('cpi');
    const { rows } = await query(
      `INSERT INTO camara_pauta_itens (id, reuniao_id, processo_id, ordem, bloco, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, data.reuniaoId, data.processoId, data.ordem ?? 0, data.bloco || null, actor || null]
    );
    return rows[0];
  },
  // Lançamento do resultado da deliberação (feito em lote após a reunião).
  async registrarResultado(id, { deliberacao, motivoSaida, registro }) {
    const { rows } = await query(
      `UPDATE camara_pauta_itens SET deliberacao = $1, motivo_saida = $2, registro = $3
       WHERE id = $4 RETURNING *`,
      [deliberacao || null, motivoSaida || null, registro || null, id]
    );
    return rows[0] || null;
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM camara_pauta_itens WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

// Designação de relatoria: histórico (um processo pode ter várias relatorias
// ao longo do tempo — troca de relator ocorre nos dados reais da planilha).
export const camaraRelatoriasRepo = {
  async listByProcesso(processoId) {
    const { rows } = await query(
      'SELECT * FROM camara_relatorias WHERE processo_id = $1 ORDER BY criado_em DESC',
      [processoId]
    );
    return rows;
  },
  async getAtiva(processoId) {
    const { rows } = await query(
      'SELECT * FROM camara_relatorias WHERE processo_id = $1 AND ativa = TRUE ORDER BY criado_em DESC LIMIT 1',
      [processoId]
    );
    return rows[0] || null;
  },
  async create(data, actor) {
    const id = data.id || genId('crel');
    const { rows } = await query(
      `INSERT INTO camara_relatorias
         (id, processo_id, relator_id, relator_nome, programa_id, data_designacao, prazo_devolucao, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, data.processoId, data.relatorId || null, data.relatorNome, data.programaId || null,
       data.dataDesignacao || null, data.prazoDevolucao || null, actor || null]
    );
    return rows[0];
  },
  // Devolução do parecer: a relatoria segue "ativa" (é o parecer vigente) até
  // ser explicitamente substituída — ver substituir().
  async registrarDevolucao(id, { dataDevolucao, resultadoParecer, parecerUrl }) {
    const { rows } = await query(
      `UPDATE camara_relatorias SET data_devolucao = $1, resultado_parecer = $2, parecer_url = $3
       WHERE id = $4 RETURNING *`,
      [dataDevolucao || null, resultadoParecer || null, parecerUrl || null, id]
    );
    return rows[0] || null;
  },
  async substituir(id, motivoSubstituicao) {
    const { rows } = await query(
      `UPDATE camara_relatorias SET ativa = FALSE, motivo_substituicao = $1 WHERE id = $2 RETURNING *`,
      [motivoSubstituicao || null, id]
    );
    return rows[0] || null;
  },
};
