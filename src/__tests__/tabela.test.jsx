// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import AdminNoticias from '../pages/admin/AdminNoticias';
import AdminPagesList from '../pages/admin/AdminPagesList';
import { dataCurta, dataLonga, periodo } from '../utils/datas';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;
let pedidos;
let resposta;

const noticia = (i) => ({ id: `n${i}`, title: `Notícia ${i}`, category: 'Geral', date: '2026-03-0' + (i % 9 + 1), status: i === 2 ? 'RASCUNHO' : 'PUBLICADO', programaId: null });

const paginado = (total, page = 1, limit = 20) => ({
  items: Array.from({ length: Math.min(limit, total - (page - 1) * limit) }, (_, i) => noticia((page - 1) * limit + i + 1)),
  total, page, limit, pages: Math.max(Math.ceil(total / limit), 1),
});

// fetch falso: registra cada chamada e responde `resposta(url, opcoes)`.
const stubFetch = () => {
  pedidos = [];
  vi.stubGlobal('fetch', vi.fn(async (url, opcoes = {}) => {
    const u = String(url);
    pedidos.push({ url: u, metodo: opcoes.method || 'GET' });
    const r = resposta(u, opcoes);
    return { ok: r.status ? r.status < 400 : true, status: r.status || 200, json: async () => r.corpo };
  }));
};

let localizacao;
function Espia() { localizacao = useLocation(); return null; }

const montar = async (el, rota = '/admin/noticias') => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[rota]}>
        <Espia />
        <Routes>
          <Route path="/admin/*" element={el} />
        </Routes>
      </MemoryRouter>
    );
  });
  // deixa as promessas do fetch e o useProgramasResumo assentarem
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return container;
};

const ultimaLista = (padrao = '/api/news?') => [...pedidos].reverse().find((p) => p.url.includes(padrao));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('roles', JSON.stringify(['Administrator']));
  localStorage.setItem('token', 'x.e30.y');
  resposta = (u) => {
    if (u.includes('/api/programas')) return { corpo: [{ id: 'p1', sigla: 'PPGX', nome: 'X', slug: 'ppgx' }] };
    if (u.includes('/api/users/resumo')) return { corpo: [] };
    if (u.includes('/api/news')) return { corpo: paginado(45) };
    return { corpo: [] };
  };
  stubFetch();
});
afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('tabela única do painel (U.3)', () => {
  it('consulta no servidor com página, tamanho e origem PRPG; mostra intervalo e páginas', async () => {
    const c = await montar(<AdminNoticias />);
    const u = new URL(ultimaLista().url);
    expect(u.searchParams.get('page')).toBe('1');
    expect(u.searchParams.get('limit')).toBe('20');
    expect(u.searchParams.get('escopo')).toBe('prpg');
    expect(c.querySelectorAll('tbody tr')).toHaveLength(20);
    expect(c.textContent).toContain('Mostrando 1–20 de 45');
    expect(c.textContent).toContain('Página 1 de 3');
    expect(c.querySelector('button[disabled]').textContent).toContain('Anterior');
  });

  it('próxima página vai para a URL e refaz a consulta', async () => {
    const c = await montar(<AdminNoticias />);
    const proxima = [...c.querySelectorAll('nav[aria-label="Paginação"] button')].find((b) => /Próxima/.test(b.textContent));
    await act(async () => { proxima.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(localizacao.search).toContain('page=2');
    expect(new URL(ultimaLista().url).searchParams.get('page')).toBe('2');
  });

  it('clicar no cabeçalho ordena no servidor, inverte no segundo clique e marca aria-sort', async () => {
    const c = await montar(<AdminNoticias />);
    const th = () => [...c.querySelectorAll('thead th')].find((t) => /Título/.test(t.textContent));
    expect(th().getAttribute('aria-sort')).toBeNull();

    await act(async () => { th().querySelector('button').click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    let u = new URL(ultimaLista().url);
    expect(u.searchParams.get('ordenar')).toBe('title');
    expect(u.searchParams.get('dir')).toBe('asc');
    expect(th().getAttribute('aria-sort')).toBe('ascending');

    await act(async () => { th().querySelector('button').click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    u = new URL(ultimaLista().url);
    expect(u.searchParams.get('dir')).toBe('desc');
    expect(th().getAttribute('aria-sort')).toBe('descending');
    expect(localizacao.search).toContain('ordenar=title');
  });

  it('abre já ordenada e filtrada quando a URL traz o estado (link compartilhável)', async () => {
    const c = await montar(<AdminNoticias />, '/admin/noticias?page=2&ordenar=date&dir=desc&status=RASCUNHO&programa=p1&q=edital');
    const u = new URL(ultimaLista().url);
    expect(u.searchParams.get('page')).toBe('2');
    expect(u.searchParams.get('ordenar')).toBe('date');
    expect(u.searchParams.get('dir')).toBe('desc');
    expect(u.searchParams.get('status')).toBe('RASCUNHO');
    expect(u.searchParams.get('programa')).toBe('p1');
    expect(u.searchParams.get('escopo')).toBeNull();
    expect(u.searchParams.get('q')).toBe('edital');
    expect(c.querySelector('#tabela-busca').value).toBe('edital');
    expect(c.querySelector('#tabela-origem').value).toBe('p1');
  });

  it('a busca espera a pessoa parar de digitar, volta à página 1 e vai para a URL', async () => {
    const c = await montar(<AdminNoticias />, '/admin/noticias?page=3');
    vi.useFakeTimers();
    const antes = pedidos.length;
    const campo = c.querySelector('#tabela-busca');
    const setValor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await act(async () => { setValor.call(campo, 'seleção'); campo.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(pedidos.length).toBe(antes); // ainda não consultou
    await act(async () => { vi.advanceTimersByTime(400); });
    vi.useRealTimers();
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    const u = new URL(ultimaLista().url);
    expect(u.searchParams.get('q')).toBe('seleção');
    expect(u.searchParams.get('page')).toBe('1');
    expect(localizacao.search).not.toContain('page=3');
  });

  it('erro de rede/permissão NÃO vira lista vazia: mostra o erro e tenta de novo', async () => {
    let falha = true;
    resposta = (u) => {
      if (u.includes('/api/news')) return falha ? { status: 500, corpo: { message: 'boom' } } : { corpo: paginado(1) };
      return { corpo: [] };
    };
    const c = await montar(<AdminNoticias />);
    expect(c.querySelector('[role=alert]').textContent).toContain('Não foi possível carregar a lista');
    expect(c.textContent).not.toContain('Nenhuma notícia ainda');
    expect(c.querySelector('table')).toBeNull();

    falha = false;
    await act(async () => { [...c.querySelectorAll('button')].find((b) => /Tentar de novo/.test(b.textContent)).click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(c.querySelector('[role=alert]')).toBeNull();
    expect(c.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('vazio sem filtro convida a criar; vazio com filtro oferece limpar', async () => {
    resposta = (u) => (u.includes('/api/news') ? { corpo: { items: [], total: 0, page: 1, limit: 20, pages: 1 } } : { corpo: [] });
    let c = await montar(<AdminNoticias />);
    expect(c.textContent).toContain('Nenhuma notícia ainda');
    expect(c.textContent).toContain('Nova Notícia');
    root.unmount(); container.remove();

    c = await montar(<AdminNoticias />, '/admin/noticias?q=xyz');
    expect(c.textContent).toContain('Nenhum resultado para estes filtros');
    const limpar = [...c.querySelectorAll('button')].filter((b) => /Limpar filtros/.test(b.textContent));
    expect(limpar.length).toBeGreaterThan(0);
    await act(async () => { limpar[0].click(); });
    expect(localizacao.search).toBe('');
  });

  it('o filtro de origem lista os programas; o Gestor de Programa não o vê e consulta só o programa dele', async () => {
    let c = await montar(<AdminNoticias />);
    const opcoes = [...c.querySelectorAll('#tabela-origem option')].map((o) => o.textContent);
    expect(opcoes).toEqual(['Somente PRPG (sem programa)', 'Todas (PRPG e programas)', 'PPGX']);
    root.unmount(); container.remove(); pedidos.length = 0;

    localStorage.setItem('roles', JSON.stringify(['GestorPrograma']));
    localStorage.setItem('gestorPrograma', JSON.stringify({ id: 'p1', sigla: 'PPGX' }));
    c = await montar(<AdminNoticias />);
    expect(c.querySelector('#tabela-origem')).toBeNull();
    const u = new URL(ultimaLista().url);
    expect(u.searchParams.get('programa')).toBe('p1');
    expect(u.searchParams.get('escopo')).toBeNull();
  });

  it('ações têm nome acessível e a exclusão confirma, chama DELETE e recarrega', async () => {
    resposta = (u, o) => {
      if (o.method === 'DELETE') return { corpo: {} };
      if (u.includes('/api/news')) return { corpo: paginado(2) };
      return { corpo: [] };
    };
    const c = await montar(<AdminNoticias />);
    expect(c.querySelector('a[aria-label="Editar Notícia 1"]').getAttribute('href')).toBe('/admin/noticias/editar/n1');
    const excluir = c.querySelector('button[aria-label="Excluir Notícia 1"]');
    await act(async () => { excluir.click(); });
    const dialogo = document.querySelector('[role=alertdialog]');
    expect(dialogo.textContent).toContain('excluir esta notícia');
    await act(async () => { [...dialogo.querySelectorAll('button')].find((b) => b.textContent === 'Confirmar').click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    const del = pedidos.find((p) => p.metodo === 'DELETE');
    expect(del.url).toContain('/api/news/n1');
    expect(pedidos.filter((p) => p.url.includes('/api/news?')).length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector('[role=status]').textContent).toContain('Notícia excluída');
  });

  it('rascunho aparece marcado na linha', async () => {
    const c = await montar(<AdminNoticias />);
    const linha2 = [...c.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes('Notícia 2'));
    expect(linha2.textContent).toContain('Rascunho');
  });

  it('seleção em massa marca os itens da página e oferece excluir os selecionados', async () => {
    const c = await montar(<AdminNoticias />);
    const todos = c.querySelector('thead input[type=checkbox]');
    await act(async () => { todos.click(); });
    expect(c.textContent).toContain('20 itens selecionados');
    expect(c.textContent).toContain('Excluir selecionados');
  });

  it('páginas fixas: pedem só as não vazias, mostram o cadeado e não podem ser excluídas nem selecionadas', async () => {
    resposta = (u) => {
      if (u.includes('/api/programas')) return { corpo: [{ id: 'p1', sigla: 'PPGX', nome: 'X', slug: 'ppgx' }] };
      if (u.includes('/api/pages')) {
        return { corpo: { items: [
          { id: 'a', title: 'Regimento', slug: 'regimento', programaId: 'p1', chave: null, status: 'PUBLICADO' },
          { id: 'b', title: 'Sobre', slug: 'sobre', programaId: 'p1', chave: 'sobre', status: 'PUBLICADO' },
        ], total: 2, page: 1, limit: 20, pages: 1 } };
      }
      return { corpo: [] };
    };
    const c = await montar(<AdminPagesList />, '/admin/paginas');
    const u = new URL(ultimaLista('/api/pages?').url);
    expect(u.searchParams.get('semFixasVazias')).toBe('1');
    const linhas = [...c.querySelectorAll('tbody tr')];
    expect(linhas[0].querySelector('button[aria-label="Excluir Regimento"]')).toBeTruthy();
    expect(linhas[0].querySelector('a[href="/ppgx/regimento"]')).toBeTruthy();
    expect(linhas[1].textContent).toContain('Fixa');
    expect(linhas[1].querySelector('button[aria-label="Excluir Sobre"]')).toBeNull();
    expect(linhas[1].querySelector('input[type=checkbox]')).toBeNull();
    expect(linhas[0].querySelector('input[type=checkbox]')).toBeTruthy();
  });
});

describe('formatação de datas do painel', () => {
  it('curta, longa e período — sem deslocamento de fuso', () => {
    expect(dataCurta('2026-03-05')).toBe('05/03/2026');
    expect(dataCurta(null)).toBe('—');
    expect(dataCurta('texto livre')).toBe('texto livre');
    expect(dataLonga('2026-03-05')).toBe('5 de Março, 2026');
    expect(periodo('2026-02-01', '2026-06-30')).toBe('01/02/2026 até 30/06/2026');
    expect(periodo('2026-02-01', null)).toBe('01/02/2026');
    expect(periodo(null, null, '-')).toBe('-');
  });
});
