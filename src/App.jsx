import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { isProgramaGestor } from './auth';

// Layouts e guardas ficam eager (envolvem todas as rotas e são pequenos).
import PublicLayout from './components/PublicLayout';
import AdminLayout from './components/AdminLayout';
import RequireAuth from './components/RequireAuth';

// Páginas carregadas sob demanda (code-splitting): o visitante público não
// baixa o código do painel admin, e cada rota vira um chunk separado.
const Home = lazy(() => import('./pages/Home'));
const EstruturaOrganizacional = lazy(() => import('./pages/EstruturaOrganizacional'));
const Equipe = lazy(() => import('./pages/Equipe'));
const ProgramasStrictoSensu = lazy(() => import('./pages/ProgramasStrictoSensu'));
const CalendarioAcademico = lazy(() => import('./pages/CalendarioAcademico'));
const Editais = lazy(() => import('./pages/Editais'));
const Resolucoes = lazy(() => import('./pages/Resolucoes'));
const Formularios = lazy(() => import('./pages/Formularios'));
const Noticias = lazy(() => import('./pages/Noticias'));
const Noticia = lazy(() => import('./pages/Noticia'));
const Edital = lazy(() => import('./pages/Edital'));
const DeclaracaoProficiencia = lazy(() => import('./pages/DeclaracaoProficiencia'));
const VerificarDeclaracao = lazy(() => import('./pages/VerificarDeclaracao'));
const ProgramaSite = lazy(() => import('./pages/programa/ProgramaSite'));

// Admin
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminTrocarSenha = lazy(() => import('./pages/admin/AdminTrocarSenha'));
const AdminNoticias = lazy(() => import('./pages/admin/AdminNoticias'));
const AdminNoticiaForm = lazy(() => import('./pages/admin/AdminNoticiaForm'));
const AdminEditais = lazy(() => import('./pages/admin/AdminEditais'));
const AdminEditalForm = lazy(() => import('./pages/admin/AdminEditalForm'));
const AdminResolucoes = lazy(() => import('./pages/admin/AdminResolucoes'));
const AdminResolucaoForm = lazy(() => import('./pages/admin/AdminResolucaoForm'));
const AdminFormularios = lazy(() => import('./pages/admin/AdminFormularios'));
const AdminFormularioForm = lazy(() => import('./pages/admin/AdminFormularioForm'));
const AdminProgramas = lazy(() => import('./pages/admin/AdminProgramas'));
const AdminProgramaForm = lazy(() => import('./pages/admin/AdminProgramaForm'));
const AdminProgramaComissoes = lazy(() => import('./pages/admin/AdminProgramaComissoes'));
const AdminProgramaMetricas = lazy(() => import('./pages/admin/AdminProgramaMetricas'));
const AdminProgramaSite = lazy(() => import('./pages/admin/AdminProgramaSite'));
const AdminProgramaLinhas = lazy(() => import('./pages/admin/AdminProgramaLinhas'));
const AdminProgramaGestorLinhas = lazy(() => import('./pages/admin/AdminProgramaGestorLinhas'));
const AdminLinhasPesquisa = lazy(() => import('./pages/admin/AdminLinhasPesquisa'));
const AdminProgramaDiscentes = lazy(() => import('./pages/admin/AdminProgramaDiscentes'));
const AdminProgramaDocentes = lazy(() => import('./pages/admin/AdminProgramaDocentes'));
const AdminCalendarios = lazy(() => import('./pages/admin/AdminCalendarios'));
const AdminCalendarioForm = lazy(() => import('./pages/admin/AdminCalendarioForm'));
const AdminTaxonomias = lazy(() => import('./pages/admin/AdminTaxonomias'));
const AdminUsersList = lazy(() => import('./pages/admin/AdminUsersList'));
const AdminUserForm = lazy(() => import('./pages/admin/AdminUserForm'));
const AdminPortarias = lazy(() => import('./pages/admin/AdminPortarias'));
const AdminPortariaForm = lazy(() => import('./pages/admin/AdminPortariaForm'));
const AdminGruposPesquisa = lazy(() => import('./pages/admin/AdminGruposPesquisa'));
const AdminGrupoPesquisaForm = lazy(() => import('./pages/admin/AdminGrupoPesquisaForm'));
const AdminTesesList = lazy(() => import('./pages/admin/AdminTesesList'));
const AdminTeseForm = lazy(() => import('./pages/admin/AdminTeseForm'));
const AdminFaqList = lazy(() => import('./pages/admin/AdminFaqList'));
const AdminFaqForm = lazy(() => import('./pages/admin/AdminFaqForm'));
const AdminDisciplinasList = lazy(() => import('./pages/admin/AdminDisciplinasList'));
const AdminDisciplinaForm = lazy(() => import('./pages/admin/AdminDisciplinaForm'));
const AdminBolsasList = lazy(() => import('./pages/admin/AdminBolsasList'));
const AdminBolsaForm = lazy(() => import('./pages/admin/AdminBolsaForm'));
const AdminPagesList = lazy(() => import('./pages/admin/AdminPagesList'));
const AdminMidia = lazy(() => import('./pages/admin/AdminMidia'));
const AdminPortal = lazy(() => import('./pages/admin/AdminPortal'));
const AdminEstrutura = lazy(() => import('./pages/admin/AdminEstrutura'));
const AdminPageForm = lazy(() => import('./pages/admin/AdminPageForm'));
const AdminMetricas = lazy(() => import('./pages/admin/AdminMetricas'));
const AdminImportacao = lazy(() => import('./pages/admin/AdminImportacao'));
const AdminProficiencia = lazy(() => import('./pages/admin/AdminProficiencia'));
const AdminCamara = lazy(() => import('./pages/admin/AdminCamara'));
const AdminCamaraForm = lazy(() => import('./pages/admin/AdminCamaraForm'));
const AdminCamaraProcesso = lazy(() => import('./pages/admin/AdminCamaraProcesso'));
const AdminCamaraReunioes = lazy(() => import('./pages/admin/AdminCamaraReunioes'));
const AdminCamaraReuniao = lazy(() => import('./pages/admin/AdminCamaraReuniao'));
const AdminCamaraUnidades = lazy(() => import('./pages/admin/AdminCamaraUnidades'));
const AdminContatos = lazy(() => import('./pages/admin/AdminContatos'));
const AdminAtos = lazy(() => import('./pages/admin/AdminAtos'));
const AdminAtoForm = lazy(() => import('./pages/admin/AdminAtoForm'));
const AdminAto = lazy(() => import('./pages/admin/AdminAto'));
const AdminAtoSeries = lazy(() => import('./pages/admin/AdminAtoSeries'));
const AdminAtoDiplomasLote = lazy(() => import('./pages/admin/AdminAtoDiplomasLote'));
const AdminPosDoutorado = lazy(() => import('./pages/admin/AdminPosDoutorado'));
const AdminPosDoutoradoForm = lazy(() => import('./pages/admin/AdminPosDoutoradoForm'));
const AdminPosDoutoradoFicha = lazy(() => import('./pages/admin/AdminPosDoutoradoFicha'));
const AdminNotificacoes = lazy(() => import('./pages/admin/AdminNotificacoes'));
const AdminMeusProcessos = lazy(() => import('./pages/admin/AdminMeusProcessos'));
const ProficienciaInscricao = lazy(() => import('./pages/ProficienciaInscricao'));
const ProficienciaInscricaoSucesso = lazy(() => import('./pages/ProficienciaInscricaoSucesso'));
// Páginas institucionais (Fase H.3): conteúdo vem do painel ("Páginas"),
// o endereço continua o mesmo.
const PaginaInstitucional = lazy(() => import('./pages/PaginaInstitucional'));
const Busca = lazy(() => import('./pages/Busca'));

function NotFoundPublic() {
  return (
    <div className="container mx-auto px-4 py-24 text-center min-h-[50vh] flex flex-col items-center justify-center">
      <i className="fa-solid fa-compass text-gray-300 text-6xl mb-5"></i>
      <h1 className="font-heading font-bold text-3xl text-ufrpe-blue mb-3">Página não encontrada</h1>
      <p className="text-gray-600 mb-8">O endereço acessado não existe no portal da PRPG.</p>
      <Link to="/" className="px-6 py-3 bg-ufrpe-blue hover:bg-ufrpe-yellow hover:text-ufrpe-blue text-white font-bold rounded-xl transition-all">
        <i className="fa-solid fa-arrow-left mr-2"></i> Voltar para o Início
      </Link>
    </div>
  );
}

// Fallback enquanto o chunk da rota carrega.
function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-gray-400">
      <i className="fa-solid fa-circle-notch fa-spin text-2xl" aria-hidden="true"></i>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

function ProgramaLinhasRouter() {
  const isGestor = isProgramaGestor();
  return isGestor ? <AdminProgramaGestorLinhas /> : <AdminProgramaLinhas />;
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Rotas Administrativas */}
        <Route path="/admin/login" element={<AdminLogin />} />
        {/* Troca obrigatória de senha provisória (fora do AdminLayout para não
            entrar em laço com o guard de senha do RequireAuth). */}
        <Route path="/admin/trocar-senha" element={<RequireAuth skipPasswordCheck />}>
          <Route index element={<AdminTrocarSenha />} />
        </Route>
        <Route path="/admin" element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminNoticias />} />
            <Route path="noticias" element={<AdminNoticias />} />
            <Route path="noticias/nova" element={<AdminNoticiaForm />} />
            <Route path="noticias/editar/:id" element={<AdminNoticiaForm />} />
            <Route path="editais" element={<AdminEditais />} />
            <Route path="editais/novo" element={<AdminEditalForm />} />
            <Route path="editais/editar/:id" element={<AdminEditalForm />} />
            <Route path="resolucoes" element={<AdminResolucoes />} />
            <Route path="resolucoes/nova" element={<AdminResolucaoForm />} />
            <Route path="resolucoes/editar/:id" element={<AdminResolucaoForm />} />
            <Route path="formularios" element={<AdminFormularios />} />
            <Route path="formularios/novo" element={<AdminFormularioForm />} />
            <Route path="formularios/editar/:id" element={<AdminFormularioForm />} />
            <Route path="programas" element={<AdminProgramas />} />
            <Route path="programas/novo" element={<AdminProgramaForm />} />
            <Route path="programas/editar/:id" element={<AdminProgramaForm />} />
            <Route path="programas/:id/discentes" element={<AdminProgramaDiscentes />} />
            <Route path="programas/:id/docentes" element={<AdminProgramaDocentes />} />
            <Route path="programas/:id/comissoes" element={<AdminProgramaComissoes />} />
            <Route path="programas/:id/metricas" element={<AdminProgramaMetricas />} />
            <Route path="programas/:id/site" element={<AdminProgramaSite />} />
            <Route path="programas/:id/linhas" element={<RequireAuth allowedRoles={['Administrator', 'Gestor', 'GestorPrograma']} />}>
              <Route index element={<ProgramaLinhasRouter />} />
            </Route>
            <Route path="calendarios" element={<AdminCalendarios />} />
            <Route path="calendarios/novo" element={<AdminCalendarioForm />} />
            <Route path="calendarios/editar/:id" element={<AdminCalendarioForm />} />
            <Route path="teses-dissertacoes" element={<AdminTesesList />} />
            <Route path="teses-dissertacoes/nova" element={<AdminTeseForm />} />
            <Route path="teses-dissertacoes/editar/:id" element={<AdminTeseForm />} />
            <Route path="faq" element={<AdminFaqList />} />
            <Route path="faq/novo" element={<AdminFaqForm />} />
            <Route path="faq/editar/:id" element={<AdminFaqForm />} />
            <Route path="disciplinas" element={<AdminDisciplinasList />} />
            <Route path="disciplinas/nova" element={<AdminDisciplinaForm />} />
            <Route path="disciplinas/editar/:id" element={<AdminDisciplinaForm />} />
            <Route path="bolsas" element={<AdminBolsasList />} />
            <Route path="bolsas/nova" element={<AdminBolsaForm />} />
            <Route path="bolsas/editar/:id" element={<AdminBolsaForm />} />
            <Route path="paginas" element={<AdminPagesList />} />
            <Route path="paginas/nova" element={<AdminPageForm />} />
            <Route path="paginas/editar/:id" element={<AdminPageForm />} />
            {/* Biblioteca de mídia (Fase F.5): leitura para quem edita conteúdo;
                trocar/excluir só Admin/Gestor (checado também no backend). */}
            <Route path="midia" element={<RequireAuth allowedRoles={['Administrator', 'Gestor', 'GestorPrograma']} />}>
              <Route index element={<AdminMidia />} />
            </Route>
            <Route path="portal" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminPortal />} />
            </Route>
            <Route path="estrutura" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminEstrutura />} />
            </Route>
            <Route path="taxonomias" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminTaxonomias />} />
            </Route>
            <Route path="portarias" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminPortarias />} />
              <Route path="nova" element={<AdminPortariaForm />} />
              <Route path="editar/:id" element={<AdminPortariaForm />} />
            </Route>
            <Route path="grupos-pesquisa" element={<RequireAuth allowedRoles={['Administrator', 'Gestor', 'GestorPrograma']} />}>
              <Route index element={<AdminGruposPesquisa />} />
              <Route path="novo" element={<AdminGrupoPesquisaForm />} />
              <Route path="editar/:id" element={<AdminGrupoPesquisaForm />} />
            </Route>
            <Route path="users" element={<RequireAuth allowedRoles={['Administrator', 'Gestor', 'GestorPrograma']} />}>
              <Route index element={<AdminUsersList />} />
              <Route path="novo" element={<AdminUserForm />} />
              <Route path="editar/:id" element={<AdminUserForm />} />
            </Route>
            <Route path="linhas-pesquisa" element={<RequireAuth allowedRoles={['Administrator', 'Gestor', 'GestorPrograma']} />}>
              <Route index element={<AdminLinhasPesquisa />} />
            </Route>
            <Route path="metricas" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminMetricas />} />
            </Route>
            <Route path="importacao" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminImportacao />} />
            </Route>
            {/* Gestão/avaliação: Admin/Gestor. */}
            <Route path="proficiencia" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminProficiencia />} />
            </Route>
            {/* Câmara de Pós-Graduação: leitura também para o Gestor de Programa
                (escopado ao seu programa, ver requisitos-camara.md §8); a escrita
                é bloqueada no backend (rotas /api/camara exigem Admin/Gestor). */}
            <Route path="camara" element={<RequireAuth allowedRoles={['Administrator', 'Gestor', 'GestorPrograma']} />}>
              <Route index element={<AdminCamara />} />
              <Route path=":id" element={<AdminCamaraProcesso />} />
            </Route>
            <Route path="camara" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route path="novo" element={<AdminCamaraForm />} />
              <Route path="editar/:id" element={<AdminCamaraForm />} />
              <Route path="unidades" element={<AdminCamaraUnidades />} />
              <Route path="reunioes" element={<AdminCamaraReunioes />} />
              <Route path="reunioes/:id" element={<AdminCamaraReuniao />} />
            </Route>
            {/* Agenda de contatos (Fase G): Admin/Gestor por enquanto — o
                escopo por GestorPrograma (D-G7) ainda não foi respondido. */}
            <Route path="contatos" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminContatos />} />
            </Route>
            {/* Expedientes (Fase E): leitura também para GestorPrograma nos
                atos do seu programa (requisitos-expedientes.md §8); escrita
                (reservar/emitir/séries) fica só com Admin/Gestor no backend. */}
            <Route path="atos" element={<RequireAuth allowedRoles={['Administrator', 'Gestor', 'GestorPrograma']} />}>
              <Route index element={<AdminAtos />} />
              <Route path="novo" element={<AdminAtoForm />} />
              <Route path="series" element={<AdminAtoSeries />} />
              <Route path="diplomas" element={<AdminAtoDiplomasLote />} />
              <Route path=":id" element={<AdminAto />} />
              <Route path=":id/editar" element={<AdminAtoForm />} />
            </Route>
            {/* Pós-Doutorado / PNPD (Fase C): leitura também para GestorPrograma,
                escopada ao seu programa (requisitos-pnpd.md §9); escrita fica
                só com Admin/Gestor no backend. */}
            <Route path="pos-doutorado" element={<RequireAuth allowedRoles={['Administrator', 'Gestor', 'GestorPrograma']} />}>
              <Route index element={<AdminPosDoutorado />} />
              <Route path="novo" element={<AdminPosDoutoradoForm />} />
              <Route path=":id" element={<AdminPosDoutoradoFicha />} />
              <Route path=":id/editar" element={<AdminPosDoutoradoForm />} />
            </Route>
            {/* Notificações (Fase I): infraestrutura de envio, Admin-only. */}
            <Route path="notificacoes" element={<RequireAuth allowedRoles={['Administrator']} />}>
              <Route index element={<AdminNotificacoes />} />
            </Route>
            {/* Meus Processos (Fase L.4): qualquer usuário autenticado — a
                relatoria é resolvida pelo próprio login (relator_id), sem
                exigir papel específico da Câmara. */}
            <Route path="meus-processos" element={<RequireAuth />}>
              <Route index element={<AdminMeusProcessos />} />
            </Route>
          </Route>
        </Route>

        {/* Microsite dedicado do programa — header/menu/footer próprios, sem a casca da PRPG.
            Segmento dinâmico: o React Router prioriza as rotas estáticas públicas abaixo,
            então /sobre, /editais, /noticias etc. continuam sendo páginas da PRPG. */}
        <Route path=":programaSlug/*" element={<ProgramaSite />} />

        {/* Site público da PRPG (Navbar + Footer) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/sobre" element={<PaginaInstitucional slug="sobre" />} />
          <Route path="/missao-visao-valores" element={<PaginaInstitucional slug="missao-visao-valores" />} />
          <Route path="/historico" element={<PaginaInstitucional slug="historico" />} />
          <Route path="/estrutura-organizacional" element={<EstruturaOrganizacional />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/financeiro" element={<PaginaInstitucional slug="financeiro" />} />
          <Route path="/proext-pg" element={<PaginaInstitucional slug="proext-pg" />} />
          <Route path="/programas" element={<ProgramasStrictoSensu />} />
          <Route path="/calendario-academico" element={<CalendarioAcademico />} />
          <Route path="/editais" element={<Editais />} />
          <Route path="/editais/:id" element={<Edital />} />
          <Route path="/resolucoes" element={<Resolucoes />} />
          <Route path="/formularios" element={<Formularios />} />
          <Route path="/proficiencia/inscricao" element={<ProficienciaInscricao />} />
          <Route path="/proficiencia/inscricao/sucesso" element={<ProficienciaInscricaoSucesso />} />
          <Route path="/declaracoes/proficiencia/:codigo" element={<DeclaracaoProficiencia />} />
          <Route path="/verificar/:codigo" element={<VerificarDeclaracao />} />
          <Route path="/relatorios-autoavaliacao" element={<PaginaInstitucional slug="relatorios-autoavaliacao" />} />
          <Route path="/especializacao" element={<PaginaInstitucional slug="especializacao" />} />
          <Route path="/residencia-profissional" element={<PaginaInstitucional slug="residencia-profissional" />} />
          <Route path="/sobre-internacionalizacao" element={<PaginaInstitucional slug="sobre-internacionalizacao" />} />
          <Route path="/alunos-estrangeiros" element={<PaginaInstitucional slug="alunos-estrangeiros" />} />
          <Route path="/capes-print" element={<PaginaInstitucional slug="capes-print" />} />
          <Route path="/mobilidade-estudantil" element={<PaginaInstitucional slug="mobilidade-estudantil" />} />
          <Route path="/reconhecimento" element={<PaginaInstitucional slug="reconhecimento" />} />
          <Route path="/privacidade" element={<PaginaInstitucional slug="privacidade" />} />
          <Route path="/busca" element={<Busca />} />
          <Route path="/noticias" element={<Noticias />} />
          <Route path="/noticia/:id" element={<Noticia />} />
          <Route path="/p/:slug" element={<PaginaInstitucional />} />
          <Route path="*" element={<NotFoundPublic />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
