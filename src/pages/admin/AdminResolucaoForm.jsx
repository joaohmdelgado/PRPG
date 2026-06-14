import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Trash2 } from 'lucide-react';
import { API_URL } from '../../api';
import { AuditHeader } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const SECTIONS = {
  'mestrado-doutorado': 'Mestrado e Doutorado',
  'internacionalizacao': 'Internacionalização',
  'lato-sensu': 'Lato sensu',
  'apoio-financeiro': 'Apoio Financeiro',
  'outras': 'Outras / Institucional'
};

const AdminResolucaoForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    sectionId: '',
    categoryTitle: '',
    title: '',
    desc: '',
    link: ''
  });

  const [loading, setLoading] = useState(isEditing);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [existingCategories, setExistingCategories] = useState([]);
  const [audit, setAudit] = useState(null);
  const users = useUsers();

  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const descRef = useRef('');

  // Carregar subcategorias da taxonomia oficial
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const response = await fetch(`${API_URL}/api/taxonomias`);
        if (response.ok) {
          const data = await response.json();
          setExistingCategories(data.subcategorias_resolucao || []);
        }
      } catch (e) {
        console.error('Erro ao buscar subcategorias de taxonomia:', e);
      }
    };
    fetchSubcategories();
  }, []);

  // Inicializar CKEditor
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
            if (descRef.current) {
              editor.setData(descRef.current);
            }
            editor.model.document.on('change:data', () => {
              const data = editor.getData();
              descRef.current = data;
              setFormData(prev => ({ ...prev, desc: data }));
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

  // Buscar dados se estiver editando
  useEffect(() => {
    if (isEditing) {
      const fetchResolucao = async () => {
        try {
          const response = await fetch(`${API_URL}/api/resolucoes/${id}`);
          if (response.ok) {
            const data = await response.json();
            setAudit(data);
            const description = data.desc || '';
            descRef.current = description;
            
            setFormData({
              sectionId: data.sectionId || '',
              categoryTitle: data.categoryTitle || '',
              title: data.title || '',
              desc: description,
              link: data.link || ''
            });

            if (editorInstanceRef.current) {
              editorInstanceRef.current.setData(description);
            }
          } else {
            setError('Resolução não encontrada');
          }
        } catch (err) {
          setError('Erro ao buscar resolução');
        } finally {
          setLoading(false);
        }
      };
      fetchResolucao();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    setError('');

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
          link: data.url
        }));
      } else {
        const errData = await response.json();
        setError(errData.message || 'Erro ao enviar o arquivo.');
      }
    } catch (error) {
      console.error('Erro de upload:', error);
      setError('Erro de conexão ao enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const sectionTitle = SECTIONS[formData.sectionId] || '';
    const payload = {
      ...formData,
      sectionTitle
    };

    try {
      const url = isEditing 
        ? `${API_URL}/api/resolucoes/${id}` 
        : `${API_URL}/api/resolucoes`;
      
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
        navigate('/admin/resolucoes');
      } else if (response.status === 401) {
        navigate('/admin/login');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar resolução');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) return <div>Carregando...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/resolucoes" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue">
          {isEditing ? 'Editar Resolução' : 'Nova Resolução'}
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
              placeholder="Ex: Resolução CEPE 048/2018"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seção Principal</label>
            <select
              name="sectionId"
              value={formData.sectionId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow bg-white"
            >
              <option value="">Selecione uma seção</option>
              {Object.entries(SECTIONS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoria *</label>
            <select
              name="categoryTitle"
              value={formData.categoryTitle}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow bg-white"
            >
              <option value="">Selecione uma subcategoria</option>
              {existingCategories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Documento da Resolução (PDF) *</label>
            {formData.link ? (
              <div className="flex items-center gap-3 bg-gray-50 p-3 border border-gray-300 rounded-md">
                <FileText className="text-red-500 shrink-0" size={24} />
                <a 
                  href={formData.link.startsWith('http') ? formData.link : `${API_URL}${formData.link}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-ufrpe-blue hover:underline flex-grow truncate font-medium"
                >
                  Visualizar PDF Anexado
                </a>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, link: '' }))}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                  title="Remover documento"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              <div className="relative">
                {uploading ? (
                  <div className="flex items-center gap-3 px-4 py-3 border border-dashed border-ufrpe-blue/30 rounded-lg bg-ufrpe-blue/5/50 text-ufrpe-blue text-sm font-medium animate-pulse">
                    <span className="w-5 h-5 border-2 border-ufrpe-blue border-t-transparent rounded-full animate-spin"></span>
                    Enviando arquivo...
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 hover:border-ufrpe-blue/40 rounded-lg cursor-pointer bg-gray-50 hover:bg-ufrpe-blue/5/30 transition-all focus-within:ring-2 focus-within:ring-ufrpe-yellow">
                    <Upload className="text-gray-400 shrink-0" size={20} />
                    <div className="flex-grow min-w-0">
                      <span className="block text-sm font-medium text-gray-700">Selecionar PDF</span>
                      <span className="block text-xs text-gray-400">Clique para escolher</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      required
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <div className="border border-gray-300 rounded-md overflow-hidden">
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
            to="/admin/resolucoes"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-4"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || uploading || !formData.link}
            className="bg-ufrpe-blue border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-[#2a3a66] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ufrpe-yellow disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Resolução'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminResolucaoForm;
