import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin } from './helpers.js';
import { emitir, verificar } from '../services/declaracoes.js';

// DOC-01 (docs/analise-prontidao-producao-2026-09-09.md): uma entidade tem no
// máximo uma declaração ativa por tipo, mesmo com emissões simultâneas.
beforeEach(async () => {
  await resetDb();
  await seedAdmin();
});
afterAll(async () => { await pool.end(); });

const pedido = (dados = { nome: 'Fulana' }) => ({
  tipo: 'PROFICIENCIA', entidade: 'inscricao_proficiencia', entidadeId: 'insc-1', dados,
});

describe('emissão de declaração', () => {
  it('emissões simultâneas da mesma entidade geram um só código', async () => {
    // Aquece o pool (conexões já abertas), senão a 1ª emissão grava antes de as outras começarem.
    await Promise.all(Array.from({ length: 10 }, () => pool.query('SELECT pg_sleep(0.05)')));
    const emitidas = await Promise.all(Array.from({ length: 10 }, () => emitir(pedido(), 'admin-test')));
    expect(new Set(emitidas.map((d) => d.codigo)).size).toBe(1);
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM declaracoes WHERE entidade_id = 'insc-1' AND revogada_em IS NULL`);
    expect(rows[0].n).toBe(1);
  }, 20000);

  it('reemissão devolve o mesmo código; tipo ou entidade diferente é outra declaração', async () => {
    const a = await emitir(pedido(), 'admin-test');
    const b = await emitir(pedido({ nome: 'Fulana' }), 'admin-test');
    expect(b.codigo).toBe(a.codigo);
    const outroTipo = await emitir({ ...pedido(), tipo: 'VINCULO_DISCENTE' }, 'admin-test');
    const outraEntidade = await emitir({ ...pedido(), entidadeId: 'insc-2' }, 'admin-test');
    expect(new Set([a.codigo, outroTipo.codigo, outraEntidade.codigo]).size).toBe(3);
  });

  it('depois de revogada, uma nova emissão gera outro código e a antiga não verifica', async () => {
    const a = await emitir(pedido(), 'admin-test');
    await pool.query('UPDATE declaracoes SET revogada_em = now() WHERE codigo = $1', [a.codigo]);
    const b = await emitir(pedido(), 'admin-test');
    expect(b.codigo).not.toBe(a.codigo);
    expect(await verificar(a.codigo)).toBeNull();
    expect((await verificar(b.codigo))?.codigo).toBe(b.codigo);
  });
});
