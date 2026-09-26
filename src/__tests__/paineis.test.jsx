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
window.scrollTo = () => {};

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

// ---- Busca do painel (U.5)
import { montarOpcoes } from '../components/admin/PaletaBusca';
import { destinosDoPainel } from '../components/admin/menuPainel';
import { useLocation } from 'react-router-dom';

describe('busca do painel — Ctrl+K (U.5)', () => {
  const perfil = { superAdmin: true, gestorPrograma: false, roles: ['Administrator'] };
  const setValor = (el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const tecla = (alvo, key, extra = {}) => alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }));
  let rota;
  function Rota() { rota = useLocation().pathname; return null; }

  const painelComBusca = () => (
    <MemoryRouter initialEntries={['/admin']}>
      <Rota />
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<p>Início</p>} />
          <Route path="*" element={<p>Outra tela</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

  it('montarOpcoes: telas, criar e conteúdo do servidor, na ordem, sem acento', () => {
    const destinos = destinosDoPainel(perfil);
    const secoes = montarOpcoes({
      texto: 'Notícia', destinos, superAdmin: true,
      resposta: { noticias: [{ id: 'n1', titulo: 'Notícia de teste', status: 'RASCUNHO' }], processos: [{ id: 'p1', numero: '23082.1/2026-1', assunto: 'Processo sobre notícia' }] },
    });
    expect(secoes.map((s) => s.chave)).toEqual(['ir', 'criar', 'noticias', 'processos']);
    expect(secoes[0].itens[0]).toMatchObject({ rotulo: 'Notícias', to: '/admin/noticias' });
    expect(secoes[1].itens[0]).toMatchObject({ rotulo: 'Nova notícia', to: '/admin/noticias/nova' });
    expect(secoes[2].itens[0]).toMatchObject({ to: '/admin/noticias/editar/n1', status: 'RASCUNHO' });
    expect(secoes[3].itens[0].to).toBe('/admin/camara/p1');
    // sem texto: só a lista de telas
    expect(montarOpcoes({ texto: '', destinos, resposta: null, superAdmin: true }).map((s) => s.chave)).toEqual(['ir']);
    // quem não é da PRPG não recebe "Criar processo/expediente"
    const gestor = montarOpcoes({ texto: 'nov', destinos: [], resposta: null, superAdmin: false })[0].itens.map((i) => i.to);
    expect(gestor).not.toContain('/admin/camara/novo');
    expect(gestor).toContain('/admin/noticias/nova');
  });

  it('Ctrl+K abre um combobox acessível; setas e Enter levam à tela; Esc fecha', async () => {
    stubMatchMedia(true);
    entrar(['Administrator']);
    await montar(painelComBusca());
    expect(document.querySelector('[role=dialog]')).toBeNull();

    await act(async () => { tecla(document.body, 'k', { ctrlKey: true }); });
    const dialogo = document.querySelector('[role=dialog]');
    expect(dialogo).toBeTruthy();
    const campo = dialogo.querySelector('[role=combobox]');
    expect(document.activeElement).toBe(campo);
    expect(campo.getAttribute('aria-controls')).toBe(dialogo.querySelector('[role=listbox]').id);

    // digitar filtra as telas (sem chamar o servidor com menos de 2 letras)
    await act(async () => { setValor(campo, 'expedi'); });
    const opcoes = () => [...dialogo.querySelectorAll('[role=option]')];
    expect(opcoes().map((o) => o.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Expedientes')]));
    expect(campo.getAttribute('aria-activedescendant')).toBe(opcoes()[0].id);
    expect(opcoes()[0].getAttribute('aria-selected')).toBe('true');

    await act(async () => { tecla(campo, 'Enter'); });
    expect(rota).toBe('/admin/atos');
    expect(document.querySelector('[role=dialog]')).toBeNull();

    // reabre e fecha com Escape
    await act(async () => { tecla(document.body, 'k', { metaKey: true }); });
    expect(document.querySelector('[role=dialog]')).toBeTruthy();
    await act(async () => { tecla(document, 'Escape'); });
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });

  it('busca no servidor depois de 2 letras e mostra o conteúdo encontrado; erro aparece como erro', async () => {
    stubMatchMedia(true);
    entrar(['Administrator']);
    let falha = false;
    vi.stubGlobal('fetch', vi.fn(async (url) => (String(url).includes('/api/busca')
      ? (falha ? { ok: false, status: 500, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({ editais: [{ id: 'e1', titulo: 'Edital de seleção 2026', status: 'PUBLICADO' }] }) })
      : { ok: true, status: 200, json: async () => [] })));
    await montar(painelComBusca());
    await act(async () => { tecla(document.body, 'k', { ctrlKey: true }); });
    const dialogo = document.querySelector('[role=dialog]');
    const campo = dialogo.querySelector('[role=combobox]');

    await act(async () => { setValor(campo, 'seleção'); });
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/busca?q=sele'), expect.anything());
    const achou = [...dialogo.querySelectorAll('[role=option]')].find((o) => o.textContent.includes('Edital de seleção 2026'));
    expect(achou).toBeTruthy();
    await act(async () => { achou.click(); });
    expect(rota).toBe('/admin/editais/editar/e1');

    // falha do servidor não vira "nada encontrado"
    falha = true;
    await act(async () => { tecla(document.body, 'k', { ctrlKey: true }); });
    const campo2 = document.querySelector('[role=combobox]');
    await act(async () => { setValor(campo2, 'qualquer'); });
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
    expect(document.querySelector('[role=dialog] [role=alert]').textContent).toContain('A busca não respondeu');
    vi.unstubAllGlobals();
  });

  it('não rouba o Ctrl+K do editor de texto (que usa para inserir link)', async () => {
    stubMatchMedia(true);
    entrar(['Administrator']);
    await montar(painelComBusca());
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    document.body.appendChild(editor);
    await act(async () => { tecla(editor, 'k', { ctrlKey: true }); });
    expect(document.querySelector('[role=dialog]')).toBeNull();
    editor.remove();
  });
});
