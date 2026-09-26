// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import AdminNoticiaForm from '../pages/admin/AdminNoticiaForm';
import AdminEditalForm from '../pages/admin/AdminEditalForm';
import AdminResolucaoForm from '../pages/admin/AdminResolucaoForm';
import AdminTeseForm from '../pages/admin/AdminTeseForm';
import AdminUserForm from '../pages/admin/AdminUserForm';
import AdminProgramaForm from '../pages/admin/AdminProgramaForm';
import AdminCamaraForm from '../pages/admin/AdminCamaraForm';
import AdminAtoForm from '../pages/admin/AdminAtoForm';
import AdminPortal from '../pages/admin/AdminPortal';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};

let root;
let container;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('roles', JSON.stringify(['Administrator']));
  localStorage.setItem('token', 'x.e30.y');
  window.matchMedia = (q) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => [] })));
  // CKEditor falso: cria a área editável como o de verdade faz, depois de carregar.
  window.ClassicEditor = {
    create: async (el) => {
      const d = document.createElement('div');
      d.setAttribute('contenteditable', 'true');
      el.appendChild(d);
      return { setData() {}, getData: () => '', destroy: async () => {}, model: { document: { on() {} } } };
    },
  };
});
afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  delete window.ClassicEditor;
});

const montar = async (rota, element, path) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[rota]}>
        <Routes><Route path="/admin" element={<AdminLayout />}><Route path={path} element={element} /></Route></Routes>
      </MemoryRouter>
    );
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  return container;
};

// Rótulo "solto": sem for, sem campo dentro e que ninguém referencia por aria-labelledby.
const orfaos = (c) => [...c.querySelectorAll('main label')]
  .filter((l) => !l.htmlFor && !l.querySelector('input,select,textarea')
    && !(l.id && c.querySelector(`[aria-labelledby~="${l.id}"]`)))
  .map((l) => l.textContent.trim().slice(0, 40));
const semNome = (c) => [...c.querySelectorAll('main input:not([type=hidden]):not([type=file]), main select, main textarea')]
  .filter((el) => !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'))
  .map((el) => `${el.tagName.toLowerCase()}[${el.name || el.type || el.placeholder || ''}]`);

// A rede de segurança (useAssociarRotulos) liga os rótulos dos formulários ainda
// não migrados para Field. Este teste renderiza formulários REAIS do painel e
// confere que nenhum rótulo ficou solto — o número cai de 246 para o que o
// hook não consegue decidir (rótulos de grupos de opções, por exemplo).
describe('rótulos ligados aos campos nos formulários reais do painel', () => {
  const casos = [
    ['notícia', '/admin/noticias/nova', <AdminNoticiaForm />, 'noticias/nova'],
    ['edital', '/admin/editais/novo', <AdminEditalForm />, 'editais/novo'],
    ['resolução', '/admin/resolucoes/nova', <AdminResolucaoForm />, 'resolucoes/nova'],
    ['tese', '/admin/teses-dissertacoes/nova', <AdminTeseForm />, 'teses-dissertacoes/nova'],
    ['usuário', '/admin/users/novo', <AdminUserForm />, 'users/novo'],
    ['programa', '/admin/programas/novo', <AdminProgramaForm />, 'programas/novo'],
    ['processo da Câmara', '/admin/camara/novo', <AdminCamaraForm />, 'camara/novo'],
    ['expediente', '/admin/atos/novo', <AdminAtoForm />, 'atos/novo'],
  ];
  for (const [nome, rota, el, path] of casos) {
    it(`formulário de ${nome}`, async () => {
      const c = await montar(rota, el, path);
      const total = c.querySelectorAll('main label').length;
      expect(total, 'o formulário não renderizou rótulos').toBeGreaterThan(2);
      expect(orfaos(c), `rótulos soltos em ${nome}`).toEqual([]);
      expect(semNome(c), `campos sem nome em ${nome}`).toEqual([]);
    });
  }
});
