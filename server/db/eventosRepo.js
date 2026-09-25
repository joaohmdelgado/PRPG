// Fase A.6 (G2, PLANO.md): linha do tempo append-only de qualquer entidade
// (ver arquitetura-dados.md §5.4). Sem update: um evento é um fato datado,
// não se corrige — corrige-se lançando outro evento. Sem consumidor ainda
// nesta fase (camara_eventos continua sendo a história da Câmara até a
// Fase B); esta tabela existe para os próximos módulos (E, C) usarem.
import crypto from 'crypto';
import { query } from './pool.js';
import { isEntidadeValida } from './core.js';

const fromRow = (r) => ({
  id: r.id, entidade: r.entidade, entidadeId: r.entidade_id, tipo: r.tipo,
  data: r.data, descricao: r.descricao, pessoaId: r.pessoa_id, unidadeId: r.unidade_id,
  arquivoId: r.arquivo_id, atoId: r.ato_id, origemTipo: r.origem_tipo, origemId: r.origem_id,
  dados: r.dados ?? {}, criadoEm: r.criado_em, criadoPor: r.criado_por,
});

export const eventosRepo = {
  async listByEntidade(entidade, entidadeId) {
    const { rows } = await query(
      `SELECT * FROM eventos WHERE entidade = $1 AND entidade_id = $2
       ORDER BY data DESC, criado_em DESC`,
      [entidade, entidadeId]
    );
    return rows.map(fromRow);
  },
  // Eventos de várias entidades numa consulta só (evita N+1 em listagens),
  // agrupados por entidade_id na mesma ordem de listByEntidade.
  async listByEntidades(entidade, ids) {
    const porId = new Map(ids.map((id) => [id, []]));
    if (ids.length === 0) return porId;
    const { rows } = await query(
      `SELECT * FROM eventos WHERE entidade = $1 AND entidade_id = ANY($2)
       ORDER BY data DESC, criado_em DESC`,
      [entidade, ids]
    );
    for (const r of rows) porId.get(r.entidade_id)?.push(fromRow(r));
    return porId;
  },
  async create(o, actor) {
    if (!isEntidadeValida(o.entidade)) {
      throw new Error(`Entidade inválida para eventos: ${o.entidade}`);
    }
    const id = o.id || crypto.randomUUID();
    const { rows } = await query(
      `INSERT INTO eventos
        (id, entidade, entidade_id, tipo, data, descricao, pessoa_id, unidade_id,
         arquivo_id, ato_id, origem_tipo, origem_id, dados, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [id, o.entidade, o.entidadeId, o.tipo, o.data, o.descricao || null,
       o.pessoaId || null, o.unidadeId || null, o.arquivoId || null, o.atoId || null,
       o.origemTipo || null, o.origemId || null, JSON.stringify(o.dados ?? {}), actor || null]
    );
    return fromRow(rows[0]);
  },
};
