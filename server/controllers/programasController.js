import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { query } from '../db/pool.js';
import {
  joinPessoa, pessoaReal, nomePessoa, campoPessoa, idsDaMesmaPessoa, pessoaCanonica,
} from '../db/identidadeVinculo.js';
import { pagesRepo, linhasPesquisaRepo } from '../db/repositories.js';
import { contatosRepo } from '../db/contatosRepo.js';
import { indicadoresDoPrograma } from '../db/indicadoresRepo.js';
import { serverError } from '../utils/httpError.js';
import { slugify } from '../utils/slug.js';
import { sqlPaginaComTexto, validarAjustes } from '../utils/micrositeMenu.js';
import { avaliarCores, normalizarHex } from '../utils/contraste.js';
import { contarModulos, menuDoPrograma, salvarAjustes, checklistDoPrograma } from '../db/micrositeRepo.js';
import { visivelPara, sqlPublicado } from '../utils/publicacao.js';
import { responderLista } from '../utils/listagem.js';

const intOrNull = (v) => (v === '' || v == null ? null : parseInt(v, 10));
const strOrNull = (v) => (v === '' || v == null ? null : v);
const arrOrEmpty = (v) => (Array.isArray(v) ? v : []);
const boolOr = (v, fallback = false) =>
  v === true || v === 'true' ? true : v === false || v === 'false' ? false : fallback;

const ALLOWED_STATUS = ['ATIVO', 'SUSPENSO', 'DESATIVADO', 'EM_AVALIACAO'];
const normalizeStatus = (v, fallback = 'ATIVO') => (ALLOWED_STATUS.includes(v) ? v : fallback);

// Slug do microsite (mesmo padrao usado em pagesController).
// Segmentos de topo ja usados pelo site da PRPG: nao podem virar slug de programa.
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'uploads', 'p', 'entrar', 'sobre', 'missao-visao-valores', 'historico',
  'estrutura-organizacional', 'equipe', 'financeiro', 'proext-pg', 'programas',
  'calendario-academico', 'editais', 'resolucoes', 'formularios',
  'relatorios-autoavaliacao', 'especializacao', 'residencia-profissional',
  'sobre-internacionalizacao', 'alunos-estrangeiros', 'capes-print',
  'mobilidade-estudantil', 'reconhecimento', 'noticias', 'noticia', 'minha-conta',
]);

// Resolve um slug unico, evitando reservados e colisoes (exclui o proprio id no update).
const resolveSlug = async (rawSlug, nome, currentId = null) => {
  let base = slugify(rawSlug) || slugify(nome) || 'programa';
  if (RESERVED_SLUGS.has(base)) base = `${base}-pg`;
  let slug = base;
  let count = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await query('SELECT id FROM programas WHERE slug = $1 LIMIT 1', [slug]);
    if (!rows[0] || rows[0].id === currentId) break;
    slug = `${base}-${count++}`;
  }
  return slug;
};

// Fase S.5: confere o contraste das cores do microsite antes de gravar.
// `atuais` = as cores já gravadas (update); só valida quando alguma cor muda,
// para um programa antigo com cores ruins ainda poder editar outros campos.
// Normaliza para '#rrggbb' (vazio -> null = padrão da PRPG). Devolve a
// mensagem de erro, ou null.
const validarCoresPrograma = (data, atuais = {}) => {
  const enviou = (c) => data[c] !== undefined;
  if (!enviou('cor_primaria') && !enviou('cor_secundaria')) return null;
  for (const c of ['cor_primaria', 'cor_secundaria']) {
    if (!enviou(c)) continue;
    const v = data[c];
    data[c] = v == null || String(v).trim() === '' ? null : (normalizarHex(v) || v);
  }
  const efetivas = {
    cor_primaria: enviou('cor_primaria') ? data.cor_primaria : atuais.cor_primaria,
    cor_secundaria: enviou('cor_secundaria') ? data.cor_secundaria : atuais.cor_secundaria,
  };
  const mudou = (efetivas.cor_primaria ?? null) !== (atuais.cor_primaria ?? null)
    || (efetivas.cor_secundaria ?? null) !== (atuais.cor_secundaria ?? null);
  if (!mudou) return null;
  const { ok, erros } = avaliarCores(efetivas);
  return ok ? null : erros.join(' ');
};

const checkAdmin = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded.roles && (decoded.roles.includes('Administrator') || decoded.roles.includes('Gestor'));
    } catch (e) {
      return false;
    }
  }
  return false;
};

const filterSensitivePessoa = (pessoa, isAdmin) => {
  if (!pessoa) return null;
  if (isAdmin) return pessoa;
  const { cpf, siape, telefones, email_institucional, email_funcao, endereco, usuario_id, ...rest } = pessoa;
  return rest;
};

// Carrega as modalidades (usadas junto com o JOIN de vínculos abaixo).
const loadModalidades = async () => (await query('SELECT * FROM modalidades')).rows;

// Fase B.3 (PLANO.md): um JOIN resolve pessoa e portaria por vínculo (antes
// era buildCombined, em JS). A pessoa vem de identidadeVinculo.js (B.11):
// `pessoas` é a fonte dos dados (G1); do login só vêm id e e-mail.
const VINCULOS_JOIN_SELECT = `
  SELECT v.*,
    u.id AS u_id, u.email AS u_email,
    row_to_json(p.*) AS p_json,
    ${pessoaReal('v.pessoa_id')} AS pessoa_real,
    po.title AS portaria_titulo, po.download_link AS portaria_download_link
  FROM vinculos v
  ${joinPessoa('v.pessoa_id')}
  LEFT JOIN portarias po ON po.id = v.portaria_id
`;

const VINCULO_ROW_KEYS = [
  'u_id', 'u_email',
  'p_json', 'pessoa_real', 'portaria_titulo', 'portaria_download_link',
];

// Objeto "combinado" (pessoa + vínculo + portaria) de uma linha do JOIN acima.
// `pessoa_id` = pessoas.id; `usuario_id` = login (o painel usa para vincular
// e editar; filterSensitivePessoa o tira da resposta pública).
const combinedFromRow = (row) => {
  if (!row.u_id && !row.p_json) return null;
  const resolvedPortaria = row.portaria_titulo != null
    ? { portaria_id: row.portaria_id, portaria: row.portaria_titulo, portaria_download_link: row.portaria_download_link }
    : { portaria_id: '', portaria: row.portaria || '', portaria_download_link: '' };
  const vFields = { ...row };
  for (const k of VINCULO_ROW_KEYS) delete vFields[k];
  const p = row.p_json || {};
  return {
    ...p,
    ...vFields,
    ...resolvedPortaria,
    pessoa_id: p.id ?? row.pessoa_real,
    usuario_id: row.u_id ?? null,
    nome: p.nome || row.u_email || '',
    cpf: p.cpf || '',
    siape: p.siape || '',
    email_institucional: p.email_institucional || row.u_email || '',
    telefones: p.telefones || '',
    endereco: vFields.endereco || '',
  };
};

export const getProgramas = async (req, res) => {
  try {
    const programas = (await query('SELECT * FROM programas ORDER BY nome')).rows;
    const modalidades = await loadModalidades();
    const { rows: vinculoRows } = await query(`${VINCULOS_JOIN_SELECT} WHERE v.ativo = TRUE`);
    const isAdmin = checkAdmin(req);
    const linhasPorPrograma = await linhasPesquisaRepo.getAllByPrograma();

    const result = programas.map((prog) => {
      const progModalidades = modalidades.filter((m) => m.programa_id === prog.id);
      const progVinculos = vinculoRows.filter((v) => v.programa_id === prog.id);

      let coordenador_atual = null, substituto = null, secretaria = null;
      progVinculos.forEach((v) => {
        const combined = combinedFromRow(v);
        if (!combined) return;
        if (v.papel === 'COORDENADOR_ATUAL') coordenador_atual = filterSensitivePessoa(combined, isAdmin);
        if (v.papel === 'SUBSTITUTO') substituto = filterSensitivePessoa(combined, isAdmin);
        if (v.papel === 'TAE') secretaria = filterSensitivePessoa(combined, isAdmin);
      });

      return {
        ...prog,
        modalidades: progModalidades,
        coordenador_atual, substituto, secretaria,
        linhas: linhasPorPrograma[prog.id] || [],
      };
    });

    // Sem ?page/?limit continua sendo o array inteiro (site público); o painel
    // pagina, busca e ordena no servidor (Fase U.3).
    responderLista(res, result, req.query, {
      busca: ['nome', 'sigla', 'campus'],
      ordenaveis: { nome: (p) => p.nome, sigla: (p) => p.sigla, campus: (p) => p.campus },
    });
  } catch (error) {
    serverError(res, 'Erro ao buscar programas', error);
  }
};

export const getProgramaById = async (req, res) => {
  try {
    const prog = (await query('SELECT * FROM programas WHERE id = $1', [req.params.id])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });

    const progModalidades = (await query('SELECT * FROM modalidades WHERE programa_id = $1', [prog.id])).rows;
    const { rows: progVinculos } = await query(`${VINCULOS_JOIN_SELECT} WHERE v.programa_id = $1`, [prog.id]);
    const isAdmin = checkAdmin(req);

    let coordenador_atual = null, substituto = null, secretaria = null;
    const historico_coordenadores = [];

    progVinculos.forEach((v) => {
      const combined = combinedFromRow(v);
      if (!combined) return;
      if (v.ativo) {
        if (v.papel === 'COORDENADOR_ATUAL') coordenador_atual = filterSensitivePessoa(combined, isAdmin);
        if (v.papel === 'SUBSTITUTO') substituto = filterSensitivePessoa(combined, isAdmin);
        if (v.papel === 'TAE') secretaria = filterSensitivePessoa(combined, isAdmin);
      }
      if (v.papel === 'COORDENADOR_ANTERIOR') {
        historico_coordenadores.push(filterSensitivePessoa(combined, isAdmin));
      }
    });

    // Ordena por início de mandato (mais recente primeiro); cai para criado_em quando ausente.
    const histKey = (x) => String(x.data_inicio_mandato || x.criado_em || '').slice(0, 10);
    historico_coordenadores.sort((a, b) => histKey(b).localeCompare(histKey(a)));

    const pagina_sobre = await pagesRepo.getFixed(prog.id, 'sobre');
    const linhas = await linhasPesquisaRepo.getByPrograma(prog.id);

    res.json({ ...prog, modalidades: progModalidades, coordenador_atual, substituto, secretaria, historico_coordenadores, pagina_sobre, linhas });
  } catch (error) {
    serverError(res, 'Erro ao buscar programa', error);
  }
};

// Busca pública do microsite por slug: programa + dirigentes + páginas (rich-text).
// Admin/Gestor da PRPG, ou o Gestor do próprio programa.
const podeVerRascunho = (user, programaId) => {
  const roles = user?.roles || [];
  if (roles.includes('Administrator') || roles.includes('Gestor')) return true;
  return roles.includes('GestorPrograma') && user.programaId === programaId;
};

export const getProgramaBySlug = async (req, res) => {
  try {
    const prog = (await query('SELECT * FROM programas WHERE slug = $1', [req.params.slug])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });
    // Microsite em rascunho (microsite_ativo=false) só aparece para quem pode
    // editá-lo — é a pré-visualização prometida pelo selo "Rascunho" do painel.
    // Para o público responde como inexistente.
    if (!prog.microsite_ativo && !podeVerRascunho(req.user, prog.id)) {
      return res.status(404).json({ message: 'Programa não encontrado' });
    }

    const progModalidades = (await query('SELECT * FROM modalidades WHERE programa_id = $1', [prog.id])).rows;
    const { rows: todosVinculos } = await query(`${VINCULOS_JOIN_SELECT} WHERE v.programa_id = $1`, [prog.id]);
    const progVinculos = todosVinculos.filter((v) => v.ativo);
    const isAdmin = checkAdmin(req);

    let coordenador_atual = null, substituto = null, secretaria = null;
    progVinculos.forEach((v) => {
      const combined = combinedFromRow(v);
      if (!combined) return;
      if (v.papel === 'COORDENADOR_ATUAL') coordenador_atual = filterSensitivePessoa(combined, isAdmin);
      if (v.papel === 'SUBSTITUTO') substituto = filterSensitivePessoa(combined, isAdmin);
      if (v.papel === 'TAE') secretaria = filterSensitivePessoa(combined, isAdmin);
    });

    // Rascunho/agendado só aparece para quem edita o programa (pré-visualização).
    const sobre = await pagesRepo.getFixed(prog.id, 'sobre');
    const pagina_sobre = sobre && visivelPara(req.user, sobre) ? sobre : null;
    // Páginas criadas pelo programa (não as fixas) — entram no submenu
    // "O Programa" do microsite.
    const paginas = (await pagesRepo.getByPrograma(prog.id)).filter((p) => visivelPara(req.user, p));
    const linhas = await linhasPesquisaRepo.getByPrograma(prog.id);
    // Fase G.9: contatos públicos (contatos.publico=true) — programa e pessoas
    // vinculadas a ele; celular/e-mail pessoal só aparecem se marcados um a um.
    const contatosPublicos = await contatosRepo.listPublicosPrograma(prog.id);

    // Conteúdo por módulo (menu e contadores da home) e o menu do microsite:
    // 4 grupos + Notícias/Documentos/Contato, só com o que tem conteúdo, com
    // os ajustes do programa (Fases S.1–S.3, server/db/micrositeRepo.js).
    const modulos = await contarModulos(prog.id);
    const menu = await menuDoPrograma(prog.id, req.user, { modulos });

    // Histórico de coordenadores (inativos, COORDENADOR_ANTERIOR).
    const historico_coordenadores = todosVinculos
      .filter((v) => v.papel === 'COORDENADOR_ANTERIOR')
      .map((v) => filterSensitivePessoa(combinedFromRow(v), isAdmin))
      .filter(Boolean)
      .sort((a, b) => (b.data_fim_mandato || '').localeCompare(a.data_fim_mandato || ''));

    // Comissões do programa (agrupadas por papel COMISSAO_*).
    const comissaoVinculos = progVinculos.filter((v) => v.papel?.startsWith('COMISSAO_'));
    const comissoes = {};
    comissaoVinculos.forEach((v) => {
      const combined = combinedFromRow(v);
      if (!combined) return;
      if (!comissoes[v.papel]) comissoes[v.papel] = [];
      comissoes[v.papel].push(filterSensitivePessoa(combined, isAdmin));
    });

    // Métrica mais recente para os contadores da home.
    const { rows: metricasRows } = await query(
      'SELECT * FROM metricas_anuais WHERE programa_id = $1 ORDER BY ano DESC LIMIT 1',
      [prog.id]
    );
    const metrica_recente = metricasRows[0] || null;

    res.json({ ...prog, modalidades: progModalidades, coordenador_atual, substituto, secretaria, pagina_sobre, paginas, linhas,
               modulos, menu, historico_coordenadores, comissoes, metrica_recente, contatos_publicos: contatosPublicos });
  } catch (error) {
    serverError(res, 'Erro ao buscar programa', error);
  }
};

// B.11: resolve (e valida) a pessoa de coordenador/substituto/secretaria antes
// de gravar qualquer coisa — id desconhecido vira 400 sem deixar o programa
// pela metade.
const canonizarDirigentes = async (data) => {
  for (const campo of ['coordenador_atual', 'substituto', 'secretaria']) {
    if (data[campo]?.pessoa_id) {
      data[campo] = { ...data[campo], pessoa_id: await pessoaCanonica(data[campo].pessoa_id) };
    }
  }
};

// Cria/atualiza/inativa o vínculo de uma pessoa num papel (regra de negócio
// preservada da versão em JSON).
const handlePessoaVinculo = async (payloadData, papel, programa_id) => {
  if (!payloadData || !payloadData.pessoa_id) return;
  const pessoaId = payloadData.pessoa_id;

  const existing = (
    await query('SELECT * FROM vinculos WHERE programa_id = $1 AND papel = $2 AND ativo = TRUE LIMIT 1', [programa_id, papel])
  ).rows[0];

  const props = {
    portaria_id: payloadData.portaria_id || '',
    portaria: payloadData.portaria || '',
    data_vencimento: payloadData.data_vencimento || null,
    email_funcao: payloadData.email_funcao || '',
    endereco: papel === 'TAE' ? (payloadData.endereco || '') : null,
    data_inicio_mandato: payloadData.data_inicio_mandato || null,
  };

  // O painel manda users.id; o vínculo pode estar gravado com o pessoas.id da
  // mesma pessoa (B.11) — isso não é troca de coordenador.
  const mesmaPessoa = !!existing && (await idsDaMesmaPessoa(pessoaId)).includes(existing.pessoa_id);
  if (existing && papel === 'COORDENADOR_ATUAL' && !mesmaPessoa) {
    // Encerra o mandato do coordenador anterior (preserva valores já gravados).
    const hoje = new Date().toISOString().slice(0, 10);
    await query(
      `UPDATE vinculos SET ativo = FALSE, papel = 'COORDENADOR_ANTERIOR',
         data_fim_mandato = COALESCE(data_fim_mandato, $2),
         motivo_encerramento = COALESCE(motivo_encerramento, 'FIM_MANDATO')
       WHERE id = $1`,
      [existing.id, hoje]
    );
    await insertVinculo(programa_id, pessoaId, papel, props);
  } else if (existing) {
    await query(
      `UPDATE vinculos SET pessoa_id=$1, portaria_id=$2, portaria=$3, data_vencimento=$4, email_funcao=$5, endereco=$6,
         data_inicio_mandato=COALESCE($7, data_inicio_mandato) WHERE id=$8`,
      [pessoaId, props.portaria_id, props.portaria, props.data_vencimento, props.email_funcao, props.endereco,
       props.data_inicio_mandato, existing.id]
    );
  } else {
    await insertVinculo(programa_id, pessoaId, papel, props);
  }
};

const insertVinculo = (programa_id, pessoaId, papel, props) =>
  query(
    `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, portaria_id, portaria, data_vencimento, email_funcao, endereco, data_inicio_mandato, ativo, criado_em)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11)`,
    [crypto.randomUUID(), programa_id, pessoaId, papel, props.portaria_id, props.portaria,
     props.data_vencimento, props.email_funcao, props.endereco, props.data_inicio_mandato || null, new Date().toISOString()]
  );

const replaceModalidades = async (programa_id, modalidades) => {
  if (!Array.isArray(modalidades)) return;
  await query('DELETE FROM modalidades WHERE programa_id = $1', [programa_id]);
  for (const m of modalidades) {
    await query(
      'INSERT INTO modalidades (id, programa_id, tipo, ano_inicio, nota_capes) VALUES ($1,$2,$3,$4,$5)',
      [m.id || crypto.randomUUID(), programa_id, m.tipo, intOrNull(m.ano_inicio), m.nota_capes || '']
    );
  }
};

export const createPrograma = async (req, res) => {
  try {
    const data = req.body || {};
    const erroCores = validarCoresPrograma(data);
    if (erroCores) return res.status(400).json({ message: erroCores, campo: 'cores' });
    await canonizarDirigentes(data);
    const progId = crypto.randomUUID();
    const now = new Date().toISOString();
    const actor = req.user?.id || null;
    const slug = await resolveSlug(data.slug, data.nome, progId);

    await query(
      `INSERT INTO programas
        (id,nome,sigla,codigo_capes,campus,em_rede,nome_rede,grande_area,
         area_conhecimento,area_avaliacao,
         status,status_descricao,data_credenciamento,data_descredenciamento,
         bloco,sala,cep,telefone_secretaria,horario_atendimento,email_programa,
         regimento_url,regulamento_url,sucupira_url,palavras_chave,
         slug,microsite_ativo,logo_url,cor_primaria,cor_secundaria,descricao_curta,
         hero_imagem_url,endereco,whatsapp,instagram_url,facebook_url,youtube_url,mapa_embed,
         criado_em,atualizado_em,criado_por,atualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
               $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
               $25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,
               $38,$38,$39,$39)`,
      [progId, data.nome, data.sigla ? data.sigla.toUpperCase() : '',
       data.codigo_capes || '', data.campus || 'SEDE', data.em_rede || false, data.nome_rede || '',
       data.grande_area || '', data.area_conhecimento || '', data.area_avaliacao || '',
       normalizeStatus(data.status), strOrNull(data.status_descricao),
       strOrNull(data.data_credenciamento), strOrNull(data.data_descredenciamento),
       strOrNull(data.bloco), strOrNull(data.sala), strOrNull(data.cep),
       strOrNull(data.telefone_secretaria), strOrNull(data.horario_atendimento),
       strOrNull(data.email_programa), strOrNull(data.regimento_url),
       strOrNull(data.regulamento_url), strOrNull(data.sucupira_url),
       arrOrEmpty(data.palavras_chave),
       slug, boolOr(data.microsite_ativo), strOrNull(data.logo_url),
       strOrNull(data.cor_primaria), strOrNull(data.cor_secundaria), strOrNull(data.descricao_curta),
       strOrNull(data.hero_imagem_url), strOrNull(data.endereco), strOrNull(data.whatsapp),
       strOrNull(data.instagram_url), strOrNull(data.facebook_url), strOrNull(data.youtube_url),
       strOrNull(data.mapa_embed),
       now, actor]
    );

    await replaceModalidades(progId, data.modalidades);
    await handlePessoaVinculo(data.coordenador_atual, 'COORDENADOR_ATUAL', progId);
    await handlePessoaVinculo(data.substituto, 'SUBSTITUTO', progId);
    await handlePessoaVinculo(data.secretaria, 'TAE', progId);
    await pagesRepo.ensureFixedPages(progId, actor);

    res.status(201).json({ message: 'Programa criado com sucesso', id: progId, slug });
  } catch (error) {
    serverError(res, 'Erro ao criar programa', error);
  }
};

export const updatePrograma = async (req, res) => {
  try {
    const progId = req.params.id;
    const existing = (await query('SELECT * FROM programas WHERE id = $1', [progId])).rows[0];
    if (!existing) return res.status(404).json({ message: 'Programa não encontrado' });

    const data = req.body || {};
    const erroCores = validarCoresPrograma(data, existing);
    if (erroCores) return res.status(400).json({ message: erroCores, campo: 'cores' });
    await canonizarDirigentes(data);
    const pick = (val, fallback) => (val !== undefined ? val : fallback);
    const actor = req.user?.id || null;

    // Recalcula o slug se foi enviado (ou se o programa ainda nao tinha um).
    let slug = existing.slug;
    if (data.slug !== undefined || !existing.slug) {
      slug = await resolveSlug(data.slug ?? existing.slug, data.nome || existing.nome, progId);
    }

    await query(
      `UPDATE programas SET nome=$1, sigla=$2, codigo_capes=$3, campus=$4, em_rede=$5,
        nome_rede=$6, grande_area=$7, area_conhecimento=$8, area_avaliacao=$9,
        status=$10, status_descricao=$11, data_credenciamento=$12, data_descredenciamento=$13,
        bloco=$14, sala=$15, cep=$16, telefone_secretaria=$17, horario_atendimento=$18,
        email_programa=$19, regimento_url=$20, regulamento_url=$21, sucupira_url=$22,
        palavras_chave=$23,
        slug=$26, microsite_ativo=$27, logo_url=$28, cor_primaria=$29, cor_secundaria=$30,
        descricao_curta=$31, hero_imagem_url=$32, endereco=$33, whatsapp=$34,
        instagram_url=$35, facebook_url=$36, youtube_url=$37, mapa_embed=$38,
        atualizado_em=$24, atualizado_por=COALESCE($25, atualizado_por)
       WHERE id=$39`,
      [
        data.nome || existing.nome,
        data.sigla ? data.sigla.toUpperCase() : existing.sigla,
        pick(data.codigo_capes, existing.codigo_capes),
        data.campus || existing.campus, pick(data.em_rede, existing.em_rede),
        pick(data.nome_rede, existing.nome_rede), pick(data.grande_area, existing.grande_area),
        pick(data.area_conhecimento, existing.area_conhecimento),
        pick(data.area_avaliacao, existing.area_avaliacao),
        normalizeStatus(data.status, existing.status),
        pick(data.status_descricao, existing.status_descricao),
        pick(data.data_credenciamento, existing.data_credenciamento),
        pick(data.data_descredenciamento, existing.data_descredenciamento),
        pick(data.bloco, existing.bloco), pick(data.sala, existing.sala),
        pick(data.cep, existing.cep), pick(data.telefone_secretaria, existing.telefone_secretaria),
        pick(data.horario_atendimento, existing.horario_atendimento),
        pick(data.email_programa, existing.email_programa),
        pick(data.regimento_url, existing.regimento_url),
        pick(data.regulamento_url, existing.regulamento_url),
        pick(data.sucupira_url, existing.sucupira_url),
        Array.isArray(data.palavras_chave) ? data.palavras_chave : existing.palavras_chave,
        new Date().toISOString(), actor,
        slug,
        data.microsite_ativo !== undefined ? boolOr(data.microsite_ativo) : existing.microsite_ativo,
        pick(data.logo_url, existing.logo_url), pick(data.cor_primaria, existing.cor_primaria),
        pick(data.cor_secundaria, existing.cor_secundaria), pick(data.descricao_curta, existing.descricao_curta),
        pick(data.hero_imagem_url, existing.hero_imagem_url), pick(data.endereco, existing.endereco),
        pick(data.whatsapp, existing.whatsapp), pick(data.instagram_url, existing.instagram_url),
        pick(data.facebook_url, existing.facebook_url), pick(data.youtube_url, existing.youtube_url),
        pick(data.mapa_embed, existing.mapa_embed),
        progId,
      ]
    );

    if (data.modalidades !== undefined) await replaceModalidades(progId, data.modalidades);
    await handlePessoaVinculo(data.coordenador_atual, 'COORDENADOR_ATUAL', progId);
    await handlePessoaVinculo(data.substituto, 'SUBSTITUTO', progId);
    await handlePessoaVinculo(data.secretaria, 'TAE', progId);
    await pagesRepo.ensureFixedPages(progId, actor); // auto-cura: garante as paginas fixas mesmo p/ programas antigos

    res.json({ message: 'Programa atualizado com sucesso', slug });
  } catch (error) {
    serverError(res, 'Erro ao atualizar programa', error);
  }
};

export const deletePrograma = async (req, res) => {
  try {
    // Páginas comuns do programa sobrevivem como páginas gerais (FK
    // ON DELETE SET NULL — comportamento preexistente, intencional). A
    // página FIXA precisa ser removida à parte: virar geral com slug/chave
    // 'sobre' colidiria para sempre com a rota institucional /sobre da PRPG.
    await query('DELETE FROM pages WHERE programa_id = $1 AND chave IS NOT NULL', [req.params.id]);
    // Modalidades e vínculos saem em cascata (FK ON DELETE CASCADE).
    const { rowCount } = await query('DELETE FROM programas WHERE id = $1', [req.params.id]);
    if (rowCount > 0) res.json({ message: 'Programa removido com sucesso' });
    else res.status(404).json({ message: 'Programa não encontrado' });
  } catch (error) {
    serverError(res, 'Erro ao remover programa', error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Busca interna do microsite (Fase 4)
// ──────────────────────────────────────────────────────────────────────────────

export const buscaPrograma = async (req, res) => {
  try {
    const prog = (await query('SELECT id FROM programas WHERE slug = $1', [req.params.slug])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });

    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    const like = `%${q}%`;
    const pid = prog.id;

    const [news, editais, disciplinas, teses, faq, grupos, paginas] = await Promise.all([
      query(
        `SELECT id, title AS titulo, excerpt AS resumo, 'noticia' AS tipo FROM news
         WHERE programa_id = $1 AND ${sqlPublicado()} AND (title ILIKE $2 OR excerpt ILIKE $2 OR content::text ILIKE $2) LIMIT 5`,
        [pid, like]
      ),
      query(
        `SELECT id, title AS titulo, description AS resumo, 'edital' AS tipo FROM editais
         WHERE programa_id = $1 AND ${sqlPublicado()} AND (title ILIKE $2 OR description ILIKE $2) LIMIT 5`,
        [pid, like]
      ),
      query(
        `SELECT id, title AS titulo, '' AS resumo, 'disciplina' AS tipo FROM disciplinas
         WHERE programa_id = $1 AND ${sqlPublicado()} AND title ILIKE $2 LIMIT 5`,
        [pid, like]
      ),
      query(
        `SELECT id, title AS titulo, '' AS resumo, 'tese' AS tipo FROM teses_dissertacoes
         WHERE programa_id = $1 AND ${sqlPublicado()} AND title ILIKE $2 LIMIT 5`,
        [pid, like]
      ),
      query(
        `SELECT id, title AS titulo, '' AS resumo, 'faq' AS tipo FROM faq
         WHERE programa_id = $1 AND ${sqlPublicado()} AND (title ILIKE $2 OR resposta ILIKE $2) LIMIT 5`,
        [pid, like]
      ),
      query(
        `SELECT id, title AS titulo, '' AS resumo, 'grupo' AS tipo FROM grupos_pesquisa
         WHERE programa_id = $1 AND ${sqlPublicado()} AND title ILIKE $2 LIMIT 5`,
        [pid, like]
      ),
      query(
        `SELECT id, slug, title AS titulo, body_summary AS resumo, 'pagina' AS tipo FROM pages
         WHERE programa_id = $1 AND ${sqlPublicado()} AND ${sqlPaginaComTexto()}
           AND (title ILIKE $2 OR body_value ILIKE $2 OR body_summary ILIKE $2) LIMIT 5`,
        [pid, like]
      ),
    ]);

    const results = [
      ...news.rows, ...editais.rows, ...disciplinas.rows,
      ...teses.rows, ...faq.rows, ...grupos.rows, ...paginas.rows,
    ].map((r) => ({ ...r, resumo: r.resumo || '' }));

    res.json(results);
  } catch (error) {
    serverError(res, 'Erro na busca', error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Corpo Docente (Fase 3)
// ──────────────────────────────────────────────────────────────────────────────

export const PAPEIS_DOCENTE = ['DOCENTE_PERMANENTE', 'DOCENTE_COLABORADOR', 'DOCENTE_VISITANTE'];

// Membros ativos de um programa em certos papéis, com a pessoa resolvida
// (identidadeVinculo.js) — base das listas públicas e do painel.
const membrosDoPrograma = async (programaId, papeis) => (await query(
  `SELECT v.id, v.papel, v.email_funcao, ${pessoaReal('v.pessoa_id')} AS pessoa_id, u.id AS usuario_id,
          COALESCE(${nomePessoa()}, v.pessoa_id) AS nome,
          ${campoPessoa('foto_url')} AS foto_url, u.programa_id,
          ${campoPessoa('lattes')} AS lattes,
          ${campoPessoa('orcid')} AS orcid,
          ${campoPessoa('google_scholar')} AS google_scholar,
          (u.id IS NOT NULL OR p.id IS NOT NULL) AS resolvido
     FROM vinculos v ${joinPessoa('v.pessoa_id')}
    WHERE v.programa_id = $1 AND v.ativo = TRUE AND v.papel = ANY($2::text[])
    ORDER BY v.papel, v.criado_em`,
  [programaId, papeis]
)).rows;

// Endpoint público: docentes do programa por slug (sem dados sensíveis).
export const getProgramaDocentesPublic = async (req, res) => {
  try {
    const prog = (await query('SELECT id FROM programas WHERE slug = $1', [req.params.slug])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });
    const membros = await membrosDoPrograma(prog.id, PAPEIS_DOCENTE);
    res.json(membros.filter((m) => m.resolvido).map((m) => ({
      id: m.id, pessoa_id: m.pessoa_id, papel: m.papel, nome: m.nome, foto_url: m.foto_url,
      lattes: m.lattes, orcid: m.orcid, google_scholar: m.google_scholar, email_funcao: m.email_funcao || null,
    })));
  } catch (error) {
    serverError(res, 'Erro ao buscar docentes', error);
  }
};

// Endpoint admin: docentes do programa por ID.
export const getDocentesAdmin = async (req, res) => {
  try {
    const membros = await membrosDoPrograma(req.params.id, PAPEIS_DOCENTE);
    res.json(membros.map((m) => ({
      id: m.id, pessoa_id: m.pessoa_id, usuario_id: m.usuario_id, papel: m.papel,
      email_funcao: m.email_funcao || '', nome: m.nome, foto_url: m.foto_url, programa_id: m.programa_id || null,
    })));
  } catch (error) {
    serverError(res, 'Erro ao listar docentes', error);
  }
};

// Adiciona docente ao programa.
export const addDocente = async (req, res) => {
  try {
    const { pessoa_id, papel, email_funcao } = req.body || {};
    if (!pessoa_id) return res.status(400).json({ message: 'pessoa_id é obrigatório' });
    if (!PAPEIS_DOCENTE.includes(papel)) return res.status(400).json({ message: 'papel inválido' });

    const pessoaId = await pessoaCanonica(pessoa_id);
    const ids = await idsDaMesmaPessoa(pessoaId);
    const existing = (
      await query(
        'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id = ANY($2::text[]) AND papel=ANY($3::text[]) AND ativo=TRUE',
        [req.params.id, ids, PAPEIS_DOCENTE]
      )
    ).rows[0];
    if (existing) return res.status(409).json({ message: 'Docente já vinculado neste programa' });

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, email_funcao, ativo, criado_em)
       VALUES ($1,$2,$3,$4,$5,TRUE,$6)`,
      [id, req.params.id, pessoaId, papel, email_funcao || null, new Date().toISOString()]
    );
    res.status(201).json({ message: 'Docente adicionado', id });
  } catch (error) {
    serverError(res, 'Erro ao adicionar docente', error);
  }
};

// Remove (inativa) vínculo de docente. O professor permanece na base — apenas
// deixa de pertencer a este programa. B.13/G1: perfil_professor.programas é
// derivado dos vínculos docentes ativos (usersRepo), então não há array a manter
// em sincronia. Se ficar sem nenhum programa, fica como "Sem vínculo" na lista.
export const removeDocente = async (req, res) => {
  try {
    const { rowCount } = await query(
      `UPDATE vinculos SET ativo=FALSE WHERE id=$1 AND programa_id=$2 AND papel=ANY($3::text[])`,
      [req.params.vinculoId, req.params.id, PAPEIS_DOCENTE]
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Vínculo não encontrado' });
    res.json({ message: 'Docente removido' });
  } catch (error) {
    serverError(res, 'Erro ao remover docente', error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Corpo Discente
// ──────────────────────────────────────────────────────────────────────────────

export const PAPEIS_DISCENTE = ['DISCENTE_MESTRADO', 'DISCENTE_DOUTORADO', 'DISCENTE_PROFISSIONAL', 'EGRESSO'];

export const PAPEIS_DISCENTE_LABEL = {
  DISCENTE_MESTRADO:     'Mestrando(a)',
  DISCENTE_DOUTORADO:    'Doutorando(a)',
  DISCENTE_PROFISSIONAL: 'Mestrando(a) Profissional',
  EGRESSO:               'Egresso(a)',
};

// Endpoint público: discentes do programa por slug.
export const getProgramaDiscentesPublic = async (req, res) => {
  try {
    const prog = (await query('SELECT id FROM programas WHERE slug=$1', [req.params.slug])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });
    const membros = await membrosDoPrograma(prog.id, PAPEIS_DISCENTE);
    res.json(membros.filter((m) => m.resolvido).map((m) => ({
      id: m.id, pessoa_id: m.pessoa_id, papel: m.papel, nome: m.nome, foto_url: m.foto_url,
      lattes: m.lattes, orcid: m.orcid, google_scholar: m.google_scholar,
    })));
  } catch (error) {
    serverError(res, 'Erro ao buscar discentes', error);
  }
};

// Endpoint admin: discentes do programa por ID.
export const getDiscentesAdmin = async (req, res) => {
  try {
    const membros = await membrosDoPrograma(req.params.id, PAPEIS_DISCENTE);
    res.json(membros.map((m) => ({
      id: m.id, pessoa_id: m.pessoa_id, usuario_id: m.usuario_id, papel: m.papel,
      nome: m.nome, foto_url: m.foto_url, programa_id: m.programa_id || null,
    })));
  } catch (error) {
    serverError(res, 'Erro ao listar discentes', error);
  }
};

export const addDiscente = async (req, res) => {
  try {
    const { pessoa_id, papel } = req.body || {};
    if (!pessoa_id) return res.status(400).json({ message: 'pessoa_id obrigatório' });
    if (!PAPEIS_DISCENTE.includes(papel)) return res.status(400).json({ message: 'papel inválido' });
    const pessoaId = await pessoaCanonica(pessoa_id);
    const ids = await idsDaMesmaPessoa(pessoaId);
    const existing = (await query(
      'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id = ANY($2::text[]) AND papel=ANY($3::text[]) AND ativo=TRUE',
      [req.params.id, ids, PAPEIS_DISCENTE]
    )).rows[0];
    if (existing) return res.status(409).json({ message: 'Discente já vinculado neste programa' });
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em) VALUES ($1,$2,$3,$4,TRUE,$5)`,
      [id, req.params.id, pessoaId, papel, new Date().toISOString()]
    );
    res.status(201).json({ message: 'Discente adicionado', id });
  } catch (error) {
    serverError(res, 'Erro ao adicionar discente', error);
  }
};

export const removeDiscente = async (req, res) => {
  try {
    const { rowCount } = await query(
      `UPDATE vinculos SET ativo=FALSE WHERE id=$1 AND programa_id=$2 AND papel=ANY($3::text[])`,
      [req.params.vinculoId, req.params.id, PAPEIS_DISCENTE]
    );
    if (rowCount > 0) res.json({ message: 'Discente removido' });
    else res.status(404).json({ message: 'Vínculo não encontrado' });
  } catch (error) {
    serverError(res, 'Erro ao remover discente', error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Comissões do programa (Fase 5)
// ──────────────────────────────────────────────────────────────────────────────

export const TIPOS_COMISSAO = {
  COMISSAO_CPG: 'Câmara/CPG',
  COMISSAO_BOLSAS: 'Bolsas',
  COMISSAO_SELECAO: 'Seleção',
  COMISSAO_PESQUISA: 'Pesquisa',
  COMISSAO_ORIENTACAO: 'Orientação',
};

const PAPEIS_COMISSAO = Object.keys(TIPOS_COMISSAO);

export const getComissoesAdmin = async (req, res) => {
  try {
    const membros = await membrosDoPrograma(req.params.id, PAPEIS_COMISSAO);
    res.json(membros.map((m) => ({
      id: m.id, pessoa_id: m.pessoa_id, usuario_id: m.usuario_id, papel: m.papel, nome: m.nome, foto_url: m.foto_url,
    })));
  } catch (error) {
    serverError(res, 'Erro ao listar comissões', error);
  }
};

export const addComissaoMembro = async (req, res) => {
  try {
    const { pessoa_id, papel } = req.body || {};
    if (!pessoa_id) return res.status(400).json({ message: 'pessoa_id obrigatório' });
    if (!PAPEIS_COMISSAO.includes(papel)) return res.status(400).json({ message: 'papel inválido' });
    const pessoaId = await pessoaCanonica(pessoa_id);
    const ids = await idsDaMesmaPessoa(pessoaId);
    const existing = (await query(
      'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id = ANY($2::text[]) AND papel=$3 AND ativo=TRUE',
      [req.params.id, ids, papel]
    )).rows[0];
    if (existing) return res.status(409).json({ message: 'Membro já vinculado nesta comissão' });
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em) VALUES ($1,$2,$3,$4,TRUE,$5)`,
      [id, req.params.id, pessoaId, papel, new Date().toISOString()]
    );
    res.status(201).json({ message: 'Membro adicionado', id });
  } catch (error) {
    serverError(res, 'Erro ao adicionar membro', error);
  }
};

export const removeComissaoMembro = async (req, res) => {
  try {
    const { rowCount } = await query(
      `UPDATE vinculos SET ativo=FALSE WHERE id=$1 AND programa_id=$2 AND papel=ANY($3::text[])`,
      [req.params.vinculoId, req.params.id, PAPEIS_COMISSAO]
    );
    if (rowCount > 0) res.json({ message: 'Membro removido' });
    else res.status(404).json({ message: 'Vínculo não encontrado' });
  } catch (error) {
    serverError(res, 'Erro ao remover membro', error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Métricas anuais públicas (Fase 5)
// ──────────────────────────────────────────────────────────────────────────────

// Indicadores por ano (Fase N.9): calculados dos vínculos e teses + os
// informados em metricas_anuais para o que não dá para calcular. Aceita o
// slug ou o id do programa (o painel usa o id).
export const getProgramaMetricasPublic = async (req, res) => {
  try {
    const prog = (await query('SELECT id FROM programas WHERE slug = $1 OR id = $1', [req.params.slug])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });
    res.json(await indicadoresDoPrograma(prog.id));
  } catch (error) {
    serverError(res, 'Erro ao buscar métricas', error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Linhas de Pesquisa por programa
// ──────────────────────────────────────────────────────────────────────────────

export const getProgramaLinhas = async (req, res) => {
  try {
    const rows = await linhasPesquisaRepo.getByPrograma(req.params.id);
    res.json(rows);
  } catch (error) {
    serverError(res, 'Erro ao buscar linhas', error);
  }
};

export const updateProgramaLinhas = async (req, res) => {
  try {
    const { linha_ids } = req.body || {};
    if (!Array.isArray(linha_ids)) return res.status(400).json({ message: 'linha_ids deve ser um array' });
    const ids = linha_ids.map(Number).filter((n) => !isNaN(n) && n > 0);
    const rows = await linhasPesquisaRepo.setForPrograma(req.params.id, ids);
    res.json(rows);
  } catch (error) {
    serverError(res, 'Erro ao atualizar linhas', error);
  }
};

// ===================== Menu do microsite (Fase S.3) =====================
// Editor do painel: o menu inteiro, com o que está oculto ou sem conteúdo.
export const getMenuPrograma = async (req, res) => {
  const { rows } = await query('SELECT id FROM programas WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Programa não encontrado' });
  res.json(await menuDoPrograma(req.params.id, req.user, { todos: true }));
};

// Grava ocultar/reordenar/renomear/mudar de grupo. Recebe { itens: [{ chave,
// rotulo, grupo, ordem, oculto }] } — o menu inteiro, que substitui o anterior.
export const updateMenuPrograma = async (req, res) => {
  const { rows } = await query('SELECT id FROM programas WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Programa não encontrado' });
  const paginaIds = (await pagesRepo.getByPrograma(req.params.id)).map((p) => p.id);
  let linhas;
  try {
    linhas = validarAjustes(req.body?.itens, paginaIds);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
  await salvarAjustes(req.params.id, linhas, req.user?.id);
  res.json(await menuDoPrograma(req.params.id, req.user, { todos: true }));
};

// Checklist de publicação do microsite (Fase S.4) — tela "Site do Programa".
export const getChecklistPrograma = async (req, res) => {
  const checklist = await checklistDoPrograma(req.params.id);
  if (!checklist) return res.status(404).json({ message: 'Programa não encontrado' });
  res.json(checklist);
};
