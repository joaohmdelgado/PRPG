import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Gavel, Search, Clock, RotateCw, ExternalLink, Edit2, Trash2, ChevronDown, CalendarClock, Building2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import { useToast } from '../../components/admin/Toast';
import { useBulkSelection, SelectAllCheckbox, RowCheckbox, BulkActionBar, bulkDelete } from '../../components/admin/BulkActions';
import { STATUS_INFO, STATUS_OPTIONS, statusLabel, statusClasses, fmtData } from '../../constants/camara';

// Popover simples de troca de status, ancorado no badge da linha (§9.2:
// "o badge de status é o botão" — clique aplica na hora, sem modal).
function StatusPopover({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClasses(value)} hover:opacity-80 transition-opacity disabled:opacity-60`}
      >
        {statusLabel(value)}
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 left-0 w-56 max-h-72 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setOpen(false); if (s !== value) onChange(s); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${s === value ? 'font-semibold' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusClasses(s).split(' ')[0]}`} />
                {statusLabel(s)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const AdminCamara = () => {
  const [processos, setProcessos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [unidadeFiltro, setUnidadeFiltro] = useState('');
  const [showResolvidos, setShowResolvidos] = useState(false);
  const [atrasadosOnly, setAtrasadosOnly] = useState(false);
  const [reincidentesOnly, setReincidentesOnly] = useState(false);
  const navigate = useNavigate();
  const { confirm, ConfirmModal } = useConfirm();
  const { toast, Toasts } = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, uRes] = await Promise.all([
        apiFetch('/api/camara/processos'),
        apiFetch('/api/camara/unidades'),
      ]);
      if (pRes.status === 401 || pRes.status === 403) return navigate('/admin/login');
      if (pRes.ok) setProcessos(await pRes.json()); else setError('Erro ao carregar processos.');
      if (uRes.ok) setUnidades(await uRes.json());
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => {
    let list = processos;
    if (!showResolvidos) list = list.filter((p) => !['RESOLVIDO', 'ARQUIVADO', 'PUBLICADO'].includes(p.status));
    if (statusFiltro) list = list.filter((p) => p.status === statusFiltro);
    if (unidadeFiltro) list = list.filter((p) => p.unidadeResponsavelId === unidadeFiltro || p.localizacaoId === unidadeFiltro);
    if (atrasadosOnly) list = list.filter((p) => p.atrasado);
    if (reincidentesOnly) list = list.filter((p) => p.reincidente);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((p) =>
        p.numero?.toLowerCase().includes(needle) ||
        p.assunto?.toLowerCase().includes(needle) ||
        p.relatorNome?.toLowerCase().includes(needle));
    }
    return list;
  }, [processos, showResolvidos, statusFiltro, unidadeFiltro, atrasadosOnly, reincidentesOnly, q]);

  const { selectedIds, selectedCount, isSelected, toggle, toggleAll, clear, allSelected, someSelected } = useBulkSelection(filtered);

  const handleStatusChange = async (id, status) => {
    const res = await apiFetch(`/api/camara/processos/${id}/status`, { method: 'PATCH', json: { status } });
    if (res.ok) {
      const updated = await res.json();
      setProcessos((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      toast.success(`Status alterado para "${statusLabel(status)}".`);
    } else {
      toast.error('Erro ao alterar status.');
    }
  };

  const handleDelete = async (id) => {
    if (!await confirm('Tem certeza que deseja excluir este processo? Todo o histórico será perdido.')) return;
    const res = await apiFetch(`/api/camara/processos/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Processo excluído.'); fetchAll(); }
    else toast.error('Erro ao excluir processo.');
  };

  const handleBulkDelete = async () => {
    if (!selectedCount) return;
    if (!await confirm(`Excluir ${selectedCount === 1 ? 'o processo selecionado' : `os ${selectedCount} processos selecionados`}? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    const { failed } = await bulkDelete('/api/camara/processos', selectedIds, { onUnauthorized: () => navigate('/admin/login') });
    setDeleting(false);
    if (failed) toast.error(`${failed} processo(s) não puderam ser removidos.`);
    clear();
    fetchAll();
  };

  if (loading) return <TableSkeleton cols={7} />;

  const pendentesCount = processos.filter((p) => !['RESOLVIDO', 'ARQUIVADO', 'PUBLICADO'].includes(p.status)).length;
  const resolvidosCount = processos.length - pendentesCount;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading text-xl font-semibold text-ufrpe-blue flex items-center gap-2">
          <Gavel className="text-ufrpe-blue" />
          Processos da Câmara de Pós-Graduação
        </h2>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/camara/reunioes"
            className="text-gray-600 hover:text-ufrpe-blue px-3 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm border border-gray-200"
          >
            <CalendarClock size={16} />
            Reuniões
          </Link>
          <Link
            to="/admin/camara/unidades"
            className="text-gray-600 hover:text-ufrpe-blue px-3 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm border border-gray-200"
          >
            <Building2 size={16} />
            Setores
          </Link>
          <Link
            to="/admin/camara/novo"
            className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            Novo Processo
          </Link>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número, assunto ou relator..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowResolvidos(false)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${!showResolvidos ? 'bg-ufrpe-blue text-white border-ufrpe-blue' : 'bg-white text-gray-600 border-gray-300'}`}
        >
          Pendentes {pendentesCount}
        </button>
        <button
          type="button"
          onClick={() => setShowResolvidos(true)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${showResolvidos ? 'bg-ufrpe-blue text-white border-ufrpe-blue' : 'bg-white text-gray-600 border-gray-300'}`}
        >
          Resolvidos {resolvidosCount}
        </button>
        <select
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select
          value={unidadeFiltro}
          onChange={(e) => setUnidadeFiltro(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          <option value="">Todos os setores</option>
          {unidades.map((u) => <option key={u.id} value={u.id}>{u.sigla}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setAtrasadosOnly((v) => !v)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${atrasadosOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300'}`}
        >
          <Clock size={12} /> Atrasados
        </button>
        <button
          type="button"
          onClick={() => setReincidentesOnly((v) => !v)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${reincidentesOnly ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-600 border-gray-300'}`}
        >
          <RotateCw size={12} /> Reincidentes
        </button>
        <button
          type="button"
          onClick={async () => {
            const r = await apiFetch('/api/camara/exportar.xlsx');
            if (!r.ok) return toast.error('Erro ao exportar.');
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'processos-camara.xlsx'; a.click();
            URL.revokeObjectURL(url);
          }}
          className="ml-auto px-3 py-2 text-sm font-medium text-ufrpe-blue border border-ufrpe-blue/30 rounded-md hover:bg-ufrpe-blue/5"
        >
          Exportar XLSX
        </button>
      </div>

      <BulkActionBar count={selectedCount} onDelete={handleBulkDelete} onClear={clear} deleting={deleting} />

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 w-px">
                <SelectAllCheckbox allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} disabled={filtered.length === 0} />
              </th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Processo</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Assunto</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Responsável</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Relator</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Localização</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Pautas</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((p) => (
              <tr key={p.id} className={`hover:bg-gray-50 transition-colors relative ${isSelected(p.id) ? 'bg-ufrpe-blue/5' : ''}`}>
                <td className="px-4 py-3">
                  <span className={`absolute left-0 top-0 bottom-0 w-1 ${statusClasses(p.status).split(' ')[0]}`} />
                  <RowCheckbox checked={isSelected(p.id)} onToggle={() => toggle(p.id)} label={`Selecionar ${p.numero}`} />
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link to={`/admin/camara/${p.id}`} className="font-mono text-xs text-ufrpe-blue hover:underline font-semibold">
                    {p.numero}
                  </Link>
                  {!p.numeroValido && <span className="ml-1 text-amber-600 text-xs" title="Número fora do padrão SIPAC">⚠</span>}
                  {p.linkSipac && (
                    <a href={p.linkSipac} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-gray-400 hover:text-ufrpe-blue inline-block align-middle">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusPopover value={p.status} onChange={(s) => handleStatusChange(p.id, s)} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                  <span className="line-clamp-2" title={p.assunto}>{p.assunto}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.unidadeResponsavelSigla || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {p.relatorNome || <span className="text-gray-300 italic">sem relator</span>}
                  {p.atrasado && <Clock size={12} className="inline ml-1 text-amber-500" />}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {p.localizacaoSigla || '—'}
                  {p.localizacaoEm && <span className="block text-xs text-gray-400">{fmtData(p.localizacaoEm)}</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {p.pautasCount > 0 && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${p.reincidente ? 'bg-violet-100 text-violet-800' : 'bg-gray-100 text-gray-600'}`}>
                      {p.reincidente && '↻ '}{p.pautasCount}ª pauta
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-right">
                  <div className="flex justify-end gap-3 items-center">
                    <Link to={`/admin/camara/editar/${p.id}`} className="text-ufrpe-blue hover:text-ufrpe-yellow transition-colors" title="Editar">
                      <Edit2 size={18} />
                    </Link>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900 transition-colors" title="Excluir">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <EmptyRow colSpan={9} icon={Gavel} message="Nenhum processo encontrado." />
            )}
          </tbody>
        </table>
      </div>
      {ConfirmModal}
      {Toasts}
    </div>
  );
};

export default AdminCamara;
