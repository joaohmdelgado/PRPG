import bcrypt from 'bcryptjs';
import request from 'supertest';
import { pool } from '../db/pool.js';
import { app } from '../app.js';
import { usersRepo } from '../db/repositories.js';

// Tudo que o resetDb esvazia a cada teste: as 47 tabelas do schema `public`
// menos `unidades` (seed persistente, nunca tocada). São as 38 que o antigo
// TRUNCATE listava + 5 que ele arrastava por CASCADE (linhas_pesquisa e as
// duas tabelas de junção, taxonomia_refs e vocabularios — todas com FK para
// programas/users). O DELETE não arrasta nada sozinho, então as 5 entram
// aqui de forma explícita. `revisoes` (Fase F.7) e `menus`/`menu_itens`/`configuracoes`
// (Fase H.1) vieram depois.
//
// ORDEM: `atos` vem antes de `ato_series` porque atos.serie_id -> ato_series
// é a única FK NO ACTION entre estas tabelas (atos_serie_id_fkey); todas as
// outras entre elas são ON DELETE CASCADE/SET NULL, e as demais NO ACTION
// (processos -> unidades) apontam para `unidades`, que não é apagada.
// resetDb.test.js confere a ordem e a cobertura contra o catálogo do banco.
export const RESET_TABLES = [
  'news', 'editais', 'resolucoes', 'formularios', 'portarias', 'teses_dissertacoes',
  'faq', 'disciplinas', 'bolsas', 'pages', 'users', 'taxonomias', 'taxonomia_refs',
  'grupos_pesquisa', 'calendarios', 'calendario_milestones', 'programas', 'pessoas',
  'modalidades', 'vinculos', 'metricas_anuais',
  'linhas_pesquisa', 'programa_linhas_pesquisa', 'user_linhas_pesquisa',
  'vocabularios',
  'inscricoes_proficiencia',
  'processos', 'camara_reunioes', 'camara_pauta_itens',
  'camara_relatorias', 'camara_atos',
  'arquivos', 'anexos', 'contatos', 'eventos',
  'atos', 'ato_series', 'ato_referencias', 'documentos', 'declaracoes',
  'pos_doutorados', 'notificacoes', 'ato_diplomas',
  'revisoes', 'menu_itens', 'menus', 'configuracoes',
];

// Tabelas do schema que o resetDb deliberadamente NÃO toca: `unidades` é seed
// (organograma) que os testes apenas leem.
export const RESET_KEEPS = ['unidades'];

// Tabelas que podem existir no banco de teste SEM vir do schema.sql: criadas
// sob demanda pelo runner de migrações (server/db/migrateRunner.mjs) e por
// migrateRunner.test.js, que não as remove. Como os arquivos de teste rodam em
// série no mesmo banco e a ordem entre eles varia, `schema_migrations` às
// vezes existe e às vezes não quando outro arquivo roda. O resetDb não as toca
// (o TRUNCATE antigo também não); resetDb.test.js só precisa reconhecê-las.
export const RESET_FORA_DO_SCHEMA = ['schema_migrations'];

// Todas as sequences do schema (PK SERIAL). O TRUNCATE ... RESTART IDENTITY
// reiniciava-as (inclusive as das tabelas arrastadas por CASCADE); DELETE não
// mexe em sequência, então reiniciamos explicitamente para os ids numéricos
// não crescerem entre testes.
export const RESET_SEQUENCES = [
  'calendario_milestones_id_seq', 'ato_diplomas_id_seq', 'linhas_pesquisa_id_seq',
  'taxonomia_refs_id_seq', 'vocabularios_id_seq', 'revisoes_id_seq',
  'menu_itens_id_seq',
];

export async function resetDb() {
  // DELETE em vez de TRUNCATE: TRUNCATE cria um relfilenode novo por tabela
  // truncada e o Postgres faz fsync síncrono de cada um (wait_event
  // IO/DataFileImmediateSync) antes de concluir. Com 43 tabelas e I/O lento
  // (Docker Desktop no Windows), isso já estourou o hookTimeout padrão do
  // Vitest (10s) no beforeEach — e o hook estourado, que o Vitest não
  // cancela, seguia rodando e colidia com o resetDb do teste seguinte
  // (duplicate key em users_pkey). Medido em 23/09/2026 com o Docker recém-
  // reiniciado (I/O saudável): TRUNCATE levava ~1,6 s por reset em mediana
  // (p99 5,5 s, pior 7,7 s; ~70% do tempo da suíte) contra ~10 ms com DELETE.
  // DELETE é DML comum: não cria relfilenode.
  // Os únicos triggers de usuário do schema são BEFORE UPDATE
  // (tocar_atualizado_em, Fase F.1) — DELETE não os dispara; e
  // limpar_dependentes() está definida mas não anexada a nenhuma tabela.
  // Então DELETE não tem efeito colateral que o TRUNCATE não tinha. Uma única
  // transação, um round-trip.
  const deletes = RESET_TABLES.map((t) => `DELETE FROM ${t};`).join('\n  ');
  const seqResets = RESET_SEQUENCES.map((s) => `ALTER SEQUENCE ${s} RESTART;`).join('\n  ');
  await pool.query(`BEGIN;\n  ${deletes}\n  ${seqResets}\nCOMMIT;`);

  // vocabularios (e taxonomia_refs) têm seed no schema.sql que some no
  // primeiro reset — igual ao comportamento anterior, em que o TRUNCATE ...
  // CASCADE em `programas` as arrastava por causa da FK programa_id ->
  // programas(id). Reseeda o vocabulário global (programa_id IS NULL) mínimo
  // se ficou vazio.
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM vocabularios');
  if (rows[0].n === 0) await reseedVocabularios();

  // ato_series é tabela real (não só seed como unidades) e também é esvaziada
  // acima — reseeda as séries-base para os testes de atos.test.js.
  const { rows: rowsSeries } = await pool.query('SELECT count(*)::int AS n FROM ato_series');
  if (rowsSeries[0].n === 0) await reseedAtoSeries();
}

async function reseedAtoSeries() {
  await pool.query(`
    INSERT INTO ato_series (id, nome, especie, sigla, exige_destinatario, publica_no_site, ordem) VALUES
      ('OFICIO', 'Ofícios da PRPG', 'OFICIO', 'OFÍCIO', TRUE, FALSE, 0),
      ('PORTARIA_PRPG', 'Portarias da PRPG', 'PORTARIA', 'PORTARIA', FALSE, FALSE, 1),
      ('EDITAL_PRPG', 'Editais da PRPG', 'EDITAL', 'EDITAL', FALSE, TRUE, 2)
    ON CONFLICT (id) DO NOTHING
  `);
}

async function reseedVocabularios() {
  await pool.query(`
    INSERT INTO vocabularios (dominio, valor, rotulo, cor, ordem) VALUES
      ('processo.situacao', 'RECEBIDO', 'Recebido', 'bg-gray-100 text-gray-700', 0),
      ('processo.situacao', 'APTO_PAUTA', 'Apto para pauta', 'bg-sky-100 text-sky-800', 2),
      ('processo.situacao', 'PUBLICADO', 'Publicado', 'bg-green-100 text-green-800', 8),
      ('processo.pauta.deliberacao', 'APROVADO', 'Aprovado', NULL, 0),
      ('evento.tipo', 'TRAMITACAO', 'Tramitação', NULL, 0),
      ('evento.tipo', 'STATUS', 'Status', NULL, 1),
      ('vinculo.papel', 'COORDENADOR', 'Coordenador(a)', NULL, 0),
      ('vinculo.papel', 'SECRETARIO', 'Secretário(a)', NULL, 3)
    ON CONFLICT (dominio, valor, COALESCE(programa_id, '')) DO NOTHING
  `);
}

// Cria um usuário com papel/perfil arbitrários (senha padrão "senha123").
export async function seedUser({ id, email, roles = ['Aluno'], perfil_geral = {}, password = 'senha123' }) {
  const password_hash = await bcrypt.hash(password, 10);
  return usersRepo.create({ id, email, password_hash, roles, perfil_geral });
}

export async function seedAdmin() {
  return seedUser({
    id: 'admin-test',
    email: 'admin@test.com',
    roles: ['Administrator'],
    perfil_geral: { nome: 'Admin Teste' },
    password: 'admin123',
  });
}

export async function login(email, password = 'senha123') {
  const res = await request(app).post('/api/login').send({ username: email, password });
  return res.body.token;
}

export async function loginAdmin() {
  return login('admin@test.com', 'admin123');
}

// Insere uma pessoa (legado) diretamente, para testar a resolução por pessoas.
export async function seedPessoa({ id, nome, cpf = '', siape = '' }) {
  await pool.query(
    'INSERT INTO pessoas (id, nome, cpf, siape) VALUES ($1, $2, $3, $4)',
    [id, nome, cpf, siape]
  );
}
