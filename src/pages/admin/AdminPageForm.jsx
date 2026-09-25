import { FormSkeleton } from '../../components/admin/AdminUI';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, File } from 'lucide-react';
import { apiFetch } from '../../api';
import { isProgramaGestor } from '../../auth';
import { configEditor, CKEDITOR_CDN } from '../../components/admin/ckeditor';
import PublicacaoCampos from '../../components/admin/PublicacaoCampos';
import useAvisoAlteracoes from '../../hooks/useAvisoAlteracoes';

const AdminPageForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  // Vindo de "Site do Programa" (Nova página), pré-seleciona o programa —
  // só importa na criação; ao editar, o valor real da página manda. Também
  // define para onde voltar (Cancelar/Salvar), fechando o fluxo no hub do
  // programa em vez da lista geral.
  const [searchParams] = useSearchParams();
  const programaFromQuery = searchParams.get('programa') || '';
  const backTo = programaFromQuery ? `/admin/programas/${programaFromQuery}/site` : '/admin/paginas';

  const [formData, setFormData] = useState({
    // Envelope de publicação + versão carregada (edição concorrente) — Fase F.6.
    status: 'PUBLICADO',
    publicadoEm: '',
    _versao: null,
    title: '',
    programaId: programaFromQuery,
    chave: null,
    slug: '',
    body: { value: '', summary: '' },
  });

  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const { sujo } = useAvisoAlteracoes(formData, !loading);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/programas')
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setProgramas(Array.isArray(d) ? d : []));
  }, []);

  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const contentRef = useRef('');

  // 1. Inicializar CKEditor dinamicamente (padrão robusto e à prova de ciclo de vida)
  useEffect(() => {
    let script;
    const initEditor = () => {
      if (window.ClassicEditor && editorRef.current && !editorInstanceRef.current) {
        window.ClassicEditor.create(editorRef.current, configEditor())
          .then(editor => {
            editorInstanceRef.current = editor;
            if (contentRef.current) {
              editor.setData(contentRef.current);
            }
            editor.model.document.on('change:data', () => {
              const data = editor.getData();
              contentRef.current = data;
              setFormData(prev => ({
                ...prev,
                body: {
                  ...prev.body,
                  value: data
                }
              }));
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
        script.src = CKEDITOR_CDN;
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
      const fetchPage = async () => {
        try {
          const response = await apiFetch(`/api/pages/${id}`);
          if (response.ok) {
            const data = await response.json();
            const bodyVal = data.body?.value || '';
            contentRef.current = bodyVal;

            setFormData({
              status: data.status || 'PUBLICADO',
              publicadoEm: data.publicadoEm || '',
              _versao: data.atualizado_em || null,
              title: data.title || '',
              programaId: data.programaId || '',
              chave: data.chave || null,
              slug: data.slug || '',
              body: { value: bodyVal, summary: data.body?.summary || '' },
            });

            if (editorInstanceRef.current) {
              editorInstanceRef.current.setData(bodyVal);
            }
          } else {
            setError('Página não encontrada');
          }
        } catch (err) {
          setError('Erro ao buscar dados da página');
        } finally {
          setLoading(false);
        }
      };
      fetchPage();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSummaryChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      body: {
        ...prev.body,
        summary: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('O título é obrigatório.');
      return;
    }
    if (!formData.body.value.trim()) {
      setError('O conteúdo da página é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const path = isEditing ? `/api/pages/${id}` : '/api/pages';

      const response = await apiFetch(path, { method: isEditing ? 'PUT' : 'POST', json: formData });

      if (response.ok) {
        navigate(backTo);
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar página');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const slugifyPreview = (text) => {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  };

  if (loading && isEditing) {
    return (
      <FormSkeleton />
    );
  }

  const currentSlug = slugifyPreview(formData.title);
  const selectedPrograma = programas.find((p) => p.id === formData.programaId);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to={backTo} className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue flex items-center gap-2">
          <File className="text-ufrpe-blue" size={24} />
          {isEditing ? 'Editar Página' : 'Nova Página'}
        </h2>
      </div>

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
          previewUrl={isEditing && formData.slug ? (selectedPrograma ? `/${selectedPrograma.slug}/${formData.slug}` : `/${formData.slug}`) : null}
          sujo={sujo}
        />
        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm"
            placeholder="Digite o título da página (ex: Infraestrutura e Laboratórios)..."
          />
          {formData.title && (
            <p className="mt-1.5 text-xs text-gray-500">
              Endereço público:{' '}
              <span className="font-semibold text-ufrpe-blue">
                {isEditing && formData.chave
                  ? (selectedPrograma ? `/${selectedPrograma.slug}/${formData.slug}` : `/${formData.slug}`)
                  : (selectedPrograma ? `/${selectedPrograma.slug}/${currentSlug}` : `/${currentSlug}`)}
              </span>
              {isEditing && formData.chave && (
                <span className="block mt-1 text-gray-400">
                  Página fixa deste programa — o endereço não muda quando o título muda.
                </span>
              )}
            </p>
          )}
        </div>

        {/* Programa */}
        <div className={isProgramaGestor() ? 'hidden' : undefined}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Programa (opcional)</label>
          {isEditing && formData.chave ? (
            <p className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-600">
              {selectedPrograma
                ? (selectedPrograma.sigla && selectedPrograma.sigla !== 'S/SIGLA' ? `${selectedPrograma.sigla} — ${selectedPrograma.nome}` : selectedPrograma.nome)
                : '—'}
              <span className="block text-xs text-gray-400 mt-0.5">Página fixa: o vínculo com o programa não pode ser alterado.</span>
            </p>
          ) : (
            <>
              <select
                name="programaId"
                value={formData.programaId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow bg-white text-sm"
              >
                <option value="">— Página geral da PRPG (sem programa) —</option>
                {programas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sigla && p.sigla !== 'S/SIGLA' ? `${p.sigla} — ${p.nome}` : p.nome}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Ao vincular, a página ganha endereço próprio dentro do microsite do programa.</p>
            </>
          )}
        </div>

        {/* Resumo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resumo (Opcional)</label>
          <textarea
            name="summary"
            value={formData.body.summary}
            onChange={handleSummaryChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm placeholder-gray-400"
            placeholder="Um resumo curto do assunto tratado na página institucional..."
          />
        </div>

        {/* Conteúdo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo Principal *</label>
          <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
            <div ref={editorRef}></div>
          </div>
          <style>{`
            .ck-editor__editable_inline {
              min-height: 350px !important;
            }
          `}</style>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            to={backTo}
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
            {loading ? 'Salvando...' : 'Salvar Página'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminPageForm;
