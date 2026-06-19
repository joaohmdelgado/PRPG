import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X, Loader2, Search } from 'lucide-react';
import { API_URL } from '../../api';
import { isProgramaGestor, getGestorPrograma } from '../../auth';
import { useConfirm } from './ConfirmModal';
import { useToast } from './Toast';

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

// CRUD completo de um único campo de taxonomia de referência (entrada,
// situacao_aluno, ...). Cada valor pode ser global (padrão) ou específico de um
// programa, e carrega o target_id legado usado na importação. É a fonte única
// dessas listas — a mesma consumida pelo formulário do aluno e pela importação.
//
// Props:
//   campo            id do campo em taxonomia_refs (ex.: 'entrada')
//   valorPlaceholder placeholder do input de valor
export default function TaxonomiaRefManager({ campo, valorPlaceholder = 'Valor' }) {
  const emptyForm = { valor: '', programa_id: '', target_id: '' };

  const [refs, setRefs] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filtroPrograma, setFiltroPrograma] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const { confirm, ConfirmModal } = useConfirm();
  const { toast, Toasts } = useToast();

  const isGestor = isProgramaGestor();
  const programa = getGestorPrograma();
  const meuProgramaId = programa?.id || null;

  useEffect(() => {
    load();
    fetchProgramas();
  }, [campo]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/taxonomia-refs?campo=${encodeURIComponent(campo)}`, { headers: auth() });
      if (r.ok) setRefs(await r.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchProgramas = async () => {
    try {
      const r = await fetch(`${API_URL}/api/programas`);
      if (r.ok) setProgramas(await r.json());
    } catch (e) { console.error(e); }
  };

  const ordenar = (lista) =>
    [...lista].sort((a, b) => a.valor.localeCompare(b.valor, 'pt', { numeric: true }));

  const criar = async () => {
    if (!form.valor.trim()) { setError('Valor é obrigatório.'); return; }
    setSaving(true); setError('');
    try {
      const programaId = isGestor ? meuProgramaId : (form.programa_id || null);
      const r = await fetch(`${API_URL}/api/taxonomia-refs`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ campo, valor: form.valor, programa_id: programaId, target_id: form.target_id || null }),
      });
      const d = await r.json();
      if (r.ok) {
        setRefs((prev) => ordenar([...prev, d]));
        setForm(emptyForm);
        toast.success('Adicionado.');
      } else setError(d.message || 'Erro ao criar.');
    } catch { setError('Erro de conexão.'); }
    setSaving(false);
  };

  const iniciarEdicao = (ref) => {
    setEditId(ref.id);
    setEditForm({ valor: ref.valor, programa_id: ref.programa_id || '', target_id: ref.target_id || '' });
  };

  const salvarEdicao = async (id) => {
    if (!editForm.valor.trim()) { setError('Valor é obrigatório.'); return; }
    setSaving(true); setError('');
    try {
      const programaId = isGestor ? meuProgramaId : (editForm.programa_id || null);
      const r = await fetch(`${API_URL}/api/taxonomia-refs/${id}`, {
        method: 'PUT', headers: auth(),
        body: JSON.stringify({ campo, valor: editForm.valor, programa_id: programaId, target_id: editForm.target_id || null }),
      });
      const d = await r.json();
      if (r.ok) {
        setRefs((prev) => ordenar(prev.map((l) => l.id === id ? d : l)));
        setEditId(null);
        toast.success('Atualizado.');
      } else setError(d.message || 'Erro ao salvar.');
    } catch { setError('Erro de conexão.'); }
    setSaving(false);
  };

  const remover = async (id) => {
    if (!await confirm('Remover este item?')) return;
    setSaving(true); setError('');
    try {
      const r = await fetch(`${API_URL}/api/taxonomia-refs/${id}`, { method: 'DELETE', headers: auth() });
      if (r.ok) {
        setRefs((prev) => prev.filter((l) => l.id !== id));
        toast.success('Removido.');
      } else {
        const d = await r.json();
        toast.error(d.message || 'Erro ao remover.');
      }
    } catch { toast.error('Erro de conexão.'); }
    setSaving(false);
  };

  const nomeProg = (pid) => programas.find((p) => p.id === pid)?.sigla || programas.find((p) => p.id === pid)?.nome || '—';

  const refsFiltradas = ordenar(refs).filter((l) => {
    const matchBusca = !search.trim() || l.valor.toLowerCase().includes(search.toLowerCase()) || (l.target_id || '').includes(search.trim());
    const matchProg = !filtroPrograma
      ? true
      : filtroPrograma === '__global__' ? !l.programa_id : l.programa_id === filtroPrograma;
    return matchBusca && matchProg;
  });

  return (
    <div className="w-full">
      {error && <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg px-4 py-2.5 text-sm mb-4">{error}</div>}

      {/* Formulário de criação */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5 shadow-sm">
        <p className="text-sm font-medium text-gray-700 mb-3">
          {isGestor ? `Novo item para ${programa?.sigla || programa?.nome}` : 'Novo item'}
        </p>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-gray-500 mb-1">Valor *</label>
            <input
              type="text"
              value={form.valor}
              onChange={(e) => setForm((v) => ({ ...v, valor: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && criar()}
              placeholder={valorPlaceholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
            />
          </div>
          {!isGestor && (
            <div className="min-w-44">
              <label className="block text-xs text-gray-500 mb-1">Programa</label>
              <select
                value={form.programa_id}
                onChange={(e) => setForm((v) => ({ ...v, programa_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
              >
                <option value="">Global (padrão)</option>
                {programas.map((p) => (
                  <option key={p.id} value={p.id}>{p.sigla || p.nome}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">ID legado</label>
            <input
              type="text"
              value={form.target_id}
              onChange={(e) => setForm((v) => ({ ...v, target_id: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && criar()}
              placeholder="target_id"
              title="ID legado do site antigo (target_id) — usado só na importação. Pode deixar vazio."
              className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
            />
          </div>
          <button
            onClick={criar}
            disabled={saving || !form.valor.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-ufrpe-blue text-white rounded-lg text-sm font-medium hover:bg-ufrpe-blue/90 disabled:opacity-50 shrink-0 whitespace-nowrap"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Adicionar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar valor ou ID legado..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
          />
        </div>
        {!isGestor && (
          <select
            value={filtroPrograma}
            onChange={(e) => setFiltroPrograma(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-ufrpe-blue/30 outline-none min-w-40"
          >
            <option value="">Todos os programas</option>
            <option value="__global__">Global (padrão)</option>
            {programas.map((p) => (
              <option key={p.id} value={p.id}>{p.sigla || p.nome}</option>
            ))}
          </select>
        )}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <Loader2 size={22} className="animate-spin mr-2" /> Carregando…
          </div>
        ) : refsFiltradas.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            {refs.length === 0 ? 'Nenhum item cadastrado.' : 'Nenhum item encontrado.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {refsFiltradas.map((l) => (
              <li key={l.id} className="px-5 py-3 group hover:bg-gray-50/60 transition-colors">
                {editId === l.id ? (
                  <div className="flex gap-2 items-center flex-wrap">
                    <input
                      type="text"
                      value={editForm.valor}
                      onChange={(e) => setEditForm((v) => ({ ...v, valor: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && salvarEdicao(l.id)}
                      autoFocus
                      className="flex-1 min-w-32 border border-ufrpe-blue/30 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
                    />
                    {!isGestor && (
                      <select
                        value={editForm.programa_id}
                        onChange={(e) => setEditForm((v) => ({ ...v, programa_id: e.target.value }))}
                        className="min-w-40 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
                      >
                        <option value="">Global (padrão)</option>
                        {programas.map((p) => (
                          <option key={p.id} value={p.id}>{p.sigla || p.nome}</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      value={editForm.target_id}
                      onChange={(e) => setEditForm((v) => ({ ...v, target_id: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && salvarEdicao(l.id)}
                      placeholder="target_id"
                      className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
                    />
                    <div className="flex gap-2 items-center shrink-0">
                      <button onClick={() => salvarEdicao(l.id)} disabled={saving}
                        className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50">
                        <Check size={15} />
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-gray-800 font-medium">{l.valor}</span>
                    {l.programa_id ? (
                      <span className="text-xs text-ufrpe-blue bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 shrink-0">
                        {nomeProg(l.programa_id)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 shrink-0">
                        global
                      </span>
                    )}
                    <span className="text-xs font-mono text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 shrink-0 w-16 text-center" title="ID legado (importação)">
                      {l.target_id || '—'}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => iniciarEdicao(l)} disabled={saving}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-ufrpe-blue disabled:opacity-20" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remover(l.id)} disabled={saving}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-20" title="Remover">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {refs.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-right">
          {refsFiltradas.length} de {refs.length} item(ns)
        </p>
      )}
      {ConfirmModal}
      {Toasts}
    </div>
  );
}
