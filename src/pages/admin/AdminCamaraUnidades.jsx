import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Trash2, Edit2, X, Check } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import { useToast } from '../../components/admin/Toast';

const BLANK = { sigla: '', nome: '', internaPrpg: false };

const AdminCamaraUnidades = () => {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();
  const { confirm, ConfirmModal } = useConfirm();
  const { toast, Toasts } = useToast();

  const fetchUnidades = useCallback(async () => {
    const res = await apiFetch('/api/camara/unidades');
    if (res.status === 401 || res.status === 403) return navigate('/admin/login');
    if (res.ok) setUnidades(await res.json());
    setLoading(false);
  }, [navigate]);

  useEffect(() => { fetchUnidades(); }, [fetchUnidades]);

  const startEdit = (u) => { setEditingId(u.id); setForm({ sigla: u.sigla, nome: u.nome, internaPrpg: u.internaPrpg }); setShowNew(false); };
  const cancelEdit = () => { setEditingId(null); setForm(BLANK); };

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await apiFetch('/api/camara/unidades', { method: 'POST', json: form });
    if (res.ok) { toast.success('Unidade criada.'); setShowNew(false); setForm(BLANK); fetchUnidades(); }
    else toast.error('Erro ao criar unidade.');
  };

  const handleUpdate = async (id) => {
    const res = await apiFetch(`/api/camara/unidades/${id}`, { method: 'PUT', json: form });
    if (res.ok) { toast.success('Unidade atualizada.'); cancelEdit(); fetchUnidades(); }
    else toast.error('Erro ao atualizar unidade.');
  };

  const handleDelete = async (id) => {
    if (!await confirm('Excluir esta unidade? Processos que a referenciam manterão o vínculo quebrado.')) return;
    const res = await apiFetch(`/api/camara/unidades/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Unidade removida.'); fetchUnidades(); }
    else toast.error('Erro ao remover unidade.');
  };

  if (loading) return <TableSkeleton cols={3} />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading text-xl font-semibold text-ufrpe-blue flex items-center gap-2">
          <Building2 className="text-ufrpe-blue" />
          Setores / Unidades (Câmara)
        </h2>
        <button
          onClick={() => { setShowNew((v) => !v); setEditingId(null); setForm(BLANK); }}
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Nova Unidade
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sigla</label>
            <input value={form.sigla} onChange={(e) => setForm((p) => ({ ...p, sigla: e.target.value }))} required
              className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome completo</label>
            <input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 pb-2">
            <input type="checkbox" checked={form.internaPrpg} onChange={(e) => setForm((p) => ({ ...p, internaPrpg: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-ufrpe-blue focus:ring-ufrpe-yellow" />
            Setor interno da PRPG
          </label>
          <button type="submit" className="bg-ufrpe-blue text-white px-4 py-2 rounded-md text-sm font-medium">Salvar</button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Sigla</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Nome</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {unidades.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                {editingId === u.id ? (
                  <>
                    <td className="px-6 py-3">
                      <input value={form.sigla} onChange={(e) => setForm((p) => ({ ...p, sigla: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                    </td>
                    <td className="px-6 py-3">
                      <input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => handleUpdate(u.id)} className="text-green-600 hover:text-green-800"><Check size={18} /></button>
                        <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{u.sigla}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{u.nome}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => startEdit(u)} className="text-ufrpe-blue hover:text-ufrpe-yellow" title="Editar"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-900" title="Excluir"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {unidades.length === 0 && <EmptyRow colSpan={3} icon={Building2} message="Nenhuma unidade cadastrada." />}
          </tbody>
        </table>
      </div>
      {ConfirmModal}
      {Toasts}
    </div>
  );
};

export default AdminCamaraUnidades;
