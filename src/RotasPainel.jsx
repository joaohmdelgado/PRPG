import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { isProgramaGestor, PAPEIS_PAINEL } from './auth';
import RequireAuth from './components/RequireAuth';

// Todas as rotas de /admin/* moram neste módulo, carregado só por quem entra
// no painel: a tabela de ~80 rotas e seus chunks não pesam no carregamento
// público (Fase P.1). O menu, a paleta de busca e os ícones do menu vêm do
// AdminLayout, também carregado só aqui.
const AdminLayout = lazy(() => import('./components/AdminLayout'));

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
const AdminRevisaoImportacao = lazy(() => import('./pages/admin/AdminRevisaoImportacao'));
const AdminPlanilhas = lazy(() => import('./pages/admin/AdminPlanilhas'));
const AdminPainel = lazy(() => import('./pages/admin/AdminPainel'));
const AdminQualidade = lazy(() => import('./pages/admin/AdminQualidade'));
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

function ProgramaLinhasRouter() {
  const isGestor = isProgramaGestor();
  return isGestor ? <AdminProgramaGestorLinhas /> : <AdminProgramaLinhas />;
}

export default function RotasPainel() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      {/* Troca obrigatória de senha provisória (fora do AdminLayout para não
          entrar em laço com o guard de senha do RequireAuth). */}
      <Route path="trocar-senha" element={<RequireAuth skipPasswordCheck />}>
        <Route index element={<AdminTrocarSenha />} />
      </Route>
      {/* O painel é da equipe; aluno e professor caem em /minha-conta. */}
      <Route element={<RequireAuth allowedRoles={PAPEIS_PAINEL} semAcesso="/minha-conta" />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminPainel />} />
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
          {/* Qualidade dos dados (Fase O.7): só a PRPG. */}
          <Route path="qualidade" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
            <Route index element={<AdminQualidade />} />
          </Route>
          {/* Planilhas (Fase O): importação fiel + revisão do que depende de decisão. */}
          <Route path="planilhas" element={<RequireAuth allowedRoles={['Administrator', 'Gestor']} />}>
            <Route index element={<AdminPlanilhas />} />
            <Route path="revisao" element={<AdminRevisaoImportacao />} />
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
          <Route path="meus-processos" element={<RequireAuth allowedRoles={PAPEIS_PAINEL} />}>
            <Route index element={<AdminMeusProcessos />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
