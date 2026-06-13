import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Book, FileText } from 'lucide-react';

const AdminDisciplinasList = () => {
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const fetchDisciplinas = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/disciplinas');
      if (response.ok) {
        const data = await response.json();
        setDisciplinas(data);
      }
    } catch (error) {
      console.error('Erro ao buscar disciplinas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisciplinas();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta disciplina?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/disciplinas/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          fetchDisciplinas();
        } else if (response.status === 401) {
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Erro ao excluir disciplina:', error);
      }
    }
  };

  const filteredDisciplinas = disciplinas.filter(item => {
    const title = item.title || '';
    const docente = item.field_docente_resolved?.nome || '';
    const tipo = item.field_tipo_disciplina || '';
    const query = searchQuery.toLowerCase();
    return title.toLowerCase().includes(query) || 
           docente.toLowerCase().includes(query) || 
           tipo.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Book className="text-blue-600" size={24} />
            Gerenciar Disciplinas
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Cadastro de disciplinas, cargas horárias, docentes responsáveis e ementas
          </p>
        </div>
        <Link 
          to="/admin/disciplinas/nova" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Nova Disciplina
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
          placeholder="Buscar por título, docente ou tipo..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-400"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Título</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Tipo</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Docente</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Carga Horária</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Ementa</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredDisciplinas.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate font-medium" title={item.title}>
                  {item.title}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.field_tipo_disciplina === 'Obrigatória' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.field_tipo_disciplina}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>
                    <p className="font-medium">{item.field_docente_resolved?.nome}</p>
                    <p className="text-xs text-gray-500">{item.field_docente_resolved?.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                  {item.field_carga_horaria}h
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.field_ementa ? (
                    <a
                      href={item.field_ementa.startsWith('http') ? item.field_ementa : `http://localhost:5000${item.field_ementa}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-800 inline-flex items-center gap-1.5 font-medium hover:underline"
                    >
                      <FileText size={16} />
                      Ementa PDF
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">Sem arquivo</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right">
                  <div className="flex justify-end gap-3">
                    <Link 
                      to={`/admin/disciplinas/editar/${item.id}`}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded transition-colors"
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
            {filteredDisciplinas.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                  Nenhuma disciplina encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDisciplinasList;
