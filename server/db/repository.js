import { query } from './pool.js';

// Fábrica de repositório para entidades de tabela única.
// - fromRow: converte uma linha do banco (snake_case) no JSON camelCase do app
// - toRow:   converte o JSON do app no objeto de colunas para o banco
// O update faz merge com o registro existente, preservando o comportamento
// antigo ({ ...existente, ...req.body }) dos controllers baseados em JSON.
export function createRepository({ table, fromRow, toRow, orderBy = 'id ASC' }) {
  const repo = {
    async getAll() {
      const { rows } = await query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
      return rows.map(fromRow);
    },

    async getById(id) {
      const { rows } = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      return rows[0] ? fromRow(rows[0]) : null;
    },

    async create(obj) {
      const row = toRow(obj);
      const keys = Object.keys(row);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const { rows } = await query(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        keys.map((k) => row[k])
      );
      return fromRow(rows[0]);
    },

    async update(id, partial) {
      const existing = await repo.getById(id);
      if (!existing) return null;
      const merged = { ...existing, ...partial };
      const row = toRow(merged);
      delete row.id; // a PK não é atualizada
      const keys = Object.keys(row);
      const set = keys.map((k, i) => `${k} = $${i + 1}`);
      const { rows } = await query(
        `UPDATE ${table} SET ${set.join(', ')} WHERE id = $${keys.length + 1} RETURNING *`,
        [...keys.map((k) => row[k]), id]
      );
      return rows[0] ? fromRow(rows[0]) : null;
    },

    async remove(id) {
      const { rowCount } = await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      return rowCount > 0;
    },
  };
  return repo;
}
