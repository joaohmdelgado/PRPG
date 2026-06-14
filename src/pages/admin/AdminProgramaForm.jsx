import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { API_URL } from '../../api';

const GRANDES_AREAS = [
  'Ciências Exatas e da Terra',
  'Ciências Biológicas',
  'Engenharias',
  'Ciências da Saúde',
  'Ciências Agrárias',
  'Ciências Sociais Aplicadas',
  'Ciências Humanas',
  'Linguística, Letras e Artes',
  'Multidisciplinar'
];

const MODALIDADE_TIPOS = [
  { id: 'M', label: 'Mestrado Acadêmico' },
  { id: 'D', label: 'Doutorado Acadêmico' },
  { id: 'P', label: 'Mestrado Profissional' }
];

const NOTAS_CAPES = ['1', '2', '3', '4', '5', '6', '7', 'A'];

const emptyPessoa = {
  pessoa_id: '', nome: '', cpf: '', siape: '', email_institucional: '', telefones: '', portaria_id: '', portaria: '', data_vencimento: '', data_inicio_mandato: '', email_funcao: '', endereco: ''
};

const MOTIVO_LABELS = {
  FIM_MANDATO: 'Fim de mandato',
  RENUNCIA: 'Renúncia',
  AFASTADO: 'Afastamento',
  APOSENTADO: 'Aposentadoria',
  EXONERADO: 'Exoneração',
};

const formatMandato = (inicio, fim) => {
  const fmt = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '—');
  if (!inicio && !fim) return '';
  return `${fmt(inicio)} – ${fmt(fim)}`;
};

const STATUS_OPTIONS = [
  { id: 'ATIVO', label: 'Ativo' },
  { id: 'SUSPENSO', label: 'Suspenso' },
  { id: 'EM_AVALIACAO', label: 'Em Avaliação' },
  { id: 'DESATIVADO', label: 'Desativado' }
];

const initialFormData = {
  nome: '',
  sigla: '',
  codigo_capes: '',
  site: '',
  campus: 'SEDE',
  em_rede: false,
  nome_rede: '',
  grande_area: '',
  area_conhecimento: '',
  area_avaliacao: '',
  linhas: '',
  // Fase 1: situação, contato/localização e documentos
  status: 'ATIVO',
  status_descricao: '',
  data_credenciamento: '',
  data_descredenciamento: '',
  bloco: '',
  sala: '',
  cep: '',
  telefone_secretaria: '',
  horario_atendimento: '',
  email_programa: '',
  regimento_url: '',
  regulamento_url: '',
  sucupira_url: '',
  palavras_chave: '',
  modalidades: [],
  coordenador_atual: { ...emptyPessoa },
  substituto: { ...emptyPessoa },
  secretaria: { ...emptyPessoa }
};

const DRAFT_KEY = 'prpg_programa_draft';

const AdminProgramaForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [users, setUsers] = useState([]);
  const [portarias, setPortarias] = useState([]);

  // Carregar lista de usuários e portarias para seleção de coordenadores e secretários
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Erro ao buscar usuários:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleUserSelect = (sectionName, userId) => {
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setFormData(prev => ({
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          pessoa_id: selectedUser.id,
          nome: selectedUser.perfil_geral?.nome || selectedUser.email,
          cpf: selectedUser.perfil_geral?.cpf || '',
          siape: selectedUser.perfil_geral?.siape || '',
          email_institucional: selectedUser.email,
          telefones: Array.isArray(selectedUser.perfil_geral?.telefones) ? selectedUser.perfil_geral.telefones.join(', ') : (selectedUser.perfil_geral?.telefones || ''),
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          pessoa_id: '',
          nome: '',
          cpf: '',
          siape: '',
          email_institucional: '',
          telefones: '',
        }
      }));
    }
  };

  // Carregar Rascunho ou Dados Existentes
  useEffect(() => {
    if (isEditing) {
      const fetchPrograma = async () => {
        try {
          const response = await fetch(`${API_URL}/api/programas/${id}`);
          if (response.ok) {
            const data = await response.json();
            setFormData({
              ...initialFormData,
              ...data,
              status: data.status || 'ATIVO',
              status_descricao: data.status_descricao || '',
              data_credenciamento: data.data_credenciamento || '',
              data_descredenciamento: data.data_descredenciamento || '',
              bloco: data.bloco || '',
              sala: data.sala || '',
              cep: data.cep || '',
              telefone_secretaria: data.telefone_secretaria || '',
              horario_atendimento: data.horario_atendimento || '',
              email_programa: data.email_programa || '',
              regimento_url: data.regimento_url || '',
              regulamento_url: data.regulamento_url || '',
              sucupira_url: data.sucupira_url || '',
              palavras_chave: Array.isArray(data.palavras_chave) ? data.palavras_chave.join(', ') : (data.palavras_chave || ''),
              coordenador_atual: data.coordenador_atual || { ...emptyPessoa },
              substituto: data.substituto || { ...emptyPessoa },
              secretaria: data.secretaria || { ...emptyPessoa },
              modalidades: data.modalidades || [],
              linhas: data.linhas ? data.linhas.join('\n') : ''
            });
          } else {
            setError('Programa não encontrado');
          }
        } catch (err) {
          setError('Erro ao buscar programa');
        } finally {
          setLoading(false);
        }
      };
      fetchPrograma();
    } else {
      setLoading(false);
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        setHasDraft(true);
      }
    }
  }, [id, isEditing]);

  // Auto-save Rascunho a cada 30s se não estiver editando
  useEffect(() => {
    if (isEditing) return;
    const interval = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }, 30000);
    return () => clearInterval(interval);
  }, [formData, isEditing]);

  const loadDraft = () => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) setFormData(JSON.parse(draft));
    setHasDraft(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const handleChange = (e, section = null) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: { ...prev[section], [name]: val }
      }));
    } else {
      if (name === 'sigla') {
        setFormData(prev => ({ ...prev, sigla: val.toUpperCase() }));
      } else {
        setFormData(prev => ({ ...prev, [name]: val }));
      }
    }
  };

  const handleModalidadeToggle = (tipo) => {
    setFormData(prev => {
      const exists = prev.modalidades.find(m => m.tipo === tipo);
      if (exists) {
        return { ...prev, modalidades: prev.modalidades.filter(m => m.tipo !== tipo) };
      } else {
        return { ...prev, modalidades: [...prev.modalidades, { tipo, ano_inicio: '', nota_capes: '' }] };
      }
    });
  };

  const handleModalidadeChange = (tipo, field, value) => {
    setFormData(prev => ({
      ...prev,
      modalidades: prev.modalidades.map(m => m.tipo === tipo ? { ...m, [field]: value } : m)
    }));
  };

  const handleSubmit = async (e, isDraft = false) => {
    if (e) e.preventDefault();
    if (!isDraft && formData.modalidades.length === 0) {
      setError('Selecione ao menos uma modalidade.');
      return;
    }
    if (!isDraft && !formData.coordenador_atual.nome) {
      setError('O nome do coordenador atual é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEditing 
        ? `${API_URL}/api/programas/${id}` 
        : `${API_URL}/api/programas`;
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        linhas: formData.linhas ? formData.linhas.split('\n').map(l => l.trim()).filter(l => l) : [],
        palavras_chave: formData.palavras_chave ? formData.palavras_chave.split(/[\n,]/).map(p => p.trim()).filter(p => p) : []
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        if (!isEditing) localStorage.removeItem(DRAFT_KEY);
        navigate('/admin/programas');
      } else if (response.status === 401) {
        navigate('/admin/login');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar programa');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  if (loading && isEditing) return <div>Carregando...</div>;

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium border-b pb-2">Identificação</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Sigla *</label>
          <input type="text" name="sigla" value={formData.sigla} onChange={handleChange} maxLength="20" required className="w-full border p-2 rounded uppercase" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nome Completo *</label>
          <input type="text" name="nome" value={formData.nome} onChange={handleChange} maxLength="200" required className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Código CAPES</label>
          <input type="text" name="codigo_capes" value={formData.codigo_capes} onChange={handleChange} className="w-full border p-2 rounded" placeholder="Ex: 25003011022P7" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Site</label>
          <input type="url" name="site" value={formData.site} onChange={handleChange} className="w-full border p-2 rounded" placeholder="https://" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Campus</label>
          <select name="campus" value={formData.campus} onChange={handleChange} className="w-full border p-2 rounded">
            <option value="SEDE">Sede Recife</option>
            <option value="UAST">UAST (Serra Talhada)</option>
            <option value="UACSA">UACSA (Cabo de Sto. Agostinho)</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="em_rede" checked={formData.em_rede} onChange={handleChange} />
          Programa em Rede
        </label>
        {formData.em_rede && (
          <input type="text" name="nome_rede" value={formData.nome_rede} onChange={handleChange} placeholder="Nome da Rede (ex: PROFIAP)" className="border p-2 rounded flex-1" />
        )}
      </div>

      <h3 className="text-lg font-medium border-b pb-2 pt-4">Modalidades, Anos e Notas</h3>
      <div className="space-y-4">
        {MODALIDADE_TIPOS.map(mt => {
          const mod = formData.modalidades.find(m => m.tipo === mt.id);
          const isActive = !!mod;
          return (
            <div key={mt.id} className="p-4 border rounded bg-gray-50 flex flex-col md:flex-row gap-4 items-center">
              <label className="flex items-center gap-2 w-48 font-medium">
                <input type="checkbox" checked={isActive} onChange={() => handleModalidadeToggle(mt.id)} />
                {mt.label}
              </label>
              {isActive && (
                <>
                  <input type="number" placeholder="Ano Início" value={mod.ano_inicio || ''} onChange={e => handleModalidadeChange(mt.id, 'ano_inicio', e.target.value)} className="border p-2 rounded w-32" />
                  <select value={mod.nota_capes || ''} onChange={e => handleModalidadeChange(mt.id, 'nota_capes', e.target.value)} className="border p-2 rounded">
                    <option value="">Nota CAPES</option>
                    {NOTAS_CAPES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </>
              )}
            </div>
          );
        })}
      </div>

      <h3 className="text-lg font-medium border-b pb-2 pt-4">Área Acadêmica</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Grande Área do Conhecimento</label>
          <select name="grande_area" value={formData.grande_area} onChange={handleChange} className="w-full border p-2 rounded">
            <option value="">Selecione...</option>
            {GRANDES_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Área de Conhecimento</label>
          <input type="text" name="area_conhecimento" value={formData.area_conhecimento} onChange={handleChange} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Área de Avaliação CAPES</label>
          <input type="text" name="area_avaliacao" value={formData.area_avaliacao} onChange={handleChange} className="w-full border p-2 rounded" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Linhas de Pesquisa (Uma por linha)</label>
          <textarea name="linhas" value={formData.linhas} onChange={handleChange} className="w-full border p-2 rounded" rows="4" placeholder="Sua primeira linha de pesquisa..." />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Palavras-chave (separadas por vírgula)</label>
          <input type="text" name="palavras_chave" value={formData.palavras_chave} onChange={handleChange} className="w-full border p-2 rounded" placeholder="Ex: Sustentabilidade, Agroecologia, Biotecnologia" />
        </div>
      </div>

      <h3 className="text-lg font-medium border-b pb-2 pt-4">Situação do Programa</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className="w-full border p-2 rounded bg-white">
            {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data de Credenciamento</label>
          <input type="date" name="data_credenciamento" value={formData.data_credenciamento} onChange={handleChange} className="w-full border p-2 rounded" />
        </div>
        {formData.status === 'DESATIVADO' && (
          <div>
            <label className="block text-sm font-medium mb-1">Data de Descredenciamento</label>
            <input type="date" name="data_descredenciamento" value={formData.data_descredenciamento} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Observação sobre a Situação (opcional)</label>
          <input type="text" name="status_descricao" value={formData.status_descricao} onChange={handleChange} className="w-full border p-2 rounded" placeholder="Ex: Suspensão temporária por falta de quórum 2024-2025" />
        </div>
      </div>

      <h3 className="text-lg font-medium border-b pb-2 pt-4">Contato e Localização da Secretaria</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Bloco / Edifício</label>
          <input type="text" name="bloco" value={formData.bloco} onChange={handleChange} className="w-full border p-2 rounded" placeholder="Ex: Bloco 7, Prédio da Pós-Graduação" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sala</label>
          <input type="text" name="sala" value={formData.sala} onChange={handleChange} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">CEP</label>
          <input type="text" name="cep" value={formData.cep} onChange={handleChange} className="w-full border p-2 rounded" placeholder="00000-000" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Telefone da Secretaria</label>
          <input type="text" name="telefone_secretaria" value={formData.telefone_secretaria} onChange={handleChange} className="w-full border p-2 rounded" placeholder="(81) 0000-0000" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">E-mail do Programa</label>
          <input type="email" name="email_programa" value={formData.email_programa} onChange={handleChange} className="w-full border p-2 rounded" placeholder="ppg@ufrpe.br" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Horário de Atendimento</label>
          <input type="text" name="horario_atendimento" value={formData.horario_atendimento} onChange={handleChange} className="w-full border p-2 rounded" placeholder="Seg-Sex 08:00-12:00 e 14:00-17:00" />
        </div>
      </div>

      <h3 className="text-lg font-medium border-b pb-2 pt-4">Documentos e Plataformas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Regimento Interno (URL)</label>
          <input type="url" name="regimento_url" value={formData.regimento_url} onChange={handleChange} className="w-full border p-2 rounded" placeholder="https://" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Regulamento de Admissão (URL)</label>
          <input type="url" name="regulamento_url" value={formData.regulamento_url} onChange={handleChange} className="w-full border p-2 rounded" placeholder="https://" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Página na Plataforma Sucupira (URL)</label>
          <input type="url" name="sucupira_url" value={formData.sucupira_url} onChange={handleChange} className="w-full border p-2 rounded" placeholder="https://sucupira.capes.gov.br/..." />
        </div>
      </div>
    </div>
  );

  const renderPessoaForm = (sectionName, label) => {
    const data = formData[sectionName];
    
    // Filtro por papel correto
    const isProfessorRole = sectionName === 'coordenador_atual' || sectionName === 'substituto';
    const eligibleUsers = isProfessorRole
      ? users.filter(u => u.roles && u.roles.includes('Professor'))
      : users.filter(u => u.roles && (u.roles.includes('Secretário(a)') || u.roles.includes('Gestor') || u.roles.includes('Administrator')));

    // Verifica se é um cadastro antigo/legado que não tem pessoa_id mas tem nome
    const isLegacy = data.nome && !data.pessoa_id;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium border-b pb-2 pt-4">{label}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Seletor de Usuários */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1 text-gray-700">Vincular Usuário do Sistema</label>
            <select
              value={data.pessoa_id || ''}
              onChange={e => handleUserSelect(sectionName, e.target.value)}
              className="w-full border p-2 rounded bg-white text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Selecione um usuário cadastrado --</option>
              {eligibleUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.perfil_geral?.nome || u.email} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Dados Pessoais Resolvidos (Read Only) */}
          {data.pessoa_id ? (
            <div className="md:col-span-2 bg-blue-50 border border-blue-100 p-4 rounded-md grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="font-semibold text-gray-700">Nome:</span> <span className="text-gray-800">{data.nome}</span></div>
              <div><span className="font-semibold text-gray-700">E-mail:</span> <span className="text-gray-800">{data.email_institucional}</span></div>
              <div><span className="font-semibold text-gray-700">CPF:</span> <span className="text-gray-800">{data.cpf || '-'}</span></div>
              <div><span className="font-semibold text-gray-700">SIAPE:</span> <span className="text-gray-800">{data.siape || '-'}</span></div>
              <div className="md:col-span-2"><span className="font-semibold text-gray-700">Telefones:</span> <span className="text-gray-800">{data.telefones || '-'}</span></div>
            </div>
          ) : isLegacy ? (
            <div className="md:col-span-2 bg-amber-50 border border-amber-100 p-4 rounded-md text-sm">
              <div className="font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                <span>⚠️ Cadastro Legado (Sem Vínculo no Sistema)</span>
              </div>
              <p className="text-xs text-amber-700 mb-3">Este membro foi importado dos dados legados e não corresponde a um usuário atual. Recomenda-se selecionar um usuário oficial acima.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div><span className="font-semibold text-amber-800">Nome:</span> <span className="text-gray-700">{data.nome}</span></div>
                <div><span className="font-semibold text-amber-800">E-mail:</span> <span className="text-gray-700">{data.email_institucional || '-'}</span></div>
                <div><span className="font-semibold text-amber-800">CPF:</span> <span className="text-gray-700">{data.cpf || '-'}</span></div>
                <div><span className="font-semibold text-amber-800">SIAPE:</span> <span className="text-gray-700">{data.siape || '-'}</span></div>
              </div>
            </div>
          ) : (
            <div className="md:col-span-2 bg-gray-50 border border-gray-200 p-4 rounded-md text-center text-sm text-gray-500">
              Nenhum usuário vinculado. Selecione um usuário acima para preencher os dados.
            </div>
          )}

          {/* Campos Específicos do Vínculo (Editáveis) */}
          {sectionName !== 'substituto' && (
             <div>
               <label className="block text-sm font-medium mb-1">E-mail da Função (Coord./Sec.)</label>
               <input type="email" name="email_funcao" value={data.email_funcao} onChange={e => handleChange(e, sectionName)} className="w-full border p-2 rounded text-sm" placeholder="Ex: coordenacao.programa@ufrpe.br" />
             </div>
          )}
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1 text-gray-700">Vincular Portaria Oficial</label>
            <select
              name="portaria_id"
              value={data.portaria_id || ''}
              onChange={e => {
                const selectedPort = portarias.find(p => p.id === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  [sectionName]: {
                    ...prev[sectionName],
                    portaria_id: e.target.value,
                    portaria: selectedPort ? selectedPort.title : ''
                  }
                }));
              }}
              className="w-full border p-2 rounded bg-white text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Selecione uma portaria oficial --</option>
              {portarias.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.data_portaria ? new Date(p.data_portaria).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data'})
                </option>
              ))}
            </select>
            
            {/* Exibição da Portaria Legada se houver e não estiver vinculada */}
            {!data.portaria_id && data.portaria && (
              <div className="mt-2 bg-amber-50 border border-amber-100 p-3 rounded-md text-xs text-amber-800">
                <span className="font-semibold">Portaria Herdada (Legado):</span> {data.portaria}
                <p className="text-gray-500 mt-1">Esta portaria foi importada como texto simples. Recomenda-se selecionar uma portaria cadastrada acima.</p>
              </div>
            )}
          </div>
          
          {sectionName === 'coordenador_atual' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Início do Mandato</label>
                <input type="date" name="data_inicio_mandato" value={data.data_inicio_mandato || ''} onChange={e => handleChange(e, sectionName)} className="w-full border p-2 rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vencimento do Mandato</label>
                <input type="date" name="data_vencimento" value={data.data_vencimento || ''} onChange={e => handleChange(e, sectionName)} className="w-full border p-2 rounded text-sm" />
              </div>
            </>
          )}
          
          {sectionName === 'secretaria' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Endereço da Secretaria (se diferir da sede)</label>
              <textarea name="endereco" value={data.endereco} onChange={e => handleChange(e, sectionName)} className="w-full border p-2 rounded text-sm" rows="2" placeholder="Endereço físico específico da secretaria do curso..." />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-6">
      {renderPessoaForm('coordenador_atual', 'Coordenador(a) Atual (Obrigatório)')}
      {renderPessoaForm('substituto', 'Substituto Eventual / Vice (Opcional)')}
      {isEditing && Array.isArray(formData.historico_coordenadores) && formData.historico_coordenadores.length > 0 && (
        <div className="pt-4">
          <h3 className="text-lg font-medium border-b pb-2">Histórico de Coordenadores</h3>
          <ul className="mt-3 border rounded divide-y">
            {formData.historico_coordenadores.map((h, i) => (
              <li key={i} className="px-4 py-2.5 text-sm flex flex-wrap justify-between items-center gap-2">
                <span className="font-medium text-gray-800">{h.nome || '—'}</span>
                <span className="text-xs text-gray-500">
                  {formatMandato(h.data_inicio_mandato, h.data_fim_mandato) || 'Período não informado'}
                  {h.motivo_encerramento ? ` · ${MOTIVO_LABELS[h.motivo_encerramento] || h.motivo_encerramento}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {renderPessoaForm('secretaria', 'Secretaria / TAE (Opcional)')}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium border-b pb-2">Revisão do Cadastro</h3>
      <div className="bg-gray-50 p-6 rounded text-sm space-y-4">
        <div className="flex justify-between border-b pb-2">
          <strong>Identificação</strong>
          <button type="button" onClick={() => setStep(1)} className="text-blue-600">Editar</button>
        </div>
        <p><strong>Nome:</strong> {formData.nome} ({formData.sigla})</p>
        <p><strong>Campus:</strong> {formData.campus} | <strong>Rede:</strong> {formData.em_rede ? `Sim (${formData.nome_rede})` : 'Não'}</p>
        <p><strong>Status:</strong> {(STATUS_OPTIONS.find(s => s.id === formData.status) || {}).label || formData.status}</p>
        <p><strong>Modalidades:</strong> {formData.modalidades.map(m => m.tipo).join(', ')}</p>

        <div className="flex justify-between border-b pb-2 mt-4">
          <strong>Coordenação</strong>
          <button type="button" onClick={() => setStep(2)} className="text-blue-600">Editar</button>
        </div>
        <p><strong>Atual:</strong> {formData.coordenador_atual.nome || 'Não preenchido'}</p>

        <div className="flex justify-between border-b pb-2 mt-4">
          <strong>Secretaria</strong>
          <button type="button" onClick={() => setStep(3)} className="text-blue-600">Editar</button>
        </div>
        <p><strong>TAE:</strong> {formData.secretaria.nome || 'Não preenchido'}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-5xl mx-auto">
      {hasDraft && !isEditing && (
        <div className="bg-blue-50 text-blue-800 p-4 rounded-md mb-6 flex justify-between items-center">
          <span>Você tem um rascunho não salvo. Deseja continuar de onde parou?</span>
          <div className="space-x-2">
            <button type="button" onClick={loadDraft} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Recuperar</button>
            <button type="button" onClick={discardDraft} className="text-blue-600 px-3 py-1 text-sm border border-blue-600 rounded">Descartar</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/programas" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-2xl font-semibold text-gray-800">
          {isEditing ? 'Editar Programa' : 'Novo Programa'}
        </h2>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-0 h-1 bg-blue-600 -z-10 transform -translate-y-1/2 transition-all" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${step >= s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-300'}`}>
            {s}
          </div>
        ))}
      </div>

      <form className="min-h-[400px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        
        <div className="flex justify-between pt-8 mt-8 border-t border-gray-200">
          {step > 1 ? (
            <button type="button" onClick={prevStep} className="flex items-center px-4 py-2 border rounded hover:bg-gray-50">
              <ChevronLeft size={18} className="mr-2" /> Anterior
            </button>
          ) : <div></div>}
          
          <div className="flex gap-2">
            {!isEditing && (
              <button type="button" onClick={() => handleSubmit(null, true)} className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded">
                Salvar Rascunho
              </button>
            )}
            
            {step < 4 ? (
              <button type="button" onClick={nextStep} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Próximo <ChevronRight size={18} className="ml-2" />
              </button>
            ) : (
              <button type="button" onClick={(e) => handleSubmit(e, false)} disabled={loading} className="flex items-center px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                <Check size={18} className="mr-2" /> {loading ? 'Salvando...' : 'Confirmar e Salvar'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProgramaForm;
