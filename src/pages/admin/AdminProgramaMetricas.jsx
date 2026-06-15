import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { API_URL } from '../../api';

const CAMPOS = [
  { key: 'docentes_permanentes', label: 'Docentes Permanentes' },
  { key: 'discentes_mestrado', label: 'Discentes Mestrado' },
  { key: 'discentes_doutorado', label: 'Discentes Doutorado' },
  { key: 'discentes_profissional', label: 'Discentes Profissional' },
  { key: 'producao_artigos', label: 'Artigos Publicados' },
  { key: 'teses_defendidas', label: 'Teses/Diss. Defendidas' },
  { key: 'bolsistas_capes', label: 'Bolsistas CAPES' },
];

const EMPTY = { ano: new Date().getFullYear(), docentes_permanentes: '', discentes_mestrado: '',
  discentes_doutorado: '', discentes_profissional: '', producao_artigos: '',
  teses_defendidas: '', bolsistas_capes: '', observacao: '' };

const h = { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };

export default function AdminProgramaMetricas() {
  const { id } = useParams();
  const [metricas, setMetricas] = useState([]);
  const [programa, setPrograma] = useState(null);
  const [editando, setEditando] = useState(null); // null | 'new' | metrica_id
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch(`${API_URL}/api/metricas?programa=${id}`, { headers: { Authorization: h.Authorization } }),
      fetch(`${API_URL}/api/programas/${id}`),
    ]);
    if (r1.ok) setMetricas(await r1.json());
    if (r2.ok) setPrograma(await r2.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const startNew = () => { setForm({ ...EMPTY }); setEditando('new'); setError(''); };
  const startEdit = (m) => { setForm({ ...m }); setEditando(m.id); setError(''); };
  const cancelEdit = () => { setEditando(null); setError(''); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.ano) return setError('Ano é obrigatório');
    setSaving(true); setError('');
    const isNew = editando === 'new';
    const url = isNew ? `${API_URL}/api/metricas` : `${API_URL}/api/metricas/${editando}`;
    const method = isNew ? 'POST' : 'PUT';
    const payload = { ...form, programa_id: id };
    const r = await fetch(url, { method, headers: h, body: JSON.stringify(payload) });
    if (r.ok) { setEditando(null); load(); }
    else { const d = await r.json(); setError(d.message || 'Erro ao salvar'); }
    setSaving(false);
  };

  const handleDelete = async (metricaId) => {
    if (!confirm('Remover esta métrica?')) return;
    await fetch(`${API_URL}/api/metricas/${metricaId}`, { method: 'DELETE', headers: { Authorization: h.Authorization } });
    load();
  };

  const titulo = programa ? `${programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla + ' — ' : ''}${programa.nome}` : '…';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/programas" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 truncate">{titulo}</p>
          <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue">Métricas Anuais</h2>
        </div>
        {editando === null && (
          <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-ufrpe-blue text-white rounded-md hover:bg-[#2a3a66] text-sm font-medium">
            <Plus size={16} /> Novo Ano
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

      {/* Form de edição / criação */}
      {editando !== null && (
        <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-200">
          <h3 className="font-medium text-gray-700 mb-4">{editando === 'new' ? 'Novo registro' : `Editando ano ${form.ano}`}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Ano *</label>
              <input type="number" name="ano" value={form.ano} onChange={handleChange} min="2000" max="2099"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            {CAMPOS.map((c) => (
              <div key={c.key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{c.label}</label>
                <input type="number" name={c.key} value={form[c.key] ?? ''} onChange={handleChange} min="0"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
            ))}
            <div className="col-span-2 sm:col-span-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Observação</label>
              <input type="text" name="observacao" value={form.observacao || ''} onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Ex: Dados preliminares" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelEdit} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50">
              <Save size={15} /> {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="py-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ufrpe-blue"></div></div>
      ) : metricas.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-10">Nenhum registro de métricas. Clique em "Novo Ano" para adicionar.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Ano</th>
                {CAMPOS.map((c) => <th key={c.key} className="px-3 py-3 text-center whitespace-nowrap">{c.label}</th>)}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {metricas.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-ufrpe-blue">{m.ano}</td>
                  {CAMPOS.map((c) => (
                    <td key={c.key} className="px-3 py-3 text-center text-gray-700">
                      {m[c.key] != null ? m[c.key] : <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => startEdit(m)} className="text-ufrpe-blue hover:opacity-70 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:opacity-70"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
