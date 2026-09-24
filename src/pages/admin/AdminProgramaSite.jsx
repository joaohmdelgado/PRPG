import { FormSkeleton } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, Plus, Edit2, Trash2, Lock, File,
  Newspaper, FileText, Scale, FileSpreadsheet, BookOpen, HelpCircle,
  Book, Microscope, Presentation, UserCheck, Users, FlaskConical,
  BarChart2, Settings,
} from 'lucide-react';
import { apiFetch } from '../../api';
import { isProgramaGestor } from '../../auth';

// Seções de conteúdo com rota PRÓPRIA por programa (já filtradas, qualquer
// que seja o papel de quem acessa — ver AdminProgramaPessoas.jsx).
const SECOES_PROGRAMA = (id) => [
  { label: 'Docentes',           to: `/admin/programas/${id}/docentes`,  icon: Presentation },
  { label: 'Discentes',          to: `/admin/programas/${id}/discentes`, icon: UserCheck },
  { label: 'Comissões',          to: `/admin/programas/${id}/comissoes`, icon: Users },
  { label: 'Linhas de Pesquisa', to: `/admin/programas/${id}/linhas`,    icon: FlaskConical },
  { label: 'Métricas Anuais',    to: `/admin/programas/${id}/metricas`,  icon: BarChart2 },
];

// Listagens gerais (Notícias, Editais...): a tela de destino não filtra por
// programa (nenhuma lista admin lê ?programa= de um admin global hoje — só o
// GestorPrograma tem escopo automático). Linkam para a lista completa.
const SECOES_GERAIS = [
  { label: 'Notícias',              to: '/admin/noticias',            icon: Newspaper },
  { label: 'Editais',               to: '/admin/editais',             icon: FileText },
  { label: 'Disciplinas',           to: '/admin/disciplinas',         icon: Book },
  { label: 'Teses e Dissertações',  to: '/admin/teses-dissertacoes',  icon: BookOpen },
  { label: 'FAQ',                   to: '/admin/faq',                 icon: HelpCircle },
  { label: 'Grupos de Pesquisa',    to: '/admin/grupos-pesquisa',     icon: Microscope },
  { label: 'Resoluções',            to: '/admin/resolucoes',          icon: Scale },
  { label: 'Formulários',           to: '/admin/formularios',         icon: FileSpreadsheet },
];

function LinkCard({ to, icon: Icon, label, hint }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-ufrpe-blue/40 hover:shadow-sm transition-all"
    >
      <span className="shrink-0 w-9 h-9 rounded-lg bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{label}</p>
        {hint && <p className="text-xs text-gray-400 truncate">{hint}</p>}
      </div>
    </Link>
  );
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const AdminProgramaSite = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, ConfirmModal } = useConfirm();

  const [programa, setPrograma] = useState(null);
  const [paginas, setPaginas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null); // id da página sendo excluída

  const load = async () => {
    setLoading(true);
    const [rPrograma, rPaginas] = await Promise.all([
      apiFetch(`/api/programas/${id}`),
      apiFetch(`/api/pages?programa=${id}`),
    ]);
    if (rPrograma.ok) setPrograma(await rPrograma.json());
    else if (rPrograma.status === 401) return navigate('/admin/login');
    if (rPaginas.ok) setPaginas(await rPaginas.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <FormSkeleton />;
  if (!programa) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-5xl mx-auto text-center text-gray-500">
        Programa não encontrado.
      </div>
    );
  }

  const sobre = paginas.find((p) => p.chave === 'sobre');
  const criadas = paginas.filter((p) => !p.chave);
  const titulo = `${programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla + ' — ' : ''}${programa.nome}`;
  const backTo = isProgramaGestor() ? `/admin/programas/editar/${id}` : '/admin/programas';

  const handleDeletePagina = async (pagina) => {
    if (!await confirm(`Excluir a página "${pagina.title}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(pagina.id);
    const r = await apiFetch(`/api/pages/${pagina.id}`, { method: 'DELETE' });
    if (r.status === 401) return navigate('/admin/login');
    setDeleting(null);
    if (r.ok) load();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4">
          <Link to={backTo} className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 truncate">Site do Programa</p>
            <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue truncate">{titulo}</h2>
          </div>
          {programa.slug && (
            <>
              <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${programa.microsite_ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {programa.microsite_ativo ? 'Publicado' : 'Rascunho'}
              </span>
              <a
                href={`/${programa.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ufrpe-blue transition-colors shrink-0"
              >
                {programa.microsite_ativo ? 'Ver microsite' : 'Pré-visualizar'} <ExternalLink size={14} />
              </a>
            </>
          )}
        </div>
        {!programa.slug && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Este programa ainda não tem endereço de microsite — defina um slug em <Link to={`/admin/programas/editar/${id}`} className="underline font-medium">Meu Programa</Link> para publicá-lo.
          </p>
        )}
      </div>

      {/* Página fixa "Sobre" */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={15} className="text-amber-600" />
          <h3 className="font-heading text-lg font-semibold text-gray-800">Sobre o Programa</h3>
          <span className="text-xs text-gray-400">— página fixa, sempre em "/sobre"</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {sobre?.body?.value && stripHtml(sobre.body.value)
            ? stripHtml(sobre.body.value).slice(0, 220) + (stripHtml(sobre.body.value).length > 220 ? '…' : '')
            : <span className="text-gray-400 italic">Conteúdo em construção — ainda não foi escrito.</span>}
        </p>
        {sobre ? (
          <Link
            to={`/admin/paginas/editar/${sobre.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-white bg-ufrpe-blue hover:bg-[#2a3a66] px-4 py-2 rounded-md transition-colors"
          >
            <Edit2 size={15} /> Editar Sobre
          </Link>
        ) : (
          <p className="text-xs text-gray-400">Página fixa ainda não disponível — recarregue em instantes.</p>
        )}
      </div>

      {/* Páginas criadas pelo programa */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-gray-800 flex items-center gap-2">
              <File size={17} className="text-ufrpe-blue" /> Páginas do Programa
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Conteúdo livre (Histórico, Regimento, Infraestrutura…), com endereço próprio dentro do microsite.</p>
          </div>
          <Link
            to={`/admin/paginas/nova?programa=${id}`}
            className="shrink-0 inline-flex items-center gap-2 text-sm font-medium text-ufrpe-blue border border-ufrpe-blue/30 hover:bg-ufrpe-blue/5 px-3 py-2 rounded-md transition-colors"
          >
            <Plus size={15} /> Nova página
          </Link>
        </div>

        {criadas.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-2">Nenhuma página criada ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {criadas.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                  {programa.slug && (
                    <a
                      href={`/${programa.slug}/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-ufrpe-blue hover:underline"
                    >
                      /{programa.slug}/{p.slug}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link to={`/admin/paginas/editar/${p.id}`} className="text-ufrpe-blue hover:text-ufrpe-yellow bg-ufrpe-blue/5 hover:bg-ufrpe-blue/10 p-1.5 rounded transition-colors" title="Editar">
                    <Edit2 size={15} />
                  </Link>
                  <button
                    onClick={() => handleDeletePagina(p)}
                    disabled={deleting === p.id}
                    className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors disabled:opacity-50"
                    title="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pessoas, comissões e métricas — já filtrados por este programa */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-heading text-lg font-semibold text-gray-800 mb-4">Pessoas e Métricas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECOES_PROGRAMA(id).map((s) => (
            <LinkCard key={s.to} to={s.to} icon={s.icon} label={s.label} />
          ))}
        </div>
      </div>

      {/* Listagens gerais */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-heading text-lg font-semibold text-gray-800 mb-1">Outros Conteúdos</h3>
        <p className="text-xs text-gray-500 mb-4">
          Listas gerais da PRPG — use a busca de cada tela para filtrar por "{programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla : programa.nome}".
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECOES_GERAIS.map((s) => (
            <LinkCard key={s.to} to={s.to} icon={s.icon} label={s.label} />
          ))}
        </div>
      </div>

      {/* Dados automáticos (Início / Contato) */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-heading text-lg font-semibold text-gray-800 mb-4">Início e Contato</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LinkCard
            to={`/admin/programas/editar/${id}`}
            icon={Settings}
            label="Editar dados do programa"
            hint="Início e Contato usam a identidade, descrição e endereço cadastrados aqui"
          />
        </div>
      </div>

      {ConfirmModal}
    </div>
  );
};

export default AdminProgramaSite;
