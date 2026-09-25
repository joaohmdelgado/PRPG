import React, { useEffect, useState } from 'react';
import { Link2, Plus, Save, Trash2, Search } from 'lucide-react';
import { apiFetch } from '../../api';

// Editor de "Relacionados" (Fase N.5) nos formulários de notícia, edital,
// resolução, formulário e página: ligar este item a outros conteúdos. A
// ligação vale nos dois sentidos e é salva à parte do formulário.
export default function RelacionadosEditor({ tipo, id }) {
  const [itens, setItens] = useState(null);
  const [original, setOriginal] = useState('[]');
  const [busca, setBusca] = useState('');
  const [candidatos, setCandidatos] = useState([]);
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    apiFetch(`/api/referencias/${tipo}/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (vivo) { setItens(d); setOriginal(JSON.stringify(d.map((i) => `${i.tipo}:${i.id}`))); } })
      .catch(() => { if (vivo) setItens([]); });
    return () => { vivo = false; };
  }, [tipo, id]);

  useEffect(() => {
    if (busca.trim().length < 2) { setCandidatos([]); return undefined; }
    const t = setTimeout(() => {
      apiFetch(`/api/referencias-candidatos?q=${encodeURIComponent(busca.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setCandidatos)
        .catch(() => setCandidatos([]));
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  if (itens === null) return null;
  const chaves = new Set(itens.map((i) => `${i.tipo}:${i.id}`));
  const sujo = JSON.stringify(itens.map((i) => `${i.tipo}:${i.id}`)) !== original;
  const disponiveis = candidatos.filter((c) => !chaves.has(`${c.tipo}:${c.id}`) && !(c.tipo === tipo && c.id === id));

  const salvar = async () => {
    setSalvando(true);
    setMsg(null);
    const r = await apiFetch(`/api/referencias/${tipo}/${encodeURIComponent(id)}`, {
      method: 'PUT', json: { itens: itens.map((i) => ({ tipo: i.tipo, id: i.id })) },
    });
    const corpo = await r.json().catch(() => ({}));
    setSalvando(false);
    if (!r.ok) return setMsg({ tipo: 'erro', texto: corpo.message || 'Não foi possível salvar.' });
    setItens(corpo);
    setOriginal(JSON.stringify(corpo.map((i) => `${i.tipo}:${i.id}`)));
    return setMsg({ tipo: 'ok', texto: 'Relacionados salvos.' });
  };

  return (
    <fieldset className="md:col-span-2 border border-gray-200 rounded-lg p-4">
      <legend className="px-1 text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Link2 size={15} aria-hidden="true" /> Relacionados</legend>
      <p className="text-xs text-gray-500 mb-3">Aparecem no site junto deste item (e este aparece junto deles). Ex.: o edital e a resolução que o fundamenta.</p>
      {itens.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {itens.map((i, idx) => (
            <li key={`${i.tipo}-${i.id}`} className="flex items-center gap-2 text-sm">
              <span className="text-xs text-gray-500 w-20 shrink-0">{i.rotuloTipo}</span>
              <span className="flex-1 truncate">{i.titulo}{i.status !== 'PUBLICADO' && <span className="text-xs text-amber-700"> · {String(i.status).toLowerCase()} (não aparece no site)</span>}</span>
              <button type="button" onClick={() => setItens(itens.filter((_, j) => j !== idx))} aria-label={`Remover ${i.titulo}`} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <label htmlFor={`rel-busca-${tipo}`} className="sr-only">Buscar conteúdo para relacionar</label>
        <Search size={15} className="absolute left-2.5 top-2.5 text-gray-400" aria-hidden="true" />
        <input id={`rel-busca-${tipo}`} type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar notícia, edital, resolução, formulário ou página pelo título…"
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm" />
        {disponiveis.length > 0 && (
          <ul className="mt-1 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-auto bg-white">
            {disponiveis.map((c) => (
              <li key={`${c.tipo}-${c.id}`}>
                <button type="button" onClick={() => { setItens([...itens, c]); setBusca(''); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                  <Plus size={14} className="text-ufrpe-blue shrink-0" aria-hidden="true" />
                  <span className="text-xs text-gray-500 w-20 shrink-0">{c.rotuloTipo}</span>
                  <span className="truncate">{c.titulo}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button type="button" onClick={salvar} disabled={!sujo || salvando}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-ufrpe-blue text-white rounded-md disabled:opacity-40">
          <Save size={15} /> {salvando ? 'Salvando…' : 'Salvar relacionados'}
        </button>
        {sujo && <span className="text-xs text-amber-700">● Relacionados não salvos</span>}
        {msg && <span role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`text-xs ${msg.tipo === 'erro' ? 'text-red-700' : 'text-green-700'}`}>{msg.texto}</span>}
      </div>
    </fieldset>
  );
}
