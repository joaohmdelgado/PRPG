// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminProgramaDocentes from '../pages/admin/AdminProgramaDocentes';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// B.11: pessoa_id (pessoas.id) e usuario_id (login) são diferentes.
const MEMBROS = [{ id: 'v1', pessoa_id: 'pes-ana', usuario_id: 'u-ana', papel: 'DOCENTE_PERMANENTE', nome: 'Ana Docente', programa_id: 'prog-1' }];
const USERS = [
  { id: 'u-ana', email: 'ana@t.br', roles: ['Professor'], perfil_geral: { nome: 'Ana Docente' } },
  { id: 'u-bia', email: 'bia@t.br', roles: ['Professor'], perfil_geral: { nome: 'Bia Docente' } },
];
const resposta = (url) => {
  if (url.includes('/api/programas/prog-1/docentes')) return MEMBROS;
  if (url.includes('/api/users')) return USERS;
  if (url.includes('/api/programas/prog-1')) return { id: 'prog-1', sigla: 'PU' };
  return [];
};

let root;
let container;
beforeEach(() => {
  localStorage.setItem('token', 'x.e30.y');
  localStorage.setItem('roles', JSON.stringify(['Administrator']));
  vi.stubGlobal('fetch', vi.fn(async (url) => ({ ok: true, status: 200, json: async () => resposta(String(url)) })));
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const montar = async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/admin/programas/prog-1/docentes']}>
        <Routes><Route path="/admin/programas/:id/docentes" element={<AdminProgramaDocentes />} /></Routes>
      </MemoryRouter>
    );
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
};
const setValor = (el, v) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('B.11 — o painel usa usuario_id (não pessoa_id) para o que é de login', () => {
  it('quem já está vinculado some dos candidatos', async () => {
    await montar();
    const busca = container.querySelector('input[placeholder="Nome ou e-mail..."]');
    await act(async () => { setValor(busca, 'docente'); });
    expect(container.textContent).toContain('Bia Docente');
    expect(container.textContent.match(/Ana Docente/g)).toHaveLength(1); // só na lista de membros
  });

  it('o lápis de edição aponta para o id de login', async () => {
    await montar();
    expect(container.querySelector('a[href="/admin/users/editar/u-ana"]')).not.toBeNull();
  });
});
