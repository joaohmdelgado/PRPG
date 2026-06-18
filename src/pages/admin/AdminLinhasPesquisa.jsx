import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Plus, Trash2, Pencil, Check, X, Loader2, Search } from 'lucide-react';
import { API_URL } from '../../api';
import { isProgramaGestor, getGestorPrograma } from '../../auth';

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

const emptyForm = { nome: '', programa_id: '', target_id: '' };

export default function AdminLinhasPesquisa() {
  const [linhas, setLinhas] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filtroPrograma, setFiltroPrograma] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const isGestor = isProgramaGestor();
  const programa = getGestorPrograma();
  const meuProgramaId = programa?.id || null;

  useEffect(() => {
    load();
    fetchProgramas();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/linhas-pesquisa`, { headers: auth() });
      if (r.ok) setLinhas(await r.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchProgramas = async () => {
    try {
      const r = await fetch(`${API_URL}/api/programas`);
      if (r.ok) setProgramas(await r.json());
    } catch (e) { console.error(e); }
  };

  const criar = async () => {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return; }
    setSaving(true); setError('');
    try {
      const programaId = isGestor ? meuProgramaId : (form.programa_id || null);
      const r = await fetch(`${API_URL}/api/linhas-pesquisa`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ nome: form.nome, programa_id: programaId, target_id: form.target_id || null }),
      });
      const d = await r.json();
      if (r.ok) {
        setLinhas((prev) => [...prev, d].sort((a, b) => a.nome.localeCompare(b.nome)));
        setForm(emptyForm);
        setSuccess('Linha criada.');
        setTimeout(() => setSuccess(''), 3000);
      } else setError(d.message || 'Erro ao criar.');
    } catch { setError('Erro de conexão.'); }
    setSaving(false);
  };

  const iniciarEdicao = (l) => {
    setEditId(l.id);
    setEditForm({ nome: l.nome, programa_id: l.programa_id || '', target_id: l.target_id || '' });
  };

  const salvarEdicao = async (id) => {
    if (!editForm.nome.trim()) { setError('Nome é obrigatório.'); return; }
    setSaving(true); setError('');
    try {
      const programaId = isGestor ? meuProgramaId : (editForm.programa_id || null);
      const r = await fetch(`${API_URL}/api/linhas-pesquisa/${id}`, {
        method: 'PUT', headers: auth(),
        body: JSON.stringify({ nome: editForm.nome, programa_id: programaId, target_id: editForm.target_id || null }),
      });
      const d = await r.json();
      if (r.ok) {
        setLinhas((prev) => prev.map((l) => l.id === id ? d : l).sort((a, b) => a.nome.localeCompare(b.nome)));
        setEditId(null);
        setSuccess('Linha atualizada.');
        setTimeout(() => setSuccess(''), 3000);
      } else setError(d.message || 'Erro ao salvar.');
    } catch { setError('Erro de conexão.'); }
    setSaving(false);
  };

  const remover = async (id) => {
    if (!confirm('Remover esta linha de pesquisa? Isso removerá também as associações com programas e usuários.')) return;
    setSaving(true); setError('');
    try {
      const r = await fetch(`${API_URL}/api/linhas-pesquisa/${id}`, { method: 'DELETE', headers: auth() });
      if (r.ok) {
        setLinhas((prev) => prev.filter((l) => l.id !== id));
        setSuccess('Linha removida.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await r.json();
        setError(d.message || 'Erro ao remover.');
      }
    } catch { setError('Erro de conexão.'); }
    setSaving(false);
  };

  const nomeProg = (pid) => programas.find((p) => p.id === pid)?.sigla || programas.find((p) => p.id === pid)?.nome || '—';

  const linhasFiltradas = linhas.filter((l) => {
    const matchBusca = !search.trim() || l.nome.toLowerCase().includes(search.toLowerCase());
    const matchProg = !filtroPrograma || l.programa_id === filtroPrograma;
    return matchBusca && matchProg;
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <FlaskConical className="text-ufrpe-blue" size={24} />
        <div>
          <h1 className="font-heading text-2xl font-bold text-ufrpe-blue leading-tight">Linhas de Pesquisa</h1>
          <p className="text-sm text-gray-500">Cadastro central das linhas — referenciadas por programas, professores e alunos.</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg px-4 py-2.5 text-sm mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 border border-green-100 rounded-lg px-4 py-2.5 text-sm mb-4">{success}</div>}

      {/* Formulário de criação */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5 shadow-sm">
        <p className="text-sm font-medium text-gray-700 mb-3">
          {isGestor ? `Nova linha de pesquisa para ${programa?.sigla || programa?.nome}` : 'Nova linha de pesquisa'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm((v) => ({ ...v, nome: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && criar()}
              placeholder="Nome da linha *"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
            />
          </div>
          {!isGestor && (
            <div>
              <select
                value={form.programa_id}
                onChange={(e) => setForm((v) => ({ ...v, programa_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
              >
                <option value="">Programa (opcional)</option>
                {programas.map((p) => (
                  <option key={p.id} value={p.id}>{p.sigla || p.nome}</option>
                ))}
              </select>
            </div>
          )}
          <div className={`flex gap-2 ${!isGestor ? '' : 'md:col-span-2'}`}>
            <input
              type="text"
              value={form.target_id}
              onChange={(e) => setForm((v) => ({ ...v, target_id: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && criar()}
              placeholder="ID legado"
              title="ID legado do Drupal (target_id) — temporário, para importação"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
            />
            <button
              onClick={criar}
              disabled={saving || !form.nome.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-ufrpe-blue text-white rounded-lg text-sm font-medium hover:bg-ufrpe-blue/90 disabled:opacity-50 shrink-0"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar linhas..."
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
            <option value="__sem__">Sem programa</option>
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
        ) : linhasFiltradas.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            {linhas.length === 0 ? 'Nenhuma linha cadastrada.' : 'Nenhuma linha encontrada.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {linhasFiltradas
              .filter((l) => filtroPrograma === '__sem__' ? !l.programa_id : true)
              .map((l) => (
                <li key={l.id} className="px-5 py-3 group hover:bg-gray-50/60 transition-colors">
                  {editId === l.id ? (
                    <div className={`grid gap-2 items-center ${isGestor ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                      <input
                        type="text"
                        value={editForm.nome}
                        onChange={(e) => setEditForm((v) => ({ ...v, nome: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && salvarEdicao(l.id)}
                        autoFocus
                        className="border border-ufrpe-blue/30 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
                      />
                      {!isGestor && (
                        <select
                          value={editForm.programa_id}
                          onChange={(e) => setEditForm((v) => ({ ...v, programa_id: e.target.value }))}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
                        >
                          <option value="">Sem programa</option>
                          {programas.map((p) => (
                            <option key={p.id} value={p.id}>{p.sigla || p.nome}</option>
                          ))}
                        </select>
                      )}
                      <div className={`flex gap-2 items-center ${isGestor ? '' : ''}`}>
                        <input
                          type="text"
                          value={editForm.target_id}
                          onChange={(e) => setEditForm((v) => ({ ...v, target_id: e.target.value }))}
                          placeholder="ID legado"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
                        />
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
                      <span className="flex-1 text-sm text-gray-800">{l.nome}</span>
                      {l.programa_id && (
                        <span className="text-xs text-ufrpe-blue bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 shrink-0">
                          {nomeProg(l.programa_id)}
                        </span>
                      )}
                      {l.target_id && (
                        <span className="text-xs font-mono text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 shrink-0" title="ID legado">
                          {l.target_id}
                        </span>
                      )}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => iniciarEdicao(l)} disabled={saving}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-ufrpe-blue disabled:opacity-20" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => remover(l.id)} disabled={saving || isGestor}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-20"
                          title={isGestor ? 'Apenas administrador pode deletar' : 'Remover'}>
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

      {linhas.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-right">
          {linhasFiltradas.filter((l) => filtroPrograma === '__sem__' ? !l.programa_id : true).length} de {linhas.length} linha(s)
        </p>
      )}
    </div>
  );
}
