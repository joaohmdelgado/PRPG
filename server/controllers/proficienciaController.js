import PDFDocument from 'pdfkit';
import { isPlainObject } from '../utils/sanitize.js';
import {
  inscricoesProficienciaRepo,
  periodosProficienciaRepo,
  usersRepo,
} from '../db/repositories.js';

// ============================ Regras de domínio ============================

export const LINGUAS_VALIDAS = ['Português', 'Inglês', 'Espanhol'];
export const NIVEIS_VALIDOS = ['Mestrado', 'Doutorado'];

// Faixas combinadas com o requisito: nota entre 5 e 7 (inclusive) = suficiência;
// acima de 7 = proficiência; abaixo de 5 = insuficiente.
export const calcularResultado = (nota) => {
  const n = Number(nota);
  if (Number.isNaN(n)) return null;
  if (n < 5) return 'INSUFICIENTE';
  if (n <= 7) return 'SUFICIENCIA';
  return 'PROFICIENCIA';
};

// Valida as línguas escolhidas conforme nível e condição de estrangeiro.
// Retorna { ok, message?, linguas? } com a lista normalizada (sem duplicatas).
export const validarLinguas = ({ linguas, nivel, estrangeiro }) => {
  const lista = Array.isArray(linguas) ? linguas : [];
  if (lista.length === 0) {
    return { ok: false, message: 'Selecione ao menos uma língua.' };
  }
  if (lista.some((l) => !LINGUAS_VALIDAS.includes(l))) {
    return { ok: false, message: 'Língua inválida. Opções: Português, Inglês, Espanhol.' };
  }
  const unicas = [...new Set(lista)];
  if (unicas.length !== lista.length) {
    return { ok: false, message: 'Há línguas repetidas na inscrição.' };
  }

  if (estrangeiro) {
    // Estrangeiro: Português + exatamente uma outra língua.
    if (unicas.length !== 2 || !unicas.includes('Português')) {
      return {
        ok: false,
        message: 'Aluno estrangeiro deve se inscrever em Português e mais uma língua.',
      };
    }
    return { ok: true, linguas: unicas };
  }

  if (nivel === 'Doutorado') {
    if (unicas.length > 2) {
      return { ok: false, message: 'Doutorado pode se inscrever em no máximo duas línguas.' };
    }
    return { ok: true, linguas: unicas };
  }

  // Mestrado (e demais): exatamente uma língua.
  if (unicas.length !== 1) {
    return { ok: false, message: 'Mestrado pode se inscrever em apenas uma língua.' };
  }
  return { ok: true, linguas: unicas };
};

// No cadastro do aluno o nível é "Mestrando"/"Doutorando"; aqui usamos
// "Mestrado"/"Doutorado". Converte o que existir no perfil.
export const nivelDoCadastro = (aluno) => {
  const n = aluno?.perfil_aluno?.nivel;
  if (n === 'Mestrando') return 'Mestrado';
  if (n === 'Doutorando') return 'Doutorado';
  if (NIVEIS_VALIDOS.includes(n)) return n;
  return null;
};

const hoje = () => new Date().toISOString().slice(0, 10);

const periodoEstaAberto = (p) => {
  if (!p || !p.ativo) return false;
  const d = hoje();
  if (p.dataInicio && d < p.dataInicio) return false;
  if (p.dataFim && d > p.dataFim) return false;
  return true;
};

// ============================ Períodos (editais) ============================

export const getPeriodos = async (req, res) => {
  res.json(await periodosProficienciaRepo.getAll());
};

// Período aberto para inscrição agora (consumido pela página do aluno).
export const getPeriodoAberto = async (req, res) => {
  const todos = await periodosProficienciaRepo.getAll();
  const aberto = todos.find(periodoEstaAberto) || null;
  res.json(aberto);
};

export const createPeriodo = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const data = { ...req.body };
  if (!data.titulo || !String(data.titulo).trim()) {
    return res.status(400).json({ message: 'O título do período é obrigatório.' });
  }
  if (!data.id) data.id = 'prof-periodo-' + Date.now().toString();
  try {
    res.status(201).json(await periodosProficienciaRepo.create(data, req.user?.id));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar período.', error: e.message });
  }
};

export const updatePeriodo = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const updated = await periodosProficienciaRepo.update(req.params.id, req.body, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Período não encontrado.' });
};

export const deletePeriodo = async (req, res) => {
  const ok = await periodosProficienciaRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Período removido com sucesso.' });
  else res.status(404).json({ message: 'Período não encontrado.' });
};

// ============================== Inscrições ==============================

// O próprio aluno logado se inscreve. Dados de identificação são puxados do
// cadastro (users) e podem ser completados pelo corpo da requisição.
export const createInscricao = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const body = { ...req.body };

  // Precisa existir um período aberto.
  const todos = await periodosProficienciaRepo.getAll();
  const aberto = todos.find(periodoEstaAberto);
  if (!aberto) {
    return res.status(409).json({ message: 'Não há período de inscrição aberto no momento.' });
  }

  const alunoId = req.user?.id;
  const aluno = alunoId ? await usersRepo.getById(alunoId) : null;

  // Identificação: corpo tem prioridade (completar dados); senão, vem do cadastro.
  const nome = (body.nome || aluno?.perfil_geral?.nome || '').trim();
  const cpf = (body.cpf || aluno?.perfil_geral?.cpf || '').trim();
  const nivel = body.nivel || nivelDoCadastro(aluno) || null;
  const estrangeiro = body.estrangeiro != null
    ? !!body.estrangeiro
    : !!aluno?.perfil_aluno?.estrangeiro;

  if (!nome) return res.status(400).json({ message: 'Nome completo é obrigatório.' });
  if (!cpf) return res.status(400).json({ message: 'CPF é obrigatório.' });
  if (!NIVEIS_VALIDOS.includes(nivel)) {
    return res.status(400).json({ message: 'Informe o nível (Mestrado ou Doutorado).' });
  }

  // Comprovantes.
  if (!body.comprovanteResidenciaUrl) {
    return res.status(400).json({ message: 'Anexe o comprovante de residência.' });
  }
  const titular = body.titularComprovante != null ? !!body.titularComprovante : true;
  if (!titular && !body.comprovanteVinculoUrl) {
    return res.status(400).json({
      message: 'Anexe o comprovante de vínculo com o titular do comprovante de residência.',
    });
  }

  // Línguas.
  const valid = validarLinguas({ linguas: body.linguas, nivel, estrangeiro });
  if (!valid.ok) return res.status(400).json({ message: valid.message });

  // Uma inscrição por aluno por período.
  if (alunoId) {
    const minhas = await inscricoesProficienciaRepo.getByAluno(alunoId);
    if (minhas.some((i) => i.periodoId === aberto.id)) {
      return res.status(409).json({ message: 'Você já possui inscrição neste período.' });
    }
  }

  const data = {
    id: 'prof-insc-' + Date.now().toString(),
    periodoId: aberto.id,
    alunoId,
    nome,
    cpf,
    nivel,
    estrangeiro,
    linguas: valid.linguas,
    comprovanteResidenciaUrl: body.comprovanteResidenciaUrl,
    titularComprovante: titular,
    comprovanteVinculoUrl: titular ? null : body.comprovanteVinculoUrl,
    status: 'INSCRITO',
  };
  try {
    res.status(201).json(await inscricoesProficienciaRepo.create(data, alunoId));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar inscrição.', error: e.message });
  }
};

// Inscrições do próprio aluno logado.
export const getMinhasInscricoes = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: 'Não autenticado.' });
  res.json(await inscricoesProficienciaRepo.getByAluno(req.user.id));
};

// Todas as inscrições (Admin/Gestor).
export const getInscricoes = async (req, res) => {
  res.json(await inscricoesProficienciaRepo.getAll());
};

export const getInscricaoById = async (req, res) => {
  const i = await inscricoesProficienciaRepo.getById(req.params.id);
  if (i) res.json(i);
  else res.status(404).json({ message: 'Inscrição não encontrada.' });
};

// Lançamento de nota (Admin/Gestor): calcula o resultado e fecha a avaliação.
export const lancarNota = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const nota = Number(req.body.nota);
  if (Number.isNaN(nota) || nota < 0 || nota > 10) {
    return res.status(400).json({ message: 'Nota inválida. Informe um valor entre 0 e 10.' });
  }
  const resultado = calcularResultado(nota);
  const updated = await inscricoesProficienciaRepo.update(
    req.params.id,
    { nota, resultado, status: 'AVALIADO', observacao: req.body.observacao },
    req.user?.id
  );
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Inscrição não encontrada.' });
};

export const deleteInscricao = async (req, res) => {
  const ok = await inscricoesProficienciaRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Inscrição removida com sucesso.' });
  else res.status(404).json({ message: 'Inscrição não encontrada.' });
};

// ===================== Declaração (PDF no servidor) =====================

const RESULTADO_LABEL = {
  SUFICIENCIA: 'SUFICIÊNCIA',
  PROFICIENCIA: 'PROFICIÊNCIA',
};

export const gerarDeclaracao = async (req, res) => {
  const insc = await inscricoesProficienciaRepo.getById(req.params.id);
  if (!insc) return res.status(404).json({ message: 'Inscrição não encontrada.' });
  if (insc.status !== 'AVALIADO' || !insc.resultado) {
    return res.status(409).json({ message: 'A inscrição ainda não foi avaliada.' });
  }
  if (insc.resultado === 'INSUFICIENTE') {
    return res.status(409).json({ message: 'Nota insuficiente: não há declaração a emitir.' });
  }

  const tipo = RESULTADO_LABEL[insc.resultado];
  const linguas = (insc.linguas || []).join(', ');
  const dataExt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="declaracao-proficiencia-${insc.id}.pdf"`
  );

  const doc = new PDFDocument({ size: 'A4', margins: { top: 80, bottom: 72, left: 72, right: 72 } });
  doc.pipe(res);

  doc.fontSize(11).font('Helvetica')
    .text('UNIVERSIDADE FEDERAL RURAL DE PERNAMBUCO', { align: 'center' })
    .text('PRÓ-REITORIA DE PÓS-GRADUAÇÃO (PRPG)', { align: 'center' });
  doc.moveDown(3);

  doc.fontSize(16).font('Helvetica-Bold')
    .text(`DECLARAÇÃO DE ${tipo} EM LÍNGUA`, { align: 'center' });
  doc.moveDown(3);

  const notaFmt = Number(insc.nota).toFixed(2).replace('.', ',');
  const corpo =
    `Declaramos, para os devidos fins, que ${insc.nome}, ` +
    `inscrito(a) no CPF nº ${insc.cpf}, aluno(a) de ${insc.nivel}, ` +
    `obteve ${tipo} na avaliação de proficiência em língua ` +
    `(${linguas}), com nota ${notaFmt}.`;

  doc.fontSize(12).font('Helvetica')
    .text(corpo, { align: 'justify', lineGap: 6 });
  doc.moveDown(4);

  doc.text(`Recife, ${dataExt}.`, { align: 'right' });
  doc.moveDown(5);

  doc.text('_______________________________________', { align: 'center' });
  doc.text('Pró-Reitoria de Pós-Graduação — UFRPE', { align: 'center' });

  doc.end();
};
