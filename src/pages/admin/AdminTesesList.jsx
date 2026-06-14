import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, BookOpen, GraduationCap, FileText } from 'lucide-react';
import { API_URL } from '../../api';
import { LastEdited } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminTesesList = () => {
  const [teses, setTeses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const users = useUsers();

  const fetchTeses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teses-dissertacoes`);
      if (response.ok) {
        const data = await response.json();
        setTeses(data);
      }
    } catch (error) {
      console.error('Erro ao buscar teses e dissertações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeses();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta tese/dissertação?')) {
      try {
        const response = await fetch(`${API_URL}/api/teses-dissertacoes/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          fetchTeses();
        } else if (response.status === 401) {
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Erro ao excluir tese/dissertação:', error);
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const filteredTeses = teses.filter(item => {
    const title = item.title || '';
    const autor = item.field_autor_resolved?.nome || '';
    const query = searchQuery.toLowerCase();
    return title.toLowerCase().includes(query) || autor.toLowerCase().includes(query);
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
            <BookOpen className="text-ufrpe-blue" size={24} />
            Gerenciar Teses e Dissertações
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Cadastro de trabalhos acadêmicos de alunos e suas respectivas referências
          </p>
        </div>
        <Link 
          to="/admin/teses-dissertacoes/nova" 
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Nova Tese/Dissertação
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
          placeholder="Buscar por título ou autor..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm placeholder-gray-400"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Título</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Tipo</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Autor (Aluno)</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Ano / Data</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Arquivo</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTeses.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs md:max-w-md" title={item.title}>
                  <div className="truncate">{item.title}</div>
                  <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.field_tipo_td === 'Tese' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {item.field_tipo_td}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>
                    <p className="font-medium">{item.field_autor_resolved?.nome}</p>
                    <p className="text-xs text-gray-500">{item.field_autor_resolved?.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(item.field_ano)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.field_arquivo ? (
                    <a
                      href={item.field_arquivo.startsWith('http') ? item.field_arquivo : `${API_URL}${item.field_arquivo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-800 inline-flex items-center gap-1.5 font-medium hover:underline"
                    >
                      <FileText size={16} />
                      PDF
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">Sem arquivo</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right">
                  <div className="flex justify-end gap-3">
                    <Link 
                      to={`/admin/teses-dissertacoes/editar/${item.id}`}
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
            {filteredTeses.length === 0 && (
              <EmptyRow colSpan={6} message="Nenhuma tese ou dissertação encontrada." />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTesesList;
