import { FormSkeleton } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Trash2, Calendar } from 'lucide-react';
import { API_URL } from '../../api';
import { isProgramaGestor } from '../../auth';
import { AuditHeader } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const CATEGORIES = {
  'mestrado-doutorado': 'Mestrado e Doutorado',
  'especializacao': 'Especialização',
  'residencia': 'Residência',
  'internacionalizacao': 'Internacionalização'
};

const AdminEditalForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    categoryId: '',
    title: '',
    publishedAt: '',
    field_periodo: {
      data_inicio: '',
      data_fim: ''
    },
    deadline: '',
    description: '',
    downloadLink: '',
    numero: '',
    year: new Date().getFullYear(),
    erratas: [],
    resultadoParcial: '',
    resultadoFinal: '',
    programaId: '',
    proficiencia: false
  });

  const { toast, Toasts } = useToast();
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');
  const [uploadingFields, setUploadingFields] = useState({});
  const [audit, setAudit] = useState(null);
  const [programas, setProgramas] = useState([]);
  const users = useUsers();

  // Lista de programas para vincular o edital a um microsite (opcional).
  useEffect(() => {
    fetch(`${API_URL}/api/programas`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProgramas(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const descriptionRef = useRef('');

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
            if (descriptionRef.current) {
              editor.setData(descriptionRef.current);
            }
            editor.model.document.on('change:data', () => {
              const data = editor.getData();
              descriptionRef.current = data;
              setFormData(prev => ({ ...prev, description: data }));
            });
          })
          .catch(error => {
            console.error('Erro ao inicializar CKEditor:', error);
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

  useEffect(() => {
    if (isEditing) {
      const fetchEdital = async () => {
        try {
          const response = await fetch(`${API_URL}/api/editais/${id}`);
          if (response.ok) {
            const data = await response.json();
            setAudit(data);
            const desc = data.description || '';
            descriptionRef.current = desc;
            
            setFormData({
              categoryId: data.categoryId || '',
              title: data.title || '',
              publishedAt: data.publishedAt || '',
              field_periodo: data.field_periodo || {
                data_inicio: data.publishedAt || '',
                data_fim: data.deadline || ''
              },
              deadline: data.deadline || '',
              description: desc,
              downloadLink: data.downloadLink || '',
              numero: data.numero || '',
              year: data.year || new Date().getFullYear(),
              erratas: data.erratas || [],
              resultadoParcial: data.resultadoParcial || '',
              resultadoFinal: data.resultadoFinal || '',
              programaId: data.programaId || '',
              proficiencia: !!data.proficiencia
            });

            if (editorInstanceRef.current) {
              editorInstanceRef.current.setData(desc);
            }
          } else {
            setError('Edital não encontrado');
          }
        } catch (err) {
          setError('Erro ao buscar edital');
        } finally {
          setLoading(false);
        }
      };
      fetchEdital();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePeriodChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      field_periodo: {
        ...prev.field_periodo,
        [name]: value
      }
    }));
  };

  const handleFileUpload = async (file, fieldName, errataIndex = null) => {
    const fieldKey = errataIndex !== null ? `erratas-${errataIndex}` : fieldName;
    setUploadingFields(prev => ({ ...prev, [fieldKey]: true }));

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
        if (fieldName === 'erratas') {
          setFormData(prev => {
            const newErratas = [...(prev.erratas || [])];
            newErratas[errataIndex] = {
              ...newErratas[errataIndex],
              downloadLink: data.url
            };
            return { ...prev, erratas: newErratas };
          });
        } else {
          setFormData(prev => ({
            ...prev,
            [fieldName]: data.url
          }));
        }
      } else {
        const errData = await response.json();
        toast.error(errData.message || 'Erro ao fazer upload do arquivo');
      }
    } catch (error) {
      console.error('Erro de upload:', error);
      toast.error('Erro de conexão ao fazer upload');
    } finally {
      setUploadingFields(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleAddErrata = () => {
    setFormData(prev => ({
      ...prev,
      erratas: [
        ...(prev.erratas || []),
        { id: Date.now().toString(), numero: ((prev.erratas || []).length + 1).toString().padStart(2, '0'), downloadLink: '' }
      ]
    }));
  };

  const handleRemoveErrata = (index) => {
    setFormData(prev => {
      const newErratas = [...prev.erratas];
      newErratas.splice(index, 1);
      return { ...prev, erratas: newErratas };
    });
  };

  const handleErrataNumeroChange = (index, value) => {
    setFormData(prev => {
      const newErratas = [...prev.erratas];
      newErratas[index] = { ...newErratas[index], numero: value };
      return { ...prev, erratas: newErratas };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.field_periodo.data_inicio && formData.field_periodo.data_fim) {
      if (new Date(formData.field_periodo.data_inicio) > new Date(formData.field_periodo.data_fim)) {
        setError('A data de início não pode ser posterior à data de término do período de inscrições.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setLoading(true);
    
    // Calcula os labels e ano
    const categoryTitle = CATEGORIES[formData.categoryId] || '';
    const yearVal = formData.year ? parseInt(formData.year, 10) : (formData.publishedAt ? parseInt(formData.publishedAt.split('-')[0], 10) : new Date().getFullYear());

    const payload = {
      ...formData,
      deadline: formData.field_periodo.data_fim, // mantém compatibilidade
      year: yearVal,
      categoryTitle
    };

    try {
      const url = isEditing 
        ? `${API_URL}/api/editais/${id}` 
        : `${API_URL}/api/editais`;
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        navigate('/admin/editais');
      } else if (response.status === 401) {
        navigate('/admin/login');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar edital');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) return <FormSkeleton />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/editais" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue">
          {isEditing ? 'Editar Edital' : 'Novo Edital'}
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow bg-white"
            >
              <option value="">Selecione uma categoria</option>
              {Object.entries(CATEGORIES).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número do Edital</label>
            <input
              type="text"
              name="numero"
              value={formData.numero}
              onChange={handleChange}
              placeholder="Ex: 07"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano do Edital</label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="Ex: 2026"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Publicação do Edital (Nó) *</label>
            <input
              type="date"
              name="publishedAt"
              value={formData.publishedAt}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
            />
          </div>

          <div className={`md:col-span-2 ${isProgramaGestor() ? 'hidden' : ''}`}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Programa (opcional)</label>
            <select
              name="programaId"
              value={formData.programaId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow bg-white"
            >
              <option value="">— Edital geral da PRPG (sem programa) —</option>
              {programas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sigla && p.sigla !== 'S/SIGLA' ? `${p.sigla} — ${p.nome}` : p.nome}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Ao vincular, o edital aparece também no microsite do programa.</p>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                name="proficiencia"
                checked={!!formData.proficiencia}
                onChange={handleChange}
                className="w-5 h-5 accent-ufrpe-blue"
              />
              <span className="text-sm font-medium text-gray-700">
                Edital de Proficiência em Línguas
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-8">
              Quando marcado, as datas do período abaixo definem a janela de inscrições na proficiência.
              Apenas um edital com esta opção deve estar vigente por vez.
            </p>
          </div>

          <div className="md:col-span-2 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-gray-500" />
              Período de Inscrição (data de início e fim)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data de Início *</label>
                <input
                  type="date"
                  name="data_inicio"
                  value={formData.field_periodo?.data_inicio || ''}
                  onChange={handlePeriodChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 bg-white rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data de Término *</label>
                <input
                  type="date"
                  name="data_fim"
                  value={formData.field_periodo?.data_fim || ''}
                  onChange={handlePeriodChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 bg-white rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Edital Completo (PDF) *</label>
            {formData.downloadLink ? (
              <div className="flex items-center gap-3 bg-gray-50 p-3 border border-gray-300 rounded-md">
                <FileText className="text-red-500 shrink-0" size={24} />
                <a 
                  href={formData.downloadLink.startsWith('http') ? formData.downloadLink : `${API_URL}${formData.downloadLink}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-ufrpe-blue hover:underline flex-grow truncate font-medium"
                >
                  Visualizar PDF do Edital
                </a>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, downloadLink: '' }))}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                  title="Remover documento"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              <div className="relative">
                {uploadingFields['downloadLink'] ? (
                  <div className="flex items-center gap-3 px-4 py-3 border border-dashed border-ufrpe-blue/30 rounded-lg bg-ufrpe-blue/5 text-ufrpe-blue text-sm font-medium animate-pulse">
                    <span className="w-5 h-5 border-2 border-ufrpe-blue border-t-transparent rounded-full animate-spin"></span>
                    Enviando edital...
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 hover:border-ufrpe-blue/40 rounded-lg cursor-pointer bg-gray-50 hover:bg-ufrpe-blue/5 transition-all focus-within:ring-2 focus-within:ring-ufrpe-yellow">
                    <Upload className="text-gray-400 shrink-0" size={20} />
                    <div className="flex-grow min-w-0">
                      <span className="block text-sm font-medium text-gray-700">Selecionar PDF do Edital</span>
                      <span className="block text-xs text-gray-400">Clique para escolher</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={uploadingFields['downloadLink']}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0], 'downloadLink');
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resultado Parcial (PDF)</label>
            {formData.resultadoParcial ? (
              <div className="flex items-center gap-3 bg-gray-50 p-3 border border-gray-300 rounded-md">
                <FileText className="text-red-500 shrink-0" size={24} />
                <a 
                  href={`${API_URL}${formData.resultadoParcial}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-ufrpe-blue hover:underline flex-grow truncate font-medium"
                >
                  Visualizar PDF
                </a>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, resultadoParcial: '' }))}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                  title="Remover documento"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              <div className="relative">
                {uploadingFields['resultadoParcial'] ? (
                  <div className="flex items-center gap-3 px-4 py-3 border border-dashed border-ufrpe-blue/30 rounded-lg bg-ufrpe-blue/5 text-ufrpe-blue text-sm font-medium animate-pulse">
                    <span className="w-5 h-5 border-2 border-ufrpe-blue border-t-transparent rounded-full animate-spin"></span>
                    Enviando arquivo...
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 hover:border-ufrpe-blue/40 rounded-lg cursor-pointer bg-gray-50 hover:bg-ufrpe-blue/5 transition-all focus-within:ring-2 focus-within:ring-ufrpe-yellow">
                    <Upload className="text-gray-400 shrink-0" size={20} />
                    <div className="flex-grow min-w-0">
                      <span className="block text-sm font-medium text-gray-700">Selecionar PDF</span>
                      <span className="block text-xs text-gray-400">Clique para escolher</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={uploadingFields['resultadoParcial']}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0], 'resultadoParcial');
                        }
                      }}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resultado Final (PDF)</label>
            {formData.resultadoFinal ? (
              <div className="flex items-center gap-3 bg-gray-50 p-3 border border-gray-300 rounded-md">
                <FileText className="text-red-500 shrink-0" size={24} />
                <a 
                  href={`${API_URL}${formData.resultadoFinal}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-ufrpe-blue hover:underline flex-grow truncate font-medium"
                >
                  Visualizar PDF
                </a>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, resultadoFinal: '' }))}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                  title="Remover documento"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              <div className="relative">
                {uploadingFields['resultadoFinal'] ? (
                  <div className="flex items-center gap-3 px-4 py-3 border border-dashed border-ufrpe-blue/30 rounded-lg bg-ufrpe-blue/5 text-ufrpe-blue text-sm font-medium animate-pulse">
                    <span className="w-5 h-5 border-2 border-ufrpe-blue border-t-transparent rounded-full animate-spin"></span>
                    Enviando arquivo...
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 hover:border-ufrpe-blue/40 rounded-lg cursor-pointer bg-gray-50 hover:bg-ufrpe-blue/5 transition-all focus-within:ring-2 focus-within:ring-ufrpe-yellow">
                    <Upload className="text-gray-400 shrink-0" size={20} />
                    <div className="flex-grow min-w-0">
                      <span className="block text-sm font-medium text-gray-700">Selecionar PDF</span>
                      <span className="block text-xs text-gray-400">Clique para escolher</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={uploadingFields['resultadoFinal']}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0], 'resultadoFinal');
                        }
                      }}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="md:col-span-2 border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Erratas do Edital</h3>
              <button
                type="button"
                onClick={handleAddErrata}
                className="bg-ufrpe-blue/5 hover:bg-ufrpe-blue/10 text-ufrpe-blue px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                + Adicionar Errata
              </button>
            </div>
            
            {(formData.erratas || []).length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhuma errata cadastrada.</p>
            ) : (
              <div className="space-y-4">
                {(formData.erratas || []).map((errata, index) => (
                  <div key={errata.id || index} className="flex flex-col md:flex-row gap-4 items-end bg-gray-50 p-4 rounded-md border border-gray-200">
                    <div className="flex-grow">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Número da Errata</label>
                      <input
                        type="text"
                        value={errata.numero || ''}
                        onChange={(e) => handleErrataNumeroChange(index, e.target.value)}
                        placeholder="Ex: 01"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow bg-white text-sm"
                      />
                    </div>
                    <div className="w-full md:w-80">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Arquivo PDF *</label>
                      {errata.downloadLink ? (
                        <div className="flex items-center gap-3 bg-white px-3 py-2 border border-gray-300 rounded-md text-sm">
                          <FileText className="text-red-500 shrink-0" size={20} />
                          <a 
                            href={`${API_URL}${errata.downloadLink}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-ufrpe-blue hover:underline truncate flex-grow font-medium"
                          >
                            Visualizar PDF
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => {
                                const newErratas = [...prev.erratas];
                                newErratas[index] = { ...newErratas[index], downloadLink: '' };
                                return { ...prev, erratas: newErratas };
                              });
                            }}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors text-xs font-medium"
                            title="Remover documento"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          {uploadingFields[`erratas-${index}`] ? (
                            <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-ufrpe-blue/30 rounded-lg bg-ufrpe-blue/5 text-ufrpe-blue text-xs font-medium animate-pulse">
                              <span className="w-4 h-4 border-2 border-ufrpe-blue border-t-transparent rounded-full animate-spin"></span>
                              Enviando errata...
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 hover:border-ufrpe-blue/40 rounded-lg cursor-pointer bg-white hover:bg-ufrpe-blue/5 transition-all focus-within:ring-2 focus-within:ring-ufrpe-yellow">
                              <Upload className="text-gray-400 shrink-0" size={16} />
                              <div className="flex-grow min-w-0">
                                <span className="block text-xs font-medium text-gray-700">Selecionar PDF</span>
                              </div>
                              <input
                                type="file"
                                accept=".pdf"
                                disabled={uploadingFields[`erratas-${index}`]}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleFileUpload(e.target.files[0], 'erratas', index);
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
                    <button
                      type="button"
                      onClick={() => handleRemoveErrata(index)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium pb-2.5"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
              <div ref={editorRef}></div>
            </div>
            <style>{`
              .ck-editor__editable_inline {
                min-height: 200px !important;
              }
            `}</style>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Link
            to="/admin/editais"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-4"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-ufrpe-blue border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-[#2a3a66] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ufrpe-yellow disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Edital'}
          </button>
        </div>
      </form>
      {Toasts}
    </div>
  );
};

export default AdminEditalForm;
