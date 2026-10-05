import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createGracefulShutdown } from '../runtime/shutdown.js';
import { estadoProcesso } from '../runtime/estado.js';
import { app } from '../app.js';
import { pool } from '../db/pool.js';

describe('createGracefulShutdown', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('fecha HTTP e PostgreSQL antes de encerrar e só executa uma vez', async () => {
    const events = [];
    const server = { close: (callback) => { events.push('server'); callback(); } };
    const dbPool = { end: vi.fn(async () => { events.push('database'); }) };
    const exit = vi.fn((code) => events.push(`exit:${code}`));
    const shutdown = createGracefulShutdown({ getServer: () => server, dbPool, exit, log: () => {} });

    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);

    expect(events).toEqual(['server', 'database', 'exit:0']);
    expect(dbPool.end).toHaveBeenCalledTimes(1);
  });

  it('marca o processo como encerrando e fecha as conexões ociosas', async () => {
    const server = { close: (cb) => cb(), closeIdleConnections: vi.fn() };
    const aoIniciar = vi.fn();
    const shutdown = createGracefulShutdown({
      getServer: () => server, dbPool: { end: async () => {} }, exit: () => {}, log: () => {}, aoIniciar,
    });
    await shutdown('SIGTERM');
    expect(aoIniciar).toHaveBeenCalledTimes(1);
    expect(server.closeIdleConnections).toHaveBeenCalledTimes(1);
  });

  it('sai com código 1 no prazo quando uma requisição prende o servidor', async () => {
    vi.useFakeTimers();
    const server = { close: () => {} }; // nunca termina de drenar
    const exit = vi.fn();
    const log = vi.fn();
    const shutdown = createGracefulShutdown({ getServer: () => server, dbPool: { end: async () => {} }, exit, log, prazoMs: 5000 });
    shutdown('SIGTERM');
    await vi.advanceTimersByTimeAsync(4999);
    expect(exit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(log.mock.calls.flat().join(' ')).toMatch(/prazo/i);
  });
});

describe('readiness durante o encerramento', () => {
  afterEach(() => { estadoProcesso.encerrando = false; });

  it('/api/ready responde 503 enquanto o processo encerra; /api/live segue 200', async () => {
    expect((await request(app).get('/api/ready')).status).toBe(200);
    estadoProcesso.encerrando = true;
    const pronto = await request(app).get('/api/ready');
    expect(pronto.status).toBe(503);
    expect(pronto.body.status).toBe('encerrando');
    expect((await request(app).get('/api/live')).status).toBe(200);
  });
});

afterAll(async () => { await pool.end(); });
