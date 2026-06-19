import crypto from 'crypto';
import { createRepository } from './repository.js';
import { query } from './pool.js';

const toArr = (v) => (Array.isArray(v) ? v : v != null && v !== '' ? [v] : []);
const intOrNull = (v) => (v === '' || v == null ? null : parseInt(v, 10));
const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

// ============================ Noticias ============================
export const newsRepo = createRepository({
  table: 'news',
  fromRow: (r) => ({
    id: r.id, title: r.title, category: r.category, categorySlug: r.category_slug,
    date: r.date, year: r.year, image: r.image, excerpt: r.excerpt,
    content: r.content ?? [], author: r.author, authorRole: r.author_role,
    imageCaption: r.image_caption, tags: r.tags ?? [],
    quote: r.quote_text || r.quote_author ? { text: r.quote_text, author: r.quote_author } : undefined,
    programaId: r.programa_id ?? null,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, category: o.category, category_slug: o.categorySlug,
    date: o.date, year: o.year != null ? String(o.year) : null, image: o.image, excerpt: o.excerpt,
    content: toArr(o.content), author: o.author, author_role: o.authorRole,
    image_caption: o.imageCaption, tags: toArr(o.tags),
    quote_text: o.quote?.text ?? null, quote_author: o.quote?.author ?? null,
    programa_id: o.programaId || null,
  }),
});

// ============================= Editais ============================
export const editaisRepo = createRepository({
  table: 'editais',
  fromRow: (r) => ({
    id: r.id, categoryId: r.category_id, categoryTitle: r.category_title, title: r.title,
    publishedAt: r.published_at, deadline: r.deadline, year: r.year, description: r.description,
    downloadLink: r.download_link, detailsLink: r.details_link,
    field_periodo: { data_inicio: r.periodo_data_inicio, data_fim: r.periodo_data_fim },
    numero: r.numero, erratas: r.erratas ?? [],
    resultadoParcial: r.resultado_parcial, resultadoFinal: r.resultado_final,
    programaId: r.programa_id ?? null,
    proficiencia: r.proficiencia ?? false,
  }),
  toRow: (o) => ({
    id: o.id, category_id: o.categoryId, category_title: o.categoryTitle, title: o.title,
    published_at: o.publishedAt, deadline: o.deadline, year: intOrNull(o.year),
    description: o.description, download_link: o.downloadLink, details_link: o.detailsLink,
    periodo_data_inicio: o.field_periodo?.data_inicio ?? null,
    periodo_data_fim: o.field_periodo?.data_fim ?? null,
    numero: o.numero, erratas: JSON.stringify(o.erratas ?? []),
    resultado_parcial: o.resultadoParcial ?? null, resultado_final: o.resultadoFinal ?? null,
    programa_id: o.programaId || null,
    proficiencia: o.proficiencia ? true : false,
  }),
});

// ===================== Resolucoes / Formularios ===================
const docFromRow = (r) => ({
  id: r.id, sectionId: r.section_id, sectionTitle: r.section_title,
  categoryTitle: r.category_title, title: r.title, desc: r.descricao, link: r.link,
});
const docToRow = (o) => ({
  id: o.id, section_id: o.sectionId, section_title: o.sectionTitle,
  category_title: o.categoryTitle, title: o.title, descricao: o.desc, link: o.link,
  programa_id: o.programaId || null,
});
const docFromRowFull = (r) => ({ ...docFromRow(r), programaId: r.programa_id || null });
export const resolucoesRepo  = createRepository({ table: 'resolucoes',  fromRow: docFromRowFull, toRow: docToRow });
export const formulariosRepo = createRepository({ table: 'formularios', fromRow: docFromRowFull, toRow: docToRow });

// =========================== Portarias ============================
export const portariasRepo = createRepository({
  table: 'portarias',
  fromRow: (r) => ({
    id: r.id, title: r.title, data_portaria: r.data_portaria,
    data_vencimento: r.data_vencimento, downloadLink: r.download_link,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, data_portaria: o.data_portaria || null,
    data_vencimento: o.data_vencimento || null, download_link: o.downloadLink || null,
  }),
});

// ====================== Teses e Dissertacoes ======================
export const tesesRepo = createRepository({
  table: 'teses_dissertacoes',
  fromRow: (r) => ({
    id: r.id, title: r.title, field_ano: r.field_ano, field_arquivo: r.field_arquivo,
    field_autor: r.field_autor, field_tipo_td: r.field_tipo_td, programaId: r.programa_id || null,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, field_ano: o.field_ano || null, field_arquivo: o.field_arquivo || null,
    field_autor: o.field_autor || null, field_tipo_td: o.field_tipo_td || null,
    programa_id: o.programaId || null,
  }),
});

// ============================== FAQ ===============================
export const faqRepo = createRepository({
  table: 'faq',
  fromRow: (r) => ({ id: r.id, title: r.title, field_resposta: r.field_resposta, programaId: r.programa_id || null }),
  toRow: (o) => ({ id: o.id, title: o.title, field_resposta: o.field_resposta || null, programa_id: o.programaId || null }),
});

// =========================== Disciplinas ==========================
export const disciplinasRepo = createRepository({
  table: 'disciplinas',
  fromRow: (r) => ({
    id: r.id, title: r.title, field_carga_horaria: r.field_carga_horaria,
    field_docente: r.field_docente, field_ementa: r.field_ementa,
    field_tipo_disciplina: r.field_tipo_disciplina, programaId: r.programa_id || null,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, field_carga_horaria: o.field_carga_horaria || null,
    field_docente: o.field_docente || null, field_ementa: o.field_ementa || null,
    field_tipo_disciplina: o.field_tipo_disciplina || null, programa_id: o.programaId || null,
  }),
});

// ============================= Bolsas =============================
export const bolsasRepo = createRepository({
  table: 'bolsas',
  fromRow: (r) => ({
    id: r.id, title: r.title, field_aluno: r.field_aluno,
    field_periodo_bolsa: { data_inicio: r.field_periodo_inicio, data_fim: r.field_periodo_fim },
    field_tipo_bolsa: r.field_tipo_bolsa,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, field_aluno: o.field_aluno || null,
    field_periodo_inicio: o.field_periodo_bolsa?.data_inicio || null,
    field_periodo_fim: o.field_periodo_bolsa?.data_fim || null,
    field_tipo_bolsa: o.field_tipo_bolsa || null,
  }),
});

// ============================= Paginas ============================
export const pagesRepo = createRepository({
  table: 'pages',
  fromRow: (r) => ({
    id: r.id, title: r.title, slug: r.slug,
    body: { value: r.body_value, summary: r.body_summary },
    programaId: r.programa_id || null,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, slug: o.slug,
    body_value: o.body?.value ?? null, body_summary: o.body?.summary ?? null,
    programa_id: o.programaId || null,
  }),
});

// ======================= Grupos de Pesquisa =======================
export const gruposRepo = createRepository({
  table: 'grupos_pesquisa',
  fromRow: (r) => ({
    id: r.id, title: r.title,
    body: { value: r.body_value, summary: r.body_summary },
    field_lideres: r.field_lideres ?? [], programaId: r.programa_id || null,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title,
    body_value: o.body?.value ?? null, body_summary: o.body?.summary ?? null,
    field_lideres: JSON.stringify(o.field_lideres ?? []), programa_id: o.programaId || null,
  }),
});

// ============================ Usuarios ============================
const userFromRow = (r) => ({
  id: r.id, email: r.email, password_hash: r.password_hash, roles: r.roles ?? [],
  privacidade: { mostrar_email: r.priv_mostrar_email, mostrar_telefone: r.priv_mostrar_telefone },
  perfil_geral: {
    nome: r.perfil_nome, cpf: r.perfil_cpf, siape: r.perfil_siape,
    foto_url: r.perfil_foto_url, telefones: r.perfil_telefones ?? [],
  },
  dados_academicos: {
    lattes: r.acad_lattes, orcid: r.acad_orcid, google_scholar: r.acad_google_scholar,
    publons: r.acad_publons,
  },
  perfil_aluno: r.perfil_aluno ?? null,
  perfil_professor: r.perfil_professor ?? null,
  programaId: r.programa_id ?? null,
  criado_em: r.criado_em, atualizado_em: r.atualizado_em,
});
const userToRow = (o) => ({
  id: o.id, email: o.email, password_hash: o.password_hash, roles: toArr(o.roles),
  priv_mostrar_email: o.privacidade?.mostrar_email ?? false,
  priv_mostrar_telefone: o.privacidade?.mostrar_telefone ?? false,
  perfil_nome: o.perfil_geral?.nome ?? null, perfil_cpf: o.perfil_geral?.cpf ?? null,
  perfil_siape: o.perfil_geral?.siape ?? null, perfil_foto_url: o.perfil_geral?.foto_url ?? null,
  perfil_telefones: toArr(o.perfil_geral?.telefones),
  acad_lattes: o.dados_academicos?.lattes ?? null, acad_orcid: o.dados_academicos?.orcid ?? null,
  acad_google_scholar: o.dados_academicos?.google_scholar ?? null,
  acad_publons: o.dados_academicos?.publons ?? null,
  perfil_aluno: o.perfil_aluno != null ? JSON.stringify(o.perfil_aluno) : null,
  perfil_professor: o.perfil_professor != null ? JSON.stringify(o.perfil_professor) : null,
  programa_id: o.programaId || null,
  criado_em: o.criado_em || new Date().toISOString(),
  atualizado_em: o.atualizado_em || new Date().toISOString(),
});
export const usersRepo = {
  ...createRepository({ table: 'users', fromRow: userFromRow, toRow: userToRow, orderBy: 'criado_em ASC' }),
  async findByEmail(email) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ? userFromRow(rows[0]) : null;
  },
  // Busca por CPF comparando só os dígitos (ignora pontuação de formatação,
  // ex.: "123.456.789-00" casa com "12345678900"). Retorna null se vazio.
  async findByCpf(cpf) {
    const digits = String(cpf || '').replace(/\D/g, '');
    if (!digits) return null;
    const { rows } = await query(
      "SELECT * FROM users WHERE regexp_replace(COALESCE(perfil_cpf,''), '\\D', '', 'g') = $1 LIMIT 1",
      [digits]
    );
    return rows[0] ? userFromRow(rows[0]) : null;
  },
  // Usuários visíveis a um Gestor de Programa: os que o programa "possui"
  // (programa_id = seu programa) OU os vinculados a ele por qualquer vínculo
  // (ex.: egresso de outro programa que também consta neste). Egressos de outro
  // programa aparecem aqui para leitura, mas a edição/exclusão fica restrita ao
  // programa dono (ver usersController/requireProgramaOwnership).
  async getScopedToPrograma(programaId) {
    const { rows } = await query(
      `SELECT DISTINCT u.* FROM users u
       LEFT JOIN vinculos v ON v.pessoa_id = u.id AND v.programa_id = $1
       WHERE u.programa_id = $1 OR v.id IS NOT NULL
       ORDER BY u.criado_em ASC`,
      [programaId]
    );
    return rows.map(userFromRow);
  },
  // True se o usuário tem algum vínculo (ativo ou não) com o programa.
  async isLinkedToPrograma(userId, programaId) {
    const { rows } = await query(
      'SELECT 1 FROM vinculos WHERE pessoa_id = $1 AND programa_id = $2 LIMIT 1',
      [userId, programaId]
    );
    return rows.length > 0;
  },
};

// ========================== Calendarios ===========================
// Inclui a tabela filha calendario_milestones.
const loadMilestones = async (calendarioId) => {
  const { rows } = await query(
    'SELECT event, date FROM calendario_milestones WHERE calendario_id = $1 ORDER BY ord ASC',
    [calendarioId]
  );
  return rows.map((m) => ({ event: m.event, date: m.date }));
};
const calFromRow = (r) => ({
  id: r.id, ano: r.ano, isCurrent: r.is_current, title: r.title,
  pdfLink: r.pdf_link, description: r.description, milestones: r._milestones ?? [],
  criado_por: r.criado_por ?? null, atualizado_por: r.atualizado_por ?? null,
});
const saveMilestones = async (calendarioId, milestones) => {
  await query('DELETE FROM calendario_milestones WHERE calendario_id = $1', [calendarioId]);
  const list = Array.isArray(milestones) ? milestones : [];
  for (let i = 0; i < list.length; i++) {
    await query(
      'INSERT INTO calendario_milestones (calendario_id, ord, event, date) VALUES ($1,$2,$3,$4)',
      [calendarioId, i, list[i].event ?? null, list[i].date ?? null]
    );
  }
};
export const calendariosRepo = {
  async getAll() {
    const { rows } = await query('SELECT * FROM calendarios ORDER BY ano DESC');
    const result = [];
    for (const r of rows) result.push(calFromRow({ ...r, _milestones: await loadMilestones(r.id) }));
    return result;
  },
  async getById(id) {
    const { rows } = await query('SELECT * FROM calendarios WHERE id = $1', [id]);
    if (!rows[0]) return null;
    return calFromRow({ ...rows[0], _milestones: await loadMilestones(id) });
  },
  async create(o, actor) {
    await query(
      `INSERT INTO calendarios (id, ano, is_current, title, pdf_link, description, criado_por, atualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
      [o.id, intOrNull(o.ano), !!o.isCurrent, o.title ?? null, o.pdfLink ?? null, o.description ?? null, actor ?? null]
    );
    await saveMilestones(o.id, o.milestones);
    return calendariosRepo.getById(o.id);
  },
  async update(id, partial, actor) {
    const existing = await calendariosRepo.getById(id);
    if (!existing) return null;
    const o = { ...existing, ...partial };
    await query(
      `UPDATE calendarios SET ano=$1, is_current=$2, title=$3, pdf_link=$4, description=$5,
         atualizado_por=COALESCE($6, atualizado_por) WHERE id=$7`,
      [intOrNull(o.ano), !!o.isCurrent, o.title ?? null, o.pdfLink ?? null, o.description ?? null, actor ?? null, id]
    );
    await saveMilestones(id, o.milestones);
    return calendariosRepo.getById(id);
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM calendarios WHERE id = $1', [id]);
    return rowCount > 0;
  },
  async unsetCurrentExcept(id) {
    await query('UPDATE calendarios SET is_current = FALSE WHERE id <> $1', [id ?? '']);
  },
};

// ======================== Metricas anuais =========================
// Snapshot anual de indicadores por programa (dashboard).
const metricaFromRow = (r) => ({
  id: r.id, programa_id: r.programa_id, ano: r.ano,
  docentes_permanentes: r.docentes_permanentes,
  discentes_mestrado: r.discentes_mestrado,
  discentes_doutorado: r.discentes_doutorado,
  discentes_profissional: r.discentes_profissional,
  producao_artigos: r.producao_artigos,
  teses_defendidas: r.teses_defendidas,
  bolsistas_capes: r.bolsistas_capes,
  taxa_conclusao: numOrNull(r.taxa_conclusao),
  indice_internacionalizacao: numOrNull(r.indice_internacionalizacao),
  observacao: r.observacao,
  criado_em: r.criado_em, atualizado_em: r.atualizado_em,
  criado_por: r.criado_por ?? null, atualizado_por: r.atualizado_por ?? null,
});
const metricaToRow = (o) => ({
  id: o.id, programa_id: o.programa_id, ano: intOrNull(o.ano),
  docentes_permanentes: intOrNull(o.docentes_permanentes),
  discentes_mestrado: intOrNull(o.discentes_mestrado),
  discentes_doutorado: intOrNull(o.discentes_doutorado),
  discentes_profissional: intOrNull(o.discentes_profissional),
  producao_artigos: intOrNull(o.producao_artigos),
  teses_defendidas: intOrNull(o.teses_defendidas),
  bolsistas_capes: intOrNull(o.bolsistas_capes),
  taxa_conclusao: numOrNull(o.taxa_conclusao),
  indice_internacionalizacao: numOrNull(o.indice_internacionalizacao),
  observacao: o.observacao || null,
  criado_em: o.criado_em || new Date().toISOString(),
  atualizado_em: new Date().toISOString(),
});
export const metricasRepo = {
  ...createRepository({ table: 'metricas_anuais', orderBy: 'ano DESC, programa_id ASC', fromRow: metricaFromRow, toRow: metricaToRow }),
  async getByPrograma(programaId) {
    const { rows } = await query('SELECT * FROM metricas_anuais WHERE programa_id = $1 ORDER BY ano DESC', [programaId]);
    return rows.map(metricaFromRow);
  },
  async findByProgramaAno(programaId, ano) {
    const { rows } = await query('SELECT * FROM metricas_anuais WHERE programa_id = $1 AND ano = $2', [programaId, intOrNull(ano)]);
    return rows[0] ? metricaFromRow(rows[0]) : null;
  },
};

// ===================== Paginas do microsite =======================
// Texto livre (rich-text) por secao do microsite de cada programa.
// Upsert por chave natural (programa_id, secao).
const ppFromRow = (r) => ({
  id: r.id, programaId: r.programa_id, secao: r.secao, titulo: r.titulo,
  body: { value: r.body_value, summary: r.body_summary },
  ord: r.ord, visivel: r.visivel,
  criado_por: r.criado_por ?? null, atualizado_por: r.atualizado_por ?? null,
});
export const programaPaginasRepo = {
  async getByPrograma(programaId, { includeHidden = false } = {}) {
    const cond = includeHidden ? '' : ' AND visivel = TRUE';
    const { rows } = await query(
      `SELECT * FROM programa_paginas WHERE programa_id = $1${cond} ORDER BY ord ASC, secao ASC`,
      [programaId]
    );
    return rows.map(ppFromRow);
  },
  async getSecao(programaId, secao) {
    const { rows } = await query(
      'SELECT * FROM programa_paginas WHERE programa_id = $1 AND secao = $2',
      [programaId, secao]
    );
    return rows[0] ? ppFromRow(rows[0]) : null;
  },
  async upsert(programaId, secao, data, actor) {
    const existing = await this.getSecao(programaId, secao);
    const now = new Date().toISOString();
    if (existing) {
      const { rows } = await query(
        `UPDATE programa_paginas SET titulo=$1, body_value=$2, body_summary=$3, ord=$4, visivel=$5,
           atualizado_em=$6, atualizado_por=COALESCE($7, atualizado_por)
         WHERE programa_id=$8 AND secao=$9 RETURNING *`,
        [
          data.titulo ?? existing.titulo ?? null,
          data.body?.value ?? null,
          data.body?.summary ?? null,
          intOrNull(data.ord) ?? existing.ord ?? 0,
          data.visivel != null ? !!data.visivel : existing.visivel,
          now, actor ?? null, programaId, secao,
        ]
      );
      return ppFromRow(rows[0]);
    }
    const { rows } = await query(
      `INSERT INTO programa_paginas
         (id, programa_id, secao, titulo, body_value, body_summary, ord, visivel, criado_por, atualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      [
        crypto.randomUUID(), programaId, secao,
        data.titulo ?? null, data.body?.value ?? null, data.body?.summary ?? null,
        intOrNull(data.ord) ?? 0, data.visivel != null ? !!data.visivel : true, actor ?? null,
      ]
    );
    return ppFromRow(rows[0]);
  },
  async remove(programaId, secao) {
    const { rowCount } = await query(
      'DELETE FROM programa_paginas WHERE programa_id = $1 AND secao = $2',
      [programaId, secao]
    );
    return rowCount > 0;
  },
};

// ===================== Proficiência em Línguas ====================
export const periodosProficienciaRepo = createRepository({
  table: 'proficiencia_periodos',
  orderBy: 'data_inicio DESC NULLS LAST, criado_em DESC',
  fromRow: (r) => ({
    id: r.id, titulo: r.titulo, descricao: r.descricao,
    dataInicio: r.data_inicio, dataFim: r.data_fim, ativo: r.ativo,
  }),
  toRow: (o) => ({
    id: o.id, titulo: o.titulo, descricao: o.descricao ?? null,
    data_inicio: o.dataInicio || null, data_fim: o.dataFim || null,
    ativo: o.ativo != null ? !!o.ativo : true,
  }),
});

const inscricaoProfFromRow = (r) => ({
  id: r.id, periodoId: r.periodo_id, alunoId: r.aluno_id,
  nome: r.nome, cpf: r.cpf, nivel: r.nivel, estrangeiro: r.estrangeiro,
  linguas: r.linguas ?? [],
  comprovanteResidenciaUrl: r.comprovante_residencia_url,
  titularComprovante: r.titular_comprovante,
  comprovanteVinculoUrl: r.comprovante_vinculo_url,
  status: r.status, nota: r.nota != null ? Number(r.nota) : null,
  resultado: r.resultado, observacao: r.observacao,
});

const inscricaoProfToRow = (o) => ({
  id: o.id, periodo_id: o.periodoId || null, aluno_id: o.alunoId || null,
  nome: o.nome, cpf: o.cpf ?? null, nivel: o.nivel ?? null,
  estrangeiro: !!o.estrangeiro, linguas: toArr(o.linguas),
  comprovante_residencia_url: o.comprovanteResidenciaUrl ?? null,
  titular_comprovante: o.titularComprovante != null ? !!o.titularComprovante : true,
  comprovante_vinculo_url: o.comprovanteVinculoUrl ?? null,
  status: o.status || 'INSCRITO',
  nota: numOrNull(o.nota), resultado: o.resultado ?? null,
  observacao: o.observacao ?? null,
});

export const inscricoesProficienciaRepo = {
  ...createRepository({
    table: 'inscricoes_proficiencia',
    orderBy: 'criado_em DESC',
    fromRow: inscricaoProfFromRow,
    toRow: inscricaoProfToRow,
  }),
  async getByAluno(alunoId) {
    const { rows } = await query(
      'SELECT * FROM inscricoes_proficiencia WHERE aluno_id = $1 ORDER BY criado_em DESC',
      [alunoId]
    );
    return rows.map((r) => ({
      ...inscricaoProfFromRow(r),
      criado_por: r.criado_por ?? null, atualizado_por: r.atualizado_por ?? null,
    }));
  },
};

// =========================== Taxonomias ===========================
// Modelada como chave -> lista de valores; o app a consome como um objeto.
// 'entradas' (períodos) e 'situacoes_aluno' não têm linhas próprias aqui: são
// derivadas da fonte única taxonomia_refs (campos 'entrada' e 'situacao_aluno'),
// para que o CRUD dessas listas seja o mesmo usado na importação.
const SITUACOES_ALUNO_ORDEM = ['Matriculado', 'Trancado', 'Desistente', 'Egresso'];

export const taxonomiasRepo = {
  async getAll() {
    const { rows } = await query('SELECT chave, valores FROM taxonomias');
    const obj = {};
    for (const r of rows) {
      obj[r.chave] = r.valores ?? [];
    }
    // Períodos de entrada: valores canônicos distintos das referências.
    const ent = await query(
      `SELECT DISTINCT valor FROM taxonomia_refs WHERE campo='entrada' ORDER BY valor`
    );
    obj.entradas = ent.rows.map((r) => r.valor);
    // Situações do aluno: na ordem lógica conhecida, demais ao final.
    const sit = await query(`SELECT DISTINCT valor FROM taxonomia_refs WHERE campo='situacao_aluno'`);
    const sitVals = sit.rows.map((r) => r.valor);
    obj.situacoes_aluno = [
      ...SITUACOES_ALUNO_ORDEM.filter((s) => sitVals.includes(s)),
      ...sitVals.filter((s) => !SITUACOES_ALUNO_ORDEM.includes(s)).sort((a, b) => a.localeCompare(b, 'pt')),
    ];
    return obj;
  },
  async replaceAll(taxonomias) {
    for (const [chave, valores] of Object.entries(taxonomias || {})) {
      // Derivadas de taxonomia_refs — geridas pelo CRUD próprio, nunca aqui.
      if (chave === 'entradas' || chave === 'situacoes_aluno') continue;
      await query(
        `INSERT INTO taxonomias (chave, valores) VALUES ($1, $2)
         ON CONFLICT (chave) DO UPDATE SET valores = EXCLUDED.valores`,
        [chave, toArr(valores)]
      );
    }
    return taxonomiasRepo.getAll();
  },
};

// =================== Linhas de Pesquisa ===========================
export const linhasPesquisaRepo = {
  async getAll(programaId = null) {
    const sql = programaId
      ? 'SELECT * FROM linhas_pesquisa WHERE programa_id = $1 ORDER BY nome'
      : 'SELECT * FROM linhas_pesquisa ORDER BY nome';
    const { rows } = await query(sql, programaId ? [programaId] : []);
    return rows;
  },
  async getById(id) {
    const { rows } = await query('SELECT * FROM linhas_pesquisa WHERE id = $1', [id]);
    return rows[0] || null;
  },
  async create(data) {
    const { rows } = await query(
      'INSERT INTO linhas_pesquisa (nome, programa_id, target_id) VALUES ($1, $2, $3) RETURNING *',
      [data.nome.trim(), data.programa_id || null, data.target_id?.trim() || null]
    );
    return rows[0];
  },
  async update(id, data) {
    const { rows } = await query(
      'UPDATE linhas_pesquisa SET nome=$1, programa_id=$2, target_id=$3 WHERE id=$4 RETURNING *',
      [data.nome.trim(), data.programa_id || null, data.target_id?.trim() || null, id]
    );
    return rows[0] || null;
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM linhas_pesquisa WHERE id=$1', [id]);
    return rowCount > 0;
  },
  async getByPrograma(programaId) {
    const { rows } = await query(
      `SELECT lp.* FROM programa_linhas_pesquisa plp
       JOIN linhas_pesquisa lp ON lp.id = plp.linha_id
       WHERE plp.programa_id = $1 ORDER BY lp.nome`,
      [programaId]
    );
    return rows;
  },
  async setForPrograma(programaId, linhaIds) {
    await query('DELETE FROM programa_linhas_pesquisa WHERE programa_id = $1', [programaId]);
    for (const id of linhaIds) {
      await query(
        'INSERT INTO programa_linhas_pesquisa (programa_id, linha_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [programaId, id]
      );
    }
    return this.getByPrograma(programaId);
  },
  async getByUser(userId) {
    const { rows } = await query(
      `SELECT lp.* FROM user_linhas_pesquisa ulp
       JOIN linhas_pesquisa lp ON lp.id = ulp.linha_id
       WHERE ulp.user_id = $1 ORDER BY lp.nome`,
      [userId]
    );
    return rows;
  },
  async setForUser(userId, linhaIds) {
    await query('DELETE FROM user_linhas_pesquisa WHERE user_id = $1', [userId]);
    for (const id of linhaIds) {
      await query(
        'INSERT INTO user_linhas_pesquisa (user_id, linha_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, id]
      );
    }
    return this.getByUser(userId);
  },
  async getAllByPrograma() {
    const { rows } = await query(
      `SELECT plp.programa_id, lp.id, lp.nome
       FROM programa_linhas_pesquisa plp
       JOIN linhas_pesquisa lp ON lp.id = plp.linha_id
       ORDER BY lp.nome`
    );
    const map = {};
    for (const r of rows) {
      if (!map[r.programa_id]) map[r.programa_id] = [];
      map[r.programa_id].push({ id: r.id, nome: r.nome });
    }
    return map;
  },
};

// ================= Referências de Taxonomia (importação) ==========
// Mapeia target_id legado do Drupal -> valor canônico, por campo. NULL em
// programa_id = referência global; uma linha de programa sobrescreve a global.
export const taxonomiaRefsRepo = {
  // Lista refs filtrando por campo e/ou programa. Quando programaId é dado,
  // retorna as do programa + as globais (programa_id IS NULL).
  async getAll({ campo = null, programaId = null } = {}) {
    const where = [];
    const params = [];
    if (campo) { params.push(campo); where.push(`campo = $${params.length}`); }
    if (programaId) {
      params.push(programaId);
      where.push(`(programa_id = $${params.length} OR programa_id IS NULL)`);
    }
    const sql = `SELECT * FROM taxonomia_refs${where.length ? ' WHERE ' + where.join(' AND ') : ''}
                 ORDER BY campo, valor`;
    const { rows } = await query(sql, params);
    return rows;
  },
  async getById(id) {
    const { rows } = await query('SELECT * FROM taxonomia_refs WHERE id = $1', [id]);
    return rows[0] || null;
  },
  async create(data) {
    const { rows } = await query(
      'INSERT INTO taxonomia_refs (campo, valor, programa_id, target_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [data.campo?.trim(), data.valor?.trim(), data.programa_id || null, data.target_id?.toString().trim() || null]
    );
    return rows[0];
  },
  async update(id, data) {
    const { rows } = await query(
      'UPDATE taxonomia_refs SET campo=$1, valor=$2, programa_id=$3, target_id=$4 WHERE id=$5 RETURNING *',
      [data.campo?.trim(), data.valor?.trim(), data.programa_id || null, data.target_id?.toString().trim() || null, id]
    );
    return rows[0] || null;
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM taxonomia_refs WHERE id=$1', [id]);
    return rowCount > 0;
  },
  // Resolve um target_id legado para o valor canônico. Prefere a referência do
  // programa; cai na global (programa_id IS NULL). Retorna null se não houver.
  async resolve(campo, targetId, programaId = null) {
    const tid = targetId == null ? null : String(targetId).trim();
    if (!tid) return null;
    const { rows } = await query(
      `SELECT valor FROM taxonomia_refs
       WHERE campo = $1 AND target_id = $2 AND (programa_id = $3 OR programa_id IS NULL)
       ORDER BY (programa_id IS NULL) ASC
       LIMIT 1`,
      [campo, tid, programaId]
    );
    return rows[0]?.valor ?? null;
  },
};
