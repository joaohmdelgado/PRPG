import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Shield, Plus, Trash2, X, Search } from 'lucide-react';
import { API_URL } from '../../api';
import { AuditHeader } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const ROLES = ['Administrator', 'Gestor', 'Secretário(a)', 'Professor', 'Aluno'];
const NIVEIS = ['Mestrando', 'Mestre', 'Doutorando', 'Doutor'];
const TIPOS_PROFESSOR = ['Permanente', 'Colaborador', 'Visitante'];
const SITUACOES_ALUNO = ['Ativo', 'Trancado', 'Desligado', 'Concluído'];

const emptyGeral = { nome: '', cpf: '', siape: '', telefones: [''] };
const emptyAcademicos = { lattes: '', orcid: '', google_scholar: '', publons: '', linhas_pesquisa: '' };
const emptyAluno = { nivel: 'Mestrando', entrada: '', orientador_id: '', qualificacao: '', defesa: '', situacao: 'Ativo', egresso: false };
const emptyProfessor = { tipo_professor: 'Permanente', programas: [] };
const defaultPrivacidade = { perfil_publico: true, mostrar_email: true, mostrar_telefone: false, mostrar_lattes: true };

const AdminUserForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    roles: [],
    privacidade: { ...defaultPrivacidade },
    perfil_geral: { ...emptyGeral },
    dados_academicos: { ...emptyAcademicos },
    perfil_aluno: null,
    perfil_professor: null
  });

  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');
  const [taxonomias, setTaxonomias] = useState({ entradas: [], linhas_pesquisa: [] });
  const users = useUsers();

  const [programasList, setProgramasList] = useState([]);

  useEffect(() => {
    fetchTaxonomias();
    fetchProgramas();
    if (isEditing) fetchUser();
  }, [id, isEditing]);

  const fetchProgramas = async () => {
    try {
      const res = await fetch(`${API_URL}/api/programas`);
      if (res.ok) setProgramasList(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchTaxonomias = async () => {
    try {
      const res = await fetch(`${API_URL}/api/taxonomias`);
      if (res.ok) setTaxonomias(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        
        let parsedTelefones = [''];
        if (data.perfil_geral?.telefones) {
          if (Array.isArray(data.perfil_geral.telefones)) {
            parsedTelefones = data.perfil_geral.telefones.length > 0 ? data.perfil_geral.telefones : [''];
          } else if (typeof data.perfil_geral.telefones === 'string') {
            parsedTelefones = [data.perfil_geral.telefones];
          }
        }

        setFormData({
          ...data,
          password: '',
          privacidade: { ...defaultPrivacidade, ...data.privacidade },
          perfil_geral: { 
            ...emptyGeral, 
            ...data.perfil_geral, 
            telefones: parsedTelefones 
          },
          dados_academicos: { 
            ...emptyAcademicos, 
            ...data.dados_academicos,
            linhas_pesquisa: data.dados_academicos?.linhas_pesquisa?.join('\n') || ''
          },
          perfil_aluno: data.perfil_aluno || null,
          perfil_professor: data.perfil_professor ? { programas: [], ...data.perfil_professor } : null
        });
      } else {
        setError('Usuário não encontrado');
      }
    } catch (err) {
      setError('Erro ao buscar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => {
      const roles = prev.roles.includes(role) 
        ? prev.roles.filter(r => r !== role) 
        : [...prev.roles, role];
      
      let perfil_aluno = prev.perfil_aluno;
      let perfil_professor = prev.perfil_professor;

      if (roles.includes('Aluno') && !perfil_aluno) perfil_aluno = { ...emptyAluno };
      if (!roles.includes('Aluno')) perfil_aluno = null;

      if (roles.includes('Professor') && !perfil_professor) perfil_professor = { ...emptyProfessor };
      if (!roles.includes('Professor')) perfil_professor = null;

      return { ...prev, roles, perfil_aluno, perfil_professor };
    });
  };

  const [programSearchQuery, setProgramSearchQuery] = useState('');
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const programDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (programDropdownRef.current && !programDropdownRef.current.contains(event.target)) {
        setShowProgramDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddProgram = (programId) => {
    setFormData(prev => {
      if (!prev.perfil_professor) return prev;
      const current = prev.perfil_professor.programas || [];
      if (current.includes(programId)) return prev;
      return {
        ...prev,
        perfil_professor: {
          ...prev.perfil_professor,
          programas: [...current, programId]
        }
      };
    });
    setProgramSearchQuery('');
    setShowProgramDropdown(false);
  };

  const handleRemoveProgram = (programId) => {
    setFormData(prev => {
      if (!prev.perfil_professor) return prev;
      const current = prev.perfil_professor.programas || [];
      return {
        ...prev,
        perfil_professor: {
          ...prev.perfil_professor,
          programas: current.filter(id => id !== programId)
        }
      };
    });
  };

  const selectedPrograms = (formData.perfil_professor?.programas || []).map(progId => {
    const p = programasList.find(prog => prog.id === progId);
    return p ? { id: p.id, nome: p.nome, sigla: p.sigla } : { id: progId, nome: 'Programa Desconhecido', sigla: '' };
  });

  const filteredPrograms = programasList.filter(prog => {
    const nome = prog.nome || '';
    const sigla = prog.sigla || '';
    const matchesQuery = nome.toLowerCase().includes(programSearchQuery.toLowerCase()) ||
                         sigla.toLowerCase().includes(programSearchQuery.toLowerCase());
    const isAlreadySelected = (formData.perfil_professor?.programas || []).includes(prog.id);
    return matchesQuery && !isAlreadySelected;
  });

  const handleChange = (e, section = null) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    if (section) {
      setFormData(prev => ({ ...prev, [section]: { ...prev[section], [name]: val } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleTelefoneChange = (index, value) => {
    setFormData(prev => {
      const newTelefones = [...prev.perfil_geral.telefones];
      newTelefones[index] = value;
      return {
        ...prev,
        perfil_geral: {
          ...prev.perfil_geral,
          telefones: newTelefones
        }
      };
    });
  };

  const handleAddTelefone = () => {
    setFormData(prev => ({
      ...prev,
      perfil_geral: {
        ...prev.perfil_geral,
        telefones: [...prev.perfil_geral.telefones, '']
      }
    }));
  };

  const handleRemoveTelefone = (index) => {
    setFormData(prev => ({
      ...prev,
      perfil_geral: {
        ...prev.perfil_geral,
        telefones: prev.perfil_geral.telefones.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.roles.length === 0) {
      setError('Selecione ao menos um papel (Role)');
      return;
    }

    if (formData.roles.includes('Professor') && (!formData.perfil_professor || !formData.perfil_professor.programas || formData.perfil_professor.programas.length === 0)) {
      setError('O professor deve estar relacionado a pelo menos um programa.');
      return;
    }

    setLoading(true);
    setError('');

    const cleanedTelefones = formData.perfil_geral.telefones.filter(t => t.trim() !== '');

    const payload = {
      ...formData,
      perfil_geral: {
        ...formData.perfil_geral,
        telefones: cleanedTelefones
      },
      dados_academicos: {
        ...formData.dados_academicos,
        linhas_pesquisa: formData.dados_academicos.linhas_pesquisa ? formData.dados_academicos.linhas_pesquisa.split('\n').filter(l => l) : []
      }
    };

    if (!payload.password) delete payload.password; // Não enviar senha vazia na edição

    try {
      const url = isEditing 
        ? `${API_URL}/api/users/${id}` 
        : `${API_URL}/api/users`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        navigate('/admin/users');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar usuário');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) return <div>Carregando...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/users" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue">
          {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
        </h2>
      </div>

      {isEditing && (
        <AuditHeader criadoPor={formData.criado_por} atualizadoPor={formData.atualizado_por} criadoEm={formData.criado_em} atualizadoEm={formData.atualizado_em} users={users} className="mb-6" />
      )}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Seção 1: Credenciais e Papéis */}
        <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Acesso e Papéis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">E-mail (Login) *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{isEditing ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required={!isEditing} className="w-full border p-2 rounded" />
            </div>
          </div>
          
          <div className="mb-2">
            <label className="block text-sm font-medium mb-2">Papéis (Roles) *</label>
            <div className="flex flex-wrap gap-3">
              {ROLES.map(role => (
                <label key={role} className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${formData.roles.includes(role) ? 'bg-ufrpe-blue/5 border-ufrpe-blue text-ufrpe-blue' : 'bg-white hover:bg-gray-100'}`}>
                  <input type="checkbox" checked={formData.roles.includes(role)} onChange={() => handleRoleToggle(role)} className="hidden" />
                  <Shield size={16} /> {role}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Seção 2: Privacidade (Granular) */}
        <section className="border border-gray-200 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Controles de Privacidade</h3>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 font-bold text-ufrpe-blue">
              <input type="checkbox" name="perfil_publico" checked={formData.privacidade.perfil_publico} onChange={(e) => handleChange(e, 'privacidade')} className="w-5 h-5 text-ufrpe-blue" />
              Perfil Visível no Site Público
            </label>
            <div className={`pl-8 space-y-2 ${!formData.privacidade.perfil_publico && 'opacity-50 pointer-events-none'}`}>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="mostrar_email" checked={formData.privacidade.mostrar_email} onChange={(e) => handleChange(e, 'privacidade')} />
                Exibir E-mail Institucional publicamente
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="mostrar_telefone" checked={formData.privacidade.mostrar_telefone} onChange={(e) => handleChange(e, 'privacidade')} />
                Exibir Telefones publicamente
              </label>
            </div>
          </div>
        </section>

        {/* Seção 3: Dados Gerais */}
        <section>
          <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Dados Pessoais / Gerais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Nome Completo</label>
              <input type="text" name="nome" value={formData.perfil_geral.nome} onChange={e => handleChange(e, 'perfil_geral')} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CPF</label>
              <input type="text" name="cpf" value={formData.perfil_geral.cpf} onChange={e => handleChange(e, 'perfil_geral')} className="w-full border p-2 rounded" />
            </div>
            {formData.roles.includes('Professor') && (
              <div>
                <label className="block text-sm font-medium mb-1">SIAPE</label>
                <input type="text" name="siape" value={formData.perfil_geral.siape} onChange={e => handleChange(e, 'perfil_geral')} className="w-full border p-2 rounded" />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">Telefone</label>
              <div className="space-y-2">
                {formData.perfil_geral.telefones.map((telefone, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={index === 0 ? "Digite o telefone" : "Digite outro telefone"}
                      value={telefone}
                      onChange={(e) => handleTelefoneChange(index, e.target.value)}
                      className="w-full border p-2 rounded focus:ring-2 focus:ring-ufrpe-yellow outline-none transition-all"
                    />
                    {formData.perfil_geral.telefones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTelefone(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Remover telefone"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddTelefone}
                className="mt-2 text-sm text-ufrpe-blue hover:text-ufrpe-yellow font-medium flex items-center gap-1 hover:underline focus:outline-none transition-colors"
              >
                <Plus size={16} /> Adicionar outro
              </button>
            </div>
          </div>
        </section>

        {/* Seção 4: Dados Acadêmicos (Para Professores, Alunos) */}
        {(formData.roles.includes('Professor') || formData.roles.includes('Aluno')) && (
          <section>
            <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Identificadores Acadêmicos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Currículo Lattes (URL)</label><input type="url" name="lattes" value={formData.dados_academicos.lattes} onChange={e => handleChange(e, 'dados_academicos')} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-sm font-medium mb-1">ORCID (URL)</label><input type="url" name="orcid" value={formData.dados_academicos.orcid} onChange={e => handleChange(e, 'dados_academicos')} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-sm font-medium mb-1">Google Scholar (URL)</label><input type="url" name="google_scholar" value={formData.dados_academicos.google_scholar} onChange={e => handleChange(e, 'dados_academicos')} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-sm font-medium mb-1">Publons (URL)</label><input type="url" name="publons" value={formData.dados_academicos.publons} onChange={e => handleChange(e, 'dados_academicos')} className="w-full border p-2 rounded" /></div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Linhas de Pesquisa (Uma por linha ou use as Oficiais)</label>
                <div className="flex gap-4">
                  <textarea name="linhas_pesquisa" value={formData.dados_academicos.linhas_pesquisa} onChange={e => handleChange(e, 'dados_academicos')} rows="3" className="w-full border p-2 rounded flex-1" />
                  {taxonomias.linhas_pesquisa.length > 0 && (
                    <div className="w-1/3 bg-gray-50 border rounded p-2 text-sm overflow-y-auto max-h-24">
                      <strong className="block mb-1">Taxonomias Oficiais:</strong>
                      {taxonomias.linhas_pesquisa.map(l => (
                        <div key={l} className="cursor-pointer text-ufrpe-blue hover:underline" onClick={() => handleChange({target:{name:'linhas_pesquisa', value: formData.dados_academicos.linhas_pesquisa ? formData.dados_academicos.linhas_pesquisa + '\n' + l : l}}, 'dados_academicos')}>{l}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Seção 5: Perfil Específico de Professor */}
        {formData.perfil_professor && (
          <section className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 space-y-4">
            <h3 className="text-lg font-medium text-yellow-800 border-b border-yellow-300 pb-2">Perfil: Professor</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Professor</label>
              <select name="tipo_professor" value={formData.perfil_professor.tipo_professor} onChange={e => handleChange(e, 'perfil_professor')} className="w-full border p-2 rounded bg-white">
                {TIPOS_PROFESSOR.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div ref={programDropdownRef} className="relative">
              <label className="block text-sm font-medium mb-2 text-yellow-900">Programas de Pós-Graduação Associados *</label>
              
              {/* Tags de Programas Selecionados */}
              {selectedPrograms.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedPrograms.map(prog => (
                    <div 
                      key={prog.id} 
                      className="bg-yellow-100 text-yellow-900 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-yellow-200 font-medium"
                    >
                      <span>{prog.nome} ({prog.sigla})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProgram(prog.id)}
                        className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-200 rounded-full p-0.5 transition-colors focus:outline-none"
                        title="Remover associação"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Campo de Busca Autocomplete */}
              {programasList.length === 0 ? (
                <p className="text-sm text-yellow-700">Nenhum programa cadastrado no sistema.</p>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    value={programSearchQuery}
                    onChange={(e) => {
                      setProgramSearchQuery(e.target.value);
                      setShowProgramDropdown(true);
                    }}
                    onFocus={() => setShowProgramDropdown(true)}
                    className="w-full border border-yellow-200 rounded-md pl-10 pr-4 py-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm placeholder-gray-400 bg-white"
                    placeholder="Buscar programa por nome ou sigla..."
                  />

                  {/* Dropdown de Resultados */}
                  {showProgramDropdown && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredPrograms.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          {programSearchQuery.trim() === '' ? 'Digite para filtrar ou selecione...' : 'Nenhum programa encontrado.'}
                        </div>
                      ) : (
                        filteredPrograms.map((prog) => (
                          <div
                            key={prog.id}
                            onClick={() => handleAddProgram(prog.id)}
                            className="px-4 py-2.5 hover:bg-yellow-50 text-sm cursor-pointer transition-colors border-b border-gray-100 last:border-0 flex justify-between items-center"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{prog.nome}</p>
                              <p className="text-xs text-gray-500">{prog.sigla}</p>
                            </div>
                            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded font-medium">Selecionar</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Seção 6: Perfil Específico de Aluno */}
        {formData.perfil_aluno && (
          <section className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-medium text-green-800 mb-4 border-b border-green-300 pb-2">Perfil: Aluno</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nível</label>
                <select name="nivel" value={formData.perfil_aluno.nivel} onChange={e => handleChange(e, 'perfil_aluno')} className="w-full border p-2 rounded bg-white">
                  {NIVEIS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Entrada (Período)</label>
                <select 
                  name="entrada" 
                  value={formData.perfil_aluno.entrada || ''} 
                  onChange={e => handleChange(e, 'perfil_aluno')} 
                  className="w-full border p-2 rounded bg-white"
                >
                  <option value="">Selecione o período de entrada</option>
                  {taxonomias.entradas.map(ent => (
                    <option key={ent} value={ent}>{ent}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Situação do Aluno</label>
                <select name="situacao" value={formData.perfil_aluno.situacao} onChange={e => handleChange(e, 'perfil_aluno')} className="w-full border p-2 rounded bg-white">
                  {SITUACOES_ALUNO.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 font-medium">
                  <input type="checkbox" name="egresso" checked={formData.perfil_aluno.egresso} onChange={e => handleChange(e, 'perfil_aluno')} className="w-5 h-5" />
                  Marcar como Egresso
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data de Qualificação</label>
                <input type="date" name="qualificacao" value={formData.perfil_aluno.qualificacao} onChange={e => handleChange(e, 'perfil_aluno')} className="w-full border p-2 rounded bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data de Defesa</label>
                <input type="date" name="defesa" value={formData.perfil_aluno.defesa} onChange={e => handleChange(e, 'perfil_aluno')} className="w-full border p-2 rounded bg-white" />
              </div>
            </div>
          </section>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button type="submit" disabled={loading} className="bg-ufrpe-blue text-white px-6 py-2 rounded hover:bg-[#2a3a66] flex items-center gap-2 disabled:opacity-50">
            <Save size={20} />
            {loading ? 'Salvando...' : 'Salvar Usuário'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default AdminUserForm;
