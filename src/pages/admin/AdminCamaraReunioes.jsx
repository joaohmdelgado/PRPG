import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, CalendarClock, Trash2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import { useToast } from '../../components/admin/Toast';
import { fmtData } from '../../constants/camara';

const REUNIAO_STATUS_LABEL = { RASCUNHO: 'Rascunho', CONVOCADA: 'Convocada', REALIZADA: 'Realizada', CANCELADA: 'Cancelada' };
const REUNIAO_STATUS_CLASSES = {
  RASCUNHO: 'bg-gray-100 text-gray-700', CONVOCADA: 'bg-sky-100 text-sky-800',
  REALIZADA: 'bg-green-100 text-green-800', CANCELADA: 'bg-rose-100 text-rose-800',
};

const AdminCamaraReunioes = () => {
  const [reunioes, setReunioes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [novoNumero, setNovoNumero] = useState('');
  const navigate = useNavigate();
  const { confirm, ConfirmModal } = useConfirm();
  const { toast, Toasts } = useToast();

  const fetchReunioes = useCallback(async () => {
    const res = await apiFetch('/api/camara/reunioes');
    if (res.status === 401 || res.status === 403) return navigate('/admin/login');
    if (res.ok) setReunioes(await res.json());
    setLoading(false);
  }, [navigate]);

  useEffect(() => { fetchReunioes(); }, [fetchReunioes]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!novaData) return;
    const res = await apiFetch('/api/camara/reunioes', { method: 'POST', json: { data: novaData, numero: novoNumero || null } });
    if (res.ok) {
      const created = await res.json();
      setShowForm(false); setNovaData(''); setNovoNumero('');
      navigate(`/admin/camara/reunioes/${created.id}`);
    } else {
      toast.error('Erro ao criar reunião.');
    }
  };

  const handleDelete = async (id) => {
    if (!await confirm('Excluir esta reunião? Os itens de pauta associados também serão removidos.')) return;
    const res = await apiFetch(`/api/camara/reunioes/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Reunião excluída.'); fetchReunioes(); }
    else toast.error('Erro ao excluir reunião.');
  };

  if (loading) return <TableSkeleton cols={4} />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading text-xl font-semibold text-ufrpe-blue flex items-center gap-2">
          <CalendarClock className="text-ufrpe-blue" />
          Reuniões da Câmara
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Nova Reunião
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
            <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} required
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Identificação (opcional)</label>
            <input value={novoNumero} onChange={(e) => setNovoNumero(e.target.value)} placeholder="Ex.: VIII Reunião Ordinária"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <button type="submit" className="bg-ufrpe-blue text-white px-4 py-2 rounded-md text-sm font-medium">Criar e montar pauta</button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Data</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Identificação</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reunioes.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  <Link to={`/admin/camara/reunioes/${r.id}`} className="text-ufrpe-blue hover:underline">{fmtData(r.data)}</Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{r.numero || '—'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${REUNIAO_STATUS_CLASSES[r.status] || 'bg-gray-100 text-gray-700'}`}>
                    {REUNIAO_STATUS_LABEL[r.status] || r.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-900 transition-colors" title="Excluir">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {reunioes.length === 0 && <EmptyRow colSpan={4} icon={CalendarClock} message="Nenhuma reunião cadastrada." />}
          </tbody>
        </table>
      </div>
      {ConfirmModal}
      {Toasts}
    </div>
  );
};

export default AdminCamaraReunioes;
