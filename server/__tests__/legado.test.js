import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, loginAdmin } from './helpers.js';

let adminToken;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

describe('Fase D — teses/dissertações', () => {
  it('D.1 resolve o autor via users.pessoa_id quando já existe pessoa vinculada', async () => {
    await seedUser({ id: 'autor-1', email: 'autor@test.com', roles: ['Aluno'], perfil_geral: { nome: 'Autor Teste' } });
    await pool.query(`INSERT INTO pessoas (id, nome, email_institucional) VALUES ('pessoa-autor-1', 'Pessoa do Autor', 'pessoa@test.com')`);
    await pool.query(`UPDATE users SET pessoa_id = 'pessoa-autor-1' WHERE id = 'autor-1'`);

    const res = await asAdmin(request(app).post('/api/teses-dissertacoes')).send({
      title: 'Dissertação Y', autorId: 'autor-1', tipo: 'Dissertação', ano: '2026-01-01',
    });
    expect(res.status).toBe(201);
    expect(res.body.autorPessoaId).toBe('pessoa-autor-1');

    const list = await asAdmin(request(app).get('/api/teses-dissertacoes'));
    expect(list.body[0].autor.nome).toBe('Pessoa do Autor');
  });

  it('D.1 faz backfill de uma pessoa quando o usuário selecionado ainda não tinha uma', async () => {
    await seedUser({ id: 'autor-2', email: 'autor2@test.com', roles: ['Aluno'], perfil_geral: { nome: 'Autor Sem Pessoa' } });

    const res = await asAdmin(request(app).post('/api/teses-dissertacoes')).send({
      title: 'Tese Z', autorId: 'autor-2', tipo: 'Tese', ano: '2026-01-01',
    });
    expect(res.status).toBe(201);
    expect(res.body.autorPessoaId).toBeTruthy();

    const { rows } = await pool.query('SELECT pessoa_id FROM users WHERE id = $1', ['autor-2']);
    expect(rows[0].pessoa_id).toBe(res.body.autorPessoaId);

    const { rows: pessoaRows } = await pool.query('SELECT nome FROM pessoas WHERE id = $1', [res.body.autorPessoaId]);
    expect(pessoaRows[0].nome).toBe('Autor Sem Pessoa');
  });

  it('D.1 arquivoUrl e tipo são persistidos com os novos nomes de coluna', async () => {
    await seedUser({ id: 'autor-3', email: 'autor3@test.com', roles: ['Aluno'], perfil_geral: { nome: 'Autor 3' } });
    const res = await asAdmin(request(app).post('/api/teses-dissertacoes')).send({
      title: 'Tese Arquivo', autorId: 'autor-3', tipo: 'Tese', ano: '2026-03-01', arquivoUrl: '/uploads/x.pdf',
    });
    expect(res.body.arquivoUrl).toBe('/uploads/x.pdf');
    expect(res.body.ano).toBe('2026-03-01');
  });
});

describe('Fase D — disciplinas', () => {
  it('D.2 resolve o docente e persiste os campos renomeados', async () => {
    await seedUser({ id: 'docente-1', email: 'docente@test.com', roles: ['Professor'], perfil_geral: { nome: 'Prof. Teste' } });
    const res = await asAdmin(request(app).post('/api/disciplinas')).send({
      title: 'Disciplina X', docenteId: 'docente-1', cargaHoraria: '60', tipoDisciplina: 'Obrigatória', ementaUrl: '/uploads/ementa.pdf',
    });
    expect(res.status).toBe(201);
    expect(res.body.docentePessoaId).toBeTruthy();
    expect(res.body.cargaHoraria).toBe('60');

    const list = await asAdmin(request(app).get('/api/disciplinas'));
    expect(list.body[0].docente.nome).toBe('Prof. Teste');
  });
});

describe('Fase D — bolsas', () => {
  it('D.3 resolve o beneficiário e usa data_inicio/data_fim como DATE', async () => {
    await seedUser({ id: 'aluno-bolsa-1', email: 'bolsa@test.com', roles: ['Aluno'], perfil_geral: { nome: 'Bolsista Teste' } });
    const res = await asAdmin(request(app).post('/api/bolsas')).send({
      title: 'Bolsa X', alunoId: 'aluno-bolsa-1', dataInicio: '2026-01-01', dataFim: '2026-12-31', tipoBolsa: 'CAPES',
    });
    expect(res.status).toBe(201);
    expect(res.body.pessoaId).toBeTruthy();
    expect(res.body.dataInicio).toBe('2026-01-01');

    const list = await asAdmin(request(app).get('/api/bolsas'));
    expect(list.body[0].aluno.nome).toBe('Bolsista Teste');
  });
});

describe('Fase D — faq', () => {
  it('D.4a persiste e lê pelo campo resposta', async () => {
    const res = await asAdmin(request(app).post('/api/faq')).send({ title: 'Pergunta?', resposta: '<p>Resposta</p>' });
    expect(res.status).toBe(201);
    expect(res.body.resposta).toBe('<p>Resposta</p>');
  });
});

describe('Fase D — grupos de pesquisa (líderes via vinculos)', () => {
  it('D.4b cria, substitui e remove líderes através de vinculos.grupo_pesquisa_id', async () => {
    await seedUser({ id: 'lider-a', email: 'lidera@test.com', roles: ['Professor'], perfil_geral: { nome: 'Líder A' } });
    await seedUser({ id: 'lider-b', email: 'liderb@test.com', roles: ['Professor'], perfil_geral: { nome: 'Líder B' } });

    const criado = await asAdmin(request(app).post('/api/grupos-pesquisa')).send({
      title: 'Grupo Y', body: { value: '<p>x</p>', summary: '' }, liderIds: ['lider-a'],
    });
    expect(criado.status).toBe(201);
    expect(criado.body.lideres).toHaveLength(1);
    expect(criado.body.lideres[0].nome).toBe('Líder A');

    const { rows } = await pool.query(
      `SELECT * FROM vinculos WHERE grupo_pesquisa_id = $1 AND papel = 'LIDER_GRUPO_PESQUISA'`,
      [criado.body.id]
    );
    expect(rows).toHaveLength(1);

    const atualizado = await asAdmin(request(app).put(`/api/grupos-pesquisa/${criado.body.id}`)).send({ liderIds: ['lider-b'] });
    expect(atualizado.body.lideres.map(l => l.nome)).toEqual(['Líder B']);

    const semLideres = await asAdmin(request(app).put(`/api/grupos-pesquisa/${criado.body.id}`)).send({ liderIds: [] });
    expect(semLideres.body.lideres).toHaveLength(0);
  });
});

describe('Fase D — editais (erratas/resultados via eventos)', () => {
  const novoEdital = async () => {
    const res = await asAdmin(request(app).post('/api/editais')).send({
      title: 'Edital Teste', categoryId: 'mestrado-doutorado', publishedAt: '2026-01-01',
      field_periodo: { data_inicio: '2026-01-01', data_fim: '2026-02-01' }, downloadLink: '/uploads/edital.pdf',
    });
    return res.body.id;
  };

  it('D.6 adiciona, lista e remove erratas como eventos append-only', async () => {
    const id = await novoEdital();

    const errata1 = await asAdmin(request(app).post(`/api/editais/${id}/erratas`)).send({ numero: '01', downloadLink: '/uploads/errata1.pdf' });
    expect(errata1.status).toBe(201);
    const errata2 = await asAdmin(request(app).post(`/api/editais/${id}/erratas`)).send({ numero: '02', downloadLink: '/uploads/errata2.pdf' });
    expect(errata2.status).toBe(201);

    const get1 = await asAdmin(request(app).get(`/api/editais/${id}`));
    expect(get1.body.erratas).toHaveLength(2);
    expect(get1.body.erratas.map(e => e.numero)).toEqual(['01', '02']);

    await asAdmin(request(app).delete(`/api/editais/${id}/erratas/${errata1.body.id}`));
    const get2 = await asAdmin(request(app).get(`/api/editais/${id}`));
    expect(get2.body.erratas).toHaveLength(1);
    expect(get2.body.erratas[0].numero).toBe('02');
  });

  it('D.6 define resultado parcial/final como o evento mais recente', async () => {
    const id = await novoEdital();

    const parcial = await asAdmin(request(app).put(`/api/editais/${id}/resultado-parcial`)).send({ downloadLink: '/uploads/parcial.pdf' });
    expect(parcial.status).toBe(201);
    const final = await asAdmin(request(app).put(`/api/editais/${id}/resultado-final`)).send({ downloadLink: '/uploads/final.pdf' });
    expect(final.status).toBe(201);

    const get = await asAdmin(request(app).get(`/api/editais/${id}`));
    expect(get.body.resultadoParcial).toBe('/uploads/parcial.pdf');
    expect(get.body.resultadoFinal).toBe('/uploads/final.pdf');

    // Reenviar substitui o valor efetivo (última evento vence), sem apagar o histórico.
    await asAdmin(request(app).put(`/api/editais/${id}/resultado-parcial`)).send({ downloadLink: '/uploads/parcial-v2.pdf' });
    const get2 = await asAdmin(request(app).get(`/api/editais/${id}`));
    expect(get2.body.resultadoParcial).toBe('/uploads/parcial-v2.pdf');

    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM eventos WHERE entidade='edital' AND entidade_id=$1 AND tipo='RESULTADO_PARCIAL'`, [id]);
    expect(rows[0].n).toBe(2);
  });

  it('D.6 a listagem pública de editais também inclui erratas/resultados derivados de eventos', async () => {
    const id = await novoEdital();
    await asAdmin(request(app).post(`/api/editais/${id}/erratas`)).send({ numero: '01', downloadLink: '/uploads/errata1.pdf' });

    const res = await request(app).get('/api/editais');
    expect(res.status).toBe(200);
    const edital = res.body.find(e => e.id === id);
    expect(edital.erratas).toHaveLength(1);
  });
});
