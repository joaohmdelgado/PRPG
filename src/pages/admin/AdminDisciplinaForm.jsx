import { FormSkeleton } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Upload, FileText, Trash2, Search, X, Book } from 'lucide-react';
import { API_URL, apiFetch } from '../../api';
import { isProgramaGestor } from '../../auth';
import { AuditHeader } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';
import PublicacaoCampos from '../../components/admin/PublicacaoCampos';
import useAvisoAlteracoes from '../../hooks/useAvisoAlteracoes';

const AdminDisciplinaForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Envelope de publicação + versão carregada (edição concorrente) — Fase F.6.
    status: 'PUBLICADO',
    publicadoEm: '',
    _versao: null,
    title: '',
    cargaHoraria: '',
    docenteId: '',
    ementaUrl: '',
    tipoDisciplina: '',
    programaId: ''
  });
  // Nome/e-mail exibidos no chip do docente selecionado — vem direto do GET
  // (data.docente) na edição, ou do item escolhido no autocomplete.
  const [docenteDisplay, setDocenteDisplay] = useState(null);

  const [professores, setProfessores] = useState([]);
  const [programas, setProgramas] = useState([]);
  const { toast, Toasts } = useToast();
  const [loading, setLoading] = useState(isEditing);
  const { sujo } = useAvisoAlteracoes(formData, !loading);
  const [error, setError] = useState('');
  const [audit, setAudit] = useState(null);
  const auditUsers = useUsers();

  useEffect(() => {
    apiFetch('/api/programas')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProgramas(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Carrega os Professores e os Dados do Formulário (se edição)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carrega usuários/professores do sistema
        const usersResponse = await apiFetch('/api/users');

        if (usersResponse.ok) {
          const users = await usersResponse.json();
          setProfessores(users.filter(u => u.roles && u.roles.includes('Professor')));
        } else if (usersResponse.status === 401 || usersResponse.status === 403) {
          navigate('/admin/login');
          return;
        }

        // Se estiver editando, busca os dados da disciplina
        if (isEditing) {
          const response = await apiFetch(`/api/disciplinas/${id}`);
          if (response.ok) {
            const data = await response.json();
            setAudit(data);
            setFormData({
              status: data.status || 'PUBLICADO',
              publicadoEm: data.publicadoEm || '',
              _versao: data.atualizado_em || null,
              title: data.title || '',
              cargaHoraria: data.cargaHoraria || '',
              docenteId: data.docentePessoaId || '',
              ementaUrl: data.ementaUrl || '',
              tipoDisciplina: data.tipoDisciplina || '',
              programaId: data.programaId || ''
            });
            if (data.docente) setDocenteDisplay({ nome: data.docente.nome, email: data.docente.email });
          } else {
            setError('Disciplina não encontrada');
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
      const response = await apiFetch('/api/upload', { method: 'POST', body: fileData });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          ementaUrl: data.url
        }));
      } else {
        const errData = await response.json();
        toast.error(errData.message || 'Erro ao enviar a ementa PDF');
      }
    } catch (error) {
      console.error('Erro de upload:', error);
      toast.error('Erro de conexão ao enviar a ementa');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectProfessor = (prof) => {
    setFormData(prev => ({ ...prev, docenteId: prof.id }));
    setDocenteDisplay({ nome: prof.perfil_geral?.nome, email: prof.email });
    setSearchQuery(prof.perfil_geral?.nome || prof.email);
    setShowDropdown(false);
  };

  const handleRemoveProfessor = () => {
    setFormData(prev => ({ ...prev, docenteId: '' }));
    setDocenteDisplay(null);
    setSearchQuery('');
  };

  const filteredProfessores = professores.filter(prof => {
    const nome = prof.perfil_geral?.nome || '';
    const email = prof.email || '';
    const q = searchQuery.toLowerCase();
    return nome.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('O título é obrigatório.');
      return;
    }
    if (!formData.cargaHoraria) {
      setError('A carga horária é obrigatória.');
      return;
    }
    if (!formData.tipoDisciplina) {
      setError('O tipo de disciplina é obrigatório.');
      return;
    }
    if (!formData.docenteId) {
      setError('O docente (Professor) é obrigatório.');
      return;
    }
    if (!formData.ementaUrl) {
      setError('O arquivo PDF da ementa é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const path = isEditing ? `/api/disciplinas/${id}` : '/api/disciplinas';

      const response = await apiFetch(path, { method: isEditing ? 'PUT' : 'POST', json: formData });

      if (response.ok) {
        navigate('/admin/disciplinas');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar disciplina');
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
        <Link to="/admin/disciplinas" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue flex items-center gap-2">
          <Book className="text-ufrpe-blue" size={24} />
          {isEditing ? 'Editar Disciplina' : 'Nova Disciplina'}
        </h2>
      </div>

      {isEditing && (
        <AuditHeader criadoPor={audit?.criado_por} atualizadoPor={audit?.atualizado_por} criadoEm={audit?.criado_em} atualizadoEm={audit?.atualizado_em} users={auditUsers} className="mb-6" />
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
              placeholder="Digite o título da disciplina..."
            />
          </div>

          {/* Carga Horária */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Carga Horária (horas inteiras) *</label>
            <input
              type="number"
              name="cargaHoraria"
              value={formData.cargaHoraria}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm"
              placeholder="Ex: 60"
            />
          </div>

          {/* Tipo de disciplina */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Disciplina *</label>
            <select
              name="tipoDisciplina"
              value={formData.tipoDisciplina}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm bg-white"
            >
              <option value="">Selecione o tipo</option>
              <option value="Eletiva">Eletiva</option>
              <option value="Obrigatória">Obrigatória</option>
            </select>
          </div>

          {/* Programa */}
          <div className={`md:col-span-2 ${isProgramaGestor() ? 'hidden' : ''}`}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Programa (opcional)</label>
            <select name="programaId" value={formData.programaId} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow bg-white text-sm">
              <option value="">— Sem programa —</option>
              {programas.map((p) => (
                <option key={p.id} value={p.id}>{p.sigla && p.sigla !== 'S/SIGLA' ? `${p.sigla} — ${p.nome}` : p.nome}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Ao vincular, a disciplina aparece no microsite do programa.</p>
          </div>

          {/* Docente Autocomplete */}
          <div ref={dropdownRef} className="relative md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Docente (Professor) *</label>

            {formData.docenteId ? (
              // Professor Selecionado
              <div className="flex items-center justify-between bg-ufrpe-blue/5 border border-ufrpe-blue/20 text-ufrpe-blue rounded-md px-4 py-2.5">
                <div>
                  <p className="font-semibold text-sm">
                    {docenteDisplay?.nome || 'Usuário carregando...'}
                  </p>
                  <p className="text-xs text-ufrpe-blue">
                    {docenteDisplay?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveProfessor}
                  className="text-ufrpe-blue hover:text-ufrpe-yellow hover:bg-ufrpe-blue/10 rounded-full p-1.5 transition-colors focus:outline-none"
                  title="Remover docente"
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
                  placeholder="Buscar professor por nome ou email..."
                />

                {/* Dropdown de Professores */}
                {showDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredProfessores.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        Nenhum professor com esse nome ou e-mail cadastrado.
                      </div>
                    ) : (
                      filteredProfessores.map((prof) => (
                        <div
                          key={prof.id}
                          onClick={() => handleSelectProfessor(prof)}
                          className="px-4 py-2.5 hover:bg-ufrpe-blue/5 text-sm cursor-pointer transition-colors border-b border-gray-100 last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">
                              {prof.perfil_geral?.nome || prof.email}
                            </p>
                            <p className="text-xs text-gray-500">{prof.email}</p>
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

          {/* Ementa PDF */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ementa (PDF) *</label>

            {formData.ementaUrl ? (
              // Arquivo já enviado
              <div className="flex items-center gap-3 bg-gray-50 p-3 border border-gray-300 rounded-md">
                <FileText className="text-red-500 shrink-0" size={24} />
                <a
                  href={formData.ementaUrl.startsWith('http') ? formData.ementaUrl : `${API_URL}${formData.ementaUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ufrpe-blue hover:underline flex-grow truncate font-medium"
                >
                  Visualizar PDF da Ementa
                </a>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, ementaUrl: '' }))}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                  title="Remover ementa"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              // Componente Premium de Upload
              <div className="relative">
                {uploading ? (
                  <div className="flex items-center gap-3 px-4 py-3 border border-dashed border-ufrpe-blue/30 rounded-lg bg-ufrpe-blue/5 text-ufrpe-blue text-sm font-medium animate-pulse">
                    <span className="w-5 h-5 border-2 border-ufrpe-blue border-t-transparent rounded-full animate-spin"></span>
                    Enviando ementa...
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 hover:border-ufrpe-blue/40 rounded-lg cursor-pointer bg-gray-50 hover:bg-ufrpe-blue/5 transition-all focus-within:ring-2 focus-within:ring-ufrpe-yellow">
                    <Upload className="text-gray-400 shrink-0" size={20} />
                    <div className="flex-grow min-w-0">
                      <span className="block text-sm font-medium text-gray-700">Selecionar PDF da Ementa</span>
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

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            to="/admin/disciplinas"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || uploading}
            className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-medium text-sm disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Disciplina'}
          </button>
        </div>
      </form>
      {Toasts}
    </div>
  );
};

export default AdminDisciplinaForm;
