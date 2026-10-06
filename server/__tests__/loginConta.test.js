import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, loginAdmin } from './helpers.js';

// AUTH-02 ("proteção de login por conta+IP"): o limite por IP não impede quem
// troca de IP de testar senhas contra uma conta. 5 falhas em 15 min bloqueiam a
// conta por 15 min, de qualquer IP; e-mail inexistente recebe o mesmo tratamento.
beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  await seedUser({ id: 'u-1', email: 'ana@t.br', roles: ['Aluno'], password: 'senhaCerta123' });
});
afterAll(async () => { await pool.end(); });

const entrar = (username, password) => request(app).post('/api/login').send({ username, password });
const errar = async (email, vezes) => { for (let i = 0; i < vezes; i++) await entrar(email, `errada-${i}`); };

// Cada tentativa compara bcrypt (lento de propósito): até 10 logins por teste.
describe('bloqueio de login por conta', { timeout: 30000 }, () => {
  it('5 falhas seguidas bloqueiam a conta, inclusive para a senha certa (429)', async () => {
    await errar('ana@t.br', 4);
    expect((await entrar('ana@t.br', 'errada-x')).status).toBe(401);
    const bloqueado = await entrar('ana@t.br', 'senhaCerta123');
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.token).toBeUndefined();
    // Outra conta segue normal.
    expect((await entrar('admin@test.com', 'admin123')).status).toBe(200);
  });

  it('o e-mail é comparado sem diferença de caixa e espaços', async () => {
    await errar(' ANA@t.br ', 5);
    expect((await entrar('ana@t.br', 'senhaCerta123')).status).toBe(429);
  });

  it('login certo zera o contador', async () => {
    await errar('ana@t.br', 4);
    expect((await entrar('ana@t.br', 'senhaCerta123')).status).toBe(200);
    await errar('ana@t.br', 4);
    expect((await entrar('ana@t.br', 'senhaCerta123')).status).toBe(200);
  });

  it('e-mail que não existe é tratado igual (não revela quais contas existem)', async () => {
    await errar('ninguem@t.br', 4);
    expect((await entrar('ninguem@t.br', 'x')).status).toBe(401);
    expect((await entrar('ninguem@t.br', 'x')).status).toBe(429);
  });

  it('o bloqueio expira', async () => {
    await errar('ana@t.br', 5);
    expect((await entrar('ana@t.br', 'senhaCerta123')).status).toBe(429);
    await pool.query("UPDATE login_tentativas SET bloqueado_ate = now() - interval '1 second'");
    expect((await entrar('ana@t.br', 'senhaCerta123')).status).toBe(200);
  });

  it('falhas antigas (fora da janela de 15 min) não somam', async () => {
    await errar('ana@t.br', 4);
    await pool.query("UPDATE login_tentativas SET primeira_falha_em = now() - interval '16 minutes'");
    await errar('ana@t.br', 1);
    expect((await entrar('ana@t.br', 'senhaCerta123')).status).toBe(200);
  });

  it('gerar senha provisória pelo painel desbloqueia a conta', async () => {
    await errar('ana@t.br', 5);
    const res = await request(app).post('/api/users/u-1/senha-provisoria').set('Authorization', `Bearer ${await loginAdmin()}`);
    expect(res.status).toBe(200);
    expect((await entrar('ana@t.br', res.body.senhaProvisoria)).status).toBe(200);
  });
});
