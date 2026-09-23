import { describe, it, expect, afterAll } from 'vitest';
import { pool } from '../db/pool.js';
import {
  resetDb, RESET_TABLES, RESET_KEEPS, RESET_FORA_DO_SCHEMA, RESET_SEQUENCES,
} from './helpers.js';

afterAll(async () => {
  await pool.end();
});

// O resetDb esvazia as tabelas com DELETE explícito. O antigo
// TRUNCATE ... CASCADE cobria sozinho qualquer tabela nova ligada por FK e
// qualquer sequence nova (RESTART IDENTITY); o DELETE não. Estes testes leem
// o catálogo do banco para que uma tabela, sequence ou FK nova esquecida em
// helpers.js falhe aqui, com mensagem clara, em vez de vazar dados entre
// testes de forma intermitente.
describe('resetDb: lista de tabelas e sequences contra o catálogo', () => {
  const tabelasDoSchema = async () => {
    const { rows } = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    return rows.map((r) => r.tablename);
  };

  it('toda tabela do banco está em RESET_TABLES, RESET_KEEPS ou RESET_FORA_DO_SCHEMA', async () => {
    const cobertas = new Set([...RESET_TABLES, ...RESET_KEEPS, ...RESET_FORA_DO_SCHEMA]);
    const faltando = (await tabelasDoSchema()).filter((t) => !cobertas.has(t)).sort();
    expect(faltando, `adicione a RESET_TABLES (ou RESET_KEEPS) em helpers.js: ${faltando}`).toEqual([]);
  });

  it('as listas não repetem tabela e só citam tabela que existe (RESET_FORA_DO_SCHEMA é opcional)', async () => {
    const existentes = new Set(await tabelasDoSchema());
    const todas = [...RESET_TABLES, ...RESET_KEEPS, ...RESET_FORA_DO_SCHEMA];
    expect(todas.filter((t, i) => todas.indexOf(t) !== i)).toEqual([]);
    // RESET_FORA_DO_SCHEMA não vem do schema.sql, então pode não existir ainda.
    const obrigatorias = [...RESET_TABLES, ...RESET_KEEPS];
    expect(obrigatorias.filter((t) => !existentes.has(t))).toEqual([]);
  });

  it('RESET_SEQUENCES cobre exatamente as sequences do schema public', async () => {
    const { rows } = await pool.query("SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'");
    expect([...RESET_SEQUENCES].sort()).toEqual(rows.map((r) => r.sequencename).sort());
  });

  it('a ordem de RESET_TABLES respeita as FKs NO ACTION/RESTRICT (filha antes do pai)', async () => {
    const { rows } = await pool.query(`
      SELECT c.conrelid::regclass::text AS filha, c.confrelid::regclass::text AS pai, c.conname
      FROM pg_constraint c
      WHERE c.contype = 'f' AND c.confdeltype IN ('a', 'r') AND c.conrelid <> c.confrelid`);
    const idx = (t) => RESET_TABLES.indexOf(t);
    const violacoes = [];
    for (const { filha, pai, conname } of rows) {
      if (idx(pai) === -1) continue; // pai não é apagado: nenhuma ordem a respeitar
      if (idx(filha) === -1) {
        violacoes.push(`${conname}: ${filha} (não apagada pelo resetDb) referencia ${pai} (apagada)`);
      } else if (idx(filha) > idx(pai)) {
        violacoes.push(`${conname}: ${filha} precisa vir ANTES de ${pai} em RESET_TABLES`);
      }
    }
    expect(violacoes).toEqual([]);
  });
});

describe('resetDb: contrato', () => {
  const count = async (sql) => (await pool.query(sql)).rows[0].n;

  it('devolve o banco ao estado base: dados de teste, tabelas arrastadas, sequences e reseeds', async () => {
    await resetDb();
    const unidadesAntes = await count('SELECT count(*)::int AS n FROM unidades');

    // Suja tudo que o TRUNCATE ... CASCADE antigo arrastava, a FK NO ACTION
    // atos -> ato_series e as sequences seriais.
    await pool.query(`
      INSERT INTO programas (id) VALUES ('p-guarda');
      INSERT INTO linhas_pesquisa (nome, programa_id) VALUES ('Linha guarda', 'p-guarda');
      INSERT INTO taxonomia_refs (campo, valor, target_id) VALUES ('entrada', 'guarda', 'guarda-1');
      INSERT INTO vocabularios (dominio, valor, rotulo) VALUES ('evento.tipo', 'GUARDA', 'Guarda');
      UPDATE vocabularios SET rotulo = 'ALTERADO'
        WHERE dominio = 'processo.situacao' AND valor = 'RECEBIDO' AND programa_id IS NULL;
      INSERT INTO ato_series (id, nome, especie) VALUES ('SERIE_GUARDA', 'Guarda', 'OFICIO');
      INSERT INTO atos (id, serie_id, ano, sequencial, assunto)
        VALUES ('ato-guarda', 'SERIE_GUARDA', 2026, 1, 'Guarda');
      INSERT INTO ato_diplomas (ato_id, nome_concluinte) VALUES ('ato-guarda', 'Fulano');
      INSERT INTO calendarios (id) VALUES ('cal-guarda');
      INSERT INTO calendario_milestones (calendario_id, ord, event, date)
        VALUES ('cal-guarda', 0, 'x', '2026-01-01');
    `);

    await resetDb();

    for (const t of ['programas', 'linhas_pesquisa', 'taxonomia_refs', 'atos', 'ato_diplomas',
      'calendarios', 'calendario_milestones']) {
      expect(await count(`SELECT count(*)::int AS n FROM ${t}`), t).toBe(0);
    }

    // Reseeds: vocabulário global mínimo (sem o dado sujo) e séries-base.
    expect(await count("SELECT count(*)::int AS n FROM vocabularios WHERE valor = 'GUARDA'")).toBe(0);
    expect(await count(
      "SELECT count(*)::int AS n FROM vocabularios WHERE valor = 'RECEBIDO' AND rotulo = 'Recebido'"
    )).toBe(1);
    expect(await count(
      "SELECT count(*)::int AS n FROM ato_series WHERE id IN ('OFICIO','PORTARIA_PRPG','EDITAL_PRPG')"
    )).toBe(3);
    expect(await count("SELECT count(*)::int AS n FROM ato_series WHERE id = 'SERIE_GUARDA'")).toBe(0);

    // Sequences reiniciadas: o próximo id volta a ser 1 (vocabularios já foi
    // reseedada, então seu menor id é 1).
    for (const seq of ['calendario_milestones_id_seq', 'ato_diplomas_id_seq',
      'linhas_pesquisa_id_seq', 'taxonomia_refs_id_seq']) {
      expect(await count(`SELECT nextval('${seq}')::int AS n`), seq).toBe(1);
    }
    expect(await count('SELECT min(id)::int AS n FROM vocabularios')).toBe(1);

    // O seed persistente de unidades não é tocado.
    expect(await count('SELECT count(*)::int AS n FROM unidades')).toBe(unidadesAntes);
    expect(unidadesAntes).toBeGreaterThan(0);
  });
});
