import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Upload, FileText, Trash2, Search, X, BookOpen } from 'lucide-react';
import { API_URL } from '../../api';

const AdminTeseForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    field_ano: '',
    field_arquivo: '',
    field_autor: '',
    field_tipo_td: ''
  });

  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Carrega os Alunos e os Dados do Formulário (se edição)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carrega usuários/alunos do sistema
        const usersResponse = await fetch(`${API_URL}/api/users`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        let filteredAlunos = [];
        if (usersResponse.ok) {
          const users = await usersResponse.json();
          filteredAlunos = users.filter(u => u.roles && u.roles.includes('Aluno'));
          setAlunos(filteredAlunos);
        } else if (usersResponse.status === 401 || usersResponse.status === 403) {
          navigate('/admin/login');
          return;
        }

        // Se estiver editando, busca os dados da tese/dissertação
        if (isEditing) {
          const response = await fetch(`${API_URL}/api/teses-dissertacoes/${id}`);
          if (response.ok) {
            const data = await response.json();
            setFormData({
              title: data.title || '',
              field_ano: data.field_ano || '',
              field_arquivo: data.field_arquivo || '',
              field_autor: data.field_autor || '',
              field_tipo_td: data.field_tipo_td || ''
            });

            // Se o autor estiver preenchido, inicializa o autocomplete
            const selectedAluno = filteredAlunos.find(aluno => aluno.id === data.field_autor);
            if (selectedAluno) {
              setSearchQuery(selectedAluno.perfil_geral?.nome || selectedAluno.email);
            }
          } else {
            setError('Tese/Dissertação não encontrada');
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

  // 2. Fechar o dropdown de busca ao clicar fora do componente
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    const fileData = new FormData();
    fileData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: fileData
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          field_arquivo: data.url
        }));
      } else {
        const errData = await response.json();
        alert(errData.message || 'Erro ao enviar o arquivo PDF');
      }
    } catch (error) {
      console.error('Erro de upload:', error);
      alert('Erro de conexão ao enviar o arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectAluno = (aluno) => {
    setFormData(prev => ({ ...prev, field_autor: aluno.id }));
    setSearchQuery(aluno.perfil_geral?.nome || aluno.email);
    setShowDropdown(false);
  };

  const handleRemoveAluno = () => {
    setFormData(prev => ({ ...prev, field_autor: '' }));
    setSearchQuery('');
  };

  const selectedAlunoObj = alunos.find(a => a.id === formData.field_autor);

  const filteredAlunos = alunos.filter(aluno => {
    const nome = aluno.perfil_geral?.nome || '';
    const email = aluno.email || '';
    const q = searchQuery.toLowerCase();
    return nome.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('O título é obrigatório.');
      return;
    }
    if (!formData.field_ano) {
      setError('A data do ano é obrigatória.');
      return;
    }
    if (!formData.field_tipo_td) {
      setError('O tipo (Tese ou Dissertação) é obrigatório.');
      return;
    }
    if (!formData.field_autor) {
      setError('O autor (Aluno) é obrigatório.');
      return;
    }
    if (!formData.field_arquivo) {
      setError('O arquivo PDF do trabalho é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEditing 
        ? `${API_URL}/api/teses-dissertacoes/${id}` 
        : `${API_URL}/api/teses-dissertacoes`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        navigate('/admin/teses-dissertacoes');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar tese/dissertação');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/teses-dissertacoes" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <BookOpen className="text-blue-600" size={24} />
          {isEditing ? 'Editar Tese/Dissertação' : 'Nova Tese/Dissertação'}
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Título */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Digite o título do trabalho acadêmico..."
            />
          </div>

          {/* Tipo (Tese ou Dissertação) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select
              name="field_tipo_td"
              value={formData.field_tipo_td}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value="">Selecione o tipo</option>
              <option value="Tese">Tese</option>
              <option value="Dissertação">Dissertação</option>
            </select>
          </div>

          {/* Data do Ano */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data / Ano *</label>
            <input
              type="date"
              name="field_ano"
              value={formData.field_ano}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Autor (Aluno) Autocomplete */}
          <div ref={dropdownRef} className="relative md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Autor (Aluno) *</label>
            
            {formData.field_autor ? (
              // Aluno Selecionado
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-900 rounded-md px-4 py-2.5">
                <div>
                  <p className="font-semibold text-sm">
                    {selectedAlunoObj?.perfil_geral?.nome || 'Usuário carregando...'}
                  </p>
                  <p className="text-xs text-blue-600">
                    {selectedAlunoObj?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveAluno}
                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full p-1.5 transition-colors focus:outline-none"
                  title="Remover autor"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              // Campo de Busca
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
                  className="w-full border border-gray-300 rounded-md pl-10 pr-4 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-400"
                  placeholder="Buscar aluno por nome ou email..."
                />

                {/* Dropdown de Alunos */}
                {showDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredAlunos.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        Nenhum aluno com esse nome ou e-mail cadastrado.
                      </div>
                    ) : (
                      filteredAlunos.map((aluno) => (
                        <div
                          key={aluno.id}
                          onClick={() => handleSelectAluno(aluno)}
                          className="px-4 py-2.5 hover:bg-blue-50 text-sm cursor-pointer transition-colors border-b border-gray-100 last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">
                              {aluno.perfil_geral?.nome || aluno.email}
                            </p>
                            <p className="text-xs text-gray-500">{aluno.email}</p>
                          </div>
                          <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded font-semibold">
                            Selecionar
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Arquivo PDF */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">PDF da Dissertação/Tese *</label>
            
            {formData.field_arquivo ? (
              // Arquivo já enviado
              <div className="flex items-center gap-3 bg-gray-50 p-3 border border-gray-300 rounded-md">
                <FileText className="text-red-500 shrink-0" size={24} />
                <a 
                  href={formData.field_arquivo.startsWith('http') ? formData.field_arquivo : `${API_URL}${formData.field_arquivo}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-blue-600 hover:underline flex-grow truncate font-medium"
                >
                  Visualizar PDF da Dissertação / Tese
                </a>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, field_arquivo: '' }))}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                  title="Remover documento"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              // Componente Premium de Upload
              <div className="relative">
                {uploading ? (
                  <div className="flex items-center gap-3 px-4 py-3 border border-dashed border-blue-300 rounded-lg bg-blue-50/50 text-blue-600 text-sm font-medium animate-pulse">
                    <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    Enviando trabalho acadêmico...
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 hover:border-blue-400 rounded-lg cursor-pointer bg-gray-50 hover:bg-blue-50/30 transition-all focus-within:ring-2 focus-within:ring-blue-500">
                    <Upload className="text-gray-400 shrink-0" size={20} />
                    <div className="flex-grow min-w-0">
                      <span className="block text-sm font-medium text-gray-700">Selecionar PDF do Trabalho</span>
                      <span className="block text-xs text-gray-400">Clique para escolher o arquivo PDF</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={uploading}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                      required
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botões do Formulário */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link 
            to="/admin/teses-dissertacoes"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button 
            type="submit"
            disabled={loading || uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Trabalho'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminTeseForm;
