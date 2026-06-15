import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { getNews, getNewsById, createNews, updateNews, deleteNews } from '../controllers/newsController.js';
import { getEditais, getEditalById, createEdital, updateEdital, deleteEdital } from '../controllers/editaisController.js';
import { getResolucoes, getResolucaoById, createResolucao, updateResolucao, deleteResolucao } from '../controllers/resolucoesController.js';
import { getFormularios, getFormularioById, createFormulario, updateFormulario, deleteFormulario } from '../controllers/formulariosController.js';
import { getProgramas, getProgramaById, getProgramaBySlug, createPrograma, updatePrograma, deletePrograma, getProgramaDocentesPublic, getDocentesAdmin, addDocente, removeDocente, buscaPrograma } from '../controllers/programasController.js';
import { getCalendarios, getCalendarioById, createCalendario, updateCalendario, deleteCalendario } from '../controllers/calendariosController.js';
import { getPortarias, getPortariaById, createPortaria, updatePortaria, deletePortaria } from '../controllers/portariasController.js';
import { getGruposPesquisa, getGrupoPesquisaById, createGrupoPesquisa, updateGrupoPesquisa, deleteGrupoPesquisa } from '../controllers/gruposPesquisaController.js';
import { getTeses, getTeseById, createTese, updateTese, deleteTese } from '../controllers/tesesController.js';
import { getFaqs, getFaqById, createFaq, updateFaq, deleteFaq } from '../controllers/faqController.js';
import { getDisciplinas, getDisciplinaById, createDisciplina, updateDisciplina, deleteDisciplina } from '../controllers/disciplinasController.js';
import { getBolsas, getBolsaById, createBolsa, updateBolsa, deleteBolsa } from '../controllers/bolsasController.js';
import { getPages, getPageById, getPageBySlug, createPage, updatePage, deletePage } from '../controllers/pagesController.js';
import { getMetricas, getMetricaById, createMetrica, updateMetrica, deleteMetrica } from '../controllers/metricasController.js';


import { login } from '../controllers/authController.js';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/usersController.js';
import { getTaxonomias, updateTaxonomias } from '../controllers/taxonomiasController.js';

import { protect, requireRole } from '../middleware/authMiddleware.js';

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
router.get('/users', protect, requireRole(['Administrator', 'Gestor']), getUsers);
router.post('/users', protect, requireRole(['Administrator', 'Gestor']), createUser);
router.delete('/users/:id', protect, requireRole(['Administrator', 'Gestor']), deleteUser);

// Portarias (Apenas Admin/Gestor podem visualizar e gerenciar)
router.get('/portarias', protect, requireRole(['Administrator', 'Gestor']), getPortarias);
router.get('/portarias/:id', protect, requireRole(['Administrator', 'Gestor']), getPortariaById);
router.post('/portarias', protect, requireRole(['Administrator', 'Gestor']), createPortaria);
router.put('/portarias/:id', protect, requireRole(['Administrator', 'Gestor']), updatePortaria);
router.delete('/portarias/:id', protect, requireRole(['Administrator', 'Gestor']), deletePortaria);

// Grupos de Pesquisa (Apenas Admin/Gestor podem visualizar e gerenciar)
router.get('/grupos-pesquisa', protect, requireRole(['Administrator', 'Gestor']), getGruposPesquisa);
router.get('/grupos-pesquisa/:id', protect, requireRole(['Administrator', 'Gestor']), getGrupoPesquisaById);
router.post('/grupos-pesquisa', protect, requireRole(['Administrator', 'Gestor']), createGrupoPesquisa);
router.put('/grupos-pesquisa/:id', protect, requireRole(['Administrator', 'Gestor']), updateGrupoPesquisa);
router.delete('/grupos-pesquisa/:id', protect, requireRole(['Administrator', 'Gestor']), deleteGrupoPesquisa);

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

// As rotas de site (programas, news) mantemos genéricas com "protect" por enquanto, 
// pois Professores ou Secretários podem editar programas.
router.post('/news', protect, createNews);
router.put('/news/:id', protect, updateNews);
router.delete('/news/:id', protect, deleteNews);
router.post('/editais', protect, createEdital);
router.put('/editais/:id', protect, updateEdital);
router.delete('/editais/:id', protect, deleteEdital);
router.post('/resolucoes', protect, createResolucao);
router.put('/resolucoes/:id', protect, updateResolucao);
router.delete('/resolucoes/:id', protect, deleteResolucao);
router.post('/formularios', protect, createFormulario);
router.put('/formularios/:id', protect, updateFormulario);
router.delete('/formularios/:id', protect, deleteFormulario);
router.post('/programas', protect, createPrograma);
router.put('/programas/:id', protect, updatePrograma);
router.delete('/programas/:id', protect, deletePrograma);
router.get('/programas/:id/docentes', protect, getDocentesAdmin);
router.post('/programas/:id/docentes', protect, addDocente);
router.delete('/programas/:id/docentes/:vinculoId', protect, removeDocente);
router.post('/calendarios', protect, createCalendario);
router.put('/calendarios/:id', protect, updateCalendario);
router.delete('/calendarios/:id', protect, deleteCalendario);
router.post('/teses-dissertacoes', protect, createTese);
router.put('/teses-dissertacoes/:id', protect, updateTese);
router.delete('/teses-dissertacoes/:id', protect, deleteTese);
router.post('/faq', protect, createFaq);
router.put('/faq/:id', protect, updateFaq);
router.delete('/faq/:id', protect, deleteFaq);
router.post('/disciplinas', protect, createDisciplina);
router.put('/disciplinas/:id', protect, updateDisciplina);
router.delete('/disciplinas/:id', protect, deleteDisciplina);
router.post('/bolsas', protect, createBolsa);
router.put('/bolsas/:id', protect, updateBolsa);
router.delete('/bolsas/:id', protect, deleteBolsa);
router.post('/pages', protect, createPage);
router.put('/pages/:id', protect, updatePage);
router.delete('/pages/:id', protect, deletePage);

export default router;
