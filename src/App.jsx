import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Sobre from './pages/Sobre';
import MissaoVisaoValores from './pages/MissaoVisaoValores';
import Historico from './pages/Historico';
import EstruturaOrganizacional from './pages/EstruturaOrganizacional';
import Equipe from './pages/Equipe';
import Financeiro from './pages/Financeiro';
import ProextPg from './pages/ProextPg';
import ProgramasStrictoSensu from './pages/ProgramasStrictoSensu';
import CalendarioAcademico from './pages/CalendarioAcademico';
import Editais from './pages/Editais';
import Resolucoes from './pages/Resolucoes';
import Formularios from './pages/Formularios';
import RelatoriosAutoavaliacao from './pages/RelatoriosAutoavaliacao';
import Especializacao from './pages/Especializacao';
import ResidenciaProfissional from './pages/ResidenciaProfissional';
import SobreInternacionalizacao from './pages/SobreInternacionalizacao';
import AlunosEstrangeiros from './pages/AlunosEstrangeiros';
import CapesPrint from './pages/CapesPrint';
import MobilidadeEstudantil from './pages/MobilidadeEstudantil';
import Reconhecimento from './pages/Reconhecimento';
import Noticias from './pages/Noticias';
import Noticia from './pages/Noticia';
import Edital from './pages/Edital';

// Admin Components
import AdminLayout from './components/AdminLayout';
import RequireAuth from './components/RequireAuth';
import AdminLogin from './pages/admin/AdminLogin';
import AdminNoticias from './pages/admin/AdminNoticias';
import AdminNoticiaForm from './pages/admin/AdminNoticiaForm';
import AdminEditais from './pages/admin/AdminEditais';
import AdminEditalForm from './pages/admin/AdminEditalForm';
import AdminResolucoes from './pages/admin/AdminResolucoes';
import AdminResolucaoForm from './pages/admin/AdminResolucaoForm';
import AdminFormularios from './pages/admin/AdminFormularios';
import AdminFormularioForm from './pages/admin/AdminFormularioForm';
import AdminProgramas from './pages/admin/AdminProgramas';
import AdminProgramaForm from './pages/admin/AdminProgramaForm';
import AdminCalendarios from './pages/admin/AdminCalendarios';
import AdminCalendarioForm from './pages/admin/AdminCalendarioForm';
import AdminTaxonomias from './pages/admin/AdminTaxonomias';
import AdminUsersList from './pages/admin/AdminUsersList';
import AdminUserForm from './pages/admin/AdminUserForm';
import AdminPortarias from './pages/admin/AdminPortarias';
import AdminPortariaForm from './pages/admin/AdminPortariaForm';
import AdminGruposPesquisa from './pages/admin/AdminGruposPesquisa';
import AdminGrupoPesquisaForm from './pages/admin/AdminGrupoPesquisaForm';
import AdminTesesList from './pages/admin/AdminTesesList';
import AdminTeseForm from './pages/admin/AdminTeseForm';
import AdminFaqList from './pages/admin/AdminFaqList';
import AdminFaqForm from './pages/admin/AdminFaqForm';
import AdminDisciplinasList from './pages/admin/AdminDisciplinasList';
import AdminDisciplinaForm from './pages/admin/AdminDisciplinaForm';
import AdminBolsasList from './pages/admin/AdminBolsasList';
import AdminBolsaForm from './pages/admin/AdminBolsaForm';
import AdminPagesList from './pages/admin/AdminPagesList';
import AdminPageForm from './pages/admin/AdminPageForm';
import PageView from './pages/PageView';

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Routes>
        {/* Rotas Administrativas */}
        <Route path="/admin/login" element={<AdminLogin />} />
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
            <Route path="taxonomias" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminTaxonomias />} />
            </Route>
            <Route path="portarias" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminPortarias />} />
              <Route path="nova" element={<AdminPortariaForm />} />
              <Route path="editar/:id" element={<AdminPortariaForm />} />
            </Route>
            <Route path="grupos-pesquisa" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminGruposPesquisa />} />
              <Route path="novo" element={<AdminGrupoPesquisaForm />} />
              <Route path="editar/:id" element={<AdminGrupoPesquisaForm />} />
            </Route>
            <Route path="users" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
              <Route index element={<AdminUsersList />} />
              <Route path="novo" element={<AdminUserForm />} />
              <Route path="editar/:id" element={<AdminUserForm />} />
            </Route>
          </Route>
        </Route>

        {/* Rotas Públicas */}
        <Route
          path="*"
          element={
            <div className="flex flex-col min-h-screen w-full">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/sobre" element={<Sobre />} />
                  <Route path="/missao-visao-valores" element={<MissaoVisaoValores />} />
                  <Route path="/historico" element={<Historico />} />
                  <Route path="/estrutura-organizacional" element={<EstruturaOrganizacional />} />
                  <Route path="/equipe" element={<Equipe />} />
                  <Route path="/financeiro" element={<Financeiro />} />
                  <Route path="/proext-pg" element={<ProextPg />} />
                  <Route path="/programas" element={<ProgramasStrictoSensu />} />
                  <Route path="/calendario-academico" element={<CalendarioAcademico />} />
                  <Route path="/editais" element={<Editais />} />
                  <Route path="/editais/:id" element={<Edital />} />
                  <Route path="/resolucoes" element={<Resolucoes />} />
                  <Route path="/formularios" element={<Formularios />} />
                  <Route path="/relatorios-autoavaliacao" element={<RelatoriosAutoavaliacao />} />
                  <Route path="/especializacao" element={<Especializacao />} />
                  <Route path="/residencia-profissional" element={<ResidenciaProfissional />} />
                  <Route path="/sobre-internacionalizacao" element={<SobreInternacionalizacao />} />
                  <Route path="/alunos-estrangeiros" element={<AlunosEstrangeiros />} />
                  <Route path="/capes-print" element={<CapesPrint />} />
                  <Route path="/mobilidade-estudantil" element={<MobilidadeEstudantil />} />
                  <Route path="/reconhecimento" element={<Reconhecimento />} />
                  <Route path="/noticias" element={<Noticias />} />
                  <Route path="/noticia/:id" element={<Noticia />} />
                  <Route path="/p/:slug" element={<PageView />} />
                </Routes>
              </main>
              <Footer />
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
