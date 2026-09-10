import { describe, expect, it, vi } from 'vitest';
import { requireInstitutionalWriter } from '../middleware/authMiddleware.js';

const makeResponse = () => {
  const res = { statusCode: null, body: null };
  res.status = vi.fn((statusCode) => {
    res.statusCode = statusCode;
    return res;
  });
  res.json = vi.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
};

describe('requireInstitutionalWriter', () => {
  it('nega escrita institucional para usuário autenticado sem papel gestor', () => {
    const req = { user: { id: 'aluno-1', roles: ['Aluno'] } };
    const res = makeResponse();
    const next = vi.fn();

    requireInstitutionalWriter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({ message: 'Acesso negado. Papel insuficiente.' });
    expect(next).not.toHaveBeenCalled();
  });
});
