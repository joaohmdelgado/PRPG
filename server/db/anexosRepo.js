// Fase A.5 (G5, PLANO.md): registro de arquivos enviados por /api/upload e o
// vinculo N:N (polimorfico) entre um arquivo e qualquer entidade. Ver
// arquitetura-dados.md §5.3 e §5.10 (justificativa do polimorfismo).
import crypto from 'crypto';
import fs from 'fs/promises';
import { query } from './pool.js';

// SHA-256 do arquivo em disco (integridade e deduplicação — Fase F.5).
export const sha256Arquivo = async (caminho) =>
  crypto.createHash('sha256').update(await fs.readFile(caminho)).digest('hex');

export const arquivosRepo = {
  // Registra um upload já salvo em disco pelo multer (server/routes/adminRoutes.js).
  async create({ url, nomeOriginal, mime, tamanhoBytes, enviadoPor, sha256 }) {
    const id = crypto.randomUUID();
    const { rows } = await query(
      `INSERT INTO arquivos (id, url, nome_original, mime, tamanho_bytes, enviado_por, sha256)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, url, nomeOriginal || null, mime || null, tamanhoBytes || null, enviadoPor || null, sha256 || null]
    );
    return rows[0];
  },
  async getById(id) {
    const { rows } = await query('SELECT * FROM arquivos WHERE id = $1', [id]);
    return rows[0] || null;
  },
  // Upload público (não sigiloso) já existente com o mesmo conteúdo.
  async findPublicoPorSha(sha256) {
    const { rows } = await query(
      `SELECT * FROM arquivos WHERE sha256 = $1 AND NOT sigiloso AND url LIKE '/uploads/%'
        ORDER BY enviado_em ASC LIMIT 1`,
      [sha256]
    );
    return rows[0] || null;
  },
};

export const anexosRepo = {
  async listByEntidade(entidade, entidadeId) {
    const { rows } = await query(
      `SELECT a.*, f.url, f.nome_original, f.mime, f.tamanho_bytes
         FROM anexos a JOIN arquivos f ON f.id = a.arquivo_id
        WHERE a.entidade = $1 AND a.entidade_id = $2
        ORDER BY a.ordem ASC, a.criado_em ASC`,
      [entidade, entidadeId]
    );
    return rows;
  },
  async create({ entidade, entidadeId, arquivoId, tipo, descricao, ordem }, actor) {
    const id = crypto.randomUUID();
    const { rows } = await query(
      `INSERT INTO anexos (id, entidade, entidade_id, arquivo_id, tipo, descricao, ordem, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, entidade, entidadeId, arquivoId, tipo || null, descricao || null, ordem ?? 0, actor || null]
    );
    return rows[0];
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM anexos WHERE id = $1', [id]);
    return rowCount > 0;
  },
};
