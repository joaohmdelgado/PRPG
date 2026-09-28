// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// Fase P.4 (docs/revisao-portal-conteudo-2026-09-24.md): o servidor embute
// menus e configurações num <script id="dados-portal"> do HTML inicial
// (server/seo/spa.js) — src/hooks/usePortal.js lê esse bloco em vez de
// esperar duas requisições depois do JavaScript.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;

const montar = async (Comp) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(<Comp />); });
  return container;
};

const colocarBloco = (dados) => {
  const el = document.createElement('script');
  el.id = 'dados-portal';
  el.type = 'application/json';
  el.textContent = JSON.stringify(dados);
  document.head.appendChild(el);
};

beforeEach(() => {
  localStorage.clear();
  document.getElementById('dados-portal')?.remove();
  vi.resetModules();
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  document.getElementById('dados-portal')?.remove();
  vi.unstubAllGlobals();
});

describe('usePortal — dados embutidos pelo servidor', () => {
  it('com o bloco no HTML, usa esses dados na hora e não busca a API', async () => {
    colocarBloco({ menus: { principal: [{ rotulo: 'Editais', destino: '/editais' }] }, config: { home: { titulo: 'Título do banner' } } });
    const fetchEspiao = vi.fn(() => { throw new Error('não deveria buscar — os dados já estão no HTML'); });
    vi.stubGlobal('fetch', fetchEspiao);

    const { useMenu, useConfig } = await import('../hooks/usePortal.js');
    let valores;
    function Sonda() { valores = { menu: useMenu('principal'), home: useConfig('home') }; return null; }
    await montar(Sonda);

    expect(valores.menu).toEqual([{ rotulo: 'Editais', destino: '/editais' }]);
    expect(valores.home).toEqual({ titulo: 'Título do banner' });
    expect(fetchEspiao).not.toHaveBeenCalled();
  });

  it('sem o bloco (build antigo em cache, ou ambiente sem SPA_DIST_DIR), busca a API como antes', async () => {
    const chamadas = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      chamadas.push(String(url));
      const corpo = String(url).includes('/menus') ? { principal: [{ rotulo: 'Notícias', destino: '/noticias' }] } : { home: { titulo: 'Da API' } };
      return { ok: true, json: async () => corpo };
    }));

    const { useMenu } = await import('../hooks/usePortal.js');
    let valor;
    function Sonda() { valor = useMenu('principal'); return null; }
    await montar(Sonda);
    await act(async () => { await Promise.resolve(); });

    expect(chamadas.some((u) => u.includes('/api/menus'))).toBe(true);
    expect(chamadas.some((u) => u.includes('/api/configuracoes'))).toBe(true);
    expect(valor).toEqual([{ rotulo: 'Notícias', destino: '/noticias' }]);
  });

  it('bloco malformado (JSON quebrado) não derruba a página — cai para a busca normal', async () => {
    const el = document.createElement('script');
    el.id = 'dados-portal';
    el.type = 'application/json';
    el.textContent = '{ isto não é json';
    document.head.appendChild(el);
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true,
      json: async () => (String(url).includes('/menus') ? {} : {}),
    })));

    const { useMenu } = await import('../hooks/usePortal.js');
    let valor;
    function Sonda() { valor = useMenu('principal'); return null; }
    await montar(Sonda);
    expect(valor).toEqual([]);
  });
});
