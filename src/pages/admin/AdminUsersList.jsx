import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import { useToast } from '../../components/admin/Toast';
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';
import { apiFetch } from '../../api';
import { LastEdited } from '../../components/AuditInfo';
import { useBulkSelection, SelectAllCheckbox, RowCheckbox, BulkActionBar, bulkDelete } from '../../components/admin/BulkActions';

const AdminUsersList = () => {
  const { confirm, ConfirmModal } = useConfirm();
  const { toast, Toasts } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [filterNome, setFilterNome] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterPrograma, setFilterPrograma] = useState('');

  const allRoles = useMemo(() => {
    const set = new Set();
    users.forEach(u => u.roles?.forEach(r => set.add(r)));
    return [...set].sort();
  }, [users]);

  const allProgramas = useMemo(() => {
    const map = new Map();
    users.forEach(u =>
      u.programas_vinculo?.forEach(p => {
        if (!map.has(p.id)) map.set(p.id, p);
      })
    );
    return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = filterNome.toLowerCase().trim();
    return users.filter(u => {
      if (q) {
        const nome = (u.perfil_geral?.nome || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        if (!nome.includes(q) && !email.includes(q)) return false;
      }
      if (filterRole && !u.roles?.includes(filterRole)) return false;
      if (filterPrograma && !u.programas_vinculo?.some(p => String(p.id) === filterPrograma)) return false;
      return true;
    });
  }, [users, filterNome, filterRole, filterPrograma]);

  const hasFilters = filterNome || filterRole || filterPrograma;

  const { selectedIds, selectedCount, isSelected, toggle, toggleAll, clear, allSelected, someSelected } = useBulkSelection(filteredUsers);

  const fetchUsers = async () => {
    try {
      const response = await apiFetch('/api/users');
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
      const response = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
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
    const { failed } = await bulkDelete('/api/users', selectedIds);
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

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail…"
            value={filterNome}
            onChange={e => setFilterNome(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ufrpe-blue/30 focus:border-ufrpe-blue"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="py-2 pl-3 pr-8 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ufrpe-blue/30 focus:border-ufrpe-blue"
        >
          <option value="">Todos os papéis</option>
          {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterPrograma}
          onChange={e => setFilterPrograma(e.target.value)}
          className="py-2 pl-3 pr-8 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ufrpe-blue/30 focus:border-ufrpe-blue"
        >
          <option value="">Todos os programas</option>
          {allProgramas.map(p => (
            <option key={p.id} value={String(p.id)}>
              {p.sigla && p.sigla !== 'S/SIGLA' ? `${p.sigla} — ${p.nome}` : p.nome}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setFilterNome(''); setFilterRole(''); setFilterPrograma(''); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-2 py-2"
            title="Limpar filtros"
          >
            <X size={15} /> Limpar
          </button>
        )}
        <span className="text-sm text-gray-400 py-2 ml-auto whitespace-nowrap">
          {filteredUsers.length} de {users.length} usuário{users.length !== 1 ? 's' : ''}
        </span>
      </div>

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
            {filteredUsers.map(user => (
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
                  {user.programas_vinculo?.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      {user.programas_vinculo.map((p) => (
                        <span key={p.id} title={p.nome}
                          className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                          {labelPrograma(p)}
                        </span>
                      ))}
                    </div>
                  ) : (user.roles.includes('Professor') || user.roles.includes('Aluno')) ? (
                    <span className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">
                      Sem vínculo
                    </span>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
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
            {filteredUsers.length === 0 && (
              <EmptyRow colSpan={6} message={hasFilters ? 'Nenhum usuário encontrado para os filtros aplicados.' : 'Nenhum usuário cadastrado.'} />
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
