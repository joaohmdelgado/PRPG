import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import PDFDocument from 'pdfkit';
import { isPlainObject } from '../utils/sanitize.js';
import { inscricoesProficienciaRepo, editaisRepo, usersRepo } from '../db/repositories.js';
import { query } from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '../assets');

// ============================ Regras de domínio ============================

export const LINGUAS_VALIDAS = ['Português', 'Inglês', 'Espanhol'];
export const NIVEIS_VALIDOS = ['Mestrado', 'Doutorado'];

export const calcularResultado = (nota) => {
  const n = Number(nota);
  if (Number.isNaN(n)) return null;
  if (n < 5) return 'INSUFICIENTE';
  if (n < 7) return 'SUFICIENCIA';
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
    dataInicio: edital.field_periodo?.data_inicio ?? edital.periodo_data_inicio ?? null,
    dataFim: edital.field_periodo?.data_fim ?? edital.periodo_data_fim ?? null,
  });
};

// ===================== Verificação de aluno matriculado =====================

// Papéis de vínculo que caracterizam um discente ativo (matriculado), excluindo egressos.
const PAPEIS_DISCENTE_ATIVO = ['DISCENTE_MESTRADO', 'DISCENTE_DOUTORADO', 'DISCENTE_PROFISSIONAL'];

// Normaliza um nome para comparação: tira espaços das pontas, colapsa espaços
// internos e passa para minúsculas. Mantém os acentos (o nome deve bater por igual).
const normalizarNome = (nome) =>
  String(nome || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Verifica (publicamente) se o nome completo informado corresponde EXATAMENTE ao
// nome de um aluno matriculado (vínculo discente ativo) em algum programa.
export const verificarAluno = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const alvo = normalizarNome(req.body.nome);
  if (!alvo) return res.status(400).json({ message: 'Informe o nome completo.' });

  const { rows } = await query(
    `SELECT 1
       FROM users u
       JOIN vinculos v ON v.pessoa_id = u.id
      WHERE v.ativo = TRUE
        AND v.papel = ANY($1::text[])
        AND lower(regexp_replace(btrim(u.perfil_nome), '\\s+', ' ', 'g')) = $2
      LIMIT 1`,
    [PAPEIS_DISCENTE_ATIVO, alvo]
  );
  res.json({ encontrado: rows.length > 0 });
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

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Formata 'YYYY-MM-DD' como '20 de agosto de 2025' (sem deslocamento de fuso).
const dataPorExtenso = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  const [, ano, mes, dia] = m;
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${ano}`;
};

// Forma adjetiva da língua para a declaração ("Língua INGLESA").
const LINGUA_ADJETIVO = { 'Português': 'PORTUGUESA', 'Inglês': 'INGLESA', 'Espanhol': 'ESPANHOLA' };
const linguasPorExtenso = (linguas) => {
  const adj = (linguas || []).map((l) => LINGUA_ADJETIVO[l] || l.toUpperCase());
  if (adj.length <= 1) return adj.join('');
  return `${adj.slice(0, -1).join(', ')} e ${adj[adj.length - 1]}`;
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

  // Data da prova vem do edital que abriu o período (proficienciaDataProva).
  const edital = insc.periodoId ? await editaisRepo.getById(insc.periodoId) : null;
  const dataProva = dataPorExtenso(edital?.proficienciaDataProva);

  const tipo = RESULTADO_LABEL[insc.resultado];
  const linguasAdj = linguasPorExtenso(insc.linguas);
  const plural = (insc.linguas || []).length > 1;
  const notaFmt = Number(insc.nota).toFixed(1).replace('.', ',');
  const dataEmissao = dataPorExtenso(new Date().toISOString().slice(0, 10));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="declaracao-proficiencia-${insc.id}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 72, right: 72 } });
  doc.pipe(res);

  // ----- Cabeçalho: brasão da República + identificação institucional -----
  const brasao = path.join(ASSETS_DIR, 'brasao-republica.png');
  if (existsSync(brasao)) {
    doc.image(brasao, doc.page.width / 2 - 30, doc.y, { width: 60 });
    doc.moveDown(0.5);
    doc.y += 38;
  }
  doc.fontSize(11).font('Helvetica-Bold')
    .text('UNIVERSIDADE FEDERAL RURAL DE PERNAMBUCO', { align: 'center' })
    .text('PRÓ-REITORIA DE PÓS-GRADUAÇÃO - PRPG', { align: 'center' })
    .text('NÚCLEO DE IDIOMAS - NID-NucLi/DL', { align: 'center' })
    .text('NÚCLEO DE INTERNACIONALIZAÇÃO - NINTER/INSTITUTO IPÊ', { align: 'center' });

  doc.moveDown(4);
  doc.fontSize(16).font('Helvetica-Bold').text('DECLARAÇÃO', { align: 'center' });
  doc.moveDown(4);

  // ----- Corpo -----
  doc.fontSize(12).font('Helvetica');
  doc.text('Declaramos, para os devidos fins, que ', { align: 'justify', lineGap: 6, continued: true })
    .font('Helvetica-Bold').text(insc.nome, { continued: true })
    .font('Helvetica').text(', CPF nº ', { continued: true })
    .font('Helvetica-Bold').text(insc.cpf, { continued: true })
    .font('Helvetica').text(', realizou o ', { continued: true })
    .font('Helvetica-Bold').text('Teste de Proficiência', { continued: true })
    .font('Helvetica').text(`${plural ? ' das Línguas ' : ' de Língua '}`, { continued: true })
    .font('Helvetica-Bold').text(linguasAdj, { continued: true })
    .font('Helvetica').text(
      ', promovido pela Pró-Reitoria de Pós-Graduação, em parceria com o Núcleo de Idiomas - NID '
      + 'e o Núcleo de Internacionalização do Instituto Ipê - NINTER/Ipê'
      + (dataProva ? `, no dia ${dataProva}` : '')
      + ', obtendo a ',
      { continued: true })
    .font('Helvetica-Bold').text('nota ', { continued: true })
    .font('Helvetica-Bold').text(notaFmt, { continued: true })
    .font('Helvetica').text(`, com resultado de ${tipo}, sendo, portanto, considerado(a) `, { continued: true })
    .font('Helvetica-Bold').text('APROVADO(A)', { continued: true })
    .font('Helvetica').text('.', { continued: false });

  doc.moveDown(1.5);
  doc.text('Esta declaração terá ', { align: 'justify', lineGap: 6, continued: true })
    .font('Helvetica-Bold').text('validade de 4 (quatro) anos', { continued: true })
    .font('Helvetica').text(', contados a partir da data de sua emissão.', { continued: false });

  doc.moveDown(3);
  if (dataEmissao) doc.text(`Recife, ${dataEmissao}.`, { align: 'right' });

  // ----- Assinatura -----
  doc.moveDown(4);
  const assinatura = path.join(ASSETS_DIR, 'assinatura-nid.png');
  if (existsSync(assinatura)) {
    const w = 200;
    doc.image(assinatura, doc.page.width / 2 - w / 2, doc.y, { width: w });
  } else {
    doc.fontSize(12).font('Helvetica-Bold').text('Prof.ª Flávia Farias de Oliveira', { align: 'center' });
    doc.font('Helvetica').text('Núcleo de Idiomas - NID', { align: 'center' });
    doc.text('SIAPE nº 1037173', { align: 'center' });
  }

  doc.end();
};
