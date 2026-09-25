import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../api';

// Marcos do calendário acadêmico (Fase N.6): atividade + período como se
// escreve ("02/03/2026 a 06/03/2026", "até 24/04/2026") + edital opcional.
// O servidor tira as datas do período (server/utils/periodo.js) — a prévia
// abaixo de cada linha mostra o que ele vai entender, para quem digita
// conferir antes de salvar. Datas sem ano usam o ano do calendário.

const DATA = /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/g;
const valida = (d, m, a) => {
  const x = new Date(Date.UTC(a, m - 1, d));
  return a && x.getUTCMonth() === m - 1 && x.getUTCDate() === d;
};
const entender = (texto, ano) => {
  const datas = [...String(texto || '').matchAll(DATA)]
    .map(([, d, m, a]) => [Number(d), Number(m), Number(a || ano)])
    .filter(([d, m, a]) => valida(d, m, a))
    .map(([d, m, a]) => `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`);
  if (!datas.length) return null;
  const soPrazo = /^\s*at[eé](?=\s|$)/i.test(String(texto));
  const fim = datas[datas.length - 1];
  if (soPrazo) return `prazo final ${fim}`;
  return datas[0] === fim ? `em ${fim}` : `de ${datas[0]} a ${fim}`;
};

const campo = 'px-2.5 py-1.5 border border-gray-300 rounded-md text-sm';

export default function MarcosEditor({ marcos, onChange, ano }) {
  const [editais, setEditais] = useState([]);
  useEffect(() => {
    apiFetch('/api/editais?resumo=1')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setEditais((Array.isArray(d) ? d : d.items || []).sort((a, b) => a.title.localeCompare(b.title))))
      .catch(() => {});
  }, []);

  const set = (i, k, v) => onChange(marcos.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  const mover = (i, d) => {
    const lista = [...marcos];
    [lista[i], lista[i + d]] = [lista[i + d], lista[i]];
    onChange(lista);
  };

  return (
    <fieldset className="md:col-span-2">
      <legend className="block text-sm font-medium text-gray-700 mb-2">Principais datas e prazos</legend>
      <ol className="space-y-2">
        {marcos.map((m, i) => {
          const entendido = entender(m.date, ano);
          return (
            <li key={i} className="border border-gray-200 rounded-lg p-3">
              <div className="flex flex-wrap gap-2 items-start">
                <input aria-label={`Atividade ${i + 1}`} placeholder="Atividade (ex.: Matrícula de discentes)" value={m.event || ''}
                  onChange={(e) => set(i, 'event', e.target.value)} className={`${campo} flex-[2] min-w-[200px]`} />
                <input aria-label={`Período ${i + 1}`} placeholder="02/03/2026 a 06/03/2026" value={m.date || ''}
                  onChange={(e) => set(i, 'date', e.target.value)} className={`${campo} flex-1 min-w-[180px]`} />
                <select aria-label={`Edital ligado ao marco ${i + 1}`} value={m.editalId || ''} onChange={(e) => set(i, 'editalId', e.target.value)}
                  className={`${campo} bg-white max-w-[240px]`}>
                  <option value="">Sem edital</option>
                  {editais.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
                <div className="flex">
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir marco ${i + 1}`} className="p-1.5 text-gray-500 disabled:opacity-30"><ArrowUp size={16} /></button>
                  <button type="button" onClick={() => mover(i, 1)} disabled={i === marcos.length - 1} aria-label={`Descer marco ${i + 1}`} className="p-1.5 text-gray-500 disabled:opacity-30"><ArrowDown size={16} /></button>
                  <button type="button" onClick={() => onChange(marcos.filter((_, j) => j !== i))} aria-label={`Remover marco ${i + 1}`} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
              {m.date && (
                <p className={`text-xs mt-1.5 ${entendido ? 'text-gray-500' : 'text-amber-700'}`} role="status">
                  {entendido ? `Entendido: ${entendido} — entra nos próximos prazos e na agenda (.ics).` : 'Nenhuma data reconhecida (use dd/mm/aaaa): o marco aparece no site, mas não nos próximos prazos.'}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={() => onChange([...marcos, { event: '', date: '', editalId: '' }])}
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
        <Plus size={15} /> Adicionar data
      </button>
    </fieldset>
  );
}
