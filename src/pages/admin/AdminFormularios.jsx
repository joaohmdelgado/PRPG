import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { API_URL } from '../../api';
import { LastEdited } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminFormularios = () => {
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const users = useUsers();

  const fetchFormularios = async () => {
    try {
      const response = await fetch(`${API_URL}/api/formularios`);
      const data = await response.json();
      setFormularios(data);
    } catch (error) {
      console.error('Erro ao buscar formulários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormularios();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este formulário?')) {
      try {
        const response = await fetch(`${API_URL}/api/formularios/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          fetchFormularios();
        } else if (response.status === 401) {
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Erro ao excluir formulário:', error);
      }
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading text-xl font-semibold text-ufrpe-blue">Gerenciar Formulários</h2>
        <Link 
          to="/admin/formularios/novo" 
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Novo Formulário
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Título</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Seção</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Subcategoria</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {formularios.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                  {item.title}
                  <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ufrpe-blue/10 text-ufrpe-blue">
                    {item.sectionTitle}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.categoryTitle}</td>
                <td className="px-6 py-4 text-sm font-medium text-right flex justify-end gap-3">
                  <Link 
                    to={`/admin/formularios/editar/${item.id}`}
                    className="text-ufrpe-blue hover:text-ufrpe-yellow"
                  >
                    <Edit2 size={18} />
                  </Link>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {formularios.length === 0 && (
              <EmptyRow colSpan={4} message="Nenhum formulário encontrado." />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFormularios;
