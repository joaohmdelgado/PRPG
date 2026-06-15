import { FormSkeleton } from '../../components/admin/AdminUI';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { API_URL } from '../../api';
import { AuditHeader } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminNoticiaForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    date: '',
    image: '',
    imageCaption: '',
    excerpt: '',
    content: '', // No form trataremos como string para facilitar, no JSON é array
    author: '',
    authorRole: '',
    tags: '',
    programaId: ''
  });

  const [loading, setLoading] = useState(isEditing);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [audit, setAudit] = useState(null);
  const [programas, setProgramas] = useState([]);
  const users = useUsers();

  // Lista de programas para vincular a notícia a um microsite (opcional).
  useEffect(() => {
    fetch(`${API_URL}/api/programas`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProgramas(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Helper para converter data para YYYY-MM-DD
  const parseDateToISO = (dateStr) => {
    if (!dateStr) return '';
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (isoRegex.test(dateStr)) {
      return dateStr;
    }
    
    try {
      const cleanStr = dateStr.replace(/de/gi, '').replace(/,/g, '').replace(/\s+/g, ' ').trim();
      const parts = cleanStr.split(' ');
      if (parts.length >= 3) {
        const day = parts[0].padStart(2, '0');
        const monthWord = parts[1].toLowerCase();
        const year = parts[2];
        
        const months = {
          'janeiro': '01', 'fevereiro': '02', 'março': '03', 'marco': '03',
          'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07',
          'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11',
          'dezembro': '12'
        };
        
        const month = months[monthWord] || '01';
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.error('Erro ao converter data para ISO:', e);
    }
    return '';
  };

  const editorRef = React.useRef(null);
  const editorInstanceRef = React.useRef(null);
  const contentRef = React.useRef('');

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
              setFormData(prev => ({ ...prev, content: data }));
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
      const fetchNoticia = async () => {
        try {
          const response = await fetch(`${API_URL}/api/news/${id}`);
          if (response.ok) {
            const data = await response.json();
            setAudit(data);
            const contentHTML = Array.isArray(data.content)
              ? data.content.map(p => p.startsWith('<p>') ? p : `<p>${p}</p>`).join('')
              : data.content || '';
            
            contentRef.current = contentHTML;

            setFormData({
              title: data.title || '',
              category: data.category || '',
              date: parseDateToISO(data.date),
              image: data.image || '',
              imageCaption: data.imageCaption || '',
              excerpt: data.excerpt || '',
              content: contentHTML,
              author: data.author || '',
              authorRole: data.authorRole || '',
              tags: Array.isArray(data.tags) ? data.tags.join(', ') : data.tags || '',
              programaId: data.programaId || ''
            });

            if (editorInstanceRef.current) {
              editorInstanceRef.current.setData(contentHTML);
            }
          }
        } catch (err) {
          setError('Erro ao buscar notícia');
        } finally {
          setLoading(false);
        }
      };
      fetchNoticia();
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
          image: data.url
        }));
      } else {
        const errData = await response.json();
        setError(errData.message || 'Erro ao enviar a imagem.');
      }
    } catch (error) {
      console.error('Erro de upload:', error);
      setError('Erro de conexão ao enviar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  const getCategorySlug = (category) => {
    const mapping = {
      'Pesquisa': 'pesquisa',
      'Institucional': 'institucional',
      'Eventos': 'eventos',
      'Internacional': 'internacional',
      'Editais': 'editais',
      'Premiação': 'eventos'
    };
    return mapping[category] || category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Calcula o ano e slug de categoria automaticamente
    const yearStr = formData.date ? formData.date.split('-')[0] : new Date().getFullYear().toString();
    const slug = getCategorySlug(formData.category);

    // Tratamento dos dados antes de enviar
    const payload = {
      ...formData,
      year: yearStr,
      categorySlug: slug,
      content: formData.content, // Já é string HTML do CKEditor
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== '')
    };

    try {
      const url = isEditing 
        ? `${API_URL}/api/news/${id}` 
        : `${API_URL}/api/news`;
      
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
        navigate('/admin/noticias');
      } else if (response.status === 401) {
        navigate('/admin/login');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar notícia');
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
        <Link to="/admin/noticias" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue">
          {isEditing ? 'Editar Notícia' : 'Nova Notícia'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow bg-white"
            >
              <option value="">Selecione uma categoria</option>
              <option value="Pesquisa">Pesquisa</option>
              <option value="Institucional">Institucional</option>
              <option value="Eventos">Eventos</option>
              <option value="Internacional">Internacional</option>
              <option value="Editais">Editais</option>
              <option value="Premiação">Premiação</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Programa (opcional)</label>
            <select
              name="programaId"
              value={formData.programaId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow bg-white"
            >
              <option value="">— Notícia geral da PRPG (sem programa) —</option>
              {programas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sigla && p.sigla !== 'S/SIGLA' ? `${p.sigla} — ${p.nome}` : p.nome}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Ao vincular, a notícia aparece também no microsite do programa.</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagem de Capa *</label>
            {formData.image ? (
              <div className="flex flex-col sm:flex-row gap-4 bg-gray-50 p-4 border border-gray-300 rounded-lg items-center">
                <img 
                  src={formData.image.startsWith('http') ? formData.image : `${API_URL}${formData.image}`} 
                  alt="Pré-visualização" 
                  className="w-32 h-20 object-cover rounded-md border border-gray-200"
                />
                <div className="flex-grow min-w-0 w-full">
                  <span className="block text-sm text-gray-600 truncate font-medium">Imagem selecionada</span>
                  <a 
                    href={formData.image.startsWith('http') ? formData.image : `${API_URL}${formData.image}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-ufrpe-blue hover:underline"
                  >
                    Visualizar imagem cheia
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                  className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                  title="Remover imagem"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ) : (
              <div className="relative">
                {uploading ? (
                  <div className="flex items-center gap-3 px-4 py-3 border border-dashed border-ufrpe-blue/30 rounded-lg bg-ufrpe-blue/5 text-ufrpe-blue text-sm font-medium animate-pulse">
                    <span className="w-5 h-5 border-2 border-ufrpe-blue border-t-transparent rounded-full animate-spin"></span>
                    Enviando imagem...
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 hover:border-ufrpe-blue/40 rounded-lg cursor-pointer bg-gray-50 hover:bg-ufrpe-blue/5 transition-all focus-within:ring-2 focus-within:ring-ufrpe-yellow">
                    <Upload className="text-gray-400 shrink-0" size={20} />
                    <div className="flex-grow min-w-0">
                      <span className="block text-sm font-medium text-gray-700">Selecionar Imagem</span>
                      <span className="block text-xs text-gray-400">Clique para escolher (JPG, PNG, WEBP)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Resumo (Excerpt)</label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conteúdo
            </label>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <div ref={editorRef}></div>
            </div>
            <style>{`
              .ck-editor__editable_inline {
                min-height: 250px !important;
              }
            `}</style>
          </div>



          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (separadas por vírgula)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
              placeholder="#Pesquisa, #Inovação"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Link
            to="/admin/noticias"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-4"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || uploading || !formData.image}
            className="bg-ufrpe-blue border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-[#2a3a66] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ufrpe-yellow disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Notícia'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminNoticiaForm;
