import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, HelpCircle } from 'lucide-react';
import { API_URL } from '../../api';
import { LastEdited } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminFaqList = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const users = useUsers();

  const fetchFaqs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/faq`);
      if (response.ok) {
        const data = await response.json();
        setFaqs(data);
      }
    } catch (error) {
      console.error('Erro ao buscar FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta pergunta frequente?')) {
      try {
        const response = await fetch(`${API_URL}/api/faq/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          fetchFaqs();
        } else if (response.status === 401) {
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Erro ao excluir FAQ:', error);
      }
    }
  };

  const filteredFaqs = faqs.filter(item => {
    const title = item.title || '';
    const resposta = item.field_resposta || '';
    const query = searchQuery.toLowerCase();
    return title.toLowerCase().includes(query) || resposta.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="w-8 h-8 border-4 border-ufrpe-blue border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ufrpe-blue flex items-center gap-2">
            <HelpCircle className="text-ufrpe-blue" size={24} />
            Gerenciar Perguntas Frequentes (FAQ)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Cadastro de perguntas e respostas exibidas na central de ajuda do portal
          </p>
        </div>
        <Link 
          to="/admin/faq/novo" 
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Nova Pergunta
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
          placeholder="Buscar por pergunta ou resposta..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm placeholder-gray-400"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500 w-3/4">Pergunta</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredFaqs.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 pr-10" title={item.title}>
                  {item.title}
                  <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right">
                  <div className="flex justify-end gap-3">
                    <Link 
                      to={`/admin/faq/editar/${item.id}`}
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
            {filteredFaqs.length === 0 && (
              <tr>
                <td colSpan="2" className="px-6 py-10 text-center text-gray-500">
                  Nenhuma pergunta frequente encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFaqList;
