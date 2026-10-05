import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import router from '../routes/adminRoutes.js';
import { resetDb, seedAdmin, seedUser, login } from './helpers.js';

// SEC-01 (docs/analise-prontidao-producao-2026-09-09.md): toda rota de escrita
// da API, enumerada do próprio router, é negada a anônimo, Aluno e Professor.
// Rota nova sem checagem de papel quebra este teste; exceção é decisão
// explícita, com o motivo, numa das duas listas abaixo.

// Escritas abertas a anônimo por desenho.
const PUBLICAS = {
  'POST /login': 'autenticação',
  'POST /proficiencia/verificar-aluno': 'inscrição de proficiência sem login',
  'POST /proficiencia/inscricoes': 'inscrição de proficiência sem login',
  'POST /proficiencia/upload': 'comprovante da inscrição (armazenamento privado)',
  'POST /web-vitals': 'métricas anônimas de desempenho',
};

// Escritas que qualquer conta logada faz sobre si mesma; o controller restringe
// ao próprio usuário (coberto pelos testes de cada uma e pelo caso abaixo).
const AUTOATENDIMENTO = {
  'PUT /minha-conta': 'contato e privacidade da própria conta',
  'PUT /minha-conta/senha': 'troca da própria senha',
  'PUT /users/:id': 'troca forçada da senha provisória (só o próprio id)',
};

const ESCRITA = ['post', 'put', 'patch', 'delete'];
const rotas = router.stack
  .filter((camada) => camada.route)
  .flatMap((camada) => Object.keys(camada.route.methods)
    .filter((m) => ESCRITA.includes(m))
    .map((m) => ({ metodo: m, padrao: camada.route.path, chave: `${m.toUpperCase()} ${camada.route.path}` })));

const caminho = (padrao) => `/api${padrao.replace(/:\w+\??/g, 'nao-existe')}`;
const chamar = (r, token) => {
  const req = request(app)[r.metodo](caminho(r.padrao));
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send({});
};

const violacoes = async (token, aceitos, liberadas) => {
  const erradas = [];
  for (const r of rotas) {
    if (liberadas[r.chave]) continue;
    const res = await chamar(r, token);
    if (!aceitos.includes(res.status)) erradas.push(`${r.chave} -> ${res.status}`);
  }
  return erradas;
};

let tokens;
beforeAll(async () => {
  await resetDb();
  await seedAdmin();
  await seedUser({ id: 'al-m', email: 'al-m@t.br', roles: ['Aluno'], perfil_geral: { nome: 'Aluna' } });
  await seedUser({ id: 'pr-m', email: 'pr-m@t.br', roles: ['Professor'], perfil_geral: { nome: 'Prof' } });
  tokens = { Aluno: await login('al-m@t.br'), Professor: await login('pr-m@t.br') };
});
afterAll(async () => { await pool.end(); });

describe('matriz de autorização das rotas de escrita (SEC-01)', () => {
  it('enumera as rotas de escrita do router', () => {
    expect(rotas.length).toBeGreaterThan(100);
    expect(rotas.every((r) => typeof r.padrao === 'string')).toBe(true);
    for (const chave of [...Object.keys(PUBLICAS), ...Object.keys(AUTOATENDIMENTO)]) {
      expect(rotas.map((r) => r.chave), `exceção sem rota: ${chave}`).toContain(chave);
    }
  });

  it('anônimo recebe 401 em toda escrita não pública', async () => {
    expect(await violacoes(null, [401], PUBLICAS)).toEqual([]);
  });

  it.each(['Aluno', 'Professor'])('%s recebe 401/403 em toda escrita fora do autoatendimento', async (papel) => {
    expect(await violacoes(tokens[papel], [401, 403], { ...PUBLICAS, ...AUTOATENDIMENTO })).toEqual([]);
  });

  it('autoatendimento não alcança outra conta', async () => {
    const res = await request(app).put('/api/users/admin-test')
      .set('Authorization', `Bearer ${tokens.Aluno}`).send({ password: 'outraSenha123' });
    expect(res.status).toBe(403);
  });
});
