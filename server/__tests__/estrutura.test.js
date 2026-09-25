import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, loginAdmin, login } from './helpers.js';
import { garantirEstruturaPrpg } from '../db/estruturaPrpg.js';

// Fase H.4 (docs/revisao-portal-conteudo-2026-09-24.md): Equipe e Estrutura
// Organizacional a partir de unidades + vinculos + contatos.

let adminToken;
const auth = (req, token = adminToken) => req.set('Authorization', `Bearer ${token}`);

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
  // `unidades` não é esvaziada entre testes (seed persistente); a carga
  // inicial roda de novo porque os vínculos foram apagados.
  await garantirEstruturaPrpg();
});

afterAll(async () => {
  await pool.end();
});

const setor = (raiz, id) => raiz.filhos.find((f) => f.id === id);

describe('H.4 — estrutura pública', () => {
  it('carga inicial: raiz PRPG, setores na ordem, pessoas e contatos públicos', async () => {
    expect(await garantirEstruturaPrpg()).toBe(0); // já carregada: não repete

    const res = await request(app).get('/api/estrutura');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'prpg', nome: 'Pró-Reitoria de Pós-Graduação' });
    expect(res.body.membros[0]).toMatchObject({ nome: 'Rinaldo Aparecido Mota', funcao: 'Pró-Reitor' });
    expect(res.body.filhos[0].id).toBe('prpg-secretaria');
    expect(setor(res.body, 'prpg-dadm')).toBeUndefined(); // fora do site
    const fin = setor(res.body, 'prpg-financeiro');
    expect(fin.contatos.map((c) => c.exibicao)).toContain('financeiro.prpg@ufrpe.br');
  });

  it('vínculo encerrado e contato não público não aparecem', async () => {
    const raiz = (await request(app).get('/api/estrutura')).body;
    const diego = setor(raiz, 'coord-stricto-excelencia').membros.find((m) => m.nome.startsWith('Diego'));
    await auth(request(app).delete(`/api/estrutura/membros/${diego.id}`));
    await auth(request(app).put('/api/estrutura/unidades/prpg-financeiro'))
      .send({ contatos: [{ tipo: 'EMAIL', valor: 'interno@ufrpe.br', publico: false }] });

    const depois = (await request(app).get('/api/estrutura')).body;
    expect(setor(depois, 'coord-stricto-excelencia').membros.map((m) => m.nome)).not.toContain(diego.nome);
    expect(setor(depois, 'prpg-financeiro').contatos).toEqual([]);
    // O painel (todos=1) ainda vê o contato interno.
    const painel = (await auth(request(app).get('/api/estrutura?todos=1'))).body;
    expect(setor(painel, 'prpg-financeiro').contatos[0]).toMatchObject({ exibicao: 'interno@ufrpe.br', publico: false });
  });
});

describe('H.4 — edição no painel', () => {
  it('adiciona pessoa com função e contatos, edita e reordena', async () => {
    const add = await auth(request(app).post('/api/estrutura/unidades/prpg-lato-sensu/membros')).send({
      nome: 'Fulana de Tal', papel: 'SECRETARIO', funcao: 'Secretária', ordem: 5,
      contatos: [{ tipo: 'EMAIL', valor: 'fulana@ufrpe.br' }],
    });
    expect(add.status).toBe(201);
    const fulana = setor(add.body, 'prpg-lato-sensu').membros.find((m) => m.nome === 'Fulana de Tal');
    expect(fulana.contatos[0].exibicao).toBe('fulana@ufrpe.br');

    const put = await auth(request(app).put(`/api/estrutura/membros/${fulana.id}`))
      .send({ funcao: 'Secretária executiva', ordem: 0, contatos: [] });
    const editada = setor(put.body, 'prpg-lato-sensu').membros[0];
    expect(editada).toMatchObject({ nome: 'Fulana de Tal', funcao: 'Secretária executiva', contatos: [] });
  });

  it('cria setor, edita descrição e esconde do site', async () => {
    const res = await auth(request(app).post('/api/estrutura/unidades')).send({ nome: 'Núcleo Novo', descricao: 'x' });
    const novo = res.body.filhos.find((f) => f.nome === 'Núcleo Novo');
    expect(novo).toBeTruthy();
    await auth(request(app).put(`/api/estrutura/unidades/${novo.id}`)).send({ descricao: 'Nova descrição', exibirNoSite: false });
    expect(setor((await request(app).get('/api/estrutura')).body, novo.id)).toBeUndefined();
    await pool.query('DELETE FROM unidades WHERE id = $1', [novo.id]); // `unidades` não é resetada
  });

  it('valida e restringe a Admin/Gestor; setor fora da PRPG é 404', async () => {
    await seedUser({ id: 'u1', email: 'prof@x.br', roles: ['Professor'] });
    const token = await login('prof@x.br');
    expect((await auth(request(app).post('/api/estrutura/unidades/prpg/membros'), token).send({ nome: 'X' })).status).toBe(403);
    expect((await auth(request(app).post('/api/estrutura/unidades/prpg/membros')).send({ nome: '' })).status).toBe(400);
    expect((await auth(request(app).post('/api/estrutura/unidades/prpg/membros')).send({ nome: 'X', papel: 'REI' })).status).toBe(400);
    expect((await auth(request(app).put('/api/estrutura/unidades/reitoria')).send({ descricao: 'x' })).status).toBe(404);
    expect((await auth(request(app).put('/api/estrutura/unidades/prpg')).send({ contatos: [{ tipo: 'FAX', valor: '1' }] })).status).toBe(400);
  });
});
