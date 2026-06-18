import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Book, FileText } from 'lucide-react';
import { API_URL } from '../../api';
import { withProgramaScope } from '../../auth';
import { LastEdited } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminDisciplinasList = () => {
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const users = useUsers();
  const { confirm, ConfirmModal } = useConfirm();

  const fetchDisciplinas = async () => {
    try {
      const response = await fetch(withProgramaScope(`${API_URL}/api/disciplinas`));
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
    if (await confirm('Tem certeza que deseja excluir esta disciplina?')) {
      try {
        const response = await fetch(`${API_URL}/api/disciplinas/${id}`, {
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
      <TableSkeleton />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ufrpe-blue flex items-center gap-2">
            <Book className="text-ufrpe-blue" size={24} />
            Gerenciar Disciplinas
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Cadastro de disciplinas, cargas horárias, docentes responsáveis e ementas
          </p>
        </div>
        <Link 
          to="/admin/disciplinas/nova" 
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
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
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm placeholder-gray-400"
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
                <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs" title={item.title}>
                  <div className="truncate">{item.title}</div>
                  <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.field_tipo_disciplina === 'Obrigatória' 
                      ? 'bg-ufrpe-blue/10 text-ufrpe-blue' 
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
                      href={item.field_ementa.startsWith('http') ? item.field_ementa : `${API_URL}${item.field_ementa}`}
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
            {filteredDisciplinas.length === 0 && (
              <EmptyRow colSpan={6} message="Nenhuma disciplina encontrada." />
            )}
          </tbody>
        </table>
      </div>
      {ConfirmModal}
    </div>
  );
};

export default AdminDisciplinasList;
