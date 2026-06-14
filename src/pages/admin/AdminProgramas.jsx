import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { API_URL } from '../../api';
import { LastEdited } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminProgramas = () => {
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const users = useUsers();

  const fetchProgramas = async () => {
    try {
      const response = await fetch(`${API_URL}/api/programas`);
      const data = await response.json();
      setProgramas(data);
    } catch (error) {
      console.error('Erro ao buscar programas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgramas();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este programa?')) {
      try {
        const response = await fetch(`${API_URL}/api/programas/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          fetchProgramas();
        } else if (response.status === 401) {
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Erro ao excluir programa:', error);
      }
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Gerenciar Programas Stricto Sensu</h2>
        <Link 
          to="/admin/programas/novo" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Novo Programa
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Programa</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Campus</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Nível</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {programas.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                  {item.nome} {item.sigla && `(${item.sigla})`}
                  <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {item.campus}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {item.modalidades && item.modalidades.map((m, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {m.tipo === 'M' ? 'Mestrado' : m.tipo === 'D' ? 'Doutorado' : m.tipo === 'P' ? 'Profissional' : m.tipo}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right flex justify-end gap-3">
                  <Link 
                    to={`/admin/programas/editar/${item.id}`}
                    className="text-indigo-600 hover:text-indigo-900"
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
            {programas.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                  Nenhum programa encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProgramas;
