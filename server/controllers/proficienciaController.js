import PDFDocument from 'pdfkit';
import { isPlainObject } from '../utils/sanitize.js';
import { inscricoesProficienciaRepo, editaisRepo, usersRepo } from '../db/repositories.js';
import { query } from '../db/pool.js';

// ============================ Regras de domínio ============================

export const LINGUAS_VALIDAS = ['Português', 'Inglês', 'Espanhol'];
export const NIVEIS_VALIDOS = ['Mestrado', 'Doutorado'];

export const calcularResultado = (nota) => {
  const n = Number(nota);
  if (Number.isNaN(n)) return null;
  if (n < 5) return 'INSUFICIENTE';
  if (n <= 7) return 'SUFICIENCIA';
  return 'PROFICIENCIA';
};

// Valida as línguas conforme nível e estrangeiro.
export const validarLinguas = ({ linguas, nivel, estrangeiro }) => {
  const lista = Array.isArray(linguas) ? linguas : [];
  if (lista.length === 0) return { ok: false, message: 'Selecione ao menos uma língua.' };
  if (lista.some((l) => !LINGUAS_VALIDAS.includes(l))) {
    return { ok: false, message: 'Língua inválida. Opções: Português, Inglês, Espanhol.' };
  }
  const unicas = [...new Set(lista)];
  if (unicas.length !== lista.length) return { ok: false, message: 'Há línguas repetidas na inscrição.' };

  if (estrangeiro) {
    if (unicas.length !== 2 || !unicas.includes('Português')) {
      return { ok: false, message: 'Aluno estrangeiro deve se inscrever em Português e mais uma língua.' };
    }
    return { ok: true, linguas: unicas };
  }
  if (nivel === 'Doutorado') {
    if (unicas.length > 2) return { ok: false, message: 'Doutorado pode se inscrever em no máximo duas línguas.' };
    return { ok: true, linguas: unicas };
  }
  if (unicas.length !== 1) return { ok: false, message: 'Mestrado pode se inscrever em apenas uma língua.' };
  return { ok: true, linguas: unicas };
};

export const nivelDoCadastro = (aluno) => {
  const n = aluno?.perfil_aluno?.nivel;
  if (n === 'Mestrando') return 'Mestrado';
  if (n === 'Doutorando') return 'Doutorado';
  if (NIVEIS_VALIDOS.includes(n)) return n;
  return null;
};

// Retorna o edital de proficiência com período aberto agora, ou null.
const buscarEditalAberto = async () => {
  const hoje = new Date().toISOString().slice(0, 10);
  const { rows } = await query(
    `SELECT * FROM editais
     WHERE proficiencia = TRUE
       AND (periodo_data_inicio IS NULL OR periodo_data_inicio <= $1)
       AND (periodo_data_fim   IS NULL OR periodo_data_fim   >= $1)
     ORDER BY periodo_data_inicio DESC NULLS LAST
     LIMIT 1`,
    [hoje]
  );
  if (!rows[0]) return null;
  return editaisRepo._fromRow ? editaisRepo._fromRow(rows[0]) : rows[0];
};

// ============================ Período aberto ============================

// Retorna o edital de proficiência com inscrições abertas (consumido pelo frontend do aluno).
export const getPeriodoAberto = async (req, res) => {
  const edital = await buscarEditalAberto();
  if (!edital) return res.json(null);
  // Normaliza o shape para o que o frontend espera (titulo, dataInicio, dataFim, id)
  res.json({
    id: edital.id,
    titulo: edital.title,
    dataInicio: edital.field_periodo?.data_inicio ?? null,
    dataFim: edital.field_periodo?.data_fim ?? null,
  });
};

// ============================== Inscrições ==============================

export const createInscricao = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const body = { ...req.body };

  const aberto = await buscarEditalAberto();
  if (!aberto) return res.status(409).json({ message: 'Não há período de inscrição aberto no momento.' });

  const alunoId = req.user?.id;
  const aluno = alunoId ? await usersRepo.getById(alunoId) : null;

  const nome = (body.nome || aluno?.perfil_geral?.nome || '').trim();
  const cpf = (body.cpf || aluno?.perfil_geral?.cpf || '').trim();
  const nivel = body.nivel || nivelDoCadastro(aluno) || null;
  const estrangeiro = body.estrangeiro != null ? !!body.estrangeiro : !!aluno?.perfil_aluno?.estrangeiro;

  if (!nome) return res.status(400).json({ message: 'Nome completo é obrigatório.' });
  if (!cpf) return res.status(400).json({ message: 'CPF é obrigatório.' });
  if (!NIVEIS_VALIDOS.includes(nivel)) return res.status(400).json({ message: 'Informe o nível (Mestrado ou Doutorado).' });

  if (!body.comprovanteResidenciaUrl) return res.status(400).json({ message: 'Anexe o comprovante de residência.' });
  const titular = body.titularComprovante != null ? !!body.titularComprovante : true;
  if (!titular && !body.comprovanteVinculoUrl) {
    return res.status(400).json({ message: 'Anexe o comprovante de vínculo com o titular do comprovante de residência.' });
  }

  const valid = validarLinguas({ linguas: body.linguas, nivel, estrangeiro });
  if (!valid.ok) return res.status(400).json({ message: valid.message });

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
    nome, cpf, nivel, estrangeiro,
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

export const getMinhasInscricoes = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: 'Não autenticado.' });
  res.json(await inscricoesProficienciaRepo.getByAluno(req.user.id));
};

export const getInscricoes = async (req, res) => {
  res.json(await inscricoesProficienciaRepo.getAll());
};

export const getInscricaoById = async (req, res) => {
  const i = await inscricoesProficienciaRepo.getById(req.params.id);
  if (i) res.json(i);
  else res.status(404).json({ message: 'Inscrição não encontrada.' });
};

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

const RESULTADO_LABEL = { SUFICIENCIA: 'SUFICIÊNCIA', PROFICIENCIA: 'PROFICIÊNCIA' };

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
  const dataExt = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="declaracao-proficiencia-${insc.id}.pdf"`);

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

  doc.fontSize(12).font('Helvetica').text(corpo, { align: 'justify', lineGap: 6 });
  doc.moveDown(4);
  doc.text(`Recife, ${dataExt}.`, { align: 'right' });
  doc.moveDown(5);
  doc.text('_______________________________________', { align: 'center' });
  doc.text('Pró-Reitoria de Pós-Graduação — UFRPE', { align: 'center' });

  doc.end();
};
