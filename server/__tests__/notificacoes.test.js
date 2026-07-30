import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';
import { _resetTransporterCache } from '../services/email.js';

// Mock do transporte SMTP: sendMail é controlado por teste (sucesso/erro),
// sem precisar de um servidor SMTP real. nodemailer.createTransport é a
// única função usada por services/email.js.
const sendMailMock = vi.fn();
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: sendMailMock }) },
}));

let adminToken;
const ENV_ORIGINAL = { ...process.env };

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
  sendMailMock.mockReset();
  process.env = { ...ENV_ORIGINAL };
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
});

afterAll(async () => {
  process.env = ENV_ORIGINAL;
  await pool.end();
});

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

describe('notificações — sem SMTP configurado (caminho padrão hoje)', () => {
  it('registra a intenção com situacao=SEM_SMTP, sem lançar erro', async () => {
    const res = await asAdmin(request(app).post('/api/notificacoes/teste'));
    expect(res.status).toBe(201);
    expect(res.body.situacao).toBe('SEM_SMTP');
    expect(sendMailMock).not.toHaveBeenCalled();

    const { rows } = await pool.query('SELECT * FROM notificacoes WHERE id = $1', [res.body.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].situacao).toBe('SEM_SMTP');
    expect(rows[0].erro).toMatch(/SMTP não configurado/);
  });
});

describe('notificações — com SMTP configurado', () => {
  it('envia com sucesso e marca ENVIADO/enviado_em', async () => {
    process.env.SMTP_HOST = 'smtp.exemplo.br';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    _resetTransporterCache();
    sendMailMock.mockResolvedValueOnce({ messageId: 'abc' });

    const res = await asAdmin(request(app).post('/api/notificacoes/teste'));
    expect(res.status).toBe(201);
    expect(res.body.situacao).toBe('ENVIADO');
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    const { rows } = await pool.query('SELECT * FROM notificacoes WHERE id = $1', [res.body.id]);
    expect(rows[0].situacao).toBe('ENVIADO');
    expect(rows[0].enviado_em).not.toBeNull();
  });

  it('registra ERRO quando o envio falha, sem quebrar a requisição', async () => {
    process.env.SMTP_HOST = 'smtp.exemplo.br';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    _resetTransporterCache();
    sendMailMock.mockRejectedValueOnce(new Error('conexão recusada'));

    const res = await asAdmin(request(app).post('/api/notificacoes/teste'));
    expect(res.status).toBe(201);
    expect(res.body.situacao).toBe('ERRO');

    const { rows } = await pool.query('SELECT * FROM notificacoes WHERE id = $1', [res.body.id]);
    expect(rows[0].situacao).toBe('ERRO');
    expect(rows[0].erro).toMatch(/conexão recusada/);
  });

  it('reenviar transiciona ERRO -> ENVIADO e não duplica o registro', async () => {
    process.env.SMTP_HOST = 'smtp.exemplo.br';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    _resetTransporterCache();
    sendMailMock.mockRejectedValueOnce(new Error('falha temporária'));

    const falhou = await asAdmin(request(app).post('/api/notificacoes/teste'));
    expect(falhou.body.situacao).toBe('ERRO');

    sendMailMock.mockResolvedValueOnce({ messageId: 'ok' });
    const reenviado = await asAdmin(request(app).post(`/api/notificacoes/${falhou.body.id}/reenviar`));
    expect(reenviado.status).toBe(200);
    expect(reenviado.body.situacao).toBe('ENVIADO');

    const { rows } = await pool.query('SELECT * FROM notificacoes');
    expect(rows).toHaveLength(1);
    expect(rows[0].tentativas).toBe(2);
  });

  it('não reenvia uma notificação já ENVIADA', async () => {
    process.env.SMTP_HOST = 'smtp.exemplo.br';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    _resetTransporterCache();
    sendMailMock.mockResolvedValueOnce({ messageId: 'ok' });

    const enviado = await asAdmin(request(app).post('/api/notificacoes/teste'));
    expect(enviado.body.situacao).toBe('ENVIADO');

    const reenvio = await asAdmin(request(app).post(`/api/notificacoes/${enviado.body.id}/reenviar`));
    expect(reenvio.status).toBe(404);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });
});

describe('notificações — listagem e controle de acesso', () => {
  it('lista e filtra por situação', async () => {
    await asAdmin(request(app).post('/api/notificacoes/teste'));
    const lista = await asAdmin(request(app).get('/api/notificacoes')).query({ situacao: 'SEM_SMTP' });
    expect(lista.status).toBe(200);
    expect(lista.body.length).toBeGreaterThan(0);
    expect(lista.body.every((n) => n.situacao === 'SEM_SMTP')).toBe(true);
  });

  it('exige autenticação', async () => {
    const res = await request(app).get('/api/notificacoes');
    expect(res.status).toBe(401);
  });
});
