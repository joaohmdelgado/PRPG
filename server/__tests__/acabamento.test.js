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
const NUP = '23082.444444/2026-01';

describe('Fase L — artefatos da Câmara', () => {
  it('L.1 gera minuta de ata em PDF', async () => {
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: NUP, assunto: 'Processo L' });
    const reuniao = await asAdmin(request(app).post('/api/camara/reunioes')).send({ data: '2026-08-01' });
    await asAdmin(request(app).post(`/api/camara/reunioes/${reuniao.body.id}/pauta`)).send({ processoIds: [proc.body.id] });
    await asAdmin(request(app).put(`/api/camara/reunioes/${reuniao.body.id}/resultados`)).send({
      itens: [{ id: (await asAdmin(request(app).get(`/api/camara/reunioes/${reuniao.body.id}/pauta`))).body[0].id, deliberacao: 'APROVADO', registro: 'Aprovado por unanimidade.' }],
    });
    const res = await asAdmin(request(app).get(`/api/camara/reunioes/${reuniao.body.id}/ata.pdf`));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  it('L.2 gera espelho do processo com QR e verificação pública', async () => {
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: NUP, assunto: 'Processo espelho' });
    const res = await asAdmin(request(app).get(`/api/camara/processos/${proc.body.id}/espelho.pdf`));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');

    const { rows } = await pool.query(`SELECT codigo FROM declaracoes WHERE tipo = 'espelho_processo' AND entidade_id = $1`, [proc.body.id]);
    expect(rows).toHaveLength(1);
    const verif = await request(app).get(`/api/declaracoes/${rows[0].codigo}`);
    expect(verif.status).toBe(200);
    expect(verif.body.numero).toBe(NUP);
  });

  it('L.3 gera extrato de encaminhamento ao CEPE/SEG', async () => {
    const res = await asAdmin(request(app).get('/api/camara/extrato-encaminhamento.pdf'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  it('L.4 "meus processos" retorna só os processos do relator autenticado', async () => {
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: NUP, assunto: 'Meu processo' });
    await pool.query(
      `INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, prazo_devolucao, ativa, criado_em)
       VALUES ('rel-meu-1', $1, 'admin-test', 'Admin Teste', '2026-09-01', TRUE, now())`,
      [proc.body.id]
    );
    const res = await asAdmin(request(app).get('/api/camara/meus-processos'));
    expect(res.status).toBe(200);
    expect(res.body.some((p) => p.numero === NUP)).toBe(true);
  });

  it('L.5 designar relator envia e-mail de designação (registrado em notificacoes)', async () => {
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: NUP, assunto: 'Processo relatoria' });
    await pool.query(`INSERT INTO pessoas (id, nome, email_institucional) VALUES ('pessoa-rel-l5', 'Relator L5', 'relatorl5@teste.com')`);
    await asAdmin(request(app).post(`/api/camara/processos/${proc.body.id}/relatorias`))
      .send({ relatorId: 'pessoa-rel-l5', relatorNome: 'Relator L5', prazoDevolucao: '2026-09-15' });

    const { rows } = await pool.query(`SELECT * FROM notificacoes WHERE tipo = 'RELATORIA_DESIGNADA'`);
    expect(rows).toHaveLength(1);
    expect(rows[0].destinatario_email).toBe('relatorl5@teste.com');
  });

  it('gera ofício de designação de relatoria em PDF', async () => {
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: NUP, assunto: 'Processo oficio' });
    const relatoria = await asAdmin(request(app).post(`/api/camara/processos/${proc.body.id}/relatorias`)).send({ relatorNome: 'Relator Oficio' });
    const res = await asAdmin(request(app).get(`/api/camara/relatorias/${relatoria.body.id}/oficio.pdf`));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  it('L.8 gera relatório anual da Câmara em PDF', async () => {
    const res = await asAdmin(request(app).get('/api/camara/relatorio-anual.pdf').query({ ano: 2026 }));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });
});

describe('Fase L — artefatos do PNPD', () => {
  const novoPosDoc = async (over = {}) => asAdmin(request(app).post('/api/pos-doutorado')).send({
    pessoaNome: 'Posdoc L', supervisorNome: 'Supervisor L', projetoTitulo: 'Projeto L', ...over,
  });

  it('L.6 gera ofício de cobrança de relatório final em PDF', async () => {
    const pd = await novoPosDoc();
    const res = await asAdmin(request(app).get(`/api/pos-doutorado/${pd.body.id}/oficio-cobranca.pdf`));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  it('L.7 gera relação de vigentes por programa em PDF', async () => {
    await novoPosDoc({ dataInicio: '2026-01-01', dataFim: '2027-01-01' });
    const res = await asAdmin(request(app).get('/api/pos-doutorado/relacao-vigentes.pdf'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  it('L.8 gera relatório anual do PNPD em PDF', async () => {
    const res = await asAdmin(request(app).get('/api/pos-doutorado/relatorio-anual.pdf').query({ ano: 2026 }));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });
});

describe('L.10 — busca global', () => {
  it('encontra processos e atos por termo', async () => {
    await asAdmin(request(app).post('/api/camara/processos')).send({ numero: NUP, assunto: 'Processo sobre busca especial' });
    await asAdmin(request(app).post('/api/atos')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'Assunto sobre busca especial', situacao: 'EMITIDO', destinatarioTexto: 'PROTOCOLO' });

    const res = await asAdmin(request(app).get('/api/busca').query({ q: 'busca especial' }));
    expect(res.status).toBe(200);
    expect(res.body.processos.length).toBeGreaterThanOrEqual(1);
    expect(res.body.atos.length).toBeGreaterThanOrEqual(1);
  });

  it('ignora buscas muito curtas', async () => {
    const res = await asAdmin(request(app).get('/api/busca').query({ q: 'a' }));
    expect(res.body.processos).toEqual([]);
  });

  it('exige autenticação', async () => {
    const res = await request(app).get('/api/busca').query({ q: 'teste' });
    expect(res.status).toBe(401);
  });
});
