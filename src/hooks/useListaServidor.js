import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { lerJson } from '../api';
import { withProgramaScope } from '../auth';

export const ORIGEM_PRPG = 'prpg';
export const ORIGEM_TODAS = 'todas';

const LIMITES = [10, 20, 50];
const int = (v, padrao) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : padrao;
};

// Lista do painel com o estado na URL e a consulta no servidor (Fase U.3).
// Página, tamanho, busca, ordenação, situação e origem vivem em ?page=&limit=&q=
// &ordenar=&dir=&status=&programa=, então a lista pode ser recarregada,
// compartilhada por link e voltar com o botão do navegador. O que o servidor
// devolve é o contrato de server/utils/listagem.js: { items, total, page, limit, pages }.
//
//   endpoint:      '/api/news'
//   origemPadrao:  ORIGEM_PRPG | ORIGEM_TODAS — o que a lista mostra sem ?programa=
//   filtros:       nomes de parâmetros extras que a tela usa (repassados ao servidor)
//   ordenarPadrao: { campo, dir } aplicado quando a URL não pede ordenação
//   gestor:        Gestor de Programa: o servidor já recebe ?programa=<o dele> (withProgramaScope)
export default function useListaServidor(endpoint, {
  origemPadrao = ORIGEM_PRPG, filtros = [], ordenarPadrao, gestor = false, limitePadrao = 20, fixos = {},
} = {}) {
  const [params, setParams] = useSearchParams();

  const page = int(params.get('page'), 1);
  const limit = LIMITES.includes(int(params.get('limit'), 0)) ? int(params.get('limit'), limitePadrao) : limitePadrao;
  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const origem = params.get('programa') || origemPadrao;
  const ordenar = params.get('ordenar') || ordenarPadrao?.campo || '';
  const dir = params.get('dir') || (params.get('ordenar') ? 'asc' : ordenarPadrao?.dir) || 'asc';
  const extras = Object.fromEntries(filtros.map((f) => [f, params.get(f) || '']));

  // URL da consulta. Origem: 'prpg' → escopo=prpg; 'todas' → sem filtro; id → programa=<id>.
  const url = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q.trim()) p.set('q', q.trim());
    if (status) p.set('status', status);
    if (ordenar) { p.set('ordenar', ordenar); p.set('dir', dir); }
    if (!gestor) {
      if (origem === ORIGEM_PRPG) p.set('escopo', 'prpg');
      else if (origem !== ORIGEM_TODAS) p.set('programa', origem);
    }
    for (const [k, v] of Object.entries(extras)) if (v) p.set(k, v);
    for (const [k, v] of Object.entries(fixos)) p.set(k, v);
    return withProgramaScope(`${endpoint}?${p}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, limit, q, status, ordenar, dir, origem, gestor, JSON.stringify(extras), JSON.stringify(fixos)]);

  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });
  const contador = useRef(0);

  const carregar = useCallback(async () => {
    const minha = ++contador.current;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    try {
      const dados = await lerJson(url);
      if (minha === contador.current) setEstado({ dados, carregando: false, erro: null });
    } catch (erro) {
      // Mantém a página anterior na tela (esmaecida) e mostra o erro por cima.
      if (minha === contador.current) setEstado((e) => ({ ...e, carregando: false, erro }));
    }
  }, [url]);

  useEffect(() => {
    carregar();
    return () => { contador.current += 1; };
  }, [carregar]);

  // Muda um parâmetro. Trocar filtro, busca, ordem ou tamanho volta à página 1.
  const definir = useCallback((mudancas) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(mudancas)) {
        if (v === '' || v === null || v === undefined || (k === 'programa' && v === origemPadrao)) next.delete(k);
        else next.set(k, String(v));
      }
      if (!('page' in mudancas)) next.delete('page');
      if (next.get('page') === '1') next.delete('page');
      return next;
    }, { replace: true });
  }, [setParams, origemPadrao]);

  const alternarOrdem = useCallback((campo) => {
    const mesmo = ordenar === campo;
    definir({ ordenar: campo, dir: mesmo && dir === 'asc' ? 'desc' : 'asc' });
  }, [definir, ordenar, dir]);

  const limpar = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  const dados = estado.dados;
  // O servidor corrige uma página fora do intervalo (ex.: depois de excluir o último item da última página).
  const paginado = dados && !Array.isArray(dados);
  const items = paginado ? dados.items : (dados || []);
  const filtrosAtivos = !!(q.trim() || status || extras && Object.values(extras).some(Boolean) || (!gestor && origem !== origemPadrao));

  return {
    items,
    total: paginado ? dados.total : items.length,
    page: paginado ? dados.page : 1,
    pages: paginado ? dados.pages : 1,
    limit,
    extra: paginado ? dados : {},
    carregando: estado.carregando,
    primeiraCarga: estado.carregando && !estado.dados,
    erro: estado.erro,
    recarregar: carregar,
    q, status, origem, ordenar, dir, extras, filtrosAtivos,
    definir, alternarOrdem, limpar,
    LIMITES,
  };
}
