import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../api';

// Filtro de origem das listas do painel (Fase R.6): antes as listas gerais
// escondiam o conteúdo dos programas, e o gestor da PRPG não encontrava itens
// que o público via em /noticias e /editais. O estado fica na URL
// (?programa=<id> ou ?programa=todas) para que links como os de "Site do
// Programa" abram a lista já filtrada. Sem parâmetro = só PRPG, o
// comportamento anterior.

export const ORIGEM_PRPG = 'prpg';
export const ORIGEM_TODAS = 'todas';

export function filtrarPorOrigem(items, origem) {
  if (origem === ORIGEM_TODAS) return items;
  if (!origem || origem === ORIGEM_PRPG) return items.filter((i) => !i.programaId);
  return items.filter((i) => i.programaId === origem);
}

// `padrao`: o que a lista mostra sem ?programa=. Notícias/Editais abrem em
// "só PRPG" (como antes); listas cujo conteúdo é quase todo de programas
// (disciplinas, teses...) abrem em "todas".
export function useOrigemFiltro(padrao = ORIGEM_PRPG) {
  const [params, setParams] = useSearchParams();
  const origem = params.get('programa') || padrao;
  const setOrigem = (valor) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    if (!valor || valor === padrao) next.delete('programa');
    else next.set('programa', valor);
    return next;
  }, { replace: true });
  return [origem, setOrigem];
}

// Lista enxuta (id, rótulo) dos programas para o seletor e para o selo nas linhas.
export function useProgramasResumo(ativo = true) {
  const [programas, setProgramas] = useState([]);
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    apiFetch('/api/programas', { auth: false })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!vivo || !Array.isArray(data)) return;
        setProgramas(data
          .map((p) => ({ id: p.id, rotulo: p.sigla && p.sigla !== 'S/SIGLA' ? p.sigla : p.nome }))
          .sort((a, b) => (a.rotulo || '').localeCompare(b.rotulo || '', 'pt-BR')));
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [ativo]);
  return programas;
}

export default function OrigemFiltro({ value, onChange, programas, id = 'filtro-origem' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <label htmlFor={id} className="text-sm text-gray-600 shrink-0">Origem</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
      >
        <option value={ORIGEM_PRPG}>Somente PRPG (sem programa)</option>
        <option value={ORIGEM_TODAS}>Todas (PRPG e programas)</option>
        {programas.map((p) => (
          <option key={p.id} value={p.id}>{p.rotulo}</option>
        ))}
      </select>
    </div>
  );
}

export function SeloPrograma({ programaId, programas }) {
  if (!programaId) return null;
  const p = programas.find((x) => x.id === programaId);
  return (
    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 align-middle">
      {p?.rotulo || 'Programa'}
    </span>
  );
}
