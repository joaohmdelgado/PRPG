import crypto from 'crypto';
import { createRepository, ConflitoEdicao } from './repository.js';
import { registrarRevisao, apagarRevisoes } from './revisoesRepo.js';
import { periodoDeTexto } from '../utils/periodo.js';
import { STATUS_PUBLICACAO } from '../utils/publicacao.js';
import { query } from './pool.js';
import { parseDataPt } from '../utils/datas.js';
import { PAGINAS_FIXAS } from '../utils/micrositeMenu.js';
import { pessoaParaNovoUsuario, gravarPessoaDoUsuario } from './pessoaDoUsuario.js';
import { doUsuario } from './identidadeVinculo.js';
import {
  PAPEIS_ALUNO, PAPEIS_DOCENTE_TODOS, ORDEM_VINCULOS, montarPerfilAluno, montarPerfilProfessor,
} from './perfilVinculo.js';
import { normalizarCpf } from '../utils/cpf.js';

const toArr = (v) => (Array.isArray(v) ? v : v != null && v !== '' ? [v] : []);
const intOrNull = (v) => (v === '' || v == null ? null : parseInt(v, 10));
const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

// ============================ Noticias ============================
const anoDe = (iso) => (typeof iso === 'string' && /^\d{4}-/.test(iso) ? iso.slice(0, 4) : null);

// Fase R.5: `date` é DATE e a lista sai da mais recente para a mais antiga
// (antes: ordem de `id`, isto é, alfabética de slug).
export const newsRepo = createRepository({
  table: 'news',
  orderBy: 'date DESC NULLS LAST, id ASC',
  publicavel: true,
  fromRow: (r) => ({
    id: r.id, title: r.title, category: r.category, categorySlug: r.category_slug,
    date: r.date, year: r.year, image: r.image, excerpt: r.excerpt,
    content: r.content ?? [], author: r.author, authorRole: r.author_role,
    imageCaption: r.image_caption, tags: r.tags ?? [],
    quote: r.quote_text || r.quote_author ? { text: r.quote_text, author: r.quote_author } : undefined,
    programaId: r.programa_id ?? null,
    destaque: !!r.destaque, imagemAlt: r.imagem_alt ?? null,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, category: o.category, category_slug: o.categorySlug,
    destaque: !!o.destaque, imagem_alt: o.imagemAlt || null,
    date: parseDataPt(o.date),
    // year acompanha a data quando o cliente não manda (filtro por ano em /noticias).
    year: o.year != null && o.year !== '' ? String(o.year) : anoDe(parseDataPt(o.date)),
    image: o.image, excerpt: o.excerpt,
    content: toArr(o.content), author: o.author, author_role: o.authorRole,
    image_caption: o.imageCaption, tags: toArr(o.tags),
    quote_text: o.quote?.text ?? null, quote_author: o.quote?.author ?? null,
    programa_id: o.programaId || null,
  }),
});

// ============================= Editais ============================
// Fase D: erratas/resultadoParcial/resultadoFinal saíram das colunas — agora
// são eventos (entidade='edital'), montados em editaisController a partir de
// eventosRepo.listByEntidade, não neste repo (que só mapeia a tabela `editais`).
export const editaisRepo = createRepository({
  table: 'editais',
  publicavel: true,
  fromRow: (r) => ({
    id: r.id, categoryId: r.category_id, categoryTitle: r.category_title, title: r.title,
    publishedAt: r.published_at, deadline: r.deadline, year: r.year, description: r.description,
    downloadLink: r.download_link, detailsLink: r.details_link,
    field_periodo: { data_inicio: r.periodo_data_inicio, data_fim: r.periodo_data_fim },
    numero: r.numero,
    programaId: r.programa_id ?? null,
    proficiencia: r.proficiencia ?? false,
    proficienciaDataProva: r.proficiencia_data_prova ?? null,
  }),
  toRow: (o) => ({
    id: o.id, category_id: o.categoryId, category_title: o.categoryTitle, title: o.title,
    published_at: o.publishedAt || null, deadline: o.deadline || null, year: intOrNull(o.year),
    description: o.description, download_link: o.downloadLink, details_link: o.detailsLink,
    periodo_data_inicio: o.field_periodo?.data_inicio || null,
    periodo_data_fim: o.field_periodo?.data_fim || null,
    numero: o.numero,
    programa_id: o.programaId || null,
    proficiencia: o.proficiencia ? true : false,
    proficiencia_data_prova: o.proficienciaDataProva || null,
  }),
});

// ===================== Resolucoes / Formularios ===================
const docFromRow = (r) => ({
  id: r.id, sectionId: r.section_id, sectionTitle: r.section_title,
  categoryTitle: r.category_title, title: r.title, desc: r.descricao, link: r.link,
  ordem: r.ordem ?? 0,
});
const docToRow = (o) => ({
  id: o.id, section_id: o.sectionId, section_title: o.sectionTitle,
  category_title: o.categoryTitle, title: o.title, descricao: o.desc, link: o.link,
  programa_id: o.programaId || null,
  ordem: Number.parseInt(o.ordem, 10) || 0,
});
const docFromRowFull = (r) => ({ ...docFromRow(r), programaId: r.programa_id || null });
export const resolucoesRepo  = createRepository({ table: 'resolucoes',  fromRow: docFromRowFull, toRow: docToRow, orderBy: 'ordem ASC, id ASC', publicavel: true });
export const formulariosRepo = createRepository({ table: 'formularios', fromRow: docFromRowFull, toRow: docToRow, orderBy: 'ordem ASC, id ASC', publicavel: true });

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
// Fase D (Legado Drupal): field_* -> nomes reais; autor_pessoa_id/orientador_pessoa_id
// são FK de verdade para pessoas (resolvidos em tesesController/tesesImporter
// via resolverOuCriarPessoa, não aqui — o repo só mapeia a coluna).
export const tesesRepo = createRepository({
  table: 'teses_dissertacoes',
  publicavel: true,
  fromRow: (r) => ({
    id: r.id, title: r.title, ano: r.ano, arquivoUrl: r.arquivo_url,
    autorPessoaId: r.autor_pessoa_id, orientadorPessoaId: r.orientador_pessoa_id,
    tipo: r.tipo, programaId: r.programa_id || null,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, ano: o.ano || null, arquivo_url: o.arquivoUrl || null,
    autor_pessoa_id: o.autorPessoaId || null, orientador_pessoa_id: o.orientadorPessoaId || null,
    tipo: o.tipo || null, programa_id: o.programaId || null,
  }),
});

// ============================== FAQ ===============================
export const faqRepo = createRepository({
  table: 'faq',
  orderBy: 'ordem ASC, id ASC',
  publicavel: true,
  fromRow: (r) => ({ id: r.id, title: r.title, resposta: r.resposta, programaId: r.programa_id || null, ordem: r.ordem ?? 0 }),
  toRow: (o) => ({ id: o.id, title: o.title, resposta: o.resposta || null, programa_id: o.programaId || null, ordem: Number.parseInt(o.ordem, 10) || 0 }),
});

// =========================== Disciplinas ==========================
// Fase D: field_* -> nomes reais; docente_pessoa_id é FK de verdade (resolvido
// em disciplinasController, não aqui).
export const disciplinasRepo = createRepository({
  table: 'disciplinas',
  publicavel: true,
  fromRow: (r) => ({
    id: r.id, title: r.title, cargaHoraria: r.carga_horaria,
    docentePessoaId: r.docente_pessoa_id, ementaUrl: r.ementa_url,
    tipoDisciplina: r.tipo_disciplina, programaId: r.programa_id || null,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, carga_horaria: o.cargaHoraria || null,
    docente_pessoa_id: o.docentePessoaId || null, ementa_url: o.ementaUrl || null,
    tipo_disciplina: o.tipoDisciplina || null, programa_id: o.programaId || null,
  }),
});

// ============================= Bolsas =============================
// Fase D: field_aluno -> pessoa_id (FK de verdade); período TEXT -> DATE.
export const bolsasRepo = createRepository({
  table: 'bolsas',
  publicavel: true,
  fromRow: (r) => ({
    id: r.id, title: r.title, pessoaId: r.pessoa_id,
    dataInicio: r.data_inicio, dataFim: r.data_fim,
    tipoBolsa: r.tipo_bolsa,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title, pessoa_id: o.pessoaId || null,
    data_inicio: o.dataInicio || null, data_fim: o.dataFim || null,
    tipo_bolsa: o.tipoBolsa || null,
  }),
});

// ============================= Paginas ============================
const pagesFromRow = (r) => ({
  id: r.id, title: r.title, slug: r.slug, chave: r.chave || null,
  body: { value: r.body_value, summary: r.body_summary },
  programaId: r.programa_id || null,
  criado_por: r.criado_por ?? null,
  atualizado_por: r.atualizado_por ?? null,
});

export const pagesRepo = createRepository({
  table: 'pages',
  publicavel: true,
  fromRow: pagesFromRow,
  toRow: (o) => ({
    id: o.id, title: o.title, slug: o.slug, chave: o.chave || null,
    body_value: o.body?.value ?? null, body_summary: o.body?.summary ?? null,
    programa_id: o.programaId || null,
  }),
});

// Pagina fixa do template do microsite (hoje so chave='sobre') vinculada a
// um programa. Busca direta por (programa_id, chave) — mais barata que
// filtrar getAll() e usada tanto pelo publico (getProgramaBySlug) quanto
// pelo admin.
pagesRepo.getFixed = async (programaId, chave) => {
  const { rows } = await query(
    'SELECT * FROM pages WHERE programa_id = $1 AND chave = $2',
    [programaId, chave]
  );
  return rows[0] ? pagesRepo._decorate(rows[0]) : null;
};

// Paginas CRIADAS pelo programa (exclui a fixa) — usadas no submenu "O
// Programa" do microsite (ProgramaLayout.jsx) e na tela "Site do Programa"
// do admin (AdminProgramaSite.jsx).
pagesRepo.getByPrograma = async (programaId) => {
  const { rows } = await query(
    'SELECT * FROM pages WHERE programa_id = $1 AND chave IS NULL ORDER BY title ASC',
    [programaId]
  );
  return rows.map(pagesRepo._decorate);
};

// Paginas fixas do programa (todas as chaves de PAGINAS_FIXAS que existirem).
pagesRepo.getFixedByPrograma = async (programaId) => {
  const { rows } = await query(
    'SELECT * FROM pages WHERE programa_id = $1 AND chave IS NOT NULL',
    [programaId]
  );
  return rows.map(pagesRepo._decorate);
};

// Garante que o programa tenha as paginas fixas do microsite (Fase S.2 —
// Sobre, Impacto Social, Autoavaliacao, Infraestrutura, Internacionalizacao,
// Planejamento; ver PAGINAS_FIXAS). Idempotente: chamada na criacao e na
// edicao do programa e no backfill de migrate.mjs. Nascem vazias (e fora do
// menu ate ganharem texto). Se o programa ja tinha criado uma pagina comum
// com o mesmo endereco (ex.: /pgx/infraestrutura), ela vira a fixa — o texto
// dela e mantido. Mesmo criterio da migracao 2026-09-25_paginas_fixas_programa.
pagesRepo.ensureFixedPages = async (programaId, actor) => {
  const existentes = new Set((await pagesRepo.getFixedByPrograma(programaId)).map((p) => p.chave));
  for (const { chave, titulo } of PAGINAS_FIXAS) {
    if (existentes.has(chave)) continue;
    const { rowCount } = await query(
      'UPDATE pages SET chave = $2 WHERE programa_id = $1 AND slug = $2 AND chave IS NULL',
      [programaId, chave]
    );
    if (rowCount) continue;
    await pagesRepo.create({
      id: crypto.randomUUID(),
      title: titulo,
      slug: chave,
      chave,
      programaId,
      body: { value: '', summary: '' },
    }, actor);
  }
};

// ======================= Grupos de Pesquisa =======================
// Fase D: field_lideres (JSONB) saiu daqui — líderes agora são linhas de
// `vinculos` (papel='LIDER_GRUPO_PESQUISA'), geridas em gruposPesquisaController.
export const gruposRepo = createRepository({
  table: 'grupos_pesquisa',
  publicavel: true,
  fromRow: (r) => ({
    id: r.id, title: r.title,
    body: { value: r.body_value, summary: r.body_summary },
    programaId: r.programa_id || null,
  }),
  toRow: (o) => ({
    id: o.id, title: o.title,
    body_value: o.body?.value ?? null, body_summary: o.body?.summary ?? null,
    programa_id: o.programaId || null,
  }),
});

// ============================ Usuarios ============================
// B.13 / G1: o formato da API (perfil_geral, dados_academicos, perfil_aluno,
// perfil_professor, privacidade) é MONTADO a partir de `pessoas` e dos vínculos
// da pessoa; `users` só guarda a credencial (e-mail, senha, papéis, programa
// dono, pessoa_id). As colunas perfil_*/acad_*/priv_* de `users` não recebem mais
// nada (saem do schema na Task 10 do plano); o dado de pessoa que chega no
// formato da API vai direto para `pessoas` (pessoaDoUsuario.js).

// Só constantes do código (nunca texto da requisição).
const sqlLista = (arr) => `ARRAY[${arr.map((p) => `'${p}'`).join(',')}]::text[]`;
// A MESMA ordem com que perfilVinculo.js escolhe o vínculo principal ao gravar:
// o que a API mostra e o que gravarPerfilNosVinculos grava são o mesmo vínculo.
const ORDEM_VINCULOS_V = ORDEM_VINCULOS.split(',').map((c) => `v.${c.trim()}`).join(', ');

// Usuário + a pessoa por trás + os vínculos de aluno/docente dela (sempre array).
const USER_SELECT = `
  SELECT u.*,
    p.nome AS p_nome, p.cpf AS p_cpf, p.siape AS p_siape, p.foto_url AS p_foto_url, p.telefones AS p_telefones,
    p.lattes AS p_lattes, p.orcid AS p_orcid, p.google_scholar AS p_google_scholar, p.publons AS p_publons,
    p.sexo AS p_sexo, p.nacionalidade AS p_nacionalidade, p.estrangeiro AS p_estrangeiro,
    p.priv_mostrar_email AS p_priv_email, p.priv_mostrar_telefone AS p_priv_telefone,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('programa_id', v.programa_id, 'papel', v.papel, 'ativo', v.ativo,
                                                   'dados', COALESCE(v.dados, '{}'::jsonb)) ORDER BY ${ORDEM_VINCULOS_V})
                FROM vinculos v
               WHERE v.pessoa_id = u.pessoa_id
                 AND v.papel = ANY(${sqlLista([...PAPEIS_ALUNO, ...PAPEIS_DOCENTE_TODOS])})), '[]'::jsonb) AS p_vinculos
  FROM users u LEFT JOIN pessoas p ON p.id = u.pessoa_id`;

// pessoas.telefones é texto ("a, b"); a API segue em array (D5).
const telefonesEmArray = (t) => String(t ?? '').split(',').map((x) => x.trim()).filter(Boolean);
// `pessoas` não guarda texto vazio (pessoaDoUsuario pula o vazio): a API devolve
// '' como antes devolvia o que o formulário tinha mandado.
const txt = (v) => v ?? '';

const userFromRow = (r) => {
  const pessoa = { sexo: r.p_sexo, nacionalidade: r.p_nacionalidade, estrangeiro: r.p_estrangeiro };
  const vinculos = r.p_vinculos || [];
  const roles = r.roles ?? [];
  return {
    id: r.id, email: r.email, password_hash: r.password_hash, roles,
    senhaTemporaria: r.senha_temporaria ?? false,
    privacidade: { mostrar_email: r.p_priv_email ?? false, mostrar_telefone: r.p_priv_telefone ?? false },
    perfil_geral: {
      nome: txt(r.p_nome), cpf: txt(r.p_cpf), siape: txt(r.p_siape),
      foto_url: txt(r.p_foto_url), telefones: telefonesEmArray(r.p_telefones),
    },
    dados_academicos: {
      lattes: txt(r.p_lattes), orcid: txt(r.p_orcid), google_scholar: txt(r.p_google_scholar),
      publons: txt(r.p_publons),
    },
    // Só quem tem o papel tem o perfil (Administrator/Gestor: null).
    perfil_aluno: roles.includes('Aluno') ? montarPerfilAluno(pessoa, vinculos) : null,
    perfil_professor: roles.includes('Professor') ? montarPerfilProfessor(pessoa, vinculos) : null,
    programaId: r.programa_id ?? null,
    pessoaId: r.pessoa_id ?? null,
    criado_em: r.criado_em, atualizado_em: r.atualizado_em,
    criado_por: r.criado_por ?? null, atualizado_por: r.atualizado_por ?? null,
  };
};
// Só a credencial: o dado de pessoa do objeto (perfil_geral...) não vai para users.
const userToRow = (o) => ({
  id: o.id, email: o.email, password_hash: o.password_hash, roles: toArr(o.roles),
  senha_temporaria: o.senhaTemporaria != null ? !!o.senhaTemporaria : false,
  programa_id: o.programaId || null,
  pessoa_id: o.pessoaId || null,
  criado_em: o.criado_em || new Date().toISOString(),
  atualizado_em: o.atualizado_em || new Date().toISOString(),
});

const lerUsuarios = async (where = 'TRUE', params = []) =>
  (await query(`${USER_SELECT} WHERE ${where} ORDER BY u.criado_em ASC, u.id ASC`, params)).rows.map(userFromRow);

export const usersRepo = {
  getAll: () => lerUsuarios(),
  async getById(id) { return (await lerUsuarios('u.id = $1', [id]))[0] || null; },
  async findByEmail(email) { return (await lerUsuarios('u.email = $1', [email]))[0] || null; },
  // Busca pelo CPF da pessoa comparando só os dígitos, com o zero à esquerda
  // (ex.: "123.456.789-00" casa com "12345678900"). Retorna null se vazio.
  async findByCpf(cpf) {
    const cpfNormalizado = normalizarCpf(cpf);
    if (!cpfNormalizado) return null;
    return (await lerUsuarios(
      "lpad(regexp_replace(COALESCE(p.cpf, ''), '\\D', '', 'g'), 11, '0') = $1", [cpfNormalizado]))[0] || null;
  },
  // B.13 / G1: a pessoa nasce ANTES do login (a sem login com o mesmo CPF, ou uma
  // nova) e recebe direto o dado de pessoa — ver server/db/pessoaDoUsuario.js. Ela
  // lê o objeto no formato do app (perfil_geral...), não o usuário relido.
  async create(obj, actor) {
    const { pessoaId, reaproveitada } = obj.pessoaId
      ? { pessoaId: obj.pessoaId, reaproveitada: true }
      : await pessoaParaNovoUsuario(obj);
    const row = userToRow({ ...obj, pessoaId });
    if (actor) { row.criado_por = actor; row.atualizado_por = actor; }
    const keys = Object.keys(row);
    await query(`INSERT INTO users (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
      keys.map((k) => row[k]));
    await gravarPessoaDoUsuario(pessoaId, null, obj, { soVazios: reaproveitada });
    return usersRepo.getById(obj.id);
  },
  async update(id, partial, actor) {
    const antes = await usersRepo.getById(id);
    if (!antes) return null;
    const { _versao, ...dados } = partial; // users não é publicável: sem checagem de versão
    const merged = { ...antes, ...dados };
    // Login sem pessoa (não deveria existir desde a migração A da B.11): ganha uma
    // pelo mesmo caminho do cadastro, ligada já neste UPDATE.
    let pessoaId = antes.pessoaId;
    let soVazios = false;
    if (!pessoaId) ({ pessoaId, reaproveitada: soVazios } = await pessoaParaNovoUsuario(merged));
    const row = userToRow({ ...merged, pessoaId });
    delete row.id; // a PK não é atualizada
    if (actor) row.atualizado_por = actor; // criado_por é preservado (fora do SET)
    const keys = Object.keys(row);
    const { rowCount } = await query(
      `UPDATE users SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE id = $${keys.length + 1}`,
      [...keys.map((k) => row[k]), id]);
    if (!rowCount) return null;
    // Pessoa recém-criada/ligada: `antes` não era dela (tudo o que veio preenchido vai).
    await gravarPessoaDoUsuario(pessoaId, antes.pessoaId ? antes : null, merged, { soVazios });
    return usersRepo.getById(id);
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount > 0;
  },
  // Usuários visíveis a um Gestor de Programa: os que o programa "possui"
  // (programa_id = seu programa) OU os vinculados a ele por qualquer vínculo
  // (ex.: egresso de outro programa que também consta neste). Egressos de outro
  // programa aparecem aqui para leitura, mas a edição/exclusão fica restrita ao
  // programa dono (ver usersController/requireProgramaOwnership).
  getScopedToPrograma: (programaId) => lerUsuarios(
    `u.programa_id = $1 OR EXISTS (SELECT 1 FROM vinculos v WHERE ${doUsuario('v.pessoa_id')} AND v.programa_id = $1)`,
    [programaId]),
  // True se o usuário tem algum vínculo (ativo ou não) com o programa.
  async isLinkedToPrograma(userId, programaId) {
    const { rows } = await query(
      `SELECT 1 FROM vinculos v JOIN users u ON ${doUsuario('v.pessoa_id')}
        WHERE u.id = $1 AND v.programa_id = $2 LIMIT 1`,
      [userId, programaId]
    );
    return rows.length > 0;
  },
};

// ========================== Calendarios ===========================
// Inclui a tabela filha calendario_milestones.
// Marcos (Fase N.6): `date` é o período como escrito (o que o site mostra);
// dataInicio/dataFim são derivadas dele ao salvar; editalId é opcional.
const loadMilestones = async (calendarioId) => {
  const { rows } = await query(
    'SELECT event, date, data_inicio, data_fim, edital_id FROM calendario_milestones WHERE calendario_id = $1 ORDER BY ord ASC',
    [calendarioId]
  );
  return rows.map((m) => ({
    event: m.event, date: m.date, dataInicio: m.data_inicio, dataFim: m.data_fim, editalId: m.edital_id,
  }));
};
const calFromRow = (r) => ({
  id: r.id, ano: r.ano, isCurrent: r.is_current, title: r.title,
  pdfLink: r.pdf_link, description: r.description, milestones: r._milestones ?? [],
  criado_por: r.criado_por ?? null, atualizado_por: r.atualizado_por ?? null,
  // Envelope de publicação (Fase F.1), igual ao de createRepository({ publicavel }).
  status: r.status, publicadoEm: r.publicado_em ?? null,
  criado_em: r.criado_em ?? null, atualizado_em: r.atualizado_em ?? null,
});
const statusOuPadrao = (v) => (STATUS_PUBLICACAO.includes(v) ? v : 'PUBLICADO');
const saveMilestones = async (calendarioId, milestones, ano = null) => {
  await query('DELETE FROM calendario_milestones WHERE calendario_id = $1', [calendarioId]);
  const list = Array.isArray(milestones) ? milestones : [];
  for (let i = 0; i < list.length; i++) {
    const { inicio, fim } = periodoDeTexto(list[i].date, ano);
    await query(
      `INSERT INTO calendario_milestones (calendario_id, ord, event, date, data_inicio, data_fim, edital_id)
       VALUES ($1,$2,$3,$4,$5,$6,(SELECT id FROM editais WHERE id = $7))`,
      [calendarioId, i, list[i].event ?? null, list[i].date ?? null, inicio, fim, list[i].editalId || null]
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
      `INSERT INTO calendarios (id, ano, is_current, title, pdf_link, description, criado_por, atualizado_por, status, publicado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9)`,
      [o.id, intOrNull(o.ano), !!o.isCurrent, o.title ?? null, o.pdfLink ?? null, o.description ?? null, actor ?? null,
        statusOuPadrao(o.status), o.publicadoEm || null]
    );
    await saveMilestones(o.id, o.milestones, intOrNull(o.ano));
    return calendariosRepo.getById(o.id);
  },
  async update(id, partial, actor) {
    const existing = await calendariosRepo.getById(id);
    if (!existing) return null;
    const { _versao: versao, ...dados } = partial;
    const o = { ...existing, ...dados };
    // Checagem de edição concorrente no próprio WHERE (ver repository.js).
    const { rowCount } = await query(
      `UPDATE calendarios SET ano=$1, is_current=$2, title=$3, pdf_link=$4, description=$5,
         atualizado_por=COALESCE($6, atualizado_por), status=$8, publicado_em=$9
       WHERE id=$7 AND ($10::timestamptz IS NULL
         OR date_trunc('milliseconds', atualizado_em) IS NOT DISTINCT FROM date_trunc('milliseconds', $10::timestamptz))`,
      [intOrNull(o.ano), !!o.isCurrent, o.title ?? null, o.pdfLink ?? null, o.description ?? null, actor ?? null, id,
        statusOuPadrao(o.status), o.publicadoEm || null, versao || null]
    );
    if (rowCount === 0) throw new ConflitoEdicao();
    await saveMilestones(id, o.milestones, intOrNull(o.ano));
    const atualizado = await calendariosRepo.getById(id);
    await registrarRevisao('calendarios', existing, atualizado);
    return atualizado;
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM calendarios WHERE id = $1', [id]);
    if (rowCount > 0) await apagarRevisoes('calendarios', id);
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

// programa_paginas (secoes rich-text 'sobre'/'historico'/'objetivos'/'linhas')
// foi substituida por `pages` com `programa_id`/`chave` — ver pagesRepo acima
// e a migracao 2026-09-14_pages_programa_scoped.sql.

// ===================== Proficiência em Línguas ====================
const inscricaoProfFromRow = (r) => ({
  id: r.id, periodoId: r.periodo_id, alunoPessoaId: r.aluno_pessoa_id,
  nome: r.nome, cpf: r.cpf, nivel: r.nivel, estrangeiro: r.estrangeiro,
  linguas: r.linguas ?? [],
  comprovanteResidenciaUrl: r.comprovante_residencia_url,
  titularComprovante: r.titular_comprovante,
  comprovanteVinculoUrl: r.comprovante_vinculo_url,
  status: r.status, nota: r.nota != null ? Number(r.nota) : null,
  resultado: r.resultado, observacao: r.observacao,
  codigoVerificacao: r.codigo_verificacao ?? null,
  emitidaEm: r.emitida_em ?? null,
});

const inscricaoProfToRow = (o) => ({
  id: o.id, periodo_id: o.periodoId || null, aluno_pessoa_id: o.alunoPessoaId || null,
  nome: o.nome, cpf: o.cpf ?? null, nivel: o.nivel ?? null,
  estrangeiro: !!o.estrangeiro, linguas: toArr(o.linguas),
  comprovante_residencia_url: o.comprovanteResidenciaUrl ?? null,
  titular_comprovante: o.titularComprovante != null ? !!o.titularComprovante : true,
  comprovante_vinculo_url: o.comprovanteVinculoUrl ?? null,
  status: o.status || 'INSCRITO',
  nota: numOrNull(o.nota), resultado: o.resultado ?? null,
  observacao: o.observacao ?? null,
  codigo_verificacao: o.codigoVerificacao ?? null,
  emitida_em: o.emitidaEm ?? null,
});

export const inscricoesProficienciaRepo = {
  ...createRepository({
    table: 'inscricoes_proficiencia',
    orderBy: 'criado_em DESC',
    fromRow: inscricaoProfFromRow,
    toRow: inscricaoProfToRow,
  }),
  // Inscrições de uma pessoa (B.12: aluno_pessoa_id = pessoas.id).
  async getByAlunoPessoa(pessoaId) {
    if (!pessoaId) return [];
    const { rows } = await query(
      'SELECT * FROM inscricoes_proficiencia WHERE aluno_pessoa_id = $1 ORDER BY criado_em DESC',
      [pessoaId]
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
  // B.13 / G1: as linhas de pesquisa são da pessoa (pessoas.id), não do login.
  async getByPessoa(pessoaId) {
    if (!pessoaId) return [];
    const { rows } = await query(
      `SELECT lp.* FROM user_linhas_pesquisa ulp
       JOIN linhas_pesquisa lp ON lp.id = ulp.linha_id
       WHERE ulp.pessoa_id = $1 ORDER BY lp.nome`,
      [pessoaId]
    );
    return rows;
  },
  // Acrescenta sem tirar as que a pessoa já tem (importadores).
  async addForPessoa(pessoaId, linhaIds) {
    for (const id of linhaIds) {
      await query(
        'INSERT INTO user_linhas_pesquisa (pessoa_id, linha_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [pessoaId, id]
      );
    }
  },
  // Substitui as linhas da pessoa (formulário do painel).
  async setForPessoa(pessoaId, linhaIds) {
    await query('DELETE FROM user_linhas_pesquisa WHERE pessoa_id = $1', [pessoaId]);
    await this.addForPessoa(pessoaId, linhaIds);
    return this.getByPessoa(pessoaId);
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

// =================== Câmara de Pós-Graduação (Fase 0) =============
// Entidades de tabela única (CRUD simples). As relações N:N e o histórico
// append-only (eventos, pauta_itens, relatorias) ficam em camaraRepo.js.
export const unidadesRepo = createRepository({
  table: 'unidades', // Fase A.4 (G8): era camara_unidades; binding JS renomeado na Fase B.1
  orderBy: 'sigla ASC',
  fromRow: (r) => ({
    id: r.id, sigla: r.sigla, nome: r.nome, aliases: r.aliases ?? [],
    internaPrpg: r.interna_prpg, ativo: r.ativo,
  }),
  toRow: (o) => ({
    id: o.id, sigla: o.sigla, nome: o.nome, aliases: toArr(o.aliases),
    interna_prpg: !!o.internaPrpg, ativo: o.ativo != null ? !!o.ativo : true,
  }),
});

export const processosRepo = createRepository({
  table: 'processos', // Fase A.7 (G3): era camara_processos; binding JS renomeado na Fase B.1
  orderBy: 'criado_em DESC',
  fromRow: (r) => ({
    id: r.id, numero: r.numero, numeroValido: r.numero_valido, linkSipac: r.link_sipac,
    assunto: r.assunto, tipoMateria: r.tipo_materia, interessado: r.interessado,
    interessadoPessoaId: r.interessado_pessoa_id,
    programaId: r.programa_id, unidadeResponsavelId: r.unidade_responsavel_id,
    status: r.status, statusMotivo: r.status_motivo,
    localizacaoId: r.localizacao_id, localizacaoEm: r.localizacao_em,
    dataEntrada: r.data_entrada, dataEncerramento: r.data_encerramento,
    processoPaiId: r.processo_pai_id, sigiloso: r.sigiloso,
    observacoes: r.observacoes, obsOriginal: r.obs_original,
  }),
  toRow: (o) => ({
    id: o.id, numero: o.numero, numero_valido: o.numeroValido != null ? !!o.numeroValido : true,
    link_sipac: o.linkSipac || null, assunto: o.assunto, tipo_materia: o.tipoMateria || null,
    interessado: o.interessado || null, interessado_pessoa_id: o.interessadoPessoaId || null,
    programa_id: o.programaId || null,
    unidade_responsavel_id: o.unidadeResponsavelId || null,
    status: o.status || 'RECEBIDO', status_motivo: o.statusMotivo || null,
    localizacao_id: o.localizacaoId || null, localizacao_em: o.localizacaoEm || null,
    data_entrada: o.dataEntrada || null, data_encerramento: o.dataEncerramento || null,
    processo_pai_id: o.processoPaiId || null, sigiloso: !!o.sigiloso,
    observacoes: o.observacoes || null, obs_original: o.obsOriginal || null,
  }),
});

export const camaraReunioesRepo = createRepository({
  table: 'camara_reunioes',
  orderBy: 'data DESC',
  fromRow: (r) => ({
    id: r.id, data: r.data, numero: r.numero, tipo: r.tipo, local: r.local, hora: r.hora,
    status: r.status, pautaPdfUrl: r.pauta_pdf_url, ataUrl: r.ata_url, observacoes: r.observacoes,
  }),
  toRow: (o) => ({
    id: o.id, data: o.data, numero: o.numero || null, tipo: o.tipo || 'ORDINARIA',
    local: o.local || null, hora: o.hora || null, status: o.status || 'RASCUNHO',
    pauta_pdf_url: o.pautaPdfUrl || null, ata_url: o.ataUrl || null, observacoes: o.observacoes || null,
  }),
});

export const camaraAtosRepo = createRepository({
  table: 'camara_atos',
  orderBy: 'data DESC NULLS LAST, criado_em DESC',
  fromRow: (r) => ({
    id: r.id, processoId: r.processo_id, tipo: r.tipo, numero: r.numero, ano: r.ano,
    data: r.data, ementa: r.ementa, link: r.link, resolucaoId: r.resolucao_id,
  }),
  toRow: (o) => ({
    id: o.id, processo_id: o.processoId, tipo: o.tipo || null, numero: o.numero || null,
    ano: intOrNull(o.ano), data: o.data || null, ementa: o.ementa || null,
    link: o.link || null, resolucao_id: o.resolucaoId || null,
  }),
});
