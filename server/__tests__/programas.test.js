import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, loginAdmin } from './helpers.js';

let token;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  await seedUser({ id: 'coord-a', email: 'coorda@test.com', roles: ['Professor'], perfil_geral: { nome: 'Coordenador A', cpf: '111' } });
  await seedUser({ id: 'coord-b', email: 'coordb@test.com', roles: ['Professor'], perfil_geral: { nome: 'Coordenador B', cpf: '222' } });
  token = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

const novoPrograma = (over = {}) => ({
  nome: 'PPG Teste',
  sigla: 'ppgt',
  modalidades: [{ tipo: 'MESTRADO', ano_inicio: 2020, nota_capes: '4' }],
  coordenador_atual: { pessoa_id: 'coord-a', portaria: 'Port. 1' },
  ...over,
});

const createPrograma = async (over) => {
  const res = await auth(request(app).post('/api/programas')).send(novoPrograma(over));
  return res.body.id;
};

describe('programas — criação e leitura', () => {
  it('cria com modalidades e coordenador (usuário do sistema)', async () => {
    const res = await auth(request(app).post('/api/programas')).send(novoPrograma());
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
  });

  it('resolve coordenador, sigla em maiúsculas e modalidades no detalhe', async () => {
    const id = await createPrograma();
    const res = await auth(request(app).get(`/api/programas/${id}`));
    expect(res.status).toBe(200);
    expect(res.body.sigla).toBe('PPGT');
    expect(res.body.modalidades).toHaveLength(1);
    expect(res.body.coordenador_atual.nome).toBe('Coordenador A');
  });
});

describe('programas — filtro de campos sensíveis', () => {
  it('expõe CPF para admin, mas oculta para o público', async () => {
    const id = await createPrograma();

    const asAdmin = await auth(request(app).get(`/api/programas/${id}`));
    expect(asAdmin.body.coordenador_atual.cpf).toBe('111');

    const asPublic = await request(app).get(`/api/programas/${id}`);
    expect(asPublic.body.coordenador_atual.cpf).toBeUndefined();
    expect(asPublic.body.coordenador_atual.nome).toBe('Coordenador A');
  });
});

describe('programas — histórico de coordenadores', () => {
  it('ao trocar o coordenador, o anterior vai para o histórico', async () => {
    const id = await createPrograma();
    await auth(request(app).put(`/api/programas/${id}`)).send({
      coordenador_atual: { pessoa_id: 'coord-b', portaria: 'Port. 2' },
    });

    const res = await auth(request(app).get(`/api/programas/${id}`));
    expect(res.body.coordenador_atual.pessoa_id).toBe('coord-b');
    expect(res.body.historico_coordenadores).toHaveLength(1);
    expect(res.body.historico_coordenadores[0].pessoa_id).toBe('coord-a');
  });
});

describe('programas — exclusão em cascata', () => {
  it('remove modalidades e vínculos junto com o programa', async () => {
    const id = await createPrograma();
    const del = await auth(request(app).delete(`/api/programas/${id}`));
    expect(del.status).toBe(200);

    const get = await request(app).get(`/api/programas/${id}`);
    expect(get.status).toBe(404);

    const mod = await pool.query('SELECT count(*)::int AS n FROM modalidades WHERE programa_id = $1', [id]);
    const vin = await pool.query('SELECT count(*)::int AS n FROM vinculos WHERE programa_id = $1', [id]);
    expect(mod.rows[0].n).toBe(0);
    expect(vin.rows[0].n).toBe(0);
  });
});
