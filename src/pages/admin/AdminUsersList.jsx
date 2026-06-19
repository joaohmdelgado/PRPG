import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import { useToast } from '../../components/admin/Toast';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { API_URL } from '../../api';
import { LastEdited } from '../../components/AuditInfo';
import { useBulkSelection, SelectAllCheckbox, RowCheckbox, BulkActionBar, bulkDelete } from '../../components/admin/BulkActions';

const AdminUsersList = () => {
  const { confirm, ConfirmModal } = useConfirm();
  const { toast, Toasts } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const { selectedIds, selectedCount, isSelected, toggle, toggleAll, clear, allSelected, someSelected } = useBulkSelection(users);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError('Erro ao carregar usuários');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!await confirm('Tem certeza que deseja remover este usuário?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        fetchUsers();
      } else {
        toast.error('Erro ao remover usuário');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedCount) return;
    if (!await confirm(`Excluir ${selectedCount === 1 ? 'o usuário selecionado' : `os ${selectedCount} usuários selecionados`}? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    const { failed } = await bulkDelete(`${API_URL}/api/users`, selectedIds);
    setDeleting(false);
    if (failed) toast.error(`${failed} ${failed === 1 ? 'usuário não pôde ser removido' : 'usuários não puderam ser removidos'}.`);
    clear();
    fetchUsers();
  };

  // Rótulo do programa: usa a sigla, salvo quando vazia/genérica, aí o nome.
  const labelPrograma = (p) =>
    p.sigla && p.sigla !== 'S/SIGLA' ? p.sigla : p.nome;

  if (loading) return <TableSkeleton />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue">Gerenciar Usuários</h2>
        <Link 
          to="/admin/users/novo" 
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Usuário
        </Link>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

      <BulkActionBar count={selectedCount} onDelete={handleBulkDelete} onClear={clear} deleting={deleting} />

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 w-px">
                <SelectAllCheckbox allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} disabled={users.length === 0} />
              </th>
              <th className="p-4 font-medium text-gray-600">Nome / E-mail</th>
              <th className="p-4 font-medium text-gray-600">Papéis (Roles)</th>
              <th className="p-4 font-medium text-gray-600">Programas</th>
              <th className="p-4 font-medium text-gray-600">Visibilidade</th>
              <th className="p-4 font-medium text-gray-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected(user.id) ? 'bg-ufrpe-blue/5' : ''}`}>
                <td className="p-4">
                  <RowCheckbox checked={isSelected(user.id)} onToggle={() => toggle(user.id)} label={`Selecionar ${user.perfil_geral?.nome || user.email}`} />
                </td>
                <td className="p-4">
                  <div className="font-medium text-gray-800">{user.perfil_geral?.nome || 'Sem Nome'}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <LastEdited criadoPor={user.criado_por} atualizadoPor={user.atualizado_por} users={users} className="mt-1" />
                </td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.map(role => (
                      <span key={role} className="bg-ufrpe-blue/10 text-ufrpe-blue text-xs px-2 py-1 rounded-full font-medium">
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  {!user.roles.includes('Professor') ? (
                    <span className="text-gray-300 text-sm">—</span>
                  ) : user.programas_vinculo?.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      {user.programas_vinculo.map((p) => (
                        <span key={p.id} title={p.nome}
                          className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                          {labelPrograma(p)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">
                      Sem vínculo
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {user.privacidade?.perfil_publico ? (
                     <span className="text-green-600 text-sm font-medium">Público</span>
                  ) : (
                     <span className="text-gray-500 text-sm font-medium">Privado</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Link 
                      to={`/admin/users/editar/${user.id}`}
                      className="p-2 text-ufrpe-blue hover:bg-ufrpe-blue/5 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <EmptyRow colSpan={6} message="Nenhum usuário cadastrado." />
            )}
          </tbody>
        </table>
      </div>
      {ConfirmModal}
      {Toasts}
    </div>
  );
};

export default AdminUsersList;
