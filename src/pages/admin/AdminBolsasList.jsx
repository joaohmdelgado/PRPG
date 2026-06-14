import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Award, Calendar } from 'lucide-react';
import { API_URL } from '../../api';
import { LastEdited } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminBolsasList = () => {
  const [bolsas, setBolsas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const users = useUsers();

  const fetchBolsas = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bolsas`);
      if (response.ok) {
        const data = await response.json();
        setBolsas(data);
      }
    } catch (error) {
      console.error('Erro ao buscar bolsas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBolsas();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este registro de bolsa?')) {
      try {
        const response = await fetch(`${API_URL}/api/bolsas/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          fetchBolsas();
        } else if (response.status === 401) {
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Erro ao excluir bolsa:', error);
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatPeriod = (periodo) => {
    if (!periodo) return '-';
    const inicio = formatDate(periodo.data_inicio);
    const fim = formatDate(periodo.data_fim);
    if (inicio && fim) {
      return `${inicio} até ${fim}`;
    }
    return inicio || fim || '-';
  };

  const filteredBolsas = bolsas.filter(item => {
    const title = item.title || '';
    const aluno = item.field_aluno_resolved?.nome || '';
    const tipo = item.field_tipo_bolsa || '';
    const query = searchQuery.toLowerCase();
    return title.toLowerCase().includes(query) || 
           aluno.toLowerCase().includes(query) || 
           tipo.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <TableSkeleton />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ufrpe-blue flex items-center gap-2">
            <Award className="text-ufrpe-blue" size={24} />
            Gerenciar Bolsas
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Cadastro de bolsas concedidas a alunos, controle de vigência e órgãos fomentadores
          </p>
        </div>
        <Link 
          to="/admin/bolsas/nova" 
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Nova Bolsa
        </Link>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por título, aluno ou tipo de bolsa..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm placeholder-gray-400"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Título</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Tipo de Bolsa</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Beneficiário (Aluno)</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Período de Vigência</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredBolsas.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs" title={item.title}>
                  <div className="truncate">{item.title}</div>
                  <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {item.field_tipo_bolsa || 'Não especificado'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>
                    <p className="font-medium">{item.field_aluno_resolved?.nome}</p>
                    <p className="text-xs text-gray-500">{item.field_aluno_resolved?.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                    <Calendar size={14} className="text-gray-400" />
                    <span>{formatPeriod(item.field_periodo_bolsa)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right">
                  <div className="flex justify-end gap-3">
                    <Link 
                      to={`/admin/bolsas/editar/${item.id}`}
                      className="text-ufrpe-blue hover:text-ufrpe-yellow bg-ufrpe-blue/5 hover:bg-ufrpe-blue/10 p-1.5 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredBolsas.length === 0 && (
              <EmptyRow colSpan={5} message="Nenhum registro de bolsa encontrado." />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBolsasList;
