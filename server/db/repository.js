import { query } from './pool.js';
import { STATUS_PUBLICACAO } from '../utils/publicacao.js';
import { registrarRevisao, apagarRevisoes } from './revisoesRepo.js';
import { apagarReferenciasDaTabela } from './referenciasRepo.js';

// Conflito de edição (Fase F.2): outra pessoa salvou o registro depois que
// este cliente o carregou. O tratador global responde 409 com a mensagem.
export class ConflitoEdicao extends Error {
  constructor() {
    super('Este item foi alterado por outra pessoa depois que você o abriu. Recarregue a página para ver a versão atual antes de salvar.');
    this.status = 409;
    this.expose = true;
  }
}

// Fábrica de repositório para entidades de tabela única.
// - fromRow: converte uma linha do banco (snake_case) no JSON camelCase do app
// - toRow:   converte o JSON do app no objeto de colunas para o banco
// - publicavel: a tabela tem o envelope de publicação (Fase F.1 — status,
//   publicado_em, criado_em, atualizado_em); a fábrica mapeia essas colunas
//   sem que cada fromRow/toRow precise repeti-las, e guarda a versão anterior
//   a cada update (histórico — Fase F.7, ver revisoesRepo.js).
// O update faz merge com o registro existente, preservando o comportamento
// antigo ({ ...existente, ...req.body }) dos controllers baseados em JSON.
export function createRepository({ table, fromRow, toRow, orderBy = 'id ASC', publicavel = false }) {
  // Anexa os campos de auditoria (Fase 3) à saída sem precisar tocar cada fromRow.
  const decorate = (row) => {
    const out = {
      ...fromRow(row),
      criado_por: row.criado_por ?? null,
      atualizado_por: row.atualizado_por ?? null,
    };
    if (publicavel) {
      out.status = row.status;
      out.publicadoEm = row.publicado_em ?? null;
      out.criado_em = row.criado_em ?? null;
      out.atualizado_em = row.atualizado_em ?? null;
    }
    return out;
  };

  // Colunas do envelope a partir do objeto do app (só as informadas).
  const envelopeRow = (obj) => {
    const row = {};
    if (!publicavel) return row;
    if (STATUS_PUBLICACAO.includes(obj.status)) row.status = obj.status;
    if (obj.publicadoEm !== undefined) row.publicado_em = obj.publicadoEm || null;
    return row;
  };

  const repo = {
    async getAll() {
      const { rows } = await query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
      return rows.map(decorate);
    },

    async getById(id) {
      const { rows } = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      return rows[0] ? decorate(rows[0]) : null;
    },

    async create(obj, actor) {
      const row = { ...toRow(obj), ...envelopeRow(obj) };
      if (actor) { row.criado_por = actor; row.atualizado_por = actor; }
      const keys = Object.keys(row);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const { rows } = await query(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        keys.map((k) => row[k])
      );
      return decorate(rows[0]);
    },

    // `partial._versao` (o atualizado_em que o cliente carregou) ativa a
    // checagem de edição concorrente: o UPDATE só acontece se ninguém salvou
    // no meio — a condição vai no próprio WHERE, sem janela entre ler e gravar.
    async update(id, partial, actor) {
      const existing = await repo.getById(id);
      if (!existing) return null;
      const { _versao: versao, ...dados } = partial;
      const merged = { ...existing, ...dados };
      const row = { ...toRow(merged), ...envelopeRow(merged) };
      delete row.id; // a PK não é atualizada
      if (actor) row.atualizado_por = actor; // criado_por é preservado (fora do SET)
      const keys = Object.keys(row);
      const set = keys.map((k, i) => `${k} = $${i + 1}`);
      const params = [...keys.map((k) => row[k]), id];
      let where = `id = $${keys.length + 1}`;
      if (publicavel && versao) {
        params.push(versao);
        where += ` AND date_trunc('milliseconds', atualizado_em) IS NOT DISTINCT FROM date_trunc('milliseconds', $${params.length}::timestamptz)`;
      }
      const { rows } = await query(`UPDATE ${table} SET ${set.join(', ')} WHERE ${where} RETURNING *`, params);
      if (!rows[0] && publicavel && versao) throw new ConflitoEdicao();
      if (!rows[0]) return null;
      const atualizado = decorate(rows[0]);
      if (publicavel) await registrarRevisao(table, existing, atualizado);
      return atualizado;
    },

    async remove(id) {
      const { rowCount } = await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      if (rowCount > 0 && publicavel) {
        await apagarRevisoes(table, id);
        await apagarReferenciasDaTabela(table, id); // "Relacionados" (Fase N.5)
      }
      return rowCount > 0;
    },

    // Para repositórios que estendem este (ex.: pagesRepo) reaproveitarem o mapeamento.
    _decorate: decorate,
  };
  return repo;
}
