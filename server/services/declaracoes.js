// Fase A.9 (G6, PLANO.md): serviço de emissão/verificação de declarações com
// código público (ver arquitetura-dados.md §5.7). Generaliza o padrão hoje
// existente só na proficiência (inscricoes_proficiencia.codigo_verificacao/
// emitida_em) — a migração da proficiência para usar isto é a Fase B.2,
// ainda não aplicada; nenhum módulo consome este serviço nesta fase.
import crypto from 'crypto';
import { query } from '../db/pool.js';

const fromRow = (r) => ({
  id: r.id, codigo: r.codigo, tipo: r.tipo, entidade: r.entidade, entidadeId: r.entidade_id,
  pessoaId: r.pessoa_id, dados: r.dados, emitidaEm: r.emitida_em, emitidaPor: r.emitida_por,
  validaAte: r.valida_ate, revogadaEm: r.revogada_em, revogadaMotivo: r.revogada_motivo,
});

// Emite (ou reemite, se já existir uma declaração ativa para a entidade)
// mantendo `codigo`/`emitidaEm` congelados na 1ª emissão — reemissões geram
// o mesmo PDF/QR, só atualizando o snapshot em `dados`.
export const emitir = async ({ tipo, entidade, entidadeId, pessoaId, dados, validaAte }, actor) => {
  const { rows: existentes } = await query(
    `SELECT * FROM declaracoes WHERE entidade = $1 AND entidade_id = $2 AND tipo = $3
     AND revogada_em IS NULL LIMIT 1`,
    [entidade, entidadeId, tipo]
  );
  if (existentes[0]) {
    const { rows } = await query(
      'UPDATE declaracoes SET dados = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(dados), existentes[0].id]
    );
    return fromRow(rows[0]);
  }
  const id = crypto.randomUUID();
  const codigo = crypto.randomUUID();
  const { rows } = await query(
    `INSERT INTO declaracoes (id, codigo, tipo, entidade, entidade_id, pessoa_id, dados, emitida_por, valida_ate)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [id, codigo, tipo, entidade, entidadeId, pessoaId || null, JSON.stringify(dados), actor || null, validaAte || null]
  );
  return fromRow(rows[0]);
};

// Verificação pública (rota sem autenticação, acessada pelo QR code). Uma
// declaração revogada não verifica — devolve null como se não existisse.
export const verificar = async (codigo) => {
  const { rows } = await query(
    'SELECT * FROM declaracoes WHERE codigo = $1 AND revogada_em IS NULL',
    [codigo]
  );
  return rows[0] ? fromRow(rows[0]) : null;
};
