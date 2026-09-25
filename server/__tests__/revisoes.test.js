import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, login } from './helpers.js';
import { MAX_REVISOES } from '../db/revisoesRepo.js';

// Fase F.7 (docs/revisao-portal-conteudo-2026-09-24.md): histórico de
// versões do conteúdo publicável e restauração.

let adminToken;
const auth = (req, token = adminToken) => req.set('Authorization', `Bearer ${token}`);

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const historico = async (entidade, id, token) =>
  auth(request(app).get(`/api/revisoes/${entidade}/${id}`), token);

describe('F.7 — histórico de versões', () => {
  it('cada salvamento guarda a versão anterior, com autor e data', async () => {
    await auth(request(app).post('/api/news')).send({ id: 'n1', title: 'V1', excerpt: 'a' });
    await auth(request(app).put('/api/news/n1')).send({ title: 'V2' });
    await auth(request(app).put('/api/news/n1')).send({ title: 'V3' });

    const res = await historico('news', 'n1');
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.titulo)).toEqual(['V2', 'V1']); // mais recente primeiro
    expect(res.body[0].autor).toBe('admin-test');
    expect(res.body[0].autorNome).toBe('Admin Teste');
    expect(res.body[0].versaoDe).toBeTruthy();
    expect(res.body[0]).not.toHaveProperty('snapshot'); // a lista não traz o conteúdo

    const rev = await auth(request(app).get(`/api/revisoes/news/n1/${res.body[1].id}`));
    expect(rev.status).toBe(200);
    expect(rev.body.snapshot).toMatchObject({ id: 'n1', title: 'V1', excerpt: 'a' });
  });

  it('salvar sem mudar nada não cria versão', async () => {
    await auth(request(app).post('/api/faq')).send({ id: 'q1', title: 'Q', resposta: '<p>r</p>' });
    await auth(request(app).put('/api/faq/q1')).send({ title: 'Q' });
    expect((await historico('faq', 'q1')).body).toEqual([]);
  });

  it('restaurar devolve o conteúdo, mas mantém situação e endereço — e pode ser desfeito', async () => {
    const criada = await auth(request(app).post('/api/pages')).send({ title: 'Sobre', body: { value: '<p>antigo</p>' } });
    const id = criada.body.id;
    const slug = criada.body.slug;
    await auth(request(app).put(`/api/pages/${id}`)).send({ body: { value: '<p>novo</p>' }, status: 'RASCUNHO' });

    const [rev] = (await historico('pages', id)).body;
    const res = await auth(request(app).post(`/api/revisoes/pages/${id}/${rev.id}/restaurar`)).send({});
    expect(res.status).toBe(200);
    expect(res.body.body.value).toBe('<p>antigo</p>');
    expect(res.body.status).toBe('RASCUNHO'); // a situação atual não volta junto
    expect(res.body.slug).toBe(slug);

    // A versão que estava antes da restauração também foi guardada.
    const depois = (await historico('pages', id)).body;
    expect(depois).toHaveLength(2);
    const ultima = await auth(request(app).get(`/api/revisoes/pages/${id}/${depois[0].id}`));
    expect(ultima.body.snapshot.body.value).toBe('<p>novo</p>');
  });

  it('restaurar respeita a edição concorrente (_versao)', async () => {
    await auth(request(app).post('/api/news')).send({ id: 'n1', title: 'V1' });
    await auth(request(app).put('/api/news/n1')).send({ title: 'V2' });
    const [rev] = (await historico('news', 'n1')).body;
    const res = await auth(request(app).post(`/api/revisoes/news/n1/${rev.id}/restaurar`))
      .send({ _versao: '2000-01-01T00:00:00.000Z' });
    expect(res.status).toBe(409);
  });

  it('calendário (repositório próprio) também guarda versões, com marcos', async () => {
    await auth(request(app).post('/api/calendarios')).send({ id: 'c1', ano: 2026, title: 'Cal', milestones: [{ event: 'M1', date: '2026-01-01' }] });
    await auth(request(app).put('/api/calendarios/c1')).send({ title: 'Cal 2', milestones: [] });
    const [rev] = (await historico('calendarios', 'c1')).body;
    const res = await auth(request(app).post(`/api/revisoes/calendarios/c1/${rev.id}/restaurar`)).send({});
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Cal');
    expect(res.body.milestones).toHaveLength(1);
  });

  it(`guarda no máximo ${MAX_REVISOES} versões por item e apaga o histórico junto com o item`, async () => {
    await auth(request(app).post('/api/news')).send({ id: 'n1', title: 'V0' });
    for (let i = 1; i <= MAX_REVISOES + 2; i++) {
      await auth(request(app).put('/api/news/n1')).send({ title: `V${i}` });
    }
    const lista = (await historico('news', 'n1')).body;
    expect(lista).toHaveLength(MAX_REVISOES);
    expect(lista.at(-1).titulo).toBe('V2'); // V0 e V1 saíram

    await auth(request(app).delete('/api/news/n1'));
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM revisoes WHERE entidade = 'news'");
    expect(rows[0].n).toBe(0);
  }, 30000); // ~32 salvamentos seguidos: passa do timeout padrão (5s) com o Docker lento

  it('revisão de outro item ou tipo desconhecido: 404', async () => {
    await auth(request(app).post('/api/news')).send({ id: 'n1', title: 'A' });
    await auth(request(app).post('/api/news')).send({ id: 'n2', title: 'B' });
    await auth(request(app).put('/api/news/n1')).send({ title: 'A2' });
    const [rev] = (await historico('news', 'n1')).body;
    expect((await auth(request(app).get(`/api/revisoes/news/n2/${rev.id}`))).status).toBe(404);
    expect((await auth(request(app).post(`/api/revisoes/news/n2/${rev.id}/restaurar`))).status).toBe(404);
    expect((await historico('users', 'admin')).status).toBe(404);
    expect((await historico('news', 'nao-existe')).status).toBe(404);
  });

  it('acesso: público não vê; gestor de programa só o do próprio programa e nada global', async () => {
    const criarProg = async (nome, slug) =>
      (await auth(request(app).post('/api/programas')).send({ nome, slug, microsite_ativo: true })).body.id;
    const a = await criarProg('Prog A', 'pa');
    const b = await criarProg('Prog B', 'pb');
    await auth(request(app).post('/api/users')).send({ email: 'ga@x.br', password: 'senha123', roles: ['GestorPrograma'], programaId: a });
    const tokenA = await login('ga@x.br');
    await auth(request(app).post('/api/news')).send({ id: 'na', title: 'A', programaId: a });
    await auth(request(app).post('/api/news')).send({ id: 'nb', title: 'B', programaId: b });
    await auth(request(app).post('/api/bolsas')).send({ id: 'b1', title: 'Bolsa' });

    expect((await request(app).get('/api/revisoes/news/na')).status).toBe(401);
    expect((await historico('news', 'na', tokenA)).status).toBe(200);
    expect((await historico('news', 'nb', tokenA)).status).toBe(403);
    expect((await historico('bolsas', 'b1', tokenA)).status).toBe(403);
  });
});
