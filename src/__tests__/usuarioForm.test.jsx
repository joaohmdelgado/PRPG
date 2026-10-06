// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import AdminUserForm from '../pages/admin/AdminUserForm';
import AdminUsersList from '../pages/admin/AdminUsersList';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};

let root;
let container;

// Usuário como a API devolve hoje: privacidade só tem as duas flags que persistem.
const usuario = {
  id: 'u1',
  email: 'ana@ufrpe.br',
  roles: ['Professor'],
  privacidade: { mostrar_email: true, mostrar_telefone: true },
  perfil_geral: { nome: 'Ana Souza', cpf: '', siape: '', telefones: ['81 9'] },
  dados_academicos: { lattes: 'http://lattes.cnpq.br/1' },
  perfil_aluno: null,
  perfil_professor: { tipo_professor: 'Permanente', programas: [] },
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('roles', JSON.stringify(['Administrator']));
  localStorage.setItem('token', 'x.e30.y');
  window.matchMedia = (q) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const u = String(url);
    let corpo = [];
    if (/\/api\/users\/u1(\?|$)/.test(u)) corpo = usuario;
    else if (u.includes('/api/users?')) {
      corpo = { items: [usuario], total: 1, page: 1, limit: 20, pages: 1 };
    }
    return { ok: true, status: 200, json: async () => corpo };
  }));
});
afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
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

describe('B.13: o painel não oferece flags de privacidade que nunca persistiram', () => {
  it('formulário de edição: só os dois controles que existem em users', async () => {
    const c = await montar('/admin/users/editar/u1', <AdminUserForm />, 'users/editar/:id');
    const texto = c.textContent;
    expect(texto).toContain('Controles de Privacidade');
    expect(texto).not.toContain('Perfil Visível no Site Público');
    expect(c.querySelector('input[name="perfil_publico"]')).toBeNull();
    expect(c.querySelector('input[name="mostrar_lattes"]')).toBeNull();

    const email = c.querySelector('input[name="mostrar_email"]');
    const telefone = c.querySelector('input[name="mostrar_telefone"]');
    expect(email).not.toBeNull();
    expect(telefone).not.toBeNull();
    expect(email.checked).toBe(true);
    expect(telefone.checked).toBe(true); // veio da API
    expect(email.labels[0].textContent).toContain('Exibir E-mail Institucional');
    expect(telefone.labels[0].textContent).toContain('Exibir Telefones');
    // sempre ativos: nada os desliga por dependência de um "perfil público"
    expect(email.closest('.pointer-events-none')).toBeNull();
    expect(telefone.closest('.opacity-50')).toBeNull();
    expect(texto).toContain('a exibição pública ainda não as consulta');
  });

  it('formulário de novo usuário: e-mail marcado e telefones desmarcado por padrão', async () => {
    const c = await montar('/admin/users/novo', <AdminUserForm />, 'users/novo');
    expect(c.querySelector('input[name="mostrar_email"]').checked).toBe(true);
    expect(c.querySelector('input[name="mostrar_telefone"]').checked).toBe(false);
    expect(c.textContent).not.toContain('Perfil Visível no Site Público');
  });

  it('lista de usuários: sem a coluna Visibilidade', async () => {
    const c = await montar('/admin/users', <AdminUsersList />, 'users');
    const cabecalhos = [...c.querySelectorAll('th')].map((th) => th.textContent.trim());
    expect(cabecalhos.length).toBeGreaterThan(0);
    expect(cabecalhos.some((t) => t.includes('Papéis'))).toBe(true);
    expect(cabecalhos.some((t) => t.includes('Visibilidade'))).toBe(false);
    expect(c.textContent).not.toContain('Privado');
  });
});

describe('AUTH-02: senha provisória no lugar da Mudar123', () => {
  const clicar = async (el) => { await act(async () => { el.click(); }); await act(async () => { await new Promise((r) => setTimeout(r, 20)); }); };
  const botao = (raiz, texto) => [...raiz.querySelectorAll('button')].find((b) => b.textContent.trim() === texto);

  it('novo usuário: senha é opcional e a tela recomenda deixar em branco', async () => {
    const c = await montar('/admin/users/novo', <AdminUserForm />, 'users/novo');
    expect(c.querySelector('input[name="password"]').required).toBe(false);
    expect(c.textContent).toContain('o sistema gera uma senha provisória');
  });

  it('edição: "Gerar senha provisória" pede confirmação e mostra a senha uma vez', async () => {
    const chamadas = [];
    const anterior = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      chamadas.push(`${opts.method || 'GET'} ${String(url)}`);
      if (String(url).endsWith('/api/users/u1/senha-provisoria')) {
        return { ok: true, status: 200, json: async () => ({ email: 'ana@ufrpe.br', senhaProvisoria: 'abcd-EFGH-2345' }) };
      }
      return anterior(url, opts);
    }));
    const c = await montar('/admin/users/editar/u1', <AdminUserForm />, 'users/editar/:id');

    await clicar(botao(c, 'Gerar senha provisória'));
    expect(chamadas.some((x) => x.startsWith('POST'))).toBe(false); // ainda só a confirmação
    await clicar(botao(document.body, 'Gerar'));

    expect(chamadas).toContain('POST http://localhost:5000/api/users/u1/senha-provisoria');
    expect(c.querySelector('[data-senha-provisoria]').textContent).toBe('abcd-EFGH-2345');
    expect(c.textContent).toContain('não será mostrada de novo');
    await clicar(botao(c, 'Já anotei'));
    expect(c.querySelector('[data-senha-provisoria]')).toBeNull();
  });
});
