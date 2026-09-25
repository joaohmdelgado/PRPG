import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

import { getNews, getNewsById, createNews, updateNews, deleteNews } from '../controllers/newsController.js';
import { getEditais, getEditalById, createEdital, updateEdital, deleteEdital, addErrata, removeErrata, setResultadoParcial, setResultadoFinal } from '../controllers/editaisController.js';
import { getResolucoes, getResolucaoById, createResolucao, updateResolucao, deleteResolucao } from '../controllers/resolucoesController.js';
import { getFormularios, getFormularioById, createFormulario, updateFormulario, deleteFormulario } from '../controllers/formulariosController.js';
import { getProgramas, getProgramaById, getProgramaBySlug, createPrograma, updatePrograma, deletePrograma, getProgramaDocentesPublic, getDocentesAdmin, addDocente, removeDocente, buscaPrograma, getComissoesAdmin, addComissaoMembro, removeComissaoMembro, getProgramaMetricasPublic, getProgramaDiscentesPublic, getDiscentesAdmin, addDiscente, removeDiscente, getProgramaLinhas, updateProgramaLinhas } from '../controllers/programasController.js';
import { getCalendarios, getCalendarioById, createCalendario, updateCalendario, deleteCalendario } from '../controllers/calendariosController.js';
import { getPortarias, getPortariaById, createPortaria, updatePortaria, deletePortaria } from '../controllers/portariasController.js';
import { getGruposPesquisa, getGruposPublicos, getGrupoPesquisaById, createGrupoPesquisa, updateGrupoPesquisa, deleteGrupoPesquisa } from '../controllers/gruposPesquisaController.js';
import { getTeses, getTeseById, createTese, updateTese, deleteTese } from '../controllers/tesesController.js';
import { getFaqs, getFaqById, createFaq, updateFaq, deleteFaq } from '../controllers/faqController.js';
import { getDisciplinas, getDisciplinaById, createDisciplina, updateDisciplina, deleteDisciplina } from '../controllers/disciplinasController.js';
import { getBolsas, getBolsaById, createBolsa, updateBolsa, deleteBolsa } from '../controllers/bolsasController.js';
import { getPages, getPageById, getPageBySlug, createPage, updatePage, deletePage } from '../controllers/pagesController.js';
import { getMetricas, getMetricaById, createMetrica, updateMetrica, deleteMetrica } from '../controllers/metricasController.js';
import {
  getPeriodoAberto, createInscricao, getMinhasInscricoes, getInscricoes,
  getInscricaoById, lancarNota, deleteInscricao, gerarDeclaracao, verificarAluno,
  verificarDeclaracao, baixarComprovante,
} from '../controllers/proficienciaController.js';
import { verificarPublica } from '../controllers/declaracoesController.js';
import { getVocabularios as getVocabulariosGenerico } from '../controllers/vocabulariosController.js';
import {
  getAgenda, getContadores, exportAgendaXlsx, getContatosByPessoa, createContatoPessoa,
  getContatosByPrograma, createContatoPrograma, updateContato, deleteContato,
} from '../controllers/contatosController.js';
import {
  getVocabularios, getUnidades, createUnidade, updateUnidade, deleteUnidade,
  getProcessos, getMeusProcessos, getProcessoById, createProcesso, updateProcesso,
  patchStatus, patchLocalizacao, deleteProcesso, addEvento, addRelatoria,
  registrarDevolucaoRelatoria, addAto, exportXlsx, getIndicadores as getIndicadoresCamara,
  espelhoProcessoPdf, extratoEncaminhamentoPdf, oficioRelatoriaPdf, relatorioAnualPdf as relatorioAnualCamaraPdf,
} from '../controllers/camaraController.js';
import {
  getReunioes, getReuniaoById, createReuniao, updateReuniao, deleteReuniao,
  getPauta, addToPauta, removeFromPauta, lancarResultados, pautaPdf, minutaAtaPdf,
} from '../controllers/camaraReunioesController.js';
import {
  getSeries, createSerie, updateSerie, deleteSerie,
  getAtos, getAtoById, getPublico as getAtosPublico, reservar, createAto, updateAto,
  patchSituacao, deleteAto, addReferencia, removeReferencia, linkProcesso, attachArquivo,
  exportXlsx as exportAtosXlsx, getIndicadores as getIndicadoresAtos,
  createDiplomasLote, getDiplomas, putDiplomas, exportDiplomasXlsx,
} from '../controllers/atosController.js';
import {
  getPosDoutorados, getPosDoutoradoById, createPosDoutorado, updatePosDoutorado,
  patchSituacao as patchSituacaoPosDoc, registrarRelatorio, prorrogar,
  linkProcesso as linkProcessoPosDoc, deletePosDoutorado, gerarDeclaracao as gerarDeclaracaoPosDoc,
  exportXlsx as exportPosDoutoradoXlsx, exportSucupira, getIndicadores as getIndicadoresPosDoutorado,
  oficioCobrancaPdf, relacaoVigentesPdf, relatorioAnualPdf as relatorioAnualPosdocPdf,
} from '../controllers/posDoutoradoController.js';
import { getNotificacoes, reenviarNotificacao, enviarTeste } from '../controllers/notificacoesController.js';
import { buscaGlobal } from '../controllers/buscaController.js';


import { getLinhas, getLinhaById, createLinha, updateLinha, deleteLinha } from '../controllers/linhasPesquisaController.js';
import { getTaxonomiaRefs, getTaxonomiaRefById, createTaxonomiaRef, updateTaxonomiaRef, deleteTaxonomiaRef } from '../controllers/taxonomiaRefsController.js';
import { getTiposImportacao, runImportacao } from '../controllers/importController.js';

import { login } from '../controllers/authController.js';
import { getUsers, getUsersResumo, getUserById, createUser, updateUser, deleteUser } from '../controllers/usersController.js';
import { getTaxonomias, updateTaxonomias } from '../controllers/taxonomiasController.js';

import {
  protect, optionalProtect, requireRole, scopeProgramaWrite, requireProgramaOwnership,
  requireSelfPrograma, blockProgramaScoped, requireInstitutionalWriter,
} from '../middleware/authMiddleware.js';
import { loginLimiter, uploadLimiter } from '../middleware/rateLimit.js';
import {
  newsRepo, editaisRepo, resolucoesRepo, formulariosRepo, disciplinasRepo,
  tesesRepo, faqRepo, gruposRepo, pagesRepo, usersRepo,
} from '../db/repositories.js';
import { arquivosRepo } from '../db/anexosRepo.js';
import { asyncRouter } from '../utils/asyncRouter.js';

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

// Allowlist de uploads de conteúdo/comprovantes: extensão E mimetype precisam
// concordar. SVG e HTML são recusados de propósito — seriam servidos a partir
// do domínio confiável em /uploads e abririam um vetor de XSS armazenado; checar
// só o mimetype (controlado pelo cliente) também permitiria forjar a extensão.
const ALLOWED_UPLOAD = {
  '.pdf': ['application/pdf'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
};

const uploadFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedMimes = ALLOWED_UPLOAD[ext];
  if (allowedMimes && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Envie PDF, PNG, JPG, GIF ou WEBP.'));
  }
};

const upload = multer({ storage, fileFilter: uploadFileFilter, limits: { fileSize: 15 * 1024 * 1024 } });

// Comprovantes de proficiência possuem dados pessoais e não podem ser
// publicados pelo middleware estático de /uploads. O diretório é exposto
// apenas pelo endpoint autenticado abaixo.
const privateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const privateUploadDir = path.join(__dirname, '../private-uploads');
    if (!fs.existsSync(privateUploadDir)) fs.mkdirSync(privateUploadDir, { recursive: true });
    cb(null, privateUploadDir);
  },
  filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const privateUpload = multer({ storage: privateStorage, fileFilter: uploadFileFilter, limits: { fileSize: 15 * 1024 * 1024 } });

// Upload em memória para arquivos de importação (JSON do site antigo). Não vai
// para disco — o conteúdo é parseado e descartado após a importação.
const importUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/json' || file.mimetype === 'text/plain' ||
      /\.(json|txt)$/i.test(file.originalname);
    cb(ok ? null : new Error('Apenas arquivos JSON ou TXT são permitidos!'), ok);
  },
  limits: { fileSize: 15 * 1024 * 1024 },
});

// asyncRouter: rejeição de handler async vai para o tratador de erros global
// (server/app.js) em vez de virar unhandledRejection e derrubar o processo.
const router = asyncRouter(express.Router());

// Rotas públicas. optionalProtect: com o token de quem edita, a listagem
// inclui rascunhos e agendados (Fase F.1 — ver server/utils/publicacao.js).
router.get('/news', optionalProtect, getNews);
router.get('/news/:id', optionalProtect, getNewsById);
router.get('/editais', optionalProtect, getEditais);
router.get('/editais/:id', optionalProtect, getEditalById);
router.get('/resolucoes', optionalProtect, getResolucoes);
router.get('/resolucoes/:id', optionalProtect, getResolucaoById);
router.get('/formularios', optionalProtect, getFormularios);
router.get('/formularios/:id', optionalProtect, getFormularioById);
router.get('/programas', getProgramas);
// optionalProtect: com token de quem edita o programa, o microsite em
// rascunho responde (pré-visualização); anônimo recebe 404.
router.get('/programas/slug/:slug', optionalProtect, getProgramaBySlug);
router.get('/programas/slug/:slug/pessoas', getProgramaDocentesPublic);
router.get('/programas/slug/:slug/busca', buscaPrograma);
router.get('/programas/slug/:slug/metricas', getProgramaMetricasPublic);
router.get('/programas/slug/:slug/discentes', getProgramaDiscentesPublic);
router.get('/programas/slug/:slug/grupos', getGruposPublicos);
// Rotas específicas ANTES da rota genérica /:id
// Gestor de programa só gerencia vínculos do SEU programa (requireSelfPrograma).
router.get('/programas/:id/docentes', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), requireSelfPrograma, getDocentesAdmin);
router.post('/programas/:id/docentes', protect, requireInstitutionalWriter, requireSelfPrograma, addDocente);
router.delete('/programas/:id/docentes/:vinculoId', protect, requireInstitutionalWriter, requireSelfPrograma, removeDocente);
router.get('/programas/:id/comissoes', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), requireSelfPrograma, getComissoesAdmin);
router.post('/programas/:id/comissoes', protect, requireInstitutionalWriter, requireSelfPrograma, addComissaoMembro);
router.delete('/programas/:id/comissoes/:vinculoId', protect, requireInstitutionalWriter, requireSelfPrograma, removeComissaoMembro);
router.get('/programas/:id/discentes', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), requireSelfPrograma, getDiscentesAdmin);
router.post('/programas/:id/discentes', protect, requireInstitutionalWriter, requireSelfPrograma, addDiscente);
router.delete('/programas/:id/discentes/:vinculoId', protect, requireInstitutionalWriter, requireSelfPrograma, removeDiscente);
router.get('/programas/:id/linhas', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), requireSelfPrograma, getProgramaLinhas);
router.put('/programas/:id/linhas', protect, requireInstitutionalWriter, requireSelfPrograma, updateProgramaLinhas);
// Rota genérica DEPOIS das específicas
router.get('/programas/:id', getProgramaById);
router.get('/calendarios', optionalProtect, getCalendarios);
router.get('/calendarios/:id', optionalProtect, getCalendarioById);
router.get('/taxonomias', getTaxonomias);
router.get('/linhas-pesquisa', optionalProtect, getLinhas);
router.get('/linhas-pesquisa/:id', getLinhaById);
router.get('/taxonomia-refs', optionalProtect, getTaxonomiaRefs);
router.get('/taxonomia-refs/:id', optionalProtect, getTaxonomiaRefById);
router.get('/teses-dissertacoes', optionalProtect, getTeses);
router.get('/teses-dissertacoes/:id', optionalProtect, getTeseById);
router.get('/faq', optionalProtect, getFaqs);
router.get('/faq/:id', optionalProtect, getFaqById);
router.get('/disciplinas', optionalProtect, getDisciplinas);
router.get('/disciplinas/:id', optionalProtect, getDisciplinaById);
router.get('/bolsas', optionalProtect, getBolsas);
router.get('/bolsas/:id', optionalProtect, getBolsaById);
router.get('/pages', optionalProtect, getPages);
router.get('/pages/:id', optionalProtect, getPageById);
router.get('/pages/slug/:slug', optionalProtect, getPageBySlug);

// Autenticação (com limite de tentativas por IP contra força bruta)
router.post('/login', loginLimiter, login);

// Uploads (qualquer usuário logado)
router.post('/upload', uploadLimiter, protect, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    const fileUrl = `/uploads/${req.file.filename}`;
    // Fase A.5 (G5): registra o upload em `arquivos`; a resposta ganha `id`
    // sem remover url/originalName (contrato existente preservado).
    const arquivo = await arquivosRepo.create({
      url: fileUrl, nomeOriginal: req.file.originalname, mime: req.file.mimetype,
      tamanhoBytes: req.file.size, enviadoPor: req.user?.id,
    });
    res.json({ id: arquivo.id, url: fileUrl, originalName: req.file.originalname });
  });
});

// Rotas exclusivas para Administrator e Gestor
router.post('/taxonomias', protect, requireRole(['Administrator', 'Gestor']), updateTaxonomias);
router.post('/linhas-pesquisa', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), createLinha);
router.put('/linhas-pesquisa/:id', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), updateLinha);
router.delete('/linhas-pesquisa/:id', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), deleteLinha);
router.post('/taxonomia-refs', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), createTaxonomiaRef);
router.put('/taxonomia-refs/:id', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), updateTaxonomiaRef);
router.delete('/taxonomia-refs/:id', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), deleteTaxonomiaRef);
// Leitura da lista de usuários: também o Gestor de Programa, que precisa dela
// para escolher docentes/discentes/coordenadores do seu programa. Criar/excluir
// usuários continua restrito a Admin/Gestor.
// O Gestor de Programa também cadastra alunos/professores (escopados ao seu
// programa via createUser) e pode excluir apenas os que o seu programa possui
// (requireProgramaOwnership confere users.programa_id).
router.get('/users', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), getUsers);
// Antes de /users/:id. Só id + nome de quem pode ser autor de conteúdo.
router.get('/users/resumo', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), getUsersResumo);
router.post('/users', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), createUser);
router.delete('/users/:id', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), requireProgramaOwnership((id) => usersRepo.getById(id)), deleteUser);

// Importação de dados do site antigo (somente Admin/Gestor da PRPG).
router.get('/import/tipos', protect, requireRole(['Administrator', 'Gestor']), getTiposImportacao);
router.post('/import/:tipo', protect, requireRole(['Administrator', 'Gestor']),
  (req, res, next) => importUpload.single('file')(req, res, (err) => (err ? res.status(400).json({ message: err.message }) : next())),
  runImportacao);

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
router.post('/news', protect, requireInstitutionalWriter, scopeProgramaWrite, createNews);
router.put('/news/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => newsRepo.getById(id)), scopeProgramaWrite, updateNews);
router.delete('/news/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => newsRepo.getById(id)), deleteNews);
router.post('/editais', protect, requireInstitutionalWriter, scopeProgramaWrite, createEdital);
router.put('/editais/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => editaisRepo.getById(id)), scopeProgramaWrite, updateEdital);
router.delete('/editais/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => editaisRepo.getById(id)), deleteEdital);
// Fase D: erratas/resultado parcial/final agora são eventos (append-only).
router.post('/editais/:id/erratas', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => editaisRepo.getById(id)), scopeProgramaWrite, addErrata);
router.delete('/editais/:id/erratas/:eventoId', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => editaisRepo.getById(id)), scopeProgramaWrite, removeErrata);
router.put('/editais/:id/resultado-parcial', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => editaisRepo.getById(id)), scopeProgramaWrite, setResultadoParcial);
router.put('/editais/:id/resultado-final', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => editaisRepo.getById(id)), scopeProgramaWrite, setResultadoFinal);
router.post('/resolucoes', protect, requireInstitutionalWriter, scopeProgramaWrite, createResolucao);
router.put('/resolucoes/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => resolucoesRepo.getById(id)), scopeProgramaWrite, updateResolucao);
router.delete('/resolucoes/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => resolucoesRepo.getById(id)), deleteResolucao);
router.post('/formularios', protect, requireInstitutionalWriter, scopeProgramaWrite, createFormulario);
router.put('/formularios/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => formulariosRepo.getById(id)), scopeProgramaWrite, updateFormulario);
router.delete('/formularios/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => formulariosRepo.getById(id)), deleteFormulario);
// Programas: só Admin/Gestor criam ou excluem. Gestor de Programa edita o SEU.
router.post('/programas', protect, requireInstitutionalWriter, blockProgramaScoped, createPrograma);
router.put('/programas/:id', protect, requireInstitutionalWriter, requireSelfPrograma, updatePrograma);
router.delete('/programas/:id', protect, requireInstitutionalWriter, blockProgramaScoped, deletePrograma);
// Calendários e Bolsas são globais da PRPG (sem programa_id): bloqueados ao gestor.
router.post('/calendarios', protect, requireInstitutionalWriter, blockProgramaScoped, createCalendario);
router.put('/calendarios/:id', protect, requireInstitutionalWriter, blockProgramaScoped, updateCalendario);
router.delete('/calendarios/:id', protect, requireInstitutionalWriter, blockProgramaScoped, deleteCalendario);
router.post('/teses-dissertacoes', protect, requireInstitutionalWriter, scopeProgramaWrite, createTese);
router.put('/teses-dissertacoes/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => tesesRepo.getById(id)), scopeProgramaWrite, updateTese);
router.delete('/teses-dissertacoes/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => tesesRepo.getById(id)), deleteTese);
router.post('/faq', protect, requireInstitutionalWriter, scopeProgramaWrite, createFaq);
router.put('/faq/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => faqRepo.getById(id)), scopeProgramaWrite, updateFaq);
router.delete('/faq/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => faqRepo.getById(id)), deleteFaq);
router.post('/disciplinas', protect, requireInstitutionalWriter, scopeProgramaWrite, createDisciplina);
router.put('/disciplinas/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => disciplinasRepo.getById(id)), scopeProgramaWrite, updateDisciplina);
router.delete('/disciplinas/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => disciplinasRepo.getById(id)), deleteDisciplina);
router.post('/bolsas', protect, requireInstitutionalWriter, blockProgramaScoped, createBolsa);
router.put('/bolsas/:id', protect, requireInstitutionalWriter, blockProgramaScoped, updateBolsa);
router.delete('/bolsas/:id', protect, requireInstitutionalWriter, blockProgramaScoped, deleteBolsa);
router.post('/pages', protect, requireInstitutionalWriter, scopeProgramaWrite, createPage);
router.put('/pages/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => pagesRepo.getById(id)), scopeProgramaWrite, updatePage);
router.delete('/pages/:id', protect, requireInstitutionalWriter, requireProgramaOwnership((id) => pagesRepo.getById(id)), deletePage);

// ===================== Proficiência em Línguas =====================
// O período de inscrição é controlado por um edital com proficiencia=TRUE.
// Consulta do período aberto e a própria inscrição são públicas: o aluno se
// inscreve sem precisar de login.
router.get('/proficiencia/periodo-aberto', getPeriodoAberto);
router.post('/proficiencia/verificar-aluno', verificarAluno);
// Verificação pública de autenticidade da declaração (acessada pelo QR code).
router.get('/proficiencia/declaracoes/:codigo', verificarDeclaracao); // legado: QR codes já impressos
router.get('/declaracoes/:codigo', verificarPublica); // Fase B.2: rota pública única
// optionalProtect: quando o aluno está logado, o token popula req.user para
// prefixar nome/CPF do cadastro e vincular a inscrição (alunoId); anônimos
// ainda podem se inscrever informando os dados no corpo.
router.post('/proficiencia/inscricoes', optionalProtect, createInscricao);
// Upload anônimo, mas armazenamento privado: comprovantes contêm dados
// pessoais. A equipe gestora os acessa somente pela rota autenticada abaixo.
router.post('/proficiencia/upload', uploadLimiter, (req, res) => {
  privateUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    const fileUrl = `/private-uploads/${req.file.filename}`;
    const arquivo = await arquivosRepo.create({
      url: fileUrl, nomeOriginal: req.file.originalname, mime: req.file.mimetype,
      tamanhoBytes: req.file.size,
    });
    res.json({ id: arquivo.id, url: fileUrl, originalName: req.file.originalname });
  });
});
router.get('/proficiencia/inscricoes/minhas', protect, getMinhasInscricoes);
router.get('/proficiencia/inscricoes', protect, requireRole(['Administrator', 'Gestor']), getInscricoes);
router.get('/proficiencia/inscricoes/:id/comprovantes/:tipo', protect, requireRole(['Administrator', 'Gestor']), baixarComprovante);
router.get('/proficiencia/inscricoes/:id', protect, requireRole(['Administrator', 'Gestor']), getInscricaoById);
router.put('/proficiencia/inscricoes/:id/nota', protect, requireRole(['Administrator', 'Gestor']), lancarNota);
router.delete('/proficiencia/inscricoes/:id', protect, requireRole(['Administrator']), deleteInscricao);
router.get('/proficiencia/inscricoes/:id/declaracao', protect, requireRole(['Administrator', 'Gestor']), gerarDeclaracao);

// ===================== Câmara de Pós-Graduação =====================
// Ver requisitos-camara.md §8. Leitura de processos/unidades também para
// GestorPrograma (escopado ao seu programa, sem sigiloso); escrita é
// exclusiva de Administrator/Gestor. Exclusão de processo é só Administrator.
const CAMARA_LEITURA = ['Administrator', 'Gestor', 'GestorPrograma'];
const CAMARA_ESCRITA = ['Administrator', 'Gestor'];

router.get('/camara/vocabularios', protect, requireRole(CAMARA_LEITURA), getVocabularios);
router.get('/vocabularios', getVocabulariosGenerico); // Fase B.5 (G10): leitura pública, só rótulos
router.get('/camara/unidades', protect, requireRole(CAMARA_LEITURA), getUnidades);
router.post('/camara/unidades', protect, requireRole(CAMARA_ESCRITA), createUnidade);
router.put('/camara/unidades/:id', protect, requireRole(CAMARA_ESCRITA), updateUnidade);
router.delete('/camara/unidades/:id', protect, requireRole(CAMARA_ESCRITA), deleteUnidade);

router.get('/camara/meus-processos', protect, getMeusProcessos);

// Rotas específicas de reuniões ANTES da rota genérica /camara/processos/:id.
router.get('/camara/reunioes', protect, requireRole(CAMARA_ESCRITA), getReunioes);
router.post('/camara/reunioes', protect, requireRole(CAMARA_ESCRITA), createReuniao);
router.get('/camara/reunioes/:id', protect, requireRole(CAMARA_ESCRITA), getReuniaoById);
router.put('/camara/reunioes/:id', protect, requireRole(CAMARA_ESCRITA), updateReuniao);
router.delete('/camara/reunioes/:id', protect, requireRole(CAMARA_ESCRITA), deleteReuniao);
router.get('/camara/reunioes/:id/pauta', protect, requireRole(CAMARA_ESCRITA), getPauta);
router.post('/camara/reunioes/:id/pauta', protect, requireRole(CAMARA_ESCRITA), addToPauta);
router.delete('/camara/reunioes/:id/pauta/:itemId', protect, requireRole(CAMARA_ESCRITA), removeFromPauta);
router.put('/camara/reunioes/:id/resultados', protect, requireRole(CAMARA_ESCRITA), lancarResultados);
router.get('/camara/reunioes/:id/pauta.pdf', protect, requireRole(CAMARA_ESCRITA), pautaPdf);
router.get('/camara/reunioes/:id/ata.pdf', protect, requireRole(CAMARA_ESCRITA), minutaAtaPdf);

router.get('/camara/exportar.xlsx', protect, requireRole(CAMARA_ESCRITA), exportXlsx);
router.get('/camara/indicadores', protect, requireRole(CAMARA_ESCRITA), getIndicadoresCamara);
router.get('/camara/extrato-encaminhamento.pdf', protect, requireRole(CAMARA_ESCRITA), extratoEncaminhamentoPdf);
router.get('/camara/relatorio-anual.pdf', protect, requireRole(CAMARA_ESCRITA), relatorioAnualCamaraPdf);
router.get('/camara/relatorias/:relatoriaId/oficio.pdf', protect, requireRole(CAMARA_ESCRITA), oficioRelatoriaPdf);
router.get('/camara/processos/:id/espelho.pdf', protect, requireRole(CAMARA_LEITURA), espelhoProcessoPdf);
router.put('/camara/relatorias/:relatoriaId', protect, requireRole(CAMARA_ESCRITA), registrarDevolucaoRelatoria);

router.get('/camara/processos', protect, requireRole(CAMARA_LEITURA), getProcessos);
router.post('/camara/processos', protect, requireRole(CAMARA_ESCRITA), createProcesso);
router.get('/camara/processos/:id', protect, requireRole(CAMARA_LEITURA), getProcessoById);
router.put('/camara/processos/:id', protect, requireRole(CAMARA_ESCRITA), updateProcesso);
router.patch('/camara/processos/:id/status', protect, requireRole(CAMARA_ESCRITA), patchStatus);
router.patch('/camara/processos/:id/localizacao', protect, requireRole(CAMARA_ESCRITA), patchLocalizacao);
router.delete('/camara/processos/:id', protect, requireRole(['Administrator']), deleteProcesso);
router.post('/camara/processos/:id/eventos', protect, requireRole(CAMARA_ESCRITA), addEvento);
router.post('/camara/processos/:id/relatorias', protect, requireRole(CAMARA_ESCRITA), addRelatoria);
router.post('/camara/processos/:id/atos', protect, requireRole(CAMARA_ESCRITA), addAto);

// ===================== Agenda de contatos (Fase G) =====================
// Ver requisitos-contatos.md §6. Escopo Admin/Gestor por enquanto: o próprio
// programa manter seus contatos via GestorPrograma é D-G7, ainda em aberto.
const CONTATOS_ESCRITA = ['Administrator', 'Gestor'];

router.get('/contatos/agenda', protect, requireRole(CONTATOS_ESCRITA), getAgenda);
router.get('/contatos/agenda/contadores', protect, requireRole(CONTATOS_ESCRITA), getContadores);
router.get('/contatos/agenda/exportar.xlsx', protect, requireRole(CONTATOS_ESCRITA), exportAgendaXlsx);
router.get('/contatos/pessoa/:pessoaId', protect, requireRole(CONTATOS_ESCRITA), getContatosByPessoa);
router.post('/contatos/pessoa/:pessoaId', protect, requireRole(CONTATOS_ESCRITA), createContatoPessoa);
router.get('/contatos/programa/:programaId', protect, requireRole(CONTATOS_ESCRITA), getContatosByPrograma);
router.post('/contatos/programa/:programaId', protect, requireRole(CONTATOS_ESCRITA), createContatoPrograma);
router.put('/contatos/:id', protect, requireRole(CONTATOS_ESCRITA), updateContato);
router.delete('/contatos/:id', protect, requireRole(CONTATOS_ESCRITA), deleteContato);

// ===================== Expedientes (Fase E) =====================
// Ver requisitos-expedientes.md §8. Leitura escopada para GestorPrograma nos
// atos do seu próprio programa (D-E6 segue em aberto quanto a "quem reserva
// número" fora de Admin/Gestor — o padrão default segue o mesmo dos outros
// módulos até a secretaria decidir).
const ATOS_LEITURA = ['Administrator', 'Gestor', 'GestorPrograma'];
const ATOS_ESCRITA = ['Administrator', 'Gestor'];

router.get('/atos/publico', getAtosPublico);

router.get('/atos/series', protect, requireRole(ATOS_LEITURA), getSeries);
router.post('/atos/series', protect, requireRole(['Administrator']), createSerie);
router.put('/atos/series/:id', protect, requireRole(['Administrator']), updateSerie);
router.delete('/atos/series/:id', protect, requireRole(['Administrator']), deleteSerie);

router.get('/atos/exportar.xlsx', protect, requireRole(ATOS_ESCRITA), exportAtosXlsx);
router.get('/atos/indicadores', protect, requireRole(ATOS_ESCRITA), getIndicadoresAtos);
router.post('/atos/reservar', protect, requireRole(ATOS_ESCRITA), reservar);
// Fase M (§9.4 caminho 2): expedição de diplomas em lote — um ofício por lista de concluintes.
router.post('/atos/diplomas-lote', protect, requireRole(ATOS_ESCRITA), createDiplomasLote);

router.get('/atos', protect, requireRole(ATOS_LEITURA), getAtos);
router.post('/atos', protect, requireRole(ATOS_ESCRITA), createAto);
router.get('/atos/:id', protect, requireRole(ATOS_LEITURA), getAtoById);
router.put('/atos/:id', protect, requireRole(ATOS_ESCRITA), updateAto);
router.patch('/atos/:id/situacao', protect, requireRole(ATOS_ESCRITA), patchSituacao);
router.delete('/atos/:id', protect, requireRole(ATOS_ESCRITA), deleteAto);
router.post('/atos/:id/referencias', protect, requireRole(ATOS_ESCRITA), addReferencia);
router.delete('/atos/referencias/:refId', protect, requireRole(ATOS_ESCRITA), removeReferencia);
router.post('/atos/:id/processo', protect, requireRole(ATOS_ESCRITA), linkProcesso);
router.get('/atos/:id/diplomas', protect, requireRole(ATOS_LEITURA), getDiplomas);
router.put('/atos/:id/diplomas', protect, requireRole(ATOS_ESCRITA), putDiplomas);
router.get('/atos/:id/diplomas.xlsx', protect, requireRole(ATOS_ESCRITA), exportDiplomasXlsx);
router.post('/atos/:id/arquivo', protect, requireRole(ATOS_ESCRITA), attachArquivo);

// ===================== Pós-Doutorado / PNPD (Fase C) =====================
// Ver requisitos-pnpd.md §9. Leitura escopada para GestorPrograma nos
// registros do seu próprio programa (mesmo desenho de isProgramaScoped já
// usado em Câmara/Expedientes).
const POSDOC_LEITURA = ['Administrator', 'Gestor', 'GestorPrograma'];
const POSDOC_ESCRITA = ['Administrator', 'Gestor'];
// Fase K.7: autosserviço — o GestorPrograma cadastra e acompanha os
// pós-docs do seu próprio programa (escopo já forçado no controller via
// isProgramaScoped); exclusão continua exclusiva de Administrator.
const POSDOC_ESCRITA_PROGRAMA = ['Administrator', 'Gestor', 'GestorPrograma'];

router.get('/pos-doutorado/exportar.xlsx', protect, requireRole(POSDOC_ESCRITA), exportPosDoutoradoXlsx);
router.get('/pos-doutorado/exportar-sucupira.xlsx', protect, requireRole(POSDOC_ESCRITA), exportSucupira);
router.get('/pos-doutorado/indicadores', protect, requireRole(POSDOC_ESCRITA), getIndicadoresPosDoutorado);
router.get('/pos-doutorado/relacao-vigentes.pdf', protect, requireRole(POSDOC_LEITURA), relacaoVigentesPdf);
router.get('/pos-doutorado/relatorio-anual.pdf', protect, requireRole(POSDOC_ESCRITA), relatorioAnualPosdocPdf);

router.get('/pos-doutorado', protect, requireRole(POSDOC_LEITURA), getPosDoutorados);
router.post('/pos-doutorado', protect, requireRole(POSDOC_ESCRITA_PROGRAMA), createPosDoutorado);
router.get('/pos-doutorado/:id', protect, requireRole(POSDOC_LEITURA), getPosDoutoradoById);
router.put('/pos-doutorado/:id', protect, requireRole(POSDOC_ESCRITA_PROGRAMA), updatePosDoutorado);
router.patch('/pos-doutorado/:id/situacao', protect, requireRole(POSDOC_ESCRITA_PROGRAMA), patchSituacaoPosDoc);
router.post('/pos-doutorado/:id/relatorio', protect, requireRole(POSDOC_ESCRITA_PROGRAMA), registrarRelatorio);
router.post('/pos-doutorado/:id/prorrogar', protect, requireRole(POSDOC_ESCRITA_PROGRAMA), prorrogar);
router.post('/pos-doutorado/:id/processo', protect, requireRole(POSDOC_ESCRITA_PROGRAMA), linkProcessoPosDoc);
router.delete('/pos-doutorado/:id', protect, requireRole(['Administrator']), deletePosDoutorado);
router.get('/pos-doutorado/:id/declaracao', protect, requireRole(POSDOC_ESCRITA_PROGRAMA), gerarDeclaracaoPosDoc);
router.get('/pos-doutorado/:id/oficio-cobranca.pdf', protect, requireRole(POSDOC_ESCRITA_PROGRAMA), oficioCobrancaPdf);

// ===================== Notificações (Fase I) =====================
// Ver services/email.js. Admin-only: é infraestrutura de envio, não conteúdo
// de um módulo específico.
router.get('/notificacoes', protect, requireRole(['Administrator']), getNotificacoes);
router.post('/notificacoes/teste', protect, requireRole(['Administrator']), enviarTeste);
router.post('/notificacoes/:id/reenviar', protect, requireRole(['Administrator']), reenviarNotificacao);

// ===================== Busca global (Fase L.10) =====================
router.get('/busca', protect, requireRole(['Administrator', 'Gestor', 'GestorPrograma']), buscaGlobal);

export default router;
