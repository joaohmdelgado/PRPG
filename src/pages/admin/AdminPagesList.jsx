import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, File, ExternalLink } from 'lucide-react';
import { API_URL } from '../../api';
import { withProgramaScope } from '../../auth';
import { LastEdited } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminPagesList = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const users = useUsers();

  const fetchPages = async () => {
    try {
      const response = await fetch(withProgramaScope(`${API_URL}/api/pages`));
      if (response.ok) {
        const data = await response.json();
        setPages(data);
      }
    } catch (error) {
      console.error('Erro ao buscar páginas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta página?')) {
      try {
        const response = await fetch(`${API_URL}/api/pages/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          fetchPages();
        } else if (response.status === 401) {
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Erro ao excluir página:', error);
      }
    }
  };

  const filteredPages = pages.filter(item => {
    const title = item.title || '';
    const slug = item.slug || '';
    const bodyText = item.body?.value || '';
    const query = searchQuery.toLowerCase();
    return title.toLowerCase().includes(query) || slug.toLowerCase().includes(query) || bodyText.toLowerCase().includes(query);
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
            <File className="text-ufrpe-blue" size={24} />
            Gerenciar Páginas Customizadas
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Criação de páginas institucionais com conteúdos ricos e URLs dinâmicas
          </p>
        </div>
        <Link 
          to="/admin/paginas/nova" 
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Nova Página
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
          placeholder="Buscar por título, slug ou conteúdo..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm placeholder-gray-400"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500 w-2/5">Título</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 w-2/5">Link Público</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right w-1/5">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredPages.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 pr-10" title={item.title}>
                  {item.title}
                  <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <a 
                    href={`/p/${item.slug}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-ufrpe-blue hover:underline inline-flex items-center gap-1.5 font-medium"
                  >
                    /p/{item.slug}
                    <ExternalLink size={14} />
                  </a>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right">
                  <div className="flex justify-end gap-3">
                    <Link 
                      to={`/admin/paginas/editar/${item.id}`}
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
            {filteredPages.length === 0 && (
              <EmptyRow colSpan={3} message="Nenhuma página institucional encontrada." />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPagesList;
