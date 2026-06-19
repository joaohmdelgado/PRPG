import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from './pool.js';
import {
  newsRepo, editaisRepo, resolucoesRepo, formulariosRepo, portariasRepo,
  tesesRepo, faqRepo, disciplinasRepo, bolsasRepo, pagesRepo, usersRepo,
  calendariosRepo, taxonomiasRepo, gruposRepo,
} from './repositories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');

const read = (name) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
  } catch {
    return null;
  }
};

const intOrNull = (v) => (v === '' || v == null ? null : parseInt(v, 10));

// Migra uma lista usando o create() do repositório.
const migrateRepo = async (label, file, repo) => {
  const items = read(file);
  if (!Array.isArray(items)) {
    console.log(`  ${label}: (arquivo ausente ou vazio)`);
    return;
  }
  let ok = 0;
  for (const item of items) {
    try {
      await repo.create(item);
      ok++;
    } catch (e) {
      console.error(`  ! ${label} id=${item.id}: ${e.message}`);
    }
  }
  console.log(`  ${label}: ${ok}/${items.length}`);
};

async function main() {
  console.log('Limpando tabelas...');
  await query(`TRUNCATE
    news, editais, resolucoes, formularios, portarias, teses_dissertacoes,
    faq, disciplinas, bolsas, pages, users, taxonomias, grupos_pesquisa,
    calendarios, calendario_milestones,
    programas, programa_paginas, pessoas, modalidades, vinculos, metricas_anuais
    RESTART IDENTITY CASCADE`);

  console.log('Migrando entidades simples...');
  await migrateRepo('news', 'news.json', newsRepo);
  await migrateRepo('editais', 'editais.json', editaisRepo);
  await migrateRepo('resolucoes', 'resolucoes.json', resolucoesRepo);
  await migrateRepo('formularios', 'formularios.json', formulariosRepo);
  await migrateRepo('portarias', 'portarias.json', portariasRepo);
  await migrateRepo('teses', 'teses_dissertacoes.json', tesesRepo);
  await migrateRepo('faq', 'faq.json', faqRepo);
  await migrateRepo('disciplinas', 'disciplinas.json', disciplinasRepo);
  await migrateRepo('bolsas', 'bolsas.json', bolsasRepo);
  await migrateRepo('pages', 'pages.json', pagesRepo);
  await migrateRepo('grupos_pesquisa', 'grupos_pesquisa.json', gruposRepo);
  await migrateRepo('users', 'users.json', usersRepo);
  await migrateRepo('calendarios', 'calendarios.json', calendariosRepo);

  console.log('Migrando taxonomias...');
  const tax = read('taxonomias.json');
  if (tax && typeof tax === 'object') {
    await taxonomiasRepo.replaceAll(tax);
    console.log(`  taxonomias: ${Object.keys(tax).length} chaves`);
  }

  console.log('Migrando programas e relacionados...');
  const programas = read('programas.json') || [];
  for (const p of programas) {
    await query(
      `INSERT INTO programas
        (id,nome,sigla,codigo_capes,campus,em_rede,nome_rede,grande_area,
         area_conhecimento,area_avaliacao,
         slug,microsite_ativo,logo_url,cor_primaria,cor_secundaria,descricao_curta,
         hero_imagem_url,endereco,whatsapp,instagram_url,facebook_url,youtube_url,mapa_embed,
         email_programa,telefone_secretaria,
         criado_em,atualizado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
               $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
      [p.id, p.nome, p.sigla, p.codigo_capes, p.campus, !!p.em_rede, p.nome_rede,
       p.grande_area, p.area_conhecimento, p.area_avaliacao,
       p.slug || null, !!p.microsite_ativo, p.logo_url || null, p.cor_primaria || null,
       p.cor_secundaria || null, p.descricao_curta || null, p.hero_imagem_url || null,
       p.endereco || null, p.whatsapp || null, p.instagram_url || null, p.facebook_url || null,
       p.youtube_url || null, p.mapa_embed || null,
       p.email_programa || null, p.telefone_secretaria || null,
       p.criado_em || null, p.atualizado_em || null]
    );
  }
  console.log(`  programas: ${programas.length}`);

  const programaPaginas = read('programa_paginas.json') || [];
  for (const pp of programaPaginas) {
    await query(
      `INSERT INTO programa_paginas
        (id,programa_id,secao,titulo,body_value,body_summary,ord,visivel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [pp.id, pp.programa_id, pp.secao, pp.titulo || null, pp.body_value || null,
       pp.body_summary || null, intOrNull(pp.ord) ?? 0, pp.visivel !== false]
    );
  }
  console.log(`  programa_paginas: ${programaPaginas.length}`);

  const pessoas = read('pessoas.json') || [];
  for (const p of pessoas) {
    await query(
      `INSERT INTO pessoas (id,nome,cpf,siape,email_institucional,telefones,endereco,criado_em,atualizado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [p.id, p.nome, p.cpf, p.siape, p.email_institucional, p.telefones, p.endereco,
       p.criado_em || null, p.atualizado_em || null]
    );
  }
  console.log(`  pessoas: ${pessoas.length}`);

  const modalidades = read('modalidades.json') || [];
  for (const m of modalidades) {
    await query(
      `INSERT INTO modalidades (id,programa_id,tipo,ano_inicio,nota_capes) VALUES ($1,$2,$3,$4,$5)`,
      [m.id, m.programa_id, m.tipo, intOrNull(m.ano_inicio), m.nota_capes]
    );
  }
  console.log(`  modalidades: ${modalidades.length}`);

  const vinculos = read('vinculos.json') || [];
  for (const v of vinculos) {
    await query(
      `INSERT INTO vinculos
        (id,programa_id,pessoa_id,papel,portaria,portaria_id,data_vencimento,email_funcao,endereco,ativo,criado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [v.id, v.programa_id, v.pessoa_id, v.papel, v.portaria, v.portaria_id || null,
       v.data_vencimento, v.email_funcao, v.endereco || null, v.ativo !== false, v.criado_em || null]
    );
  }
  console.log(`  vinculos: ${vinculos.length}`);

  console.log('\nMigração concluída.');
  await pool.end();
}

main().catch(async (e) => {
  console.error('Falha na migração:', e);
  await pool.end();
  process.exit(1);
});
