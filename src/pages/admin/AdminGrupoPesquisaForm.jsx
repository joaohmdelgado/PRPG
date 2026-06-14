import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, X, Search } from 'lucide-react';
import { API_URL } from '../../api';
import { AuditHeader } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminGrupoPesquisaForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    body: {
      value: '',
      summary: ''
    },
    field_lideres: []
  });

  const [professores, setProfessores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audit, setAudit] = useState(null);
  const auditUsers = useUsers();

  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const contentRef = useRef('');

  // 1. Inicializar CKEditor dinamicamente (mesmo padrão usado no AdminNoticiaForm)
  useEffect(() => {
    let script;
    const initEditor = () => {
      if (window.ClassicEditor && editorRef.current && !editorInstanceRef.current) {
        window.ClassicEditor.create(editorRef.current, {
          toolbar: [
            'heading', '|',
            'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
            'blockQuote', 'insertTable', 'undo', 'redo'
          ]
        })
          .then(editor => {
            editorInstanceRef.current = editor;
            if (contentRef.current) {
              editor.setData(contentRef.current);
            }
            editor.model.document.on('change:data', () => {
              const data = editor.getData();
              contentRef.current = data;
              setFormData(prev => ({
                ...prev,
                body: {
                  ...prev.body,
                  value: data
                }
              }));
            });
          })
          .catch(err => {
            console.error('Erro ao inicializar CKEditor:', err);
          });
      }
    };

    if (!loading) {
      if (window.ClassicEditor) {
        initEditor();
      } else {
        script = document.createElement('script');
        script.src = 'https://cdn.ckeditor.com/ckeditor5/41.1.0/classic/ckeditor.js';
        script.async = true;
        script.onload = initEditor;
        document.body.appendChild(script);
      }
    }

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy()
          .then(() => {
            editorInstanceRef.current = null;
          })
          .catch(err => {
            console.error('Erro ao destruir CKEditor:', err);
          });
      }
    };
  }, [loading]);

  // 2. Carregar dados dos Professores e Grupo (se edição)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obter professores
        const usersResponse = await fetch(`${API_URL}/api/users`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (usersResponse.ok) {
          const users = await usersResponse.json();
          const filtered = users.filter(u => u.roles && u.roles.includes('Professor'));
          setProfessores(filtered);
        } else if (usersResponse.status === 401 || usersResponse.status === 403) {
          navigate('/admin/login');
          return;
        }

        // Se edição, obter grupo de pesquisa
        if (isEditing) {
          const grupoResponse = await fetch(`${API_URL}/api/grupos-pesquisa/${id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (grupoResponse.ok) {
            const data = await grupoResponse.json();
            setAudit(data);
            const valueHTML = data.body?.value || '';
            contentRef.current = valueHTML;

            setFormData({
              title: data.title || '',
              body: {
                value: valueHTML,
                summary: data.body?.summary || ''
              },
              field_lideres: data.field_lideres || []
            });

            if (editorInstanceRef.current) {
              editorInstanceRef.current.setData(valueHTML);
            }
          } else {
            setError('Grupo de pesquisa não encontrado');
          }
        }
      } catch (err) {
        setError('Erro ao carregar dados do servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditing, navigate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddLeader = (professorId) => {
    setFormData(prev => {
      if (prev.field_lideres.includes(professorId)) return prev;
      return { ...prev, field_lideres: [...prev.field_lideres, professorId] };
    });
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleRemoveLeader = (professorId) => {
    setFormData(prev => ({
      ...prev,
      field_lideres: prev.field_lideres.filter(id => id !== professorId)
    }));
  };

  const selectedLeaders = formData.field_lideres.map(leaderId => {
    const p = professores.find(prof => prof.id === leaderId);
    return p ? { id: p.id, nome: p.perfil_geral?.nome || p.email, email: p.email } : { id: leaderId, nome: 'Usuário Desconhecido', email: '' };
  });

  const filteredProfessores = professores.filter(prof => {
    const nome = prof.perfil_geral?.nome || '';
    const email = prof.email || '';
    const matchesQuery = nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         email.toLowerCase().includes(searchQuery.toLowerCase());
    const isAlreadySelected = formData.field_lideres.includes(prof.id);
    return matchesQuery && !isAlreadySelected;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'summary') {
      setFormData(prev => ({
        ...prev,
        body: {
          ...prev.body,
          summary: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('O título é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEditing 
        ? `${API_URL}/api/grupos-pesquisa/${id}` 
        : `${API_URL}/api/grupos-pesquisa`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        navigate('/admin/grupos-pesquisa');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar grupo de pesquisa');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/grupos-pesquisa" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="font-heading text-xl font-semibold text-ufrpe-blue">
          {isEditing ? 'Editar Grupo de Pesquisa' : 'Novo Grupo de Pesquisa'}
        </h2>
      </div>

      {isEditing && (
        <AuditHeader criadoPor={audit?.criado_por} atualizadoPor={audit?.atualizado_por} criadoEm={audit?.criado_em} atualizadoEm={audit?.atualizado_em} users={auditUsers} className="mb-6" />
      )}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
          <input 
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm"
            placeholder="Ex: Grupo de Estudo em Ciências de Dados"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resumo (Summary)</label>
          <textarea 
            name="summary"
            value={formData.body.summary}
            onChange={handleInputChange}
            rows="2"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm"
            placeholder="Ex: Breve resumo dos objetivos do grupo..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada *</label>
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <div ref={editorRef}></div>
          </div>
          <style>{`
            .ck-editor__editable_inline {
              min-height: 250px !important;
            }
          `}</style>
        </div>

        <div ref={dropdownRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Líderes (Professores) *</label>
          
          {/* Tags de Líderes Selecionados */}
          {selectedLeaders.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedLeaders.map(leader => (
                <div 
                  key={leader.id} 
                  className="bg-ufrpe-blue/5 text-ufrpe-blue text-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-ufrpe-blue/20 font-medium"
                >
                  <div>
                    <span>{leader.nome}</span>
                    {leader.email && <span className="text-xs text-ufrpe-blue ml-1 font-normal">({leader.email})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLeader(leader.id)}
                    className="text-ufrpe-blue hover:text-ufrpe-yellow hover:bg-ufrpe-blue/10 rounded-full p-0.5 transition-colors focus:outline-none"
                    title="Remover líder"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Campo de Busca Autocomplete */}
          {professores.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
              Nenhum usuário com o papel "Professor" encontrado no sistema. Por favor, cadastre um professor primeiro para associar ao grupo.
            </p>
          ) : (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full border border-gray-300 rounded-md pl-10 pr-4 py-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm placeholder-gray-400"
                placeholder="Buscar professor por nome ou email..."
              />

              {/* Dropdown de Resultados */}
              {showDropdown && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredProfessores.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      {searchQuery.trim() === '' ? 'Digite para filtrar ou selecione...' : 'Nenhum professor encontrado.'}
                    </div>
                  ) : (
                    filteredProfessores.map((prof) => (
                      <div
                        key={prof.id}
                        onClick={() => handleAddLeader(prof.id)}
                        className="px-4 py-2.5 hover:bg-ufrpe-blue/5 text-sm cursor-pointer transition-colors border-b border-gray-100 last:border-0 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{prof.perfil_geral?.nome || prof.email}</p>
                          <p className="text-xs text-gray-500">{prof.email}</p>
                        </div>
                        <span className="text-xs text-ufrpe-blue bg-ufrpe-blue/5 px-2 py-1 rounded font-medium">Selecionar</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link 
            to="/admin/grupos-pesquisa"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button 
            type="submit"
            disabled={loading}
            className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Grupo'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminGrupoPesquisaForm;
