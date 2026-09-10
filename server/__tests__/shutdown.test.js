import { describe, it, expect, vi } from 'vitest';
import { createGracefulShutdown } from '../runtime/shutdown.js';

describe('createGracefulShutdown', () => {
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
});
