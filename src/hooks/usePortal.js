import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

// Menus, atalhos e contato do portal (Fase H.1), editados no painel em
// "Menus e portal". Uma única busca por carregamento do site, compartilhada
// por Navbar, Footer, Home e cabeçalhos. A última resposta fica no
// localStorage: numa nova visita o menu aparece na hora e é atualizado quando
// a API responde (sem ela, a primeira visita mostra o menu um instante depois).

const CHAVE_CACHE = 'prpg.portal.v1';

const lerCache = () => {
  try {
    const bruto = window.localStorage.getItem(CHAVE_CACHE);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
};

let estado = lerCache() || { menus: {}, config: {}, carregado: false };
let promessa = null;
const ouvintes = new Set();

const carregar = () => {
  promessa ||= Promise.all([
    apiFetch('/api/menus').then((r) => (r.ok ? r.json() : Promise.reject(r))),
    apiFetch('/api/configuracoes').then((r) => (r.ok ? r.json() : Promise.reject(r))),
  ]).then(([menus, config]) => {
    estado = { menus, config, carregado: true };
    try { window.localStorage.setItem(CHAVE_CACHE, JSON.stringify(estado)); } catch { /* sem armazenamento */ }
    ouvintes.forEach((fn) => fn(estado));
  }).catch(() => {
    promessa = null; // tenta de novo na próxima montagem
  });
  return promessa;
};

// Para o editor do painel: depois de salvar, o site reflete na hora.
export const recarregarPortal = () => {
  promessa = null;
  return carregar();
};

export default function usePortal() {
  const [atual, setAtual] = useState(estado);
  useEffect(() => {
    ouvintes.add(setAtual);
    carregar();
    return () => { ouvintes.delete(setAtual); };
  }, []);
  return atual;
}

// Atalhos de uso comum.
export const useMenu = (chave) => usePortal().menus?.[chave] || [];
export const useConfig = (chave) => usePortal().config?.[chave] || {};

// Destino externo abre em nova aba; interno usa o roteador.
export const ehExterno = (destino) => /^(https?:)?\/\//i.test(destino || '') || /^(mailto|tel):/i.test(destino || '');

// Telefone de exibição -> link tel: (só dígitos e +).
export const linkTelefone = (t) => `tel:${String(t || '').replace(/[^\d+]/g, '')}`;
