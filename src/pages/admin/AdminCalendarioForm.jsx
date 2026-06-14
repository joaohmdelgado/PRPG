import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_URL } from '../../api';
import { AuditHeader } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';

const AdminCalendarioForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    ano: new Date().getFullYear(),
    isCurrent: false,
    pdfLink: '',
    description: '',
    milestones: []
  });

  const [milestonesInput, setMilestonesInput] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');
  const [audit, setAudit] = useState(null);
  const users = useUsers();

  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const descriptionRef = useRef('');

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

  // Buscar dados se estiver editando
  useEffect(() => {
    if (isEditing) {
      const fetchCalendario = async () => {
        try {
          const response = await fetch(`${API_URL}/api/calendarios/${id}`);
          if (response.ok) {
            const data = await response.json();
            setAudit(data);
            const descHTML = data.description || '';
            descriptionRef.current = descHTML;

            setFormData({
              title: data.title || '',
              ano: data.ano || new Date().getFullYear(),
              isCurrent: Boolean(data.isCurrent),
              pdfLink: data.pdfLink || '',
              description: descHTML,
              milestones: data.milestones || []
            });

            if (data.milestones) {
              setMilestonesInput(
                data.milestones.map(m => `${m.event} | ${m.date}`).join('\n')
              );
            }

            if (editorInstanceRef.current) {
              editorInstanceRef.current.setData(descHTML);
            }
          } else {
            setError('Calendário não encontrado');
          }
        } catch (err) {
          setError('Erro ao buscar calendário');
        } finally {
          setLoading(false);
        }
      };
      fetchCalendario();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Converte a string de marcos de prazo no formato "Evento | Data" para array de objetos
    const milestonesArray = milestonesInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.includes('|'))
      .map(line => {
        const parts = line.split('|');
        return {
          event: parts[0].trim(),
          date: parts[1].trim()
        };
      });

    const payload = {
      ...formData,
      ano: parseInt(formData.ano, 10),
      milestones: milestonesArray
    };

    try {
      const url = isEditing 
        ? `${API_URL}/api/calendarios/${id}` 
        : `${API_URL}/api/calendarios`;
      
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
        navigate('/admin/calendarios');
      } else if (response.status === 401) {
        navigate('/admin/login');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar calendário');
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
        <Link to="/admin/calendarios" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue">
          {isEditing ? 'Editar Calendário' : 'Novo Calendário'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Título do Calendário</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
              placeholder="Ex: Calendário Acadêmico 2026 - Corrente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano Letivo</label>
            <input
              type="number"
              name="ano"
              value={formData.ano}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
              placeholder="Ex: 2026"
            />
          </div>

          <div className="flex items-end pb-2.5">
            <label className="inline-flex items-center text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="isCurrent"
                checked={formData.isCurrent}
                onChange={handleChange}
                className="rounded border-gray-300 text-ufrpe-blue focus:ring-ufrpe-yellow h-4 w-4 mr-2"
              />
              Definir como Calendário Corrente (Ativo)
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Link do PDF Completo</label>
            <input
              type="text"
              name="pdfLink"
              value={formData.pdfLink}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
              placeholder="Ex: https://prpg.ufrpe.br/.../calendario.pdf"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <div ref={editorRef}></div>
            </div>
            <style>{`
              .ck-editor__editable_inline {
                min-height: 150px !important;
              }
            `}</style>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Principais Datas e Prazos (Formato: Atividade | Período)
            </label>
            <textarea
              value={milestonesInput}
              onChange={(e) => setMilestonesInput(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow font-mono text-sm"
              placeholder="Exemplo:&#10;Início das Aulas do Semestre 2026.1 | 09/03/2026&#10;Matrícula de Discentes | 02/03/2026 a 06/03/2026"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Link
            to="/admin/calendarios"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-4"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-ufrpe-blue border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-[#2a3a66] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ufrpe-yellow disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Calendário'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminCalendarioForm;
