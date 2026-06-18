import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import { useToast } from '../../components/admin/Toast';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, FileCheck, Eye } from 'lucide-react';
import { API_URL } from '../../api';
import { LastEdited } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminPortarias = () => {
  const [portarias, setPortarias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const users = useUsers();
  const { confirm, ConfirmModal } = useConfirm();
  const { toast, Toasts } = useToast();

  const fetchPortarias = async () => {
    try {
      const response = await fetch(`${API_URL}/api/portarias`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Ordenar por data da portaria decrescente
        data.sort((a, b) => new Date(b.data_portaria) - new Date(a.data_portaria));
        setPortarias(data);
      } else if (response.status === 401 || response.status === 403) {
        navigate('/admin/login');
      } else {
        setError('Erro ao carregar portarias');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortarias();
  }, []);

  const handleDelete = async (id) => {
    if (!await confirm('Tem certeza que deseja remover esta portaria?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/portarias/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        fetchPortarias();
      } else {
        toast.error('Erro ao remover portaria');
      }
    } catch (err) {
      toast.error('Erro de conexão com o servidor');
    }
  };

  const isVencida = (dataVencimento) => {
    if (!dataVencimento) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(dataVencimento);
    return venc < hoje;
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading text-xl font-semibold text-ufrpe-blue flex items-center gap-2">
          <FileCheck className="text-ufrpe-blue" />
          Gerenciar Portarias
        </h2>
        <Link 
          to="/admin/portarias/nova" 
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Nova Portaria
        </Link>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Título</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Data Portaria</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Data Vencimento</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {portarias.map((item) => {
              const expired = isVencida(item.data_vencimento);
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {item.title}
                    <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.data_portaria ? new Date(item.data_portaria).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.data_vencimento ? new Date(item.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.data_vencimento ? (
                      expired ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          Vencida
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          Ativa
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ufrpe-blue/10 text-ufrpe-blue">
                        Permanente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right flex justify-end gap-3 items-center">
                    {item.downloadLink && (
                      <a 
                        href={`${API_URL}${item.downloadLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-ufrpe-yellow transition-colors"
                        title="Ver arquivo anexado"
                      >
                        <Eye size={18} />
                      </a>
                    )}
                    <Link 
                      to={`/admin/portarias/editar/${item.id}`}
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
            {portarias.length === 0 && (
              <EmptyRow colSpan={5} message="Nenhuma portaria cadastrada." />
            )}
          </tbody>
        </table>
      </div>
      {ConfirmModal}
      {Toasts}
    </div>
  );
};

export default AdminPortarias;
