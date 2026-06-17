import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { getNews, getNewsById, createNews, updateNews, deleteNews } from '../controllers/newsController.js';
import { getEditais, getEditalById, createEdital, updateEdital, deleteEdital } from '../controllers/editaisController.js';
import { getResolucoes, getResolucaoById, createResolucao, updateResolucao, deleteResolucao } from '../controllers/resolucoesController.js';
import { getFormularios, getFormularioById, createFormulario, updateFormulario, deleteFormulario } from '../controllers/formulariosController.js';
import { getProgramas, getProgramaById, getProgramaBySlug, createPrograma, updatePrograma, deletePrograma, getProgramaDocentesPublic, getDocentesAdmin, addDocente, removeDocente, buscaPrograma, getComissoesAdmin, addComissaoMembro, removeComissaoMembro, getProgramaMetricasPublic, getProgramaDiscentesPublic, getDiscentesAdmin, addDiscente, removeDiscente } from '../controllers/programasController.js';
import { getCalendarios, getCalendarioById, createCalendario, updateCalendario, deleteCalendario } from '../controllers/calendariosController.js';
import { getPortarias, getPortariaById, createPortaria, updatePortaria, deletePortaria } from '../controllers/portariasController.js';
import { getGruposPesquisa, getGrupoPesquisaById, createGrupoPesquisa, updateGrupoPesquisa, deleteGrupoPesquisa } from '../controllers/gruposPesquisaController.js';
import { getTeses, getTeseById, createTese, updateTese, deleteTese } from '../controllers/tesesController.js';
import { getFaqs, getFaqById, createFaq, updateFaq, deleteFaq } from '../controllers/faqController.js';
import { getDisciplinas, getDisciplinaById, createDisciplina, updateDisciplina, deleteDisciplina } from '../controllers/disciplinasController.js';
import { getBolsas, getBolsaById, createBolsa, updateBolsa, deleteBolsa } from '../controllers/bolsasController.js';
import { getPages, getPageById, getPageBySlug, createPage, updatePage, deletePage } from '../controllers/pagesController.js';
import { getMetricas, getMetricaById, createMetrica, updateMetrica, deleteMetrica } from '../controllers/metricasController.js';
import {
  getPeriodoAberto, createInscricao, getMinhasInscricoes, getInscricoes,
  getInscricaoById, lancarNota, deleteInscricao, gerarDeclaracao,
} from '../controllers/proficienciaController.js';


import { login } from '../controllers/authController.js';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/usersController.js';
import { getTaxonomias, updateTaxonomias } from '../controllers/taxonomiasController.js';

import {
  protect, requireRole, scopeProgramaWrite, requireProgramaOwnership,
  requireSelfPrograma, blockProgramaScoped,
} from '../middleware/authMiddleware.js';
import {
  newsRepo, editaisRepo, resolucoesRepo, formulariosRepo, disciplinasRepo,
  tesesRepo, faqRepo, gruposRepo, pagesRepo, usersRepo,
} from '../db/repositories.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF ou imagens são permitidos!'));
    }
  },
  limits: { fileSize: 15 * 1024 * 1024 }
});

const router = express.Router();

// Rotas públicas
router.get('/news', getNews);
router.get('/news/:id', getNewsById);
router.get('/editais', getEditais);
router.get('/editais/:id', getEditalById);
router.get('/resolucoes', getResolucoes);
router.get('/resolucoes/:id', getResolucaoById);
router.get('/formularios', getFormularios);
router.get('/formularios/:id', getFormularioById);
router.get('/programas', getProgramas);
router.get('/programas/slug/:slug', getProgramaBySlug);
router.get('/programas/slug/:slug/pessoas', getProgramaDocentesPublic);
router.get('/programas/slug/:slug/busca', buscaPrograma);
router.get('/programas/slug/:slug/metricas', getProgramaMetricasPublic);
router.get('/programas/slug/:slug/discentes', getProgramaDiscentesPublic);
// Rotas específicas ANTES da rota genérica /:id
// Gestor de programa só gerencia vínculos do SEU programa (requireSelfPrograma).
router.get('/programas/:id/docentes', protect, requireSelfPrograma, getDocentesAdmin);
router.post('/programas/:id/docentes', protect, requireSelfPrograma, addDocente);
router.delete('/programas/:id/docentes/:vinculoId', protect, requireSelfPrograma, removeDocente);
router.get('/programas/:id/comissoes', protect, requireSelfPrograma, getComissoesAdmin);
router.post('/programas/:id/comissoes', protect, requireSelfPrograma, addComissaoMembro);
router.delete('/programas/:id/comissoes/:vinculoId', protect, requireSelfPrograma, removeComissaoMembro);
router.get('/programas/:id/discentes', protect, requireSelfPrograma, getDiscentesAdmin);
router.post('/programas/:id/discentes', protect, requireSelfPrograma, addDiscente);
router.delete('/programas/:id/discentes/:vinculoId', protect, requireSelfPrograma, removeDiscente);
// Rota genérica DEPOIS das específicas
router.get('/programas/:id', getProgramaById);
router.get('/calendarios', getCalendarios);
router.get('/calendarios/:id', getCalendarioById);
router.get('/taxonomias', getTaxonomias);
router.get('/teses-dissertacoes', getTeses);
router.get('/teses-dissertacoes/:id', getTeseById);
router.get('/faq', getFaqs);
router.get('/faq/:id', getFaqById);
router.get('/disciplinas', getDisciplinas);
router.get('/disciplinas/:id', getDisciplinaById);
router.get('/bolsas', getBolsas);
router.get('/bolsas/:id', getBolsaById);
router.get('/pages', getPages);
router.get('/pages/:id', getPageById);
router.get('/pages/slug/:slug', getPageBySlug);

// Autenticação
router.post('/login', login);

// Uploads (qualquer usuário logado)
router.post('/upload', protect, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, originalName: req.file.originalname });
  });
});

// Rotas exclusivas para Administrator e Gestor
router.post('/taxonomias', protect, requireRole(['Administrator', 'Gestor']), updateTaxonomias);
// Leitura da lista de usuários: também o Gestor de Programa, que precisa dela
// para escolher docentes/discentes/coordenadores do seu programa. Criar/excluir
// usuários continua restrito a Admin/Gestor.
// O Gestor de Programa também cadastra alunos/professores (escopados ao seu
// programa via createUser) e pode excluir apenas os que o seu programa possui
// (requireProgramaOwnership confere users.programa_id).
router.get('/users', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), getUsers);
router.post('/users', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), createUser);
router.delete('/users/:id', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), requireProgramaOwnership((id) => usersRepo.getById(id)), deleteUser);

// Portarias: leitura liberada também ao Gestor de Programa (para vincular à
// coordenação do seu programa). Gestão (POST/PUT/DELETE) segue Admin/Gestor.
router.get('/portarias', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), getPortarias);
router.get('/portarias/:id', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), getPortariaById);
router.post('/portarias', protect, requireRole(['Administrator', 'Gestor']), createPortaria);
router.put('/portarias/:id', protect, requireRole(['Administrator', 'Gestor']), updatePortaria);
router.delete('/portarias/:id', protect, requireRole(['Administrator', 'Gestor']), deletePortaria);

// Grupos de Pesquisa (Admin/Gestor da PRPG + Gestor de Programa escopado ao seu programa)
router.get('/grupos-pesquisa', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), getGruposPesquisa);
router.get('/grupos-pesquisa/:id', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), getGrupoPesquisaById);
router.post('/grupos-pesquisa', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), scopeProgramaWrite, createGrupoPesquisa);
router.put('/grupos-pesquisa/:id', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), requireProgramaOwnership((id) => gruposRepo.getById(id)), scopeProgramaWrite, updateGrupoPesquisa);
router.delete('/grupos-pesquisa/:id', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), requireProgramaOwnership((id) => gruposRepo.getById(id)), deleteGrupoPesquisa);

// Métricas anuais / dashboard (Apenas Admin/Gestor)
router.get('/metricas', protect, requireRole(['Administrator', 'Gestor']), getMetricas);
router.get('/metricas/:id', protect, requireRole(['Administrator', 'Gestor']), getMetricaById);
router.post('/metricas', protect, requireRole(['Administrator', 'Gestor']), createMetrica);
router.put('/metricas/:id', protect, requireRole(['Administrator', 'Gestor']), updateMetrica);
router.delete('/metricas/:id', protect, requireRole(['Administrator', 'Gestor']), deleteMetrica);

// Rota de usuário que também pode ser acessada pelo próprio dono (update/get)
// No momento simplificaremos: Admin/Gestor tem acesso livre. Dono da conta poderia atualizar a própria, mas vamos deixar liberado pro Gestor aqui.
router.get('/users/:id', protect, getUserById); 
router.put('/users/:id', protect, updateUser);

// Conteúdo vinculável a programa: o Gestor de Programa pode criar/editar/excluir,
// mas tudo é forçado ao SEU programa (scopeProgramaWrite) e só pode tocar itens
// do próprio programa (requireProgramaOwnership). Admin/Gestor têm acesso global.
router.post('/news', protect, scopeProgramaWrite, createNews);
router.put('/news/:id', protect, requireProgramaOwnership((id) => newsRepo.getById(id)), scopeProgramaWrite, updateNews);
router.delete('/news/:id', protect, requireProgramaOwnership((id) => newsRepo.getById(id)), deleteNews);
router.post('/editais', protect, scopeProgramaWrite, createEdital);
router.put('/editais/:id', protect, requireProgramaOwnership((id) => editaisRepo.getById(id)), scopeProgramaWrite, updateEdital);
router.delete('/editais/:id', protect, requireProgramaOwnership((id) => editaisRepo.getById(id)), deleteEdital);
router.post('/resolucoes', protect, scopeProgramaWrite, createResolucao);
router.put('/resolucoes/:id', protect, requireProgramaOwnership((id) => resolucoesRepo.getById(id)), scopeProgramaWrite, updateResolucao);
router.delete('/resolucoes/:id', protect, requireProgramaOwnership((id) => resolucoesRepo.getById(id)), deleteResolucao);
router.post('/formularios', protect, scopeProgramaWrite, createFormulario);
router.put('/formularios/:id', protect, requireProgramaOwnership((id) => formulariosRepo.getById(id)), scopeProgramaWrite, updateFormulario);
router.delete('/formularios/:id', protect, requireProgramaOwnership((id) => formulariosRepo.getById(id)), deleteFormulario);
// Programas: só Admin/Gestor criam ou excluem. Gestor de Programa edita o SEU.
router.post('/programas', protect, blockProgramaScoped, createPrograma);
router.put('/programas/:id', protect, requireSelfPrograma, updatePrograma);
router.delete('/programas/:id', protect, blockProgramaScoped, deletePrograma);
// Calendários e Bolsas são globais da PRPG (sem programa_id): bloqueados ao gestor.
router.post('/calendarios', protect, blockProgramaScoped, createCalendario);
router.put('/calendarios/:id', protect, blockProgramaScoped, updateCalendario);
router.delete('/calendarios/:id', protect, blockProgramaScoped, deleteCalendario);
router.post('/teses-dissertacoes', protect, scopeProgramaWrite, createTese);
router.put('/teses-dissertacoes/:id', protect, requireProgramaOwnership((id) => tesesRepo.getById(id)), scopeProgramaWrite, updateTese);
router.delete('/teses-dissertacoes/:id', protect, requireProgramaOwnership((id) => tesesRepo.getById(id)), deleteTese);
router.post('/faq', protect, scopeProgramaWrite, createFaq);
router.put('/faq/:id', protect, requireProgramaOwnership((id) => faqRepo.getById(id)), scopeProgramaWrite, updateFaq);
router.delete('/faq/:id', protect, requireProgramaOwnership((id) => faqRepo.getById(id)), deleteFaq);
router.post('/disciplinas', protect, scopeProgramaWrite, createDisciplina);
router.put('/disciplinas/:id', protect, requireProgramaOwnership((id) => disciplinasRepo.getById(id)), scopeProgramaWrite, updateDisciplina);
router.delete('/disciplinas/:id', protect, requireProgramaOwnership((id) => disciplinasRepo.getById(id)), deleteDisciplina);
router.post('/bolsas', protect, blockProgramaScoped, createBolsa);
router.put('/bolsas/:id', protect, blockProgramaScoped, updateBolsa);
router.delete('/bolsas/:id', protect, blockProgramaScoped, deleteBolsa);
router.post('/pages', protect, scopeProgramaWrite, createPage);
router.put('/pages/:id', protect, requireProgramaOwnership((id) => pagesRepo.getById(id)), scopeProgramaWrite, updatePage);
router.delete('/pages/:id', protect, requireProgramaOwnership((id) => pagesRepo.getById(id)), deletePage);

// ===================== Proficiência em Línguas =====================
// O período de inscrição é controlado por um edital com proficiencia=TRUE.
router.get('/proficiencia/periodo-aberto', protect, getPeriodoAberto);
router.post('/proficiencia/inscricoes', protect, createInscricao);
router.get('/proficiencia/inscricoes/minhas', protect, getMinhasInscricoes);
router.get('/proficiencia/inscricoes', protect, requireRole(['Administrator', 'Gestor']), getInscricoes);
router.get('/proficiencia/inscricoes/:id', protect, requireRole(['Administrator', 'Gestor']), getInscricaoById);
router.put('/proficiencia/inscricoes/:id/nota', protect, requireRole(['Administrator', 'Gestor']), lancarNota);
router.delete('/proficiencia/inscricoes/:id', protect, requireRole(['Administrator', 'Gestor']), deleteInscricao);
router.get('/proficiencia/inscricoes/:id/declaracao', protect, requireRole(['Administrator', 'Gestor']), gerarDeclaracao);

export default router;
