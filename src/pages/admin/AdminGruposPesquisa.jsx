import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { API_URL } from '../../api';
import { LastEdited } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminGruposPesquisa = () => {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const users = useUsers();

  const fetchGrupos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/grupos-pesquisa`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
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
    if (!window.confirm('Tem certeza que deseja remover este grupo de pesquisa?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/grupos-pesquisa/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        fetchGrupos();
      } else {
        alert('Erro ao remover grupo de pesquisa');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor');
    }
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

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500 w-1/3">Título</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 w-1/3">Líderes</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 w-1/4">Resumo</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {grupos.map((item) => {
              const leadersText = item.field_lideres_resolved && item.field_lideres_resolved.length > 0
                ? item.field_lideres_resolved.map(l => l.nome).join(', ')
                : 'Nenhum líder associado';

              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {item.title}
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
            {grupos.length === 0 && (
              <EmptyRow colSpan={4} message="Nenhum grupo de pesquisa cadastrado." />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminGruposPesquisa;
