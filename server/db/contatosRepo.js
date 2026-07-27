// Fase A.5b (PLANO.md): CRUD da tabela `contatos` (polimórfica — ver
// arquitetura-dados.md §5.9/§5.10). Ainda sem consumidor nesta fase: os 8
// campos de contato hoje espalhados (pessoas/programas/vinculos) só migram
// para cá na Fase G, quando a tela de agenda existir.
import crypto from 'crypto';
import { query } from './pool.js';
import { normalizarEmail, normalizarTelefone, formatarTelefone } from '../utils/contato.js';

const fromRow = (r) => ({
  id: r.id, entidade: r.entidade, entidadeId: r.entidade_id, tipo: r.tipo,
  valor: r.valor, valorExibicao: r.valor_exibicao, rotulo: r.rotulo,
  vinculoId: r.vinculo_id, principal: r.principal, publico: r.publico,
  observacao: r.observacao, ordem: r.ordem,
});

// Normaliza `valor` conforme o tipo (EMAIL vs telefone/celular/whatsapp/ramal).
const normalizar = (tipo, valor) => {
  if (tipo === 'EMAIL') return { valor: normalizarEmail(valor), valorExibicao: valor || null };
  if (['TELEFONE', 'CELULAR', 'WHATSAPP', 'RAMAL'].includes(tipo)) {
    const digitos = normalizarTelefone(valor);
    return { valor: digitos, valorExibicao: formatarTelefone(digitos) };
  }
  return { valor: (valor || '').trim() || null, valorExibicao: valor || null };
};

export const contatosRepo = {
  async listByEntidade(entidade, entidadeId) {
    const { rows } = await query(
      `SELECT * FROM contatos WHERE entidade = $1 AND entidade_id = $2
       ORDER BY ordem ASC, criado_em ASC`,
      [entidade, entidadeId]
    );
    return rows.map(fromRow);
  },
  async create(o, actor) {
    const id = o.id || crypto.randomUUID();
    const { valor, valorExibicao } = normalizar(o.tipo, o.valor);
    const { rows } = await query(
      `INSERT INTO contatos
        (id, entidade, entidade_id, tipo, valor, valor_exibicao, rotulo, vinculo_id,
         principal, publico, observacao, ordem, criado_por, atualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) RETURNING *`,
      [id, o.entidade, o.entidadeId, o.tipo, valor, valorExibicao, o.rotulo || null,
       o.vinculoId || null, !!o.principal, !!o.publico, o.observacao || null, o.ordem ?? 0, actor || null]
    );
    return fromRow(rows[0]);
  },
  async update(id, o, actor) {
    const { valor, valorExibicao } = normalizar(o.tipo, o.valor);
    const { rows } = await query(
      `UPDATE contatos SET tipo=$1, valor=$2, valor_exibicao=$3, rotulo=$4, vinculo_id=$5,
         principal=$6, publico=$7, observacao=$8, ordem=$9, atualizado_por=$10, atualizado_em=now()
       WHERE id=$11 RETURNING *`,
      [o.tipo, valor, valorExibicao, o.rotulo || null, o.vinculoId || null,
       !!o.principal, !!o.publico, o.observacao || null, o.ordem ?? 0, actor || null, id]
    );
    return rows[0] ? fromRow(rows[0]) : null;
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM contatos WHERE id = $1', [id]);
    return rowCount > 0;
  },
};
