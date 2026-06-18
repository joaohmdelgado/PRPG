import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { query } from '../db/pool.js';
import { usersRepo, portariasRepo, programaPaginasRepo, linhasPesquisaRepo } from '../db/repositories.js';
import { sanitizeHtml } from '../utils/sanitize.js';

const intOrNull = (v) => (v === '' || v == null ? null : parseInt(v, 10));
const strOrNull = (v) => (v === '' || v == null ? null : v);
const arrOrEmpty = (v) => (Array.isArray(v) ? v : []);
const boolOr = (v, fallback = false) =>
  v === true || v === 'true' ? true : v === false || v === 'false' ? false : fallback;

const ALLOWED_STATUS = ['ATIVO', 'SUSPENSO', 'DESATIVADO', 'EM_AVALIACAO'];
const normalizeStatus = (v, fallback = 'ATIVO') => (ALLOWED_STATUS.includes(v) ? v : fallback);

// Slug do microsite (mesmo padrao usado em pagesController).
const slugify = (text) =>
  (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/(^-|-$)+/g, '');

// Segmentos de topo ja usados pelo site da PRPG: nao podem virar slug de programa.
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'uploads', 'p', 'sobre', 'missao-visao-valores', 'historico',
  'estrutura-organizacional', 'equipe', 'financeiro', 'proext-pg', 'programas',
  'calendario-academico', 'editais', 'resolucoes', 'formularios',
  'relatorios-autoavaliacao', 'especializacao', 'residencia-profissional',
  'sobre-internacionalizacao', 'alunos-estrangeiros', 'capes-print',
  'mobilidade-estudantil', 'reconhecimento', 'noticias', 'noticia',
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
  const { cpf, siape, telefones, email_institucional, email_funcao, endereco, ...rest } = pessoa;
  return rest;
};

// Carrega os dados relacionados a programas (todos como arrays simples).
const loadRelated = async () => {
  const [modalidades, vinculos, pessoas, users, portarias] = await Promise.all([
    query('SELECT * FROM modalidades').then((r) => r.rows),
    query('SELECT * FROM vinculos').then((r) => r.rows),
    query('SELECT * FROM pessoas').then((r) => r.rows),
    usersRepo.getAll(),
    portariasRepo.getAll(),
  ]);
  return { modalidades, vinculos, pessoas, users, portarias };
};

// Resolve um vínculo numa pessoa "combinada" (dados + portaria), reaproveitada
// tanto na listagem quanto no detalhe.
const buildCombined = (v, { users, pessoas, portarias }) => {
  const user = users.find((u) => u.id === v.pessoa_id);
  const portariaObj = portarias.find((p) => p.id === v.portaria_id);
  const resolvedPortaria = portariaObj
    ? { portaria_id: v.portaria_id, portaria: portariaObj.title, portaria_download_link: portariaObj.downloadLink }
    : { portaria_id: '', portaria: v.portaria || '', portaria_download_link: '' };

  if (user) {
    return {
      pessoa_id: user.id,
      nome: user.perfil_geral?.nome || user.email,
      cpf: user.perfil_geral?.cpf || '',
      siape: user.perfil_geral?.siape || '',
      email_institucional: user.email,
      telefones: Array.isArray(user.perfil_geral?.telefones)
        ? user.perfil_geral.telefones.join(', ')
        : (user.perfil_geral?.telefones || ''),
      endereco: v.endereco || user.perfil_geral?.endereco || '',
      ...v,
      ...resolvedPortaria,
    };
  }
  const pessoa = pessoas.find((p) => p.id === v.pessoa_id);
  if (pessoa) {
    return { ...pessoa, pessoa_id: pessoa.id, ...v, ...resolvedPortaria };
  }
  return null;
};

export const getProgramas = async (req, res) => {
  try {
    const programas = (await query('SELECT * FROM programas ORDER BY nome')).rows;
    const related = await loadRelated();
    const isAdmin = checkAdmin(req);
    const linhasPorPrograma = await linhasPesquisaRepo.getAllByPrograma();

    const result = programas.map((prog) => {
      const progModalidades = related.modalidades.filter((m) => m.programa_id === prog.id);
      const progVinculos = related.vinculos.filter((v) => v.programa_id === prog.id && v.ativo);

      let coordenador_atual = null, substituto = null, secretaria = null;
      progVinculos.forEach((v) => {
        const combined = buildCombined(v, related);
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

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar programas', error: error.message });
  }
};

export const getProgramaById = async (req, res) => {
  try {
    const prog = (await query('SELECT * FROM programas WHERE id = $1', [req.params.id])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });

    const related = await loadRelated();
    const isAdmin = checkAdmin(req);

    const progModalidades = related.modalidades.filter((m) => m.programa_id === prog.id);
    const progVinculos = related.vinculos.filter((v) => v.programa_id === prog.id);

    let coordenador_atual = null, substituto = null, secretaria = null;
    const historico_coordenadores = [];

    progVinculos.forEach((v) => {
      const combined = buildCombined(v, related);
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

    const paginas = await programaPaginasRepo.getByPrograma(prog.id, { includeHidden: isAdmin });
    const linhas = await linhasPesquisaRepo.getByPrograma(prog.id);

    res.json({ ...prog, modalidades: progModalidades, coordenador_atual, substituto, secretaria, historico_coordenadores, paginas, linhas });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar programa', error: error.message });
  }
};

// Busca pública do microsite por slug: programa + dirigentes + páginas (rich-text).
export const getProgramaBySlug = async (req, res) => {
  try {
    const prog = (await query('SELECT * FROM programas WHERE slug = $1', [req.params.slug])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });

    const related = await loadRelated();
    const isAdmin = checkAdmin(req);

    const progModalidades = related.modalidades.filter((m) => m.programa_id === prog.id);
    const progVinculos = related.vinculos.filter((v) => v.programa_id === prog.id && v.ativo);

    let coordenador_atual = null, substituto = null, secretaria = null;
    progVinculos.forEach((v) => {
      const combined = buildCombined(v, related);
      if (!combined) return;
      if (v.papel === 'COORDENADOR_ATUAL') coordenador_atual = filterSensitivePessoa(combined, isAdmin);
      if (v.papel === 'SUBSTITUTO') substituto = filterSensitivePessoa(combined, isAdmin);
      if (v.papel === 'TAE') secretaria = filterSensitivePessoa(combined, isAdmin);
    });

    const paginas = await programaPaginasRepo.getByPrograma(prog.id, { includeHidden: isAdmin });
    const linhas = await linhasPesquisaRepo.getByPrograma(prog.id);

    // Conta itens por módulo para o menu dinâmico do microsite.
    const MODULOS_TABELAS = [
      ['disciplinas', 'disciplinas'],
      ['teses', 'teses_dissertacoes'],
      ['faq', 'faq'],
      ['grupos', 'grupos_pesquisa'],
      ['resolucoes', 'resolucoes'],
      ['formularios', 'formularios'],
    ];
    const modulos = {};
    await Promise.all(MODULOS_TABELAS.map(async ([key, tbl]) => {
      const { rows } = await query(`SELECT count(*)::int AS n FROM ${tbl} WHERE programa_id = $1`, [prog.id]);
      modulos[key] = rows[0]?.n ?? 0;
    }));
    modulos['pessoas'] = related.vinculos.filter(
      (v) => v.programa_id === prog.id && v.ativo && ['DOCENTE_PERMANENTE', 'DOCENTE_COLABORADOR'].includes(v.papel)
    ).length;
    modulos['discentes'] = related.vinculos.filter(
      (v) => v.programa_id === prog.id && v.ativo && ['DISCENTE_MESTRADO', 'DISCENTE_DOUTORADO', 'DISCENTE_PROFISSIONAL', 'EGRESSO'].includes(v.papel)
    ).length;

    // Histórico de coordenadores (inativos, COORDENADOR_ANTERIOR).
    const todosVinculos = related.vinculos.filter((v) => v.programa_id === prog.id);
    const historico_coordenadores = todosVinculos
      .filter((v) => v.papel === 'COORDENADOR_ANTERIOR')
      .map((v) => filterSensitivePessoa(buildCombined(v, related), isAdmin))
      .filter(Boolean)
      .sort((a, b) => (b.data_fim_mandato || '').localeCompare(a.data_fim_mandato || ''));

    // Comissões do programa (agrupadas por papel COMISSAO_*).
    const comissaoVinculos = progVinculos.filter((v) => v.papel?.startsWith('COMISSAO_'));
    const comissoes = {};
    comissaoVinculos.forEach((v) => {
      const combined = buildCombined(v, related);
      if (!combined) return;
      if (!comissoes[v.papel]) comissoes[v.papel] = [];
      comissoes[v.papel].push(filterSensitivePessoa(combined, isAdmin));
    });
    modulos['comissoes'] = comissaoVinculos.length;

    // Métrica mais recente para os contadores da home.
    const { rows: metricasRows } = await query(
      'SELECT * FROM metricas_anuais WHERE programa_id = $1 ORDER BY ano DESC LIMIT 1',
      [prog.id]
    );
    const metrica_recente = metricasRows[0] || null;

    res.json({ ...prog, modalidades: progModalidades, coordenador_atual, substituto, secretaria, paginas, linhas,
               modulos, historico_coordenadores, comissoes, metrica_recente });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar programa', error: error.message });
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

  if (existing && papel === 'COORDENADOR_ATUAL' && existing.pessoa_id !== pessoaId) {
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

// Upsert das paginas de texto livre do microsite (sanitiza o HTML antes de gravar).
const savePaginas = async (programa_id, paginas, actor) => {
  if (!Array.isArray(paginas)) return;
  for (const p of paginas) {
    if (!p || !p.secao) continue;
    const body = p.body ? { value: sanitizeHtml(p.body.value), summary: p.body.summary } : undefined;
    await programaPaginasRepo.upsert(programa_id, p.secao, { ...p, body }, actor);
  }
};

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
    const progId = crypto.randomUUID();
    const now = new Date().toISOString();
    const actor = req.user?.id || null;
    const slug = await resolveSlug(data.slug, data.nome, progId);

    await query(
      `INSERT INTO programas
        (id,nome,sigla,site,codigo_capes,campus,em_rede,nome_rede,grande_area,
         area_conhecimento,area_avaliacao,
         status,status_descricao,data_credenciamento,data_descredenciamento,
         bloco,sala,cep,telefone_secretaria,horario_atendimento,email_programa,
         regimento_url,regulamento_url,sucupira_url,palavras_chave,
         slug,microsite_ativo,logo_url,cor_primaria,cor_secundaria,descricao_curta,
         hero_imagem_url,endereco,whatsapp,instagram_url,facebook_url,youtube_url,mapa_embed,
         criado_em,atualizado_em,criado_por,atualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
               $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
               $26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,
               $39,$39,$40,$40)`,
      [progId, data.nome, data.sigla ? data.sigla.toUpperCase() : '', data.site || '',
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
    await savePaginas(progId, data.paginas, actor);

    res.status(201).json({ message: 'Programa criado com sucesso', id: progId, slug });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar programa', error: error.message });
  }
};

export const updatePrograma = async (req, res) => {
  try {
    const progId = req.params.id;
    const existing = (await query('SELECT * FROM programas WHERE id = $1', [progId])).rows[0];
    if (!existing) return res.status(404).json({ message: 'Programa não encontrado' });

    const data = req.body || {};
    const pick = (val, fallback) => (val !== undefined ? val : fallback);
    const actor = req.user?.id || null;

    // Recalcula o slug se foi enviado (ou se o programa ainda nao tinha um).
    let slug = existing.slug;
    if (data.slug !== undefined || !existing.slug) {
      slug = await resolveSlug(data.slug ?? existing.slug, data.nome || existing.nome, progId);
    }

    await query(
      `UPDATE programas SET nome=$1, sigla=$2, site=$3, codigo_capes=$4, campus=$5, em_rede=$6,
        nome_rede=$7, grande_area=$8, area_conhecimento=$9, area_avaliacao=$10,
        status=$11, status_descricao=$12, data_credenciamento=$13, data_descredenciamento=$14,
        bloco=$15, sala=$16, cep=$17, telefone_secretaria=$18, horario_atendimento=$19,
        email_programa=$20, regimento_url=$21, regulamento_url=$22, sucupira_url=$23,
        palavras_chave=$24,
        slug=$27, microsite_ativo=$28, logo_url=$29, cor_primaria=$30, cor_secundaria=$31,
        descricao_curta=$32, hero_imagem_url=$33, endereco=$34, whatsapp=$35,
        instagram_url=$36, facebook_url=$37, youtube_url=$38, mapa_embed=$39,
        atualizado_em=$25, atualizado_por=COALESCE($26, atualizado_por)
       WHERE id=$40`,
      [
        data.nome || existing.nome,
        data.sigla ? data.sigla.toUpperCase() : existing.sigla,
        pick(data.site, existing.site), pick(data.codigo_capes, existing.codigo_capes),
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
    await savePaginas(progId, data.paginas, actor);

    res.json({ message: 'Programa atualizado com sucesso', slug });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar programa', error: error.message });
  }
};

export const deletePrograma = async (req, res) => {
  try {
    // Modalidades e vínculos saem em cascata (FK ON DELETE CASCADE).
    const { rowCount } = await query('DELETE FROM programas WHERE id = $1', [req.params.id]);
    if (rowCount > 0) res.json({ message: 'Programa removido com sucesso' });
    else res.status(404).json({ message: 'Programa não encontrado' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover programa', error: error.message });
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

    const [news, editais, disciplinas, teses, faq, grupos] = await Promise.all([
      query(
        `SELECT id, title AS titulo, excerpt AS resumo, 'noticia' AS tipo FROM news
         WHERE programa_id = $1 AND (title ILIKE $2 OR excerpt ILIKE $2 OR content::text ILIKE $2) LIMIT 5`,
        [pid, like]
      ),
      query(
        `SELECT id, title AS titulo, description AS resumo, 'edital' AS tipo FROM editais
         WHERE programa_id = $1 AND (title ILIKE $2 OR description ILIKE $2) LIMIT 5`,
        [pid, like]
      ),
      query(
        `SELECT id, title AS titulo, desc AS resumo, 'disciplina' AS tipo FROM disciplinas
         WHERE programa_id = $1 AND (title ILIKE $2 OR desc ILIKE $2) LIMIT 5`,
        [pid, like]
      ),
      query(
        `SELECT id, title AS titulo, '' AS resumo, 'tese' AS tipo FROM teses_dissertacoes
         WHERE programa_id = $1 AND (title ILIKE $2 OR author ILIKE $2) LIMIT 5`,
        [pid, like]
      ),
      query(
        `SELECT id, title AS titulo, '' AS resumo, 'faq' AS tipo FROM faq
         WHERE programa_id = $1 AND (title ILIKE $2 OR field_resposta ILIKE $2) LIMIT 5`,
        [pid, like]
      ),
      query(
        `SELECT id, title AS titulo, '' AS resumo, 'grupo' AS tipo FROM grupos_pesquisa
         WHERE programa_id = $1 AND title ILIKE $2 LIMIT 5`,
        [pid, like]
      ),
    ]);

    const results = [
      ...news.rows, ...editais.rows, ...disciplinas.rows,
      ...teses.rows, ...faq.rows, ...grupos.rows,
    ].map((r) => ({ ...r, resumo: r.resumo || '' }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Erro na busca', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Corpo Docente (Fase 3)
// ──────────────────────────────────────────────────────────────────────────────

export const PAPEIS_DOCENTE = ['DOCENTE_PERMANENTE', 'DOCENTE_COLABORADOR'];

// Endpoint público: docentes do programa por slug (sem dados sensíveis).
export const getProgramaDocentesPublic = async (req, res) => {
  try {
    const prog = (await query('SELECT id FROM programas WHERE slug = $1', [req.params.slug])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });

    const { rows: vinculos } = await query(
      `SELECT id, pessoa_id, papel, email_funcao FROM vinculos
       WHERE programa_id = $1 AND ativo = TRUE AND papel = ANY($2::text[])
       ORDER BY papel, criado_em`,
      [prog.id, PAPEIS_DOCENTE]
    );

    const ids = vinculos.map((v) => v.pessoa_id);
    if (ids.length === 0) return res.json([]);

    const { rows: usrs } = await query(
      `SELECT id, email, perfil_nome, perfil_foto_url, acad_lattes, acad_orcid, acad_google_scholar
       FROM users WHERE id = ANY($1::text[])`,
      [ids]
    );

    const byId = Object.fromEntries(usrs.map((u) => [u.id, u]));
    const docentes = vinculos
      .map((v) => {
        const u = byId[v.pessoa_id];
        if (!u) return null;
        return {
          id: v.id,
          pessoa_id: v.pessoa_id,
          papel: v.papel,
          nome: u.perfil_nome || u.email,
          foto_url: u.perfil_foto_url || null,
          lattes: u.acad_lattes || null,
          orcid: u.acad_orcid || null,
          google_scholar: u.acad_google_scholar || null,
          email_funcao: v.email_funcao || null,
        };
      })
      .filter(Boolean);

    res.json(docentes);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar docentes', error: error.message });
  }
};

// Endpoint admin: docentes do programa por ID.
export const getDocentesAdmin = async (req, res) => {
  try {
    const { rows: vinculos } = await query(
      `SELECT id, pessoa_id, papel, email_funcao FROM vinculos
       WHERE programa_id = $1 AND ativo = TRUE AND papel = ANY($2::text[])
       ORDER BY papel, criado_em`,
      [req.params.id, PAPEIS_DOCENTE]
    );

    const ids = vinculos.map((v) => v.pessoa_id);
    if (ids.length === 0) return res.json([]);

    const { rows: usrs } = await query(
      `SELECT id, email, perfil_nome, perfil_foto_url, programa_id FROM users WHERE id = ANY($1::text[])`,
      [ids]
    );
    const byId = Object.fromEntries(usrs.map((u) => [u.id, u]));

    res.json(
      vinculos.map((v) => {
        const u = byId[v.pessoa_id] || {};
        return { id: v.id, pessoa_id: v.pessoa_id, papel: v.papel, email_funcao: v.email_funcao || '',
                 nome: u.perfil_nome || u.email || v.pessoa_id, foto_url: u.perfil_foto_url || null,
                 programa_id: u.programa_id || null };
      })
    );
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar docentes', error: error.message });
  }
};

// Adiciona docente ao programa.
export const addDocente = async (req, res) => {
  try {
    const { pessoa_id, papel, email_funcao } = req.body || {};
    if (!pessoa_id) return res.status(400).json({ message: 'pessoa_id é obrigatório' });
    if (!PAPEIS_DOCENTE.includes(papel)) return res.status(400).json({ message: 'papel inválido' });

    const existing = (
      await query(
        'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id=$2 AND papel=ANY($3::text[]) AND ativo=TRUE',
        [req.params.id, pessoa_id, PAPEIS_DOCENTE]
      )
    ).rows[0];
    if (existing) return res.status(409).json({ message: 'Docente já vinculado neste programa' });

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, email_funcao, ativo, criado_em)
       VALUES ($1,$2,$3,$4,$5,TRUE,$6)`,
      [id, req.params.id, pessoa_id, papel, email_funcao || null, new Date().toISOString()]
    );
    res.status(201).json({ message: 'Docente adicionado', id });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao adicionar docente', error: error.message });
  }
};

// Remove (inativa) vínculo de docente. O professor permanece na base — apenas
// deixa de pertencer a este programa. Mantém perfil_professor.programas em
// sincronia para não ficar com programa fantasma (origem do "já cadastrado" na
// importação). Se ficar sem nenhum programa, fica como "Sem vínculo" na lista.
export const removeDocente = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT pessoa_id, programa_id FROM vinculos
       WHERE id=$1 AND programa_id=$2 AND papel=ANY($3::text[])`,
      [req.params.vinculoId, req.params.id, PAPEIS_DOCENTE]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Vínculo não encontrado' });
    const { pessoa_id, programa_id } = rows[0];

    await query(`UPDATE vinculos SET ativo=FALSE WHERE id=$1`, [req.params.vinculoId]);

    const user = await usersRepo.getById(pessoa_id);
    if (Array.isArray(user?.perfil_professor?.programas)) {
      const programas = user.perfil_professor.programas.filter((p) => p !== programa_id);
      if (programas.length !== user.perfil_professor.programas.length) {
        await usersRepo.update(pessoa_id, {
          ...user,
          perfil_professor: { ...user.perfil_professor, programas },
        });
      }
    }
    res.json({ message: 'Docente removido' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover docente', error: error.message });
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

    const { rows: vinculos } = await query(
      `SELECT id, pessoa_id, papel FROM vinculos
       WHERE programa_id=$1 AND ativo=TRUE AND papel=ANY($2::text[])
       ORDER BY papel, criado_em`,
      [prog.id, PAPEIS_DISCENTE]
    );

    const ids = vinculos.map((v) => v.pessoa_id);
    if (ids.length === 0) return res.json([]);

    const { rows: usrs } = await query(
      `SELECT id, email, perfil_nome, perfil_foto_url, acad_lattes, acad_orcid, acad_google_scholar
       FROM users WHERE id=ANY($1::text[])`,
      [ids]
    );
    const byId = Object.fromEntries(usrs.map((u) => [u.id, u]));

    res.json(
      vinculos.map((v) => {
        const u = byId[v.pessoa_id];
        if (!u) return null;
        return {
          id: v.id, pessoa_id: v.pessoa_id, papel: v.papel,
          nome: u.perfil_nome || u.email,
          foto_url: u.perfil_foto_url || null,
          lattes: u.acad_lattes || null,
          orcid: u.acad_orcid || null,
          google_scholar: u.acad_google_scholar || null,
        };
      }).filter(Boolean)
    );
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar discentes', error: error.message });
  }
};

// Endpoint admin: discentes do programa por ID.
export const getDiscentesAdmin = async (req, res) => {
  try {
    const { rows: vinculos } = await query(
      `SELECT id, pessoa_id, papel FROM vinculos
       WHERE programa_id=$1 AND ativo=TRUE AND papel=ANY($2::text[])
       ORDER BY papel, criado_em`,
      [req.params.id, PAPEIS_DISCENTE]
    );
    const ids = vinculos.map((v) => v.pessoa_id);
    if (ids.length === 0) return res.json([]);
    const { rows: usrs } = await query(
      `SELECT id, email, perfil_nome, perfil_foto_url, programa_id FROM users WHERE id=ANY($1::text[])`, [ids]
    );
    const byId = Object.fromEntries(usrs.map((u) => [u.id, u]));
    res.json(vinculos.map((v) => {
      const u = byId[v.pessoa_id] || {};
      return { id: v.id, pessoa_id: v.pessoa_id, papel: v.papel,
               nome: u.perfil_nome || u.email || v.pessoa_id, foto_url: u.perfil_foto_url || null,
               programa_id: u.programa_id || null };
    }));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar discentes', error: error.message });
  }
};

export const addDiscente = async (req, res) => {
  try {
    const { pessoa_id, papel } = req.body || {};
    if (!pessoa_id) return res.status(400).json({ message: 'pessoa_id obrigatório' });
    if (!PAPEIS_DISCENTE.includes(papel)) return res.status(400).json({ message: 'papel inválido' });
    const existing = (await query(
      'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id=$2 AND papel=ANY($3::text[]) AND ativo=TRUE',
      [req.params.id, pessoa_id, PAPEIS_DISCENTE]
    )).rows[0];
    if (existing) return res.status(409).json({ message: 'Discente já vinculado neste programa' });
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em) VALUES ($1,$2,$3,$4,TRUE,$5)`,
      [id, req.params.id, pessoa_id, papel, new Date().toISOString()]
    );
    res.status(201).json({ message: 'Discente adicionado', id });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao adicionar discente', error: error.message });
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
    res.status(500).json({ message: 'Erro ao remover discente', error: error.message });
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
    const { rows: vinculos } = await query(
      `SELECT id, pessoa_id, papel FROM vinculos WHERE programa_id=$1 AND ativo=TRUE AND papel=ANY($2::text[]) ORDER BY papel, criado_em`,
      [req.params.id, PAPEIS_COMISSAO]
    );
    const ids = vinculos.map((v) => v.pessoa_id);
    if (ids.length === 0) return res.json([]);
    const { rows: usrs } = await query(
      `SELECT id, email, perfil_nome, perfil_foto_url FROM users WHERE id=ANY($1::text[])`, [ids]
    );
    const byId = Object.fromEntries(usrs.map((u) => [u.id, u]));
    res.json(vinculos.map((v) => {
      const u = byId[v.pessoa_id] || {};
      return { id: v.id, pessoa_id: v.pessoa_id, papel: v.papel,
               nome: u.perfil_nome || u.email || v.pessoa_id, foto_url: u.perfil_foto_url || null };
    }));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar comissões', error: error.message });
  }
};

export const addComissaoMembro = async (req, res) => {
  try {
    const { pessoa_id, papel } = req.body || {};
    if (!pessoa_id) return res.status(400).json({ message: 'pessoa_id obrigatório' });
    if (!PAPEIS_COMISSAO.includes(papel)) return res.status(400).json({ message: 'papel inválido' });
    const existing = (await query(
      'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id=$2 AND papel=$3 AND ativo=TRUE',
      [req.params.id, pessoa_id, papel]
    )).rows[0];
    if (existing) return res.status(409).json({ message: 'Membro já vinculado nesta comissão' });
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em) VALUES ($1,$2,$3,$4,TRUE,$5)`,
      [id, req.params.id, pessoa_id, papel, new Date().toISOString()]
    );
    res.status(201).json({ message: 'Membro adicionado', id });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao adicionar membro', error: error.message });
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
    res.status(500).json({ message: 'Erro ao remover membro', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Métricas anuais públicas (Fase 5)
// ──────────────────────────────────────────────────────────────────────────────

export const getProgramaMetricasPublic = async (req, res) => {
  try {
    const prog = (await query('SELECT id FROM programas WHERE slug=$1', [req.params.slug])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });
    const { rows } = await query(
      'SELECT * FROM metricas_anuais WHERE programa_id=$1 ORDER BY ano DESC', [prog.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar métricas', error: error.message });
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
    res.status(500).json({ message: 'Erro ao buscar linhas', error: error.message });
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
    res.status(500).json({ message: 'Erro ao atualizar linhas', error: error.message });
  }
};
