import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import React, { useState, useEffect } from 'react';
import { Save, Trash2, Edit2, X, GraduationCap, Users, Award, BarChart3 } from 'lucide-react';
import { API_URL } from '../../api';

const INT_FIELDS = [
  { key: 'docentes_permanentes', label: 'Docentes permanentes' },
  { key: 'discentes_mestrado', label: 'Discentes — Mestrado' },
  { key: 'discentes_doutorado', label: 'Discentes — Doutorado' },
  { key: 'discentes_profissional', label: 'Discentes — Prof.' },
  { key: 'producao_artigos', label: 'Artigos no ano' },
  { key: 'teses_defendidas', label: 'Teses/dissert. defendidas' },
  { key: 'bolsistas_capes', label: 'Bolsistas CAPES' },
];
const PCT_FIELDS = [
  { key: 'taxa_conclusao', label: 'Taxa de conclusão (%)' },
  { key: 'indice_internacionalizacao', label: 'Internacionalização (%)' },
];

const emptyForm = {
  programa_id: '', ano: new Date().getFullYear(),
  docentes_permanentes: '', discentes_mestrado: '', discentes_doutorado: '', discentes_profissional: '',
  producao_artigos: '', teses_defendidas: '', bolsistas_capes: '',
  taxa_conclusao: '', indice_internacionalizacao: '', observacao: '',
};

const num = (v) => (v == null || v === '' ? 0 : Number(v));

export default function AdminMetricas() {
  const [programas, setProgramas] = useState([]);
  const [metricas, setMetricas] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    try {
      const [pr, mr] = await Promise.all([
        fetch(`${API_URL}/api/programas`).then((r) => r.json()),
        fetch(`${API_URL}/api/metricas`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : [])),
      ]);
      setProgramas(pr);
      setMetricas(mr);
    } catch (e) {
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); }, []);

  const programaLabel = (id) => {
    const p = programas.find((x) => x.id === id);
    return p ? (p.sigla || p.nome) : id;
  };
  const discentesTotal = (m) => num(m.discentes_mestrado) + num(m.discentes_doutorado) + num(m.discentes_profissional);

  // Última métrica (maior ano) por programa — base do resumo.
  const latestByPrograma = (() => {
    const map = new Map();
    for (const m of metricas) {
      const cur = map.get(m.programa_id);
      if (!cur || m.ano > cur.ano) map.set(m.programa_id, m);
    }
    return Array.from(map.values()).sort((a, b) => discentesTotal(b) - discentesTotal(a));
  })();

  const totals = latestByPrograma.reduce(
    (acc, m) => ({
      docentes: acc.docentes + num(m.docentes_permanentes),
      discentes: acc.discentes + discentesTotal(m),
      bolsistas: acc.bolsistas + num(m.bolsistas_capes),
    }),
    { docentes: 0, discentes: 0, bolsistas: 0 }
  );
  const maxDiscentes = Math.max(1, ...latestByPrograma.map(discentesTotal));

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const startEdit = (m) => {
    setEditingId(m.id);
    const filled = { ...emptyForm };
    Object.keys(emptyForm).forEach((k) => { filled[k] = m[k] == null ? '' : m[k]; });
    setForm(filled);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.programa_id) { setError('Selecione um programa.'); return; }
    if (!form.ano) { setError('Informe o ano.'); return; }

    const url = editingId ? `${API_URL}/api/metricas/${editingId}` : `${API_URL}/api/metricas`;
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(form) });
    if (res.ok) {
      cancelEdit();
      fetchAll();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.message || 'Erro ao salvar.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este registro de métricas?')) return;
    const res = await fetch(`${API_URL}/api/metricas/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) fetchAll();
  };

  if (loading) return <TableSkeleton />;

  const Card = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}><Icon size={22} /></div>
      <div>
        <div className="text-2xl font-bold text-gray-800">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue">Dashboard de Indicadores</h2>
        <p className="text-sm text-gray-500 mt-1">
          Resumo com base no último ano informado de cada programa. Os dados são um <em>snapshot</em> anual — mantenha-os atualizados.
        </p>
      </div>

      {/* Cartões de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={GraduationCap} label="Docentes permanentes" value={totals.docentes} color="bg-ufrpe-blue/10 text-ufrpe-blue" />
        <Card icon={Users} label="Discentes (M+D+P)" value={totals.discentes} color="bg-emerald-100 text-emerald-700" />
        <Card icon={Award} label="Bolsistas CAPES" value={totals.bolsistas} color="bg-amber-100 text-amber-700" />
        <Card icon={BarChart3} label="Programas com dados" value={latestByPrograma.length} color="bg-violet-100 text-violet-700" />
      </div>

      {/* Comparativo de discentes por programa */}
      {latestByPrograma.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-heading font-semibold text-ufrpe-blue mb-4">Discentes por programa (último ano)</h3>
          <div className="space-y-3">
            {latestByPrograma.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-sm text-gray-700 truncate" title={programaLabel(m.programa_id)}>
                  {programaLabel(m.programa_id)}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-5 bg-emerald-500 rounded-full flex items-center justify-end pr-2 text-[10px] font-semibold text-white transition-all"
                    style={{ width: `${Math.max(6, (discentesTotal(m) / maxDiscentes) * 100)}%` }}
                  >
                    {discentesTotal(m)}
                  </div>
                </div>
                <div className="w-12 shrink-0 text-xs text-gray-400 text-right">{m.ano}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulário de registro */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-heading font-semibold text-ufrpe-blue">{editingId ? 'Editar registro anual' : 'Novo registro anual'}</h3>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Programa *</label>
            <select name="programa_id" value={form.programa_id} onChange={handleChange} disabled={!!editingId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none transition disabled:bg-gray-100">
              <option value="">Selecione...</option>
              {programas.map((p) => <option key={p.id} value={p.id}>{p.nome} {p.sigla && `(${p.sigla})`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ano *</label>
            <input type="number" name="ano" value={form.ano} onChange={handleChange} disabled={!!editingId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none transition disabled:bg-gray-100" min="1990" max="2100" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {INT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium mb-1 text-gray-600">{f.label}</label>
              <input type="number" name={f.key} value={form[f.key]} onChange={handleChange} min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none transition" />
            </div>
          ))}
          {PCT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium mb-1 text-gray-600">{f.label}</label>
              <input type="number" name={f.key} value={form[f.key]} onChange={handleChange} min="0" max="100" step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none transition" />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-gray-600">Observação</label>
          <input type="text" name="observacao" value={form.observacao} onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none transition" placeholder="Notas sobre o período, fonte do dado, etc." />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-ufrpe-blue text-white rounded hover:bg-[#2a3a66]">
            <Save size={18} /> {editingId ? 'Salvar alterações' : 'Adicionar'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
              <X size={18} /> Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Tabela de todos os registros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-heading font-semibold text-ufrpe-blue">Registros ({metricas.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                <th className="px-4 py-3">Programa</th>
                <th className="px-4 py-3">Ano</th>
                <th className="px-4 py-3">Docentes</th>
                <th className="px-4 py-3">Disc. (M/D/P)</th>
                <th className="px-4 py-3">Bolsistas</th>
                <th className="px-4 py-3">Conclusão</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metricas.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{programaLabel(m.programa_id)}</td>
                  <td className="px-4 py-3 text-gray-600">{m.ano}</td>
                  <td className="px-4 py-3 text-gray-600">{m.docentes_permanentes ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {num(m.discentes_mestrado)}/{num(m.discentes_doutorado)}/{num(m.discentes_profissional)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.bolsistas_capes ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{m.taxa_conclusao != null ? `${m.taxa_conclusao}%` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => startEdit(m)} className="text-ufrpe-blue hover:text-ufrpe-yellow"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {metricas.length === 0 && (
                <EmptyRow colSpan={7} icon={BarChart3} message="Nenhum indicador registrado ainda." hint="Use o formulário acima para registrar o primeiro snapshot anual de um programa." />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
