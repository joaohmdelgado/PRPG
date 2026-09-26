import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';

// Layout público e guarda ficam eager (envolvem quase todas as rotas e são pequenos).
import PublicLayout from './components/PublicLayout';
import RequireAuth from './components/RequireAuth';
import { Carregando } from './components/ui/Estados';
import Icone from './components/Icone';

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

// Minha conta (aluno e professor)
const MinhaContaLayout = lazy(() => import('./pages/conta/MinhaContaLayout'));
const ContaDados = lazy(() => import('./pages/conta/ContaDados'));
const ContaInscricoes = lazy(() => import('./pages/conta/ContaInscricoes'));
const ContaDeclaracoes = lazy(() => import('./pages/conta/ContaDeclaracoes'));
const ContaRelatorias = lazy(() => import('./pages/conta/ContaRelatorias'));

// O painel inteiro (rotas, menu, busca, telas) só é baixado por quem entra nele.
const RotasPainel = lazy(() => import('./RotasPainel'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const ProficienciaInscricao = lazy(() => import('./pages/ProficienciaInscricao'));
const ProficienciaInscricaoSucesso = lazy(() => import('./pages/ProficienciaInscricaoSucesso'));
// Páginas institucionais (Fase H.3): conteúdo vem do painel ("Páginas"),
// o endereço continua o mesmo.
const PaginaInstitucional = lazy(() => import('./pages/PaginaInstitucional'));
const Busca = lazy(() => import('./pages/Busca'));
const RepositorioTeses = lazy(() => import('./pages/RepositorioTeses'));
const ProgramaPublico = lazy(() => import('./pages/ProgramaPublico'));

function NotFoundPublic() {
  return (
    <div className="container mx-auto px-4 py-24 text-center min-h-[50vh] flex flex-col items-center justify-center">
      <Icone nome="fa-solid fa-compass" className="text-gray-300 text-6xl mb-5" />
      <h1 className="font-heading font-bold text-3xl text-ufrpe-blue mb-3">Página não encontrada</h1>
      <p className="text-gray-600 mb-8">O endereço acessado não existe no portal da PRPG.</p>
      <Link to="/" className="px-6 py-3 bg-ufrpe-blue hover:bg-ufrpe-yellow hover:text-ufrpe-blue text-white font-bold rounded-xl transition-all">
        <Icone nome="fa-solid fa-arrow-left" className="mr-2" /> Voltar para o Início
      </Link>
    </div>
  );
}

// Fallback enquanto o chunk da rota carrega.
function RouteFallback() {
  return (
    <Carregando className="min-h-[40vh]" />
  );
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Rotas Administrativas */}
        <Route path="/entrar" element={<AdminLogin />} />
        {/* Minha conta (Fase U.1): aluno e professor — separada do painel. */}
        <Route path="/minha-conta" element={<RequireAuth />}>
          <Route element={<MinhaContaLayout />}>
            <Route index element={<ContaDados />} />
            <Route path="inscricoes" element={<ContaInscricoes />} />
            <Route path="declaracoes" element={<ContaDeclaracoes />} />
            <Route path="relatorias" element={<ContaRelatorias />} />
          </Route>
        </Route>
        {/* O painel é da equipe (Administrator, Gestor, GestorPrograma); as rotas ficam em RotasPainel. */}
        <Route path="/admin/*" element={<RotasPainel />} />

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
          <Route path="/programas/:slug" element={<ProgramaPublico />} />
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
          <Route path="/teses" element={<RepositorioTeses />} />
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
