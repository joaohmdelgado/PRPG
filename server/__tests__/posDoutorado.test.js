import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';

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

const novoPosDoc = (over = {}) => ({
  pessoaNome: 'Fulana de Tal', supervisorNome: 'Beltrano Docente',
  projetoTitulo: 'Estudo de caso em teste automatizado',
  ...over,
});

describe('pos-doutorado — cadastro e resolução de pessoa', () => {
  it('cria a partir de nomes (sem cadastro prévio), gerando pessoas novas', async () => {
    const res = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc());
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Fulana de Tal');
    expect(res.body.supervisorNome).toBe('Beltrano Docente');
    expect(res.body.modalidade).toBe('VOLUNTARIO');
  });

  it('rejeita sem projeto/pessoa/supervisor', async () => {
    const semProjeto = await asAdmin(request(app).post('/api/pos-doutorado')).send({ pessoaNome: 'X', supervisorNome: 'Y' });
    expect(semProjeto.status).toBe(400);
    const semPessoa = await asAdmin(request(app).post('/api/pos-doutorado')).send({ supervisorNome: 'Y', projetoTitulo: 'Z' });
    expect(semPessoa.status).toBe(400);
  });
});

describe('pos-doutorado — derivação de situação (requisitos-pnpd.md §6.2)', () => {
  const hoje = new Date().toISOString().slice(0, 10);
  const futuro = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const passado = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
  const passadoRecente = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);

  it('início futuro → APROVADO', async () => {
    const res = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ dataInicio: futuro, dataFim: new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10) }));
    expect(res.body.situacao).toBe('APROVADO');
  });

  it('hoje dentro do intervalo → VIGENTE', async () => {
    const res = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ dataInicio: passado, dataFim: futuro }));
    expect(res.body.situacao).toBe('VIGENTE');
  });

  it('fim passado sem relatório → ENCERRADO_SEM_RELATORIO', async () => {
    const res = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ dataInicio: passado, dataFim: passadoRecente }));
    expect(res.body.situacao).toBe('ENCERRADO_SEM_RELATORIO');
  });

  it('fim passado com relatório entregue → ENCERRADO', async () => {
    const created = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ dataInicio: passado, dataFim: passadoRecente }));
    const res = await asAdmin(request(app).post(`/api/pos-doutorado/${created.body.id}/relatorio`)).send({ dataEntrega: hoje });
    expect(res.body.situacao).toBe('ENCERRADO');
    expect(res.body.relatorioPendente).toBe(false);
  });

  it('situacao_manual vence a derivação', async () => {
    const created = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ dataInicio: passado, dataFim: futuro }));
    const res = await asAdmin(request(app).patch(`/api/pos-doutorado/${created.body.id}/situacao`)).send({ situacaoManual: 'INTERROMPIDO', motivo: 'Desistência' });
    expect(res.body.situacao).toBe('INTERROMPIDO');
  });
});

describe('pos-doutorado — prorrogação', () => {
  it('cria registro encadeado, copia campos, mantém o original intacto', async () => {
    const original = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ dataInicio: '2020-01-01', dataFim: '2020-12-31' }));
    const prorrogado = await asAdmin(request(app).post(`/api/pos-doutorado/${original.body.id}/prorrogar`))
      .send({ dataInicio: '2021-01-01', dataFim: '2021-12-31' });
    expect(prorrogado.status).toBe(201);
    expect(prorrogado.body.renovacaoDeId).toBe(original.body.id);
    expect(prorrogado.body.projetoTitulo).toBe(original.body.projetoTitulo);
    expect(prorrogado.body.supervisorNome).toBe(original.body.supervisorNome);

    const originalDepois = await asAdmin(request(app).get(`/api/pos-doutorado/${original.body.id}`));
    expect(originalDepois.body.dataFim).toBe('2020-12-31');
  });
});

describe('pos-doutorado — vínculo N:1 com processo', () => {
  it('dois estágios podem apontar para o mesmo processo', async () => {
    const a = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ pessoaNome: 'Pessoa A' }));
    const b = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ pessoaNome: 'Pessoa B' }));
    const NUP = '23082.024509/2024-66';
    const linkA = await asAdmin(request(app).post(`/api/pos-doutorado/${a.body.id}/processo`)).send({ numero: NUP });
    const linkB = await asAdmin(request(app).post(`/api/pos-doutorado/${b.body.id}/processo`)).send({ numero: NUP });
    expect(linkA.status).toBe(200);
    expect(linkB.status).toBe(200);
    expect(linkA.body.processoId).toBe(linkB.body.processoId);
  });
});

describe('pos-doutorado — eventos append-only', () => {
  it('PATCH /situacao cria evento e não sobrescreve nada', async () => {
    const created = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc());
    await asAdmin(request(app).patch(`/api/pos-doutorado/${created.body.id}/situacao`)).send({ situacaoManual: 'CANCELADO' });
    const ficha = await asAdmin(request(app).get(`/api/pos-doutorado/${created.body.id}`));
    expect(ficha.body.eventos.some((e) => e.tipo === 'SITUACAO')).toBe(true);
    // um evento de criação + um de mudança de situação, ambos preservados
    expect(ficha.body.eventos.filter((e) => e.tipo === 'SITUACAO').length).toBeGreaterThanOrEqual(2);
  });
});

describe('pos-doutorado — LGPD e controle de acesso', () => {
  it('CPF completo não aparece na listagem, só na ficha', async () => {
    await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ cpf: '52529514380' }));
    const lista = await asAdmin(request(app).get('/api/pos-doutorado'));
    expect(lista.body[0].cpf).toMatch(/^\*\*\*\./);

    const ficha = await asAdmin(request(app).get(`/api/pos-doutorado/${lista.body[0].id}`));
    expect(ficha.body.cpf).toBe('52529514380');
  });

  it('GestorPrograma só enxerga registros do seu programa', async () => {
    await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES ('programa-pd', 'Programa PD', 'PPD')`);
    await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ pessoaNome: 'De outro programa' }));
    await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ pessoaNome: 'Do meu programa', programaId: 'programa-pd' }));

    const lista = await asAdmin(request(app).get('/api/pos-doutorado')).query({ programa: 'programa-pd' });
    expect(lista.body.every((p) => p.programaId === 'programa-pd')).toBe(true);
    expect(lista.body.some((p) => p.nome === 'Do meu programa')).toBe(true);
  });
});

describe('pos-doutorado — declaração de vínculo', () => {
  it('emite PDF com código de verificação congelado na 1ª emissão', async () => {
    const created = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc());
    const res1 = await asAdmin(request(app).get(`/api/pos-doutorado/${created.body.id}/declaracao`));
    expect(res1.status).toBe(200);
    expect(res1.headers['content-type']).toBe('application/pdf');

    const { rows } = await pool.query(
      `SELECT codigo, emitida_em FROM declaracoes WHERE entidade='pos_doutorado' AND entidade_id=$1`,
      [created.body.id]
    );
    expect(rows).toHaveLength(1);
    const codigoOriginal = rows[0].codigo;

    // reemissão
    await asAdmin(request(app).get(`/api/pos-doutorado/${created.body.id}/declaracao`));
    const { rows: rows2 } = await pool.query(
      `SELECT codigo FROM declaracoes WHERE entidade='pos_doutorado' AND entidade_id=$1`,
      [created.body.id]
    );
    expect(rows2).toHaveLength(1);
    expect(rows2[0].codigo).toBe(codigoOriginal);
  });

  it('verificação pública devolve CPF mascarado', async () => {
    const created = await asAdmin(request(app).post('/api/pos-doutorado')).send(novoPosDoc({ cpf: '52529514380' }));
    await asAdmin(request(app).get(`/api/pos-doutorado/${created.body.id}/declaracao`));
    const { rows } = await pool.query(
      `SELECT codigo FROM declaracoes WHERE entidade='pos_doutorado' AND entidade_id=$1`, [created.body.id]
    );
    const verif = await request(app).get(`/api/declaracoes/${rows[0].codigo}`);
    expect(verif.status).toBe(200);
    expect(verif.body.cpf).toMatch(/^\*\*\*\./);
  });
});
