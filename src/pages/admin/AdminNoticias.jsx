import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { API_URL } from '../../api';
import { LastEdited } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (regex.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = months[parseInt(month, 10) - 1];
    return `${parseInt(day, 10)} de ${monthName}, ${year}`;
  }
  return dateStr;
};

const AdminNoticias = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const users = useUsers();

  const fetchNews = async () => {
    try {
      const response = await fetch(`${API_URL}/api/news`);
      const data = await response.json();
      setNews(data);
    } catch (error) {
      console.error('Erro ao buscar notícias:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta notícia?')) {
      try {
        const response = await fetch(`${API_URL}/api/news/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          fetchNews(); // Refresh the list
        } else if (response.status === 401) {
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Erro ao excluir notícia:', error);
      }
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading text-xl font-semibold text-ufrpe-blue">Gerenciar Notícias</h2>
        <Link 
          to="/admin/noticias/nova" 
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Nova Notícia
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Título</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Categoria</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Data</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {news.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {item.title}
                  <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ufrpe-blue/10 text-ufrpe-blue">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(item.date)}</td>
                <td className="px-6 py-4 text-sm font-medium text-right flex justify-end gap-3">
                  <Link 
                    to={`/admin/noticias/editar/${item.id}`}
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
            {news.length === 0 && (
              <EmptyRow colSpan={4} message="Nenhuma notícia encontrada." />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminNoticias;
