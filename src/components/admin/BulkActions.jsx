import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { API_URL, apiFetch } from '../../api';

/**
 * Seleção em massa para as listas do painel admin.
 *
 * `items` é o array atualmente renderizado (já filtrado, quando há busca), de
 * modo que "selecionar todos" marca apenas o que está visível. `getId` extrai a
 * chave de cada item (padrão: `item.id`).
 */
export function useBulkSelection(items, getId = (it) => it.id) {
  const [selected, setSelected] = useState(() => new Set());

  const ids = useMemo(() => items.map(getId), [items, getId]);

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allOn = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allOn) {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...ids]);
    });
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id) => selected.has(id), [selected]);

  // Restringe aos itens atualmente visíveis (evita excluir itens fora do filtro).
  const selectedIds = useMemo(() => ids.filter((id) => selected.has(id)), [ids, selected]);
  const allSelected = ids.length > 0 && selectedIds.length === ids.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  };
}

const checkboxClass =
  'h-4 w-4 rounded border-gray-300 text-ufrpe-blue focus:ring-ufrpe-yellow cursor-pointer align-middle';

/** Checkbox do cabeçalho ("selecionar todos") com estado indeterminado. */
export function SelectAllCheckbox({ allSelected, someSelected, onToggle, disabled }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allSelected}
      disabled={disabled}
      onChange={onToggle}
      className={checkboxClass}
      aria-label="Selecionar todos"
      title="Selecionar todos"
    />
  );
}

/** Checkbox de uma linha da tabela. */
export function RowCheckbox({ checked, onToggle, label = 'Selecionar item' }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onToggle}
      className={checkboxClass}
      aria-label={label}
    />
  );
}

/** Barra de ações em massa, exibida quando há itens selecionados. */
export function BulkActionBar({ count, onDelete, onClear, deleting }) {
  if (!count) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 px-4 py-3 bg-ufrpe-blue/5 border border-ufrpe-blue/20 rounded-lg">
      <span className="text-sm font-medium text-ufrpe-blue">
        {count === 1 ? '1 item selecionado' : `${count} itens selecionados`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-60"
        >
          <X size={16} />
          Limpar seleção
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-60"
        >
          <Trash2 size={16} />
          {deleting ? 'Excluindo...' : 'Excluir selecionados'}
        </button>
      </div>
    </div>
  );
}

/**
 * Exclui em massa via DELETE individual por item (não há endpoint em lote).
 * `apiPath` ex.: `/api/news`. Retorna { succeeded, failed }.
 */
export async function bulkDelete(apiPath, ids, { onUnauthorized } = {}) {
  let unauthorized = false;
  const results = await Promise.allSettled(
    ids.map((id) =>
      apiFetch(`${apiPath}/${encodeURIComponent(id)}`, { method: 'DELETE' }).then((res) => {
        if (res.status === 401 || res.status === 403) unauthorized = true;
        if (!res.ok) throw new Error(String(res.status));
        return id;
      })
    )
  );
  if (unauthorized && onUnauthorized) onUnauthorized();
  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  return { succeeded, failed: ids.length - succeeded };
}

export { API_URL };
