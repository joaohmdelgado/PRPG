// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch } from '../api.js';

// AUTH-02: o 403 SENHA_TEMPORARIA da API leva à troca de senha.
const resposta = (status, corpo) => new Response(JSON.stringify(corpo), {
  status, headers: { 'Content-Type': 'application/json' },
});

describe('apiFetch — senha provisória', () => {
  let assign;
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 't');
    assign = vi.fn();
    vi.stubGlobal('location', { pathname: '/admin/noticias', assign });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('403 SENHA_TEMPORARIA marca a sessão e vai para a troca de senha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(403, { codigo: 'SENHA_TEMPORARIA', message: 'x' })));
    const res = await apiFetch('/api/users');
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ codigo: 'SENHA_TEMPORARIA' });
    expect(localStorage.getItem('senhaTemporaria')).toBe('true');
    expect(assign).toHaveBeenCalledWith('/admin/trocar-senha');
  });

  it('outro 403 não mexe na sessão', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(403, { message: 'Papel insuficiente.' })));
    await apiFetch('/api/users');
    expect(localStorage.getItem('senhaTemporaria')).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it('já na troca de senha não redireciona de novo', async () => {
    vi.stubGlobal('location', { pathname: '/admin/trocar-senha', assign });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(403, { codigo: 'SENHA_TEMPORARIA' })));
    await apiFetch('/api/users');
    expect(assign).not.toHaveBeenCalled();
  });
});
