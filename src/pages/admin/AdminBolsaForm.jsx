import { FormSkeleton } from '../../components/admin/AdminUI';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Search, X, Award, Calendar } from 'lucide-react';
import { apiFetch } from '../../api';
import { AuditHeader } from '../../components/AuditInfo';
import useVocabulario from '../../hooks/useVocabulario';
import PublicacaoCampos from '../../components/admin/PublicacaoCampos';
import useAvisoAlteracoes from '../../hooks/useAvisoAlteracoes';

const AdminBolsaForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Envelope de publicação + versão carregada (edição concorrente) — Fase F.6.
    status: 'PUBLICADO',
    publicadoEm: '',
    _versao: null,
    title: '',
    alunoId: '',
    dataInicio: '',
    dataFim: '',
    tipoBolsa: ''
  });
  // Nome/e-mail exibidos no chip do beneficiário selecionado.
  const [alunoDisplay, setAlunoDisplay] = useState(null);

  const [users, setUsers] = useState([]);
  // Tipos de bolsa vêm de vocabularios ('bolsa.tipo' — Fase F.4), editáveis em Classificações.
  const { itens: tiposVocab } = useVocabulario('bolsa.tipo');
  const tiposBolsa = tiposVocab.map((v) => v.rotulo);
  const [loading, setLoading] = useState(isEditing);
  const { sujo } = useAvisoAlteracoes(formData, !loading);
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
        const usersResponse = await apiFetch('/api/users');

        if (usersResponse.ok) {
          setUsers(await usersResponse.json());
        } else if (usersResponse.status === 401 || usersResponse.status === 403) {
          navigate('/admin/login');
          return;
        }

        // Se estiver editando, busca os dados da bolsa
        if (isEditing) {
          const response = await apiFetch(`/api/bolsas/${id}`);
          if (response.ok) {
            const data = await response.json();
            setAudit(data);
            setFormData({
              status: data.status || 'PUBLICADO',
              publicadoEm: data.publicadoEm || '',
              _versao: data.atualizado_em || null,
              title: data.title || '',
              alunoId: data.pessoaId || '',
              dataInicio: data.dataInicio || '',
              dataFim: data.dataFim || '',
              tipoBolsa: data.tipoBolsa || ''
            });
            if (data.aluno) setAlunoDisplay({ nome: data.aluno.nome, email: data.aluno.email });
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

  const handleSelectUser = (u) => {
    setFormData(prev => ({ ...prev, alunoId: u.id }));
    setAlunoDisplay({ nome: u.perfil_geral?.nome, email: u.email, roles: u.roles });
    setSearchQuery(u.perfil_geral?.nome || u.email);
    setShowDropdown(false);
  };

  const handleRemoveUser = () => {
    setFormData(prev => ({ ...prev, alunoId: '' }));
    setAlunoDisplay(null);
    setSearchQuery('');
  };

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
    if (!formData.alunoId) {
      setError('O beneficiário (Aluno) é obrigatório.');
      return;
    }
    if (!formData.dataInicio || !formData.dataFim) {
      setError('As datas de início e fim da bolsa são obrigatórias.');
      return;
    }
    if (!formData.tipoBolsa) {
      setError('O tipo de bolsa é obrigatório.');
      return;
    }

    // Verificar se data_inicio é anterior a data_fim
    if (new Date(formData.dataInicio) > new Date(formData.dataFim)) {
      setError('A data de início não pode ser posterior à data de término da bolsa.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const path = isEditing ? `/api/bolsas/${id}` : '/api/bolsas';

      const response = await apiFetch(path, { method: isEditing ? 'PUT' : 'POST', json: formData });

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
      <FormSkeleton />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/bolsas" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue flex items-center gap-2">
          <Award className="text-ufrpe-blue" size={24} />
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
        <PublicacaoCampos
          status={formData.status}
          publicadoEm={formData.publicadoEm}
          onChange={(pub) => setFormData((prev) => ({ ...prev, ...pub }))}
          previewUrl={null}
          sujo={sujo}
          historico={isEditing ? { entidade: 'bolsas', id, versao: formData._versao } : null}
        />
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm"
              placeholder="Digite a identificação ou título da bolsa..."
            />
          </div>

          {/* Tipo de Bolsa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Bolsa *</label>
            <select
              name="tipoBolsa"
              value={formData.tipoBolsa}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm bg-white"
            >
              <option value="">Selecione o tipo de bolsa</option>
              {tiposBolsa.map((tipo, idx) => (
                <option key={idx} value={tipo}>{tipo}</option>
              ))}
              {formData.tipoBolsa && !tiposBolsa.includes(formData.tipoBolsa) && (
                <option value={formData.tipoBolsa}>{formData.tipoBolsa}</option>
              )}
            </select>
          </div>

          {/* Aluno/User Autocomplete */}
          <div ref={dropdownRef} className="relative md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiário (Usuário/Aluno) *</label>

            {formData.alunoId ? (
              // Usuário Selecionado
              <div className="flex items-center justify-between bg-ufrpe-blue/5 border border-ufrpe-blue/20 text-ufrpe-blue rounded-md px-4 py-2.5">
                <div>
                  <p className="font-semibold text-sm">
                    {alunoDisplay?.nome || 'Usuário carregando...'}
                  </p>
                  <p className="text-xs text-ufrpe-blue">
                    {alunoDisplay?.email} {alunoDisplay?.roles && `(${alunoDisplay.roles.join(', ')})`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveUser}
                  className="text-ufrpe-blue hover:text-ufrpe-yellow hover:bg-ufrpe-blue/10 rounded-full p-1.5 transition-colors focus:outline-none"
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
                  className="w-full border border-gray-300 rounded-md pl-10 pr-4 py-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm placeholder-gray-400"
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
                          className="px-4 py-2.5 hover:bg-ufrpe-blue/5 text-sm cursor-pointer transition-colors border-b border-gray-100 last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">
                              {u.perfil_geral?.nome || u.email}
                            </p>
                            <p className="text-xs text-gray-500">
                              {u.email} {u.roles && `(${u.roles.join(', ')})`}
                            </p>
                          </div>
                          <span className="text-xs text-ufrpe-blue bg-ufrpe-blue/5 px-2.5 py-1 rounded font-semibold">
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
                  name="dataInicio"
                  value={formData.dataInicio}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 bg-white rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data de Término *</label>
                <input
                  type="date"
                  name="dataFim"
                  value={formData.dataFim}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 bg-white rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm"
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
            className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm disabled:opacity-50"
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
