import { createRepository } from './repository.js';
import { query } from './pool.js';

const toArr = (v) => (Array.isArray(v) ? v : v != null && v !== '' ? [v] : []);
const intOrNull = (v) => (v === '' || v == null ? null : parseInt(v, 10));

// ============================ Noticias ============================
export const newsRepo = createRepository({
  table: 'news',
  fromRow: (r) => ({
    id: r.id, title: r.title, category: r.category, categorySlug: r.category_slug,
    date: r.date, year: r.year, image: r.image, excerpt: r.excerpt,
    content: r.content ?? [], author: r.author, authorRole: r.author_role,
    imageCaption: r.image_caption, tags: r.tags ?? [],
    quote: r.quote_text || r.quote_author ? { text: r.quote_text, author: r.quote_author } : undefined,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, category: o.category, category_slug: o.categorySlug,
    date: o.date, year: o.year != null ? String(o.year) : null, image: o.image, excerpt: o.excerpt,
    content: toArr(o.content), author: o.author, author_role: o.authorRole,
    image_caption: o.imageCaption, tags: toArr(o.tags),
    quote_text: o.quote?.text ?? null, quote_author: o.quote?.author ?? null,
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
  }),
  toRow: (o) => ({
    id: o.id, category_id: o.categoryId, category_title: o.categoryTitle, title: o.title,
    published_at: o.publishedAt, deadline: o.deadline, year: intOrNull(o.year),
    description: o.description, download_link: o.downloadLink, details_link: o.detailsLink,
    periodo_data_inicio: o.field_periodo?.data_inicio ?? null,
    periodo_data_fim: o.field_periodo?.data_fim ?? null,
    numero: o.numero, erratas: JSON.stringify(o.erratas ?? []),
    resultado_parcial: o.resultadoParcial ?? null, resultado_final: o.resultadoFinal ?? null,
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
});
export const resolucoesRepo = createRepository({ table: 'resolucoes', fromRow: docFromRow, toRow: docToRow });
export const formulariosRepo = createRepository({ table: 'formularios', fromRow: docFromRow, toRow: docToRow });

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
    field_autor: r.field_autor, field_tipo_td: r.field_tipo_td,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, field_ano: o.field_ano || null, field_arquivo: o.field_arquivo || null,
    field_autor: o.field_autor || null, field_tipo_td: o.field_tipo_td || null,
  }),
});

// ============================== FAQ ===============================
export const faqRepo = createRepository({
  table: 'faq',
  fromRow: (r) => ({ id: r.id, title: r.title, field_resposta: r.field_resposta }),
  toRow: (o) => ({ id: o.id, title: o.title, field_resposta: o.field_resposta || null }),
});

// =========================== Disciplinas ==========================
export const disciplinasRepo = createRepository({
  table: 'disciplinas',
  fromRow: (r) => ({
    id: r.id, title: r.title, field_carga_horaria: r.field_carga_horaria,
    field_docente: r.field_docente, field_ementa: r.field_ementa,
    field_tipo_disciplina: r.field_tipo_disciplina,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, field_carga_horaria: o.field_carga_horaria || null,
    field_docente: o.field_docente || null, field_ementa: o.field_ementa || null,
    field_tipo_disciplina: o.field_tipo_disciplina || null,
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
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, slug: o.slug,
    body_value: o.body?.value ?? null, body_summary: o.body?.summary ?? null,
  }),
});

// ======================= Grupos de Pesquisa =======================
export const gruposRepo = createRepository({
  table: 'grupos_pesquisa',
  fromRow: (r) => ({
    id: r.id, title: r.title,
    body: { value: r.body_value, summary: r.body_summary },
    field_lideres: r.field_lideres ?? [],
  }),
  toRow: (o) => ({
    id: o.id, title: o.title,
    body_value: o.body?.value ?? null, body_summary: o.body?.summary ?? null,
    field_lideres: JSON.stringify(o.field_lideres ?? []),
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
    publons: r.acad_publons, linhas_pesquisa: r.acad_linhas_pesquisa ?? [],
  },
  perfil_aluno: r.perfil_aluno ?? null,
  perfil_professor: r.perfil_professor ?? null,
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
  acad_linhas_pesquisa: toArr(o.dados_academicos?.linhas_pesquisa),
  perfil_aluno: o.perfil_aluno != null ? JSON.stringify(o.perfil_aluno) : null,
  perfil_professor: o.perfil_professor != null ? JSON.stringify(o.perfil_professor) : null,
  criado_em: o.criado_em || new Date().toISOString(),
  atualizado_em: o.atualizado_em || new Date().toISOString(),
});
export const usersRepo = {
  ...createRepository({ table: 'users', fromRow: userFromRow, toRow: userToRow, orderBy: 'criado_em ASC' }),
  async findByEmail(email) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ? userFromRow(rows[0]) : null;
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
  async create(o) {
    await query(
      `INSERT INTO calendarios (id, ano, is_current, title, pdf_link, description)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [o.id, intOrNull(o.ano), !!o.isCurrent, o.title ?? null, o.pdfLink ?? null, o.description ?? null]
    );
    await saveMilestones(o.id, o.milestones);
    return calendariosRepo.getById(o.id);
  },
  async update(id, partial) {
    const existing = await calendariosRepo.getById(id);
    if (!existing) return null;
    const o = { ...existing, ...partial };
    await query(
      `UPDATE calendarios SET ano=$1, is_current=$2, title=$3, pdf_link=$4, description=$5 WHERE id=$6`,
      [intOrNull(o.ano), !!o.isCurrent, o.title ?? null, o.pdfLink ?? null, o.description ?? null, id]
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

// =========================== Taxonomias ===========================
// Modelada como chave -> lista de valores; o app a consome como um objeto.
export const taxonomiasRepo = {
  async getAll() {
    const { rows } = await query('SELECT chave, valores FROM taxonomias');
    const obj = {};
    for (const r of rows) obj[r.chave] = r.valores ?? [];
    return obj;
  },
  async replaceAll(taxonomias) {
    for (const [chave, valores] of Object.entries(taxonomias || {})) {
      await query(
        `INSERT INTO taxonomias (chave, valores) VALUES ($1, $2)
         ON CONFLICT (chave) DO UPDATE SET valores = EXCLUDED.valores`,
        [chave, toArr(valores)]
      );
    }
    return taxonomiasRepo.getAll();
  },
};
