// Fase B.5 (G10, PLANO.md): leitura do vocabulário consultável — ver
// arquitetura-dados.md §5.11. Sem consumidor de validação ainda nesta fase;
// os controllers seguem validando com os `const` atuais (migrar a validação
// em si é trabalho de cada domínio, quando precisar).
import { query } from './pool.js';

const fromRow = (r) => ({
  id: r.id, dominio: r.dominio, valor: r.valor, rotulo: r.rotulo, cor: r.cor,
  ordem: r.ordem, ativo: r.ativo, programaId: r.programa_id, meta: r.meta ?? {},
});

export const vocabulariosRepo = {
  async getByDominio(dominio, programaId) {
    const { rows } = await query(
      `SELECT * FROM vocabularios
       WHERE dominio = $1 AND ativo = TRUE AND (programa_id IS NULL OR programa_id = $2)
       ORDER BY ordem ASC, rotulo ASC`,
      [dominio, programaId || null]
    );
    return rows.map(fromRow);
  },
};
