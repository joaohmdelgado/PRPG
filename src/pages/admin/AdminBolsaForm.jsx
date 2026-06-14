import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Search, X, Award, Calendar } from 'lucide-react';
import { API_URL } from '../../api';
import { AuditHeader } from '../../components/AuditInfo';

const AdminBolsaForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    field_aluno: '',
    field_periodo_bolsa: {
      data_inicio: '',
      data_fim: ''
    },
    field_tipo_bolsa: ''
  });

  const [users, setUsers] = useState([]);
  const [tiposBolsa, setTiposBolsa] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');
  const [audit, setAudit] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Carrega os Usuários, Taxonomias de Tipos de Bolsa e Dados (se edição)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carrega todos os usuários para vinculação
        const usersResponse = await fetch(`${API_URL}/api/users`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        let loadedUsers = [];
        if (usersResponse.ok) {
          loadedUsers = await usersResponse.json();
          setUsers(loadedUsers);
        } else if (usersResponse.status === 401 || usersResponse.status === 403) {
          navigate('/admin/login');
          return;
        }

        // Carrega taxonomias para buscar tipo_bolsa
        const taxResponse = await fetch(`${API_URL}/api/taxonomias`);
        if (taxResponse.ok) {
          const taxData = await taxResponse.json();
          setTiposBolsa(taxData.tipo_bolsa || []);
        }

        // Se estiver editando, busca os dados da bolsa
        if (isEditing) {
          const response = await fetch(`${API_URL}/api/bolsas/${id}`);
          if (response.ok) {
            const data = await response.json();
            setAudit(data);
            setFormData({
              title: data.title || '',
              field_aluno: data.field_aluno || '',
              field_periodo_bolsa: data.field_periodo_bolsa || { data_inicio: '', data_fim: '' },
              field_tipo_bolsa: data.field_tipo_bolsa || ''
            });

            // Se o aluno estiver preenchido, inicializa o autocomplete
            const selectedUser = loadedUsers.find(u => u.id === data.field_aluno);
            if (selectedUser) {
              setSearchQuery(selectedUser.perfil_geral?.nome || selectedUser.email);
            }
          } else {
            setError('Bolsa não encontrada');
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

  const handlePeriodChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      field_periodo_bolsa: {
        ...prev.field_periodo_bolsa,
        [name]: value
      }
    }));
  };

  const handleSelectUser = (u) => {
    setFormData(prev => ({ ...prev, field_aluno: u.id }));
    setSearchQuery(u.perfil_geral?.nome || u.email);
    setShowDropdown(false);
  };

  const handleRemoveUser = () => {
    setFormData(prev => ({ ...prev, field_aluno: '' }));
    setSearchQuery('');
  };

  const selectedUserObj = users.find(u => u.id === formData.field_aluno);

  const filteredUsers = users.filter(u => {
    const nome = u.perfil_geral?.nome || '';
    const email = u.email || '';
    const q = searchQuery.toLowerCase();
    return nome.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('O título é obrigatório.');
      return;
    }
    if (!formData.field_aluno) {
      setError('O beneficiário (Aluno) é obrigatório.');
      return;
    }
    if (!formData.field_periodo_bolsa.data_inicio || !formData.field_periodo_bolsa.data_fim) {
      setError('As datas de início e fim da bolsa são obrigatórias.');
      return;
    }
    if (!formData.field_tipo_bolsa) {
      setError('O tipo de bolsa é obrigatório.');
      return;
    }

    // Verificar se data_inicio é anterior a data_fim
    if (new Date(formData.field_periodo_bolsa.data_inicio) > new Date(formData.field_periodo_bolsa.data_fim)) {
      setError('A data de início não pode ser posterior à data de término da bolsa.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEditing 
        ? `${API_URL}/api/bolsas/${id}` 
        : `${API_URL}/api/bolsas`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        navigate('/admin/bolsas');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar bolsa');
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
        <Link to="/admin/bolsas" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <Award className="text-blue-600" size={24} />
          {isEditing ? 'Editar Bolsa' : 'Nova Bolsa'}
        </h2>
      </div>

      {isEditing && (
        <AuditHeader criadoPor={audit?.criado_por} atualizadoPor={audit?.atualizado_por} criadoEm={audit?.criado_em} atualizadoEm={audit?.atualizado_em} users={users} className="mb-6" />
      )}

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
              placeholder="Digite a identificação ou título da bolsa..."
            />
          </div>

          {/* Tipo de Bolsa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Bolsa *</label>
            <select
              name="field_tipo_bolsa"
              value={formData.field_tipo_bolsa}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value="">Selecione o tipo de bolsa</option>
              {tiposBolsa.map((tipo, idx) => (
                <option key={idx} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          {/* Aluno/User Autocomplete */}
          <div ref={dropdownRef} className="relative md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiário (Usuário/Aluno) *</label>
            
            {formData.field_aluno ? (
              // Usuário Selecionado
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-900 rounded-md px-4 py-2.5">
                <div>
                  <p className="font-semibold text-sm">
                    {selectedUserObj?.perfil_geral?.nome || 'Usuário carregando...'}
                  </p>
                  <p className="text-xs text-blue-600">
                    {selectedUserObj?.email} {selectedUserObj?.roles && `(${selectedUserObj.roles.join(', ')})`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveUser}
                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full p-1.5 transition-colors focus:outline-none"
                  title="Remover beneficiário"
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
                  placeholder="Buscar usuário/aluno por nome ou email..."
                />

                {/* Dropdown de Usuários */}
                {showDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        Nenhum usuário com esse nome ou e-mail cadastrado.
                      </div>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => handleSelectUser(u)}
                          className="px-4 py-2.5 hover:bg-blue-50 text-sm cursor-pointer transition-colors border-b border-gray-100 last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">
                              {u.perfil_geral?.nome || u.email}
                            </p>
                            <p className="text-xs text-gray-500">
                              {u.email} {u.roles && `(${u.roles.join(', ')})`}
                            </p>
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

          {/* Período da Bolsa */}
          <div className="md:col-span-2 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-gray-500" />
              Período de Vigência da Bolsa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data de Início *</label>
                <input
                  type="date"
                  name="data_inicio"
                  value={formData.field_periodo_bolsa.data_inicio}
                  onChange={handlePeriodChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 bg-white rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data de Término *</label>
                <input
                  type="date"
                  name="data_fim"
                  value={formData.field_periodo_bolsa.data_fim}
                  onChange={handlePeriodChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 bg-white rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link 
            to="/admin/bolsas"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button 
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Bolsa'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminBolsaForm;
