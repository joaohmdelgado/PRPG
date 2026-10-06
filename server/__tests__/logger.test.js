import { describe, it, expect } from 'vitest';
import { formatErrorLog } from '../utils/logger.js';

describe('formatErrorLog', () => {
  it('preserva correlação técnica sem registrar a mensagem potencialmente sensível', () => {
    const error = Object.assign(new Error('CPF 111.222.333-44; senha=segredo; token=abc'), { code: '23505' });
    const log = formatErrorLog({ requestId: '7ee2d687-01e1-4046-b26d-b1ee93b1b08a', error });

    expect(log).toContain('7ee2d687-01e1-4046-b26d-b1ee93b1b08a');
    expect(log).toContain('23505');
    expect(log).not.toContain('111.222.333-44');
    expect(log).not.toContain('segredo');
    expect(log).not.toContain('token=abc');
  });
});

// OPS-03: log de acesso em JSON, sem dado pessoal na URL, com negações em warn.
describe('log de acesso', () => {
  const montar = async ({ metodo = 'GET', url = '/api/news', status = 200, user = null, rota } = {}) => {
    const { middlewareAcesso } = await import('../utils/logger.js');
    const linhas = [];
    const eventos = {};
    const req = { method: metodo, originalUrl: url, requestId: 'req-1', user, baseUrl: '/api', route: rota ? { path: rota } : undefined };
    const res = { statusCode: status, on: (e, fn) => { eventos[e] = fn; } };
    middlewareAcesso({ escrever: (l) => linhas.push(JSON.parse(l)), ativo: true })(req, res, () => {});
    eventos.finish?.(); // sondas de saúde nem registram o evento
    return linhas;
  };

  it('registra método, rota, status, duração e requestId; nunca a query nem o valor dos parâmetros', async () => {
    const [l] = await montar({ url: '/api/users/abc-123?q=111.222.333-44&token=segredo', rota: '/users/:id', status: 200 });
    expect(l).toMatchObject({ event: 'http_request', level: 'info', method: 'GET', route: '/api/users/:id', status: 200, requestId: 'req-1' });
    expect(typeof l.durationMs).toBe('number');
    const bruto = JSON.stringify(l);
    expect(bruto).not.toContain('111.222.333-44');
    expect(bruto).not.toContain('segredo');
    expect(bruto).not.toContain('abc-123');
  });

  it('401/403 saem em warn e 5xx em error; usuário só pseudonimizado', async () => {
    const [negado] = await montar({ status: 403, user: { id: 'user-9' }, rota: '/users' });
    expect(negado.level).toBe('warn');
    expect(negado.user).toMatch(/^[0-9a-f]{12}$/);
    expect(JSON.stringify(negado)).not.toContain('user-9');
    expect((await montar({ status: 500 }))[0].level).toBe('error');
    expect((await montar({ status: 401 }))[0].user).toBeNull();
  });

  it('rota desconhecida não vaza o caminho; sondas de saúde não são registradas', async () => {
    const [sem] = await montar({ url: '/api/segredo/111.222.333-44', status: 404 });
    expect(sem.route).toBeNull();
    expect(JSON.stringify(sem)).not.toContain('111.222.333-44');
    expect(await montar({ url: '/api/live' })).toEqual([]);
    expect(await montar({ url: '/api/ready' })).toEqual([]);
  });

  it('desligado (ativo: false), não escreve nada', async () => {
    const { middlewareAcesso } = await import('../utils/logger.js');
    const linhas = [];
    const eventos = {};
    middlewareAcesso({ escrever: (l) => linhas.push(l), ativo: false })({ method: 'GET', originalUrl: '/x' }, { on: (e, f) => { eventos[e] = f; } }, () => {});
    expect(eventos.finish).toBeUndefined();
    expect(linhas).toEqual([]);
  });
});
