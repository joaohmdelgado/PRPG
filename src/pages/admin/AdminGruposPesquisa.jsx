import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import { useToast } from '../../components/admin/Toast';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { apiFetch } from '../../api';
import { withProgramaScope, isProgramaGestor } from '../../auth';
import { LastEdited } from '../../components/AuditInfo';
import { useBulkSelection, SelectAllCheckbox, RowCheckbox, BulkActionBar, bulkDelete } from '../../components/admin/BulkActions';
import useUsers from '../../hooks/useUsers';
import OrigemFiltro, { filtrarPorOrigem, useOrigemFiltro, useProgramasResumo, SeloPrograma, ORIGEM_TODAS } from '../../components/admin/OrigemFiltro';

const AdminGruposPesquisa = () => {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const users = useUsers();
  const { confirm, ConfirmModal } = useConfirm();
  const { toast, Toasts } = useToast();
  const gestor = isProgramaGestor();
  const [origem, setOrigem] = useOrigemFiltro(ORIGEM_TODAS);
  const programas = useProgramasResumo(!gestor);
  // Gestor de programa já recebe só o seu conteúdo (withProgramaScope).
  const porOrigem = gestor ? grupos : filtrarPorOrigem(grupos, origem);
  const { selectedIds, selectedCount, isSelected, toggle, toggleAll, clear, allSelected, someSelected } = useBulkSelection(porOrigem);

  const fetchGrupos = async () => {
    try {
      const response = await apiFetch(withProgramaScope('/api/grupos-pesquisa'));
      if (response.ok) {
        const data = await response.json();
        setGrupos(data);
      } else if (response.status === 401 || response.status === 403) {
        navigate('/admin/login');
      } else {
        setError('Erro ao carregar grupos de pesquisa');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrupos();
  }, []);

  const handleDelete = async (id) => {
    if (!await confirm('Tem certeza que deseja remover este grupo de pesquisa?')) return;
    
    try {
      const response = await apiFetch(`/api/grupos-pesquisa/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchGrupos();
      } else {
        toast.error('Erro ao remover grupo de pesquisa');
      }
    } catch (err) {
      toast.error('Erro de conexão com o servidor');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedCount) return;
    if (!await confirm(`Excluir ${selectedCount === 1 ? 'o grupo selecionado' : `os ${selectedCount} grupos selecionados`}? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    const { failed } = await bulkDelete('/api/grupos-pesquisa', selectedIds, { onUnauthorized: () => navigate('/admin/login') });
    setDeleting(false);
    if (failed) toast.error(`${failed} ${failed === 1 ? 'grupo não pôde ser removido' : 'grupos não puderam ser removidos'}.`);
    clear();
    fetchGrupos();
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading text-xl font-semibold text-ufrpe-blue flex items-center gap-2">
          <Users className="text-ufrpe-blue" />
          Gerenciar Grupos de Pesquisa
        </h2>
        <Link 
          to="/admin/grupos-pesquisa/novo" 
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Novo Grupo de Pesquisa
        </Link>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

      {!gestor && <OrigemFiltro value={origem} onChange={(v) => { clear(); setOrigem(v); }} programas={programas} />}

      <BulkActionBar count={selectedCount} onDelete={handleBulkDelete} onClear={clear} deleting={deleting} />

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 w-px">
                <SelectAllCheckbox allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} disabled={porOrigem.length === 0} />
              </th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 w-1/3">Título</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 w-1/3">Líderes</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 w-1/4">Resumo</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {porOrigem.map((item) => {
              const leadersText = item.lideres && item.lideres.length > 0
                ? item.lideres.map(l => l.nome).join(', ')
                : 'Nenhum líder associado';

              return (
                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isSelected(item.id) ? 'bg-ufrpe-blue/5' : ''}`}>
                  <td className="px-6 py-4">
                    <RowCheckbox checked={isSelected(item.id)} onToggle={() => toggle(item.id)} label={`Selecionar ${item.title}`} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {item.title}
                    {!gestor && <SeloPrograma programaId={item.programaId} programas={programas} />}
                    <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {leadersText}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[200px]">
                    {item.body?.summary || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right flex justify-end gap-3 items-center">
                    <Link 
                      to={`/admin/grupos-pesquisa/editar/${item.id}`}
                      className="text-ufrpe-blue hover:text-ufrpe-yellow transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {porOrigem.length === 0 && (
              <EmptyRow colSpan={5} message="Nenhum grupo de pesquisa cadastrado." />
            )}
          </tbody>
        </table>
      </div>
      {ConfirmModal}
      {Toasts}
    </div>
  );
};

export default AdminGruposPesquisa;
