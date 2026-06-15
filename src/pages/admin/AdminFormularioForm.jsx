import { FormSkeleton } from '../../components/admin/AdminUI';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_URL } from '../../api';
import { AuditHeader } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const SECTIONS = {
  'mestrado-doutorado': 'Mestrado e Doutorado',
  'lato-sensu': 'Lato sensu',
  'apoio-financeiro': 'Apoio Financeiro'
};

const AdminFormularioForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    sectionId: '',
    categoryTitle: '',
    title: '',
    desc: '',
    link: '',
    programaId: ''
  });

  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');
  const [existingCategories, setExistingCategories] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [audit, setAudit] = useState(null);
  const users = useUsers();

  useEffect(() => {
    fetch(`${API_URL}/api/programas`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProgramas(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const descRef = useRef('');

  // Carregar subcategorias existentes para sugestões
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const response = await fetch(`${API_URL}/api/formularios`);
        if (response.ok) {
          const data = await response.json();
          const cats = Array.from(new Set(data.map(item => item.categoryTitle).filter(Boolean)));
          setExistingCategories(cats);
        }
      } catch (e) {
        console.error('Erro ao buscar subcategorias:', e);
      }
    };
    fetchExisting();
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
      const fetchFormulario = async () => {
        try {
          const response = await fetch(`${API_URL}/api/formularios/${id}`);
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
              link: data.link || '',
              programaId: data.programaId || ''
            });

            if (editorInstanceRef.current) {
              editorInstanceRef.current.setData(description);
            }
          } else {
            setError('Formulário não encontrado');
          }
        } catch (err) {
          setError('Erro ao buscar formulário');
        } finally {
          setLoading(false);
        }
      };
      fetchFormulario();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        ? `${API_URL}/api/formularios/${id}` 
        : `${API_URL}/api/formularios`;
      
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
        navigate('/admin/formularios');
      } else if (response.status === 401) {
        navigate('/admin/login');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar formulário');
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
        <Link to="/admin/formularios" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue">
          {isEditing ? 'Editar Formulário' : 'Novo Formulário'}
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Programa (opcional)</label>
          <select name="programaId" value={formData.programaId} onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow bg-white text-sm">
            <option value="">— Formulário geral da PRPG —</option>
            {programas.map((p) => (
              <option key={p.id} value={p.id}>{p.sigla && p.sigla !== 'S/SIGLA' ? `${p.sigla} — ${p.nome}` : p.nome}</option>
            ))}
          </select>
        </div>

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
              placeholder="Ex: Ficha de Identificação do Discente"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoria</label>
            <input
              type="text"
              name="categoryTitle"
              value={formData.categoryTitle}
              onChange={handleChange}
              required
              list="categories-list"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
              placeholder="Digite ou selecione uma subcategoria"
            />
            <datalist id="categories-list">
              {existingCategories.map((cat, idx) => (
                <option key={idx} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Link do Documento (Download/Acesso)</label>
            <input
              type="text"
              name="link"
              value={formData.link}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
              placeholder="Ex: https://prpg.ufrpe.br/.../documento.docx"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
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
            to="/admin/formularios"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-4"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-ufrpe-blue border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-[#2a3a66] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ufrpe-yellow disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Formulário'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminFormularioForm;
