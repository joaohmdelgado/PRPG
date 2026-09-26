// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import RequireAuth from '../components/RequireAuth';
import AreaErrorBoundary from '../components/ui/AreaErrorBoundary';
import { Estado, EstadoVazio, EstadoErro, Carregando } from '../components/ui/Estados';
import ContaInscricoes from '../pages/conta/ContaInscricoes';
import ContaDeclaracoes from '../pages/conta/ContaDeclaracoes';
import ContaRelatorias from '../pages/conta/ContaRelatorias';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;
const montar = async (el) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(el); });
  return container;
};

// matchMedia: `larguraDesktop` decide se (min-width: 1024px) casa.
const stubMatchMedia = (desktop) => {
  window.matchMedia = (q) => ({
    matches: /min-width: 1024px/.test(q) ? desktop : false,
    media: q,
    addEventListener() {}, removeEventListener() {},
  });
};

const token = (extra = {}) => {
  const payload = btoa(JSON.stringify({ id: 'u1', exp: Math.floor(Date.now() / 1000) + 3600, ...extra }));
  return `x.${payload}.y`;
};
const entrar = (roles, extra = {}) => {
  localStorage.setItem('token', token());
  localStorage.setItem('roles', JSON.stringify(roles));
  localStorage.setItem('username', 'pessoa@teste.com');
  Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v));
};

beforeEach(() => { localStorage.clear(); });
afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

const painel = (rota = '/admin') => (
  <MemoryRouter initialEntries={[rota]}>
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<p>Conteúdo do painel</p>} />
        <Route path="noticias" element={<p>Notícias</p>} />
        <Route path="erro" element={<Explode />} />
      </Route>
    </Routes>
  </MemoryRouter>
);
function Explode() { throw new Error('boom'); }

describe('AdminLayout — menu por tarefa, drawer e acessibilidade', () => {
  it('desktop: menu por grupos fixo, um único <main>, link para pular ao conteúdo', async () => {
    stubMatchMedia(true);
    entrar(['Administrator']);
    const c = await montar(painel());
    expect(c.querySelectorAll('main')).toHaveLength(1);
    expect(c.querySelector('main').id).toBe('conteudo-painel');
    expect(c.querySelector('a[href="#conteudo-painel"]')).toBeTruthy();

    const nav = c.querySelector('nav[aria-label="Painel"]');
    const grupos = [...nav.querySelectorAll('button[aria-expanded]')].map((b) => b.textContent.trim());
    expect(grupos).toEqual(['Site', 'Programas', 'Secretaria', 'Pessoas e Contatos', 'Configuração']);
    // Início marcado como página atual.
    expect(nav.querySelector('a[aria-current="page"]').textContent).toContain('Pendências');
    // Sem drawer no desktop: o menu não é inert nem diálogo.
    const aside = c.querySelector('#menu-painel');
    expect(aside.hasAttribute('inert')).toBe(false);
    expect(aside.getAttribute('role')).toBeNull();
  });

  it('o grupo da rota atual abre sozinho e os outros começam recolhidos', async () => {
    stubMatchMedia(true);
    entrar(['Administrator']);
    const c = await montar(painel('/admin/noticias'));
    const abertos = [...c.querySelectorAll('nav button[aria-expanded="true"]')].map((b) => b.textContent.trim());
    expect(abertos).toEqual(['Site']);
    const recolhido = c.querySelector('nav button[aria-expanded="false"]');
    expect(document.getElementById(recolhido.getAttribute('aria-controls')).hidden).toBe(true);
    await act(async () => { recolhido.click(); });
    expect(recolhido.getAttribute('aria-expanded')).toBe('true');
  });

  it('celular: menu fora da ordem de foco (inert); o botão abre o drawer como diálogo; Escape fecha e devolve o foco', async () => {
    stubMatchMedia(false);
    entrar(['Administrator']);
    const c = await montar(painel());
    const aside = c.querySelector('#menu-painel');
    expect(aside.hasAttribute('inert')).toBe(true);

    const abrir = c.querySelector('button[aria-controls="menu-painel"]');
    expect(abrir.getAttribute('aria-label')).toBe('Abrir menu do painel');
    expect(abrir.getAttribute('aria-expanded')).toBe('false');
    abrir.focus();
    await act(async () => { abrir.click(); });

    expect(aside.hasAttribute('inert')).toBe(false);
    expect(aside.getAttribute('role')).toBe('dialog');
    expect(aside.getAttribute('aria-modal')).toBe('true');
    expect(abrir.getAttribute('aria-expanded')).toBe('true');
    expect(aside.contains(document.activeElement)).toBe(true);

    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(aside.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(abrir);
  });

  it('Gestor de Programa vê o menu do programa, não o da PRPG', async () => {
    stubMatchMedia(true);
    entrar(['GestorPrograma'], { gestorPrograma: JSON.stringify({ id: 'p1', sigla: 'PPGX', nome: 'X', slug: 'ppgx' }) });
    const c = await montar(painel());
    const links = [...c.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('/admin/programas/p1/site');
    expect(links).not.toContain('/admin/users');
    expect(c.querySelector('h1').textContent).toContain('PPGX');
  });

  it('um erro de renderização numa tela fica contido: o menu continua e aparece o aviso', async () => {
    stubMatchMedia(true);
    entrar(['Administrator']);
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    const c = await montar(painel('/admin/erro'));
    silencio.mockRestore();
    expect(c.querySelector('[role=alert]').textContent).toContain('Algo deu errado nesta tela');
    expect(c.querySelector('nav[aria-label="Painel"]')).toBeTruthy();
  });
});

describe('RequireAuth — o painel é da equipe (U.1)', () => {
  const app = (rota) => (
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/admin/login" element={<p>LOGIN</p>} />
        <Route path="/minha-conta" element={<RequireAuth />}><Route index element={<p>MINHA CONTA</p>} /></Route>
        <Route path="/admin" element={<RequireAuth allowedRoles={['Administrator', 'Gestor', 'GestorPrograma']} semAcesso="/minha-conta" />}>
          <Route index element={<p>PAINEL</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

  it('sem sessão vai ao login', async () => {
    const c = await montar(app('/admin'));
    expect(c.textContent).toBe('LOGIN');
  });
  it('aluno e professor que abrem /admin caem em /minha-conta', async () => {
    entrar(['Aluno']);
    expect((await montar(app('/admin'))).textContent).toBe('MINHA CONTA');
  });
  it('a equipe entra no painel', async () => {
    entrar(['Gestor']);
    expect((await montar(app('/admin'))).textContent).toBe('PAINEL');
  });
});

describe('Estados distintos (U.6)', () => {
  it('carregando, vazio e erro têm papéis diferentes; erro oferece tentar de novo', async () => {
    const tentar = vi.fn();
    const c = await montar(
      <>
        <Carregando />
        <EstadoVazio titulo="Nada aqui" />
        <EstadoErro erro={new Error('HTTP 500')} onTentar={tentar} />
      </>
    );
    expect(c.querySelector('[role=status]').textContent).toContain('Carregando');
    expect(c.querySelectorAll('[role=alert]')).toHaveLength(1);
    expect(c.textContent).toContain('Nada aqui');
    expect(c.textContent).toContain('HTTP 500');
    await act(async () => { [...c.querySelectorAll('button')].find((b) => /Tentar de novo/.test(b.textContent)).click(); });
    expect(tentar).toHaveBeenCalled();
  });

  it('Estado escolhe: erro tem prioridade sobre vazio, carregando sobre ambos', async () => {
    const c = await montar(<Estado carregando={false} erro={new Error('x')} vazio vaziaProps={{ titulo: 'VAZIO' }}>FILHO</Estado>);
    expect(c.textContent).not.toContain('VAZIO');
    expect(c.querySelector('[role=alert]')).toBeTruthy();
    root.unmount(); container.remove();
    const d = await montar(<Estado carregando erro={new Error('x')}>FILHO</Estado>);
    expect(d.querySelector('[role=status]')).toBeTruthy();
    expect(d.querySelector('[role=alert]')).toBeNull();
  });

  it('AreaErrorBoundary contém o erro e se recupera ao navegar', async () => {
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    const c = await montar(
      <MemoryRouter>
        <AreaErrorBoundary area="teste"><Explode /></AreaErrorBoundary>
      </MemoryRouter>
    );
    silencio.mockRestore();
    expect(c.textContent).toContain('Algo deu errado');
    expect(c.textContent).toContain('teste');
  });
});

// /minha-conta: cada tela recebe os dados do layout por useOutletContext().
const comDados = (dados, filha) => (
  <MemoryRouter>
    <Routes>
      <Route element={<Ctx dados={dados} />}><Route path="*" element={filha} /></Route>
    </Routes>
  </MemoryRouter>
);
function Ctx({ dados }) { return <Outlet context={dados} />; }

describe('/minha-conta (U.1)', () => {
  it('inscrições: vazio com o próximo passo, e lista com resultado e nota', async () => {
    let c = await montar(comDados({ inscricoes: [] }, <ContaInscricoes />));
    expect(c.textContent).toContain('Você ainda não fez nenhuma inscrição');
    root.unmount(); container.remove();

    c = await montar(comDados({
      inscricoes: [
        { id: 'a', periodo: 'Proficiência 2026.1', nivel: 'Mestrado', linguas: ['Inglês'], status: 'AVALIADO', nota: 8.5, resultado: 'PROFICIENCIA', criadaEm: '2026-03-10', declaracaoEmitida: true },
        { id: 'b', periodo: 'Proficiência 2026.2', nivel: 'Mestrado', linguas: ['Espanhol'], status: 'INSCRITO', nota: null, resultado: null, criadaEm: '2026-09-01', declaracaoEmitida: false },
      ],
    }, <ContaInscricoes />));
    expect(c.textContent).toContain('Proficiência · nota 8,5');
    expect(c.textContent).toContain('Aguardando avaliação');
    expect(c.textContent).toContain('10/03/2026');
    expect(c.textContent).toContain('Declaração emitida');
  });

  it('declarações: baixar PDF só para proficiência não revogada; verificação sempre que válida', async () => {
    const c = await montar(comDados({
      declaracoes: [
        { codigo: 'c1', rotulo: 'Proficiência em língua estrangeira', emitidaEm: '2026-04-01', validaAte: '2030-04-01', revogada: false, inscricaoId: 'i1', resumo: { linguas: ['Inglês'], resultado: 'Proficiência' } },
        { codigo: 'c2', rotulo: 'Vínculo discente', emitidaEm: '2026-05-01', validaAte: null, revogada: false, inscricaoId: null, resumo: null },
        { codigo: 'c3', rotulo: 'Proficiência em língua estrangeira', emitidaEm: '2025-01-01', validaAte: null, revogada: true, inscricaoId: 'i0', resumo: null },
      ],
    }, <ContaDeclaracoes />));
    const itens = [...c.querySelectorAll('li')];
    expect(itens).toHaveLength(3);
    const botoes = (li) => [...li.querySelectorAll('button, a')].map((e) => e.textContent.trim());
    expect(botoes(itens[0])).toEqual(expect.arrayContaining(['Baixar PDF', 'Página de verificação']));
    expect(botoes(itens[1])).toEqual(['Página de verificação']);
    expect(botoes(itens[2])).toEqual([]);
    expect(itens[2].textContent).toContain('revogada');
    expect(c.querySelector('a[href="/verificar/c1"]')).toBeTruthy();
  });

  it('relatorias: prazo vencido aparece como atrasado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [{ valor: 'EM_ANALISE', rotulo: 'Em análise' }] })));
    const c = await montar(comDados({
      relatorias: [{ id: 'r1', numero: '23082.000001/2026-11', assunto: 'Credenciamento', status: 'EM_ANALISE', designadaEm: '2026-01-05', prazo: '2026-02-01', atrasada: true }],
    }, <ContaRelatorias />));
    await act(async () => { await Promise.resolve(); });
    expect(c.textContent).toContain('23082.000001/2026-11');
    expect(c.textContent).toContain('Atrasado — prazo 01/02/2026');
    vi.unstubAllGlobals();
  });
});
