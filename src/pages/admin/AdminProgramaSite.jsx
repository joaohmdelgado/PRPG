import { FormSkeleton } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, Plus, Edit2, Trash2, Lock, File, CheckCircle2, Circle,
  Newspaper, FileText, Scale, FileSpreadsheet, BookOpen, HelpCircle,
  Book, Microscope, Presentation, UserCheck, Users, FlaskConical,
  BarChart2, Settings,
} from 'lucide-react';
import { apiFetch } from '../../api';
import { isProgramaGestor } from '../../auth';
import MicrositeMenuEditor from '../../components/admin/MicrositeMenuEditor';

// Seções de conteúdo com rota PRÓPRIA por programa (já filtradas, qualquer
// que seja o papel de quem acessa — ver AdminProgramaPessoas.jsx).
const SECOES_PROGRAMA = (id) => [
  { label: 'Docentes',           to: `/admin/programas/${id}/docentes`,  icon: Presentation },
  { label: 'Discentes',          to: `/admin/programas/${id}/discentes`, icon: UserCheck },
  { label: 'Comissões',          to: `/admin/programas/${id}/comissoes`, icon: Users },
  { label: 'Linhas de Pesquisa', to: `/admin/programas/${id}/linhas`,    icon: FlaskConical },
  { label: 'Métricas Anuais',    to: `/admin/programas/${id}/metricas`,  icon: BarChart2 },
];

// Listagens gerais (Notícias, Editais...): o link leva ?programa=<id> e a
// lista abre filtrada (OrigemFiltro, Fase R.6). O GestorPrograma já tem
// escopo automático e ignora o filtro.
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
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Ordem das páginas fixas (a mesma de PAGINAS_FIXAS em
// server/utils/micrositeMenu.js — Fase S.2).
const ORDEM_FIXAS = ['sobre', 'impacto-social', 'autoavaliacao', 'infraestrutura', 'internacionalizacao', 'planejamento'];

function EstadoFixa({ pagina }) {
  if (pagina.chave === 'sobre') {
    return <span className="text-xs text-gray-400">sempre no menu</span>;
  }
  if (!stripHtml(pagina.body?.value)) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">vazia · fora do menu</span>;
  }
  if (pagina.status !== 'PUBLICADO') {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{pagina.status === 'RASCUNHO' ? 'rascunho' : 'arquivada'} · fora do menu</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">no menu</span>;
}

// Checklist de publicação (Fase S.4 — GET /api/programas/:id/checklist).
function ChecklistPublicacao({ checklist, linkPara }) {
  const { itens, feitos, total, percentual } = checklist;
  const cor = percentual === 100 ? 'bg-green-500' : percentual >= 50 ? 'bg-ufrpe-blue' : 'bg-amber-500';
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="font-heading text-lg font-semibold text-gray-800">Checklist de publicação</h3>
        <span className="text-sm font-semibold text-gray-700">{percentual}% <span className="font-normal text-gray-400">({feitos} de {total})</span></span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4" role="progressbar" aria-valuenow={percentual} aria-valuemin={0} aria-valuemax={100} aria-label="Checklist de publicação">
        <div className={`h-full ${cor} transition-all`} style={{ width: `${percentual}%` }} />
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {itens.map((i) => (
          <li key={i.chave} className="flex items-start gap-2 text-sm">
            {i.ok
              ? <CheckCircle2 size={17} className="text-green-600 shrink-0 mt-0.5" aria-label="feito" />
              : <Circle size={17} className="text-gray-300 shrink-0 mt-0.5" aria-label="pendente" />}
            <span className="min-w-0">
              <span className={i.ok ? 'text-gray-700' : 'text-gray-900 font-medium'}>{i.rotulo}</span>
              {!i.ok && (
                <span className="block text-xs text-gray-500">
                  {i.dica}{' '}
                  {linkPara(i.onde) && <Link to={linkPara(i.onde)} className="text-ufrpe-blue hover:underline">Resolver</Link>}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const AdminProgramaSite = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, ConfirmModal } = useConfirm();

  const [programa, setPrograma] = useState(null);
  const [paginas, setPaginas] = useState([]);
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null); // id da página sendo excluída

  const load = async () => {
    setLoading(true);
    const [rPrograma, rPaginas, rChecklist] = await Promise.all([
      apiFetch(`/api/programas/${id}`),
      apiFetch(`/api/pages?programa=${id}`),
      apiFetch(`/api/programas/${id}/checklist`),
    ]);
    if (rChecklist.ok) setChecklist(await rChecklist.json());
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

  const fixas = paginas
    .filter((p) => p.chave)
    .sort((a, b) => ORDEM_FIXAS.indexOf(a.chave) - ORDEM_FIXAS.indexOf(b.chave));
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

      {checklist && (
        <ChecklistPublicacao
          checklist={checklist}
          linkPara={(onde) => ({
            programa: `/admin/programas/editar/${id}`,
            sobre: fixas.find((p) => p.chave === 'sobre') ? `/admin/paginas/editar/${fixas.find((p) => p.chave === 'sobre').id}` : null,
            linhas: `/admin/programas/${id}/linhas`,
          })[onde]}
        />
      )}

      {/* Páginas fixas (Fase S.2) */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={15} className="text-amber-600" />
          <h3 className="font-heading text-lg font-semibold text-gray-800">Páginas fixas</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Todo programa tem estas páginas, com endereço fixo. Elas só entram no menu "O Programa" depois de
          ganhar texto — até lá ficam ocultas.
        </p>
        {fixas.length === 0 ? (
          <p className="text-xs text-gray-400">Páginas fixas ainda não disponíveis — recarregue em instantes.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {fixas.map((p) => {
              const texto = stripHtml(p.body?.value);
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate flex items-center gap-2">
                      {p.title} <EstadoFixa pagina={p} />
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {texto ? texto.slice(0, 140) : <span className="italic text-gray-400">Ainda não foi escrita.</span>}
                    </p>
                  </div>
                  <Link
                    to={`/admin/paginas/editar/${p.id}`}
                    className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-ufrpe-blue border border-ufrpe-blue/30 hover:bg-ufrpe-blue/5 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <Edit2 size={14} /> {texto ? 'Editar' : 'Escrever'}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Páginas criadas pelo programa */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-gray-800 flex items-center gap-2">
              <File size={17} className="text-ufrpe-blue" /> Páginas do Programa
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Conteúdo livre (Histórico, Regimento, Laboratórios…), com endereço próprio dentro do microsite.</p>
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

      {/* Menu do microsite (Fase S.3) */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-heading text-lg font-semibold text-gray-800">Menu do microsite</h3>
        <p className="text-xs text-gray-500 mt-0.5 mb-4">
          O modelo é o mesmo dos sites dos programas (O Programa, Pessoas, Produção, Admissão). Aqui dá para
          mudar nomes, ocultar, reordenar e trocar item de grupo. Itens sem conteúdo ficam fora do menu
          automaticamente, mesmo marcados como visíveis.
        </p>
        <MicrositeMenuEditor programaId={id} />
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
          Abrem as listas gerais já filtradas por este programa.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECOES_GERAIS.map((s) => (
            <LinkCard key={s.to} to={`${s.to}?programa=${encodeURIComponent(id)}`} icon={s.icon} label={s.label} />
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
