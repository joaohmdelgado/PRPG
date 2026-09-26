import {
  LayoutDashboard, Newspaper, FileText, Scale, FileSpreadsheet, GraduationCap, Calendar, Users, Tags,
  FileCheck, BookOpen, HelpCircle, Book, Award, File, UserCog, UserCheck, Presentation, Languages, Upload,
  FlaskConical, Gavel, Contact, Inbox, Microscope, Mail, ClipboardList, Layers, Images, Menu, Network,
  ClipboardCheck, ListChecks, DatabaseZap,
} from 'lucide-react';

// Menu do painel por TAREFA (Fase U.2), não por tabela. O que a pessoa quer
// fazer decide o grupo:
//   Site                  — o que o público lê (notícias, editais, páginas, menus)
//   Programas             — os programas e o que pertence a eles
//   Secretaria            — o trabalho administrativo (Câmara, expedientes, pós-doc, proficiência)
//   Pessoas e Contatos    — quem são (usuários) e como falar com eles (agenda)
//   Configuração          — classificações, importações, qualidade dos dados, envio de e-mail
// "Portarias" continua em Secretaria enquanto a E.11 (aposentar portarias em
// favor de Expedientes) não conclui — só sai dali depois.
//
// Cada grupo aparece só se tiver item permitido ao perfil (`papeis`).

// Itens do painel da PRPG (Administrator/Gestor). `papeis` ausente = qualquer
// usuário do painel; as rotas continuam protegidas no RequireAuth e na API.
const GRUPOS_PRPG = [
  {
    id: 'site', rotulo: 'Site',
    itens: [
      { to: '/admin/noticias', label: 'Notícias', icon: Newspaper },
      { to: '/admin/editais', label: 'Editais', icon: FileText },
      { to: '/admin/resolucoes', label: 'Resoluções', icon: Scale },
      { to: '/admin/formularios', label: 'Formulários', icon: FileSpreadsheet },
      { to: '/admin/calendarios', label: 'Calendários', icon: Calendar },
      { to: '/admin/teses-dissertacoes', label: 'Teses e Dissertações', icon: BookOpen },
      { to: '/admin/faq', label: 'FAQ', icon: HelpCircle },
      { to: '/admin/bolsas', label: 'Bolsas', icon: Award },
      { to: '/admin/paginas', label: 'Páginas', icon: File },
      { to: '/admin/midia', label: 'Biblioteca de Mídia', icon: Images },
      { to: '/admin/portal', label: 'Menus e portal', icon: Menu },
      { to: '/admin/estrutura', label: 'Equipe e estrutura', icon: Network },
    ],
  },
  {
    id: 'programas', rotulo: 'Programas',
    itens: [
      { to: '/admin/programas', label: 'Programas', icon: GraduationCap },
      { to: '/admin/disciplinas', label: 'Disciplinas', icon: Book },
      { to: '/admin/grupos-pesquisa', label: 'Grupos de Pesquisa', icon: Users },
      { to: '/admin/linhas-pesquisa', label: 'Linhas de Pesquisa', icon: FlaskConical },
      { to: '/admin/metricas', label: 'Indicadores e métricas', icon: LayoutDashboard },
    ],
  },
  {
    id: 'secretaria', rotulo: 'Secretaria',
    itens: [
      { to: '/admin/camara', label: 'Câmara de Pós-Graduação', icon: Gavel },
      { to: '/admin/atos', label: 'Expedientes', icon: Inbox },
      { to: '/admin/pos-doutorado', label: 'Pós-Doutorado', icon: Microscope },
      { to: '/admin/proficiencia', label: 'Proficiência', icon: Languages },
      { to: '/admin/portarias', label: 'Portarias', icon: FileCheck },
      { to: '/admin/meus-processos', label: 'Meus processos', icon: ClipboardList },
    ],
  },
  {
    id: 'pessoas', rotulo: 'Pessoas e Contatos',
    itens: [
      { to: '/admin/users', label: 'Usuários', icon: UserCog },
      { to: '/admin/contatos', label: 'Agenda de Contatos', icon: Contact },
    ],
  },
  {
    id: 'config', rotulo: 'Configuração',
    itens: [
      { to: '/admin/taxonomias', label: 'Classificações', icon: Tags },
      { to: '/admin/planilhas', label: 'Planilhas (importação)', icon: ClipboardCheck },
      { to: '/admin/importacao', label: 'Importar usuários', icon: Upload },
      { to: '/admin/qualidade', label: 'Qualidade dos dados', icon: DatabaseZap },
      { to: '/admin/notificacoes', label: 'Notificações e agendador', icon: Mail, papeis: ['Administrator'] },
    ],
  },
];

// Gestor de Programa: só conteúdo vinculável ao seu programa (itens globais da
// PRPG ficam de fora). "Meu Programa" abre a edição do próprio programa.
const gruposGestorPrograma = (programaId) => [
  {
    id: 'site', rotulo: 'Site do programa',
    itens: [
      { to: `/admin/programas/${programaId}/site`, label: 'Site do Programa', icon: Layers },
      { to: '/admin/noticias', label: 'Notícias', icon: Newspaper },
      { to: '/admin/editais', label: 'Editais', icon: FileText },
      { to: '/admin/resolucoes', label: 'Resoluções', icon: Scale },
      { to: '/admin/formularios', label: 'Formulários', icon: FileSpreadsheet },
      { to: '/admin/faq', label: 'FAQ', icon: HelpCircle },
      { to: '/admin/paginas', label: 'Páginas', icon: File },
    ],
  },
  {
    id: 'programas', rotulo: 'Programa',
    itens: [
      { to: `/admin/programas/editar/${programaId}`, label: 'Meu Programa', icon: GraduationCap },
      { to: `/admin/programas/${programaId}/docentes`, label: 'Docentes', icon: Presentation },
      { to: `/admin/programas/${programaId}/discentes`, label: 'Discentes', icon: UserCheck },
      { to: `/admin/programas/${programaId}/linhas`, label: 'Linhas de Pesquisa', icon: FlaskConical },
      { to: '/admin/grupos-pesquisa', label: 'Grupos de Pesquisa', icon: Users },
      { to: '/admin/disciplinas', label: 'Disciplinas', icon: Book },
      { to: '/admin/teses-dissertacoes', label: 'Teses e Dissertações', icon: BookOpen },
    ],
  },
  {
    id: 'secretaria', rotulo: 'Secretaria',
    itens: [
      { to: '/admin/meus-processos', label: 'Meus processos', icon: ClipboardList },
    ],
  },
];

export const INICIO = { to: '/admin', label: 'Pendências', icon: ListChecks, exact: true };

// Grupos visíveis para o perfil. `perfil`: { superAdmin, gestorPrograma, programaId, roles }.
export function gruposDoPainel({ superAdmin, gestorPrograma, programaId, roles = [] }) {
  const base = gestorPrograma && !superAdmin ? gruposGestorPrograma(programaId) : (superAdmin ? GRUPOS_PRPG : []);
  return base
    .map((g) => ({
      ...g,
      itens: g.itens.filter((i) => !i.papeis || i.papeis.some((p) => roles.includes(p))),
    }))
    .filter((g) => g.itens.length > 0);
}

// Todos os destinos do painel (para a busca do Ctrl+K), com o grupo como contexto.
export const destinosDoPainel = (perfil) => [
  { ...INICIO, grupo: 'Início' },
  ...gruposDoPainel(perfil).flatMap((g) => g.itens.map((i) => ({ ...i, grupo: g.rotulo }))),
];
