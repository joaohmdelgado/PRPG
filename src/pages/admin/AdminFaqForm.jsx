import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, HelpCircle } from 'lucide-react';

const AdminFaqForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    field_resposta: ''
  });

  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');

  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const contentRef = useRef('');

  // 1. Inicializar CKEditor dinamicamente (padrão robusto e à prova de ciclo de vida)
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
              setFormData(prev => ({ ...prev, field_resposta: data }));
            });
          })
          .catch(err => {
            console.error('Erro ao inicializar CKEditor:', err);
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

  // 2. Carrega dados se for edição
  useEffect(() => {
    if (isEditing) {
      const fetchFaq = async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/faq/${id}`);
          if (response.ok) {
            const data = await response.json();
            const resp = data.field_resposta || '';
            contentRef.current = resp;

            setFormData({
              title: data.title || '',
              field_resposta: resp
            });

            if (editorInstanceRef.current) {
              editorInstanceRef.current.setData(resp);
            }
          } else {
            setError('FAQ não encontrado');
          }
        } catch (err) {
          setError('Erro ao buscar pergunta frequente');
        } finally {
          setLoading(false);
        }
      };
      fetchFaq();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('A pergunta é obrigatória.');
      return;
    }
    if (!formData.field_resposta.trim()) {
      setError('A resposta é obrigatória.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEditing 
        ? `http://localhost:5000/api/faq/${id}` 
        : 'http://localhost:5000/api/faq';
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        navigate('/admin/faq');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar FAQ');
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
        <Link to="/admin/faq" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <HelpCircle className="text-blue-600" size={24} />
          {isEditing ? 'Editar FAQ' : 'Novo FAQ'}
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Título (= Pergunta) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pergunta *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Digite a pergunta frequente..."
          />
        </div>

        {/* Resposta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resposta *</label>
          <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
            <div ref={editorRef}></div>
          </div>
          <style>{`
            .ck-editor__editable_inline {
              min-height: 250px !important;
            }
          `}</style>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link 
            to="/admin/faq"
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
            {loading ? 'Salvando...' : 'Salvar FAQ'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminFaqForm;
