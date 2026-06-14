import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { API_URL } from '../../api';
import { LastEdited } from '../../components/AuditInfo';

const AdminUsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    if (!window.confirm('Tem certeza que deseja remover este usuário?')) return;
    
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
        alert('Erro ao remover usuário');
      }
    } catch (err) {
      alert('Erro de conexão');
    }
  };

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

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-medium text-gray-600">Nome / E-mail</th>
              <th className="p-4 font-medium text-gray-600">Papéis (Roles)</th>
              <th className="p-4 font-medium text-gray-600">Visibilidade</th>
              <th className="p-4 font-medium text-gray-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
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
              <EmptyRow colSpan={4} message="Nenhum usuário cadastrado." />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsersList;
