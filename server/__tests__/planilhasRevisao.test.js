import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import XLSX from 'xlsx';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, seedUser, login } from './helpers.js';
import { executarImportacao } from '../services/planilhas/nucleo.js';

// Fase O.2: importar fielmente e revisar depois — o núcleo comum dos
// importadores (simulação, origem, reexecução segura) e a tela de revisão.

let adminToken;
beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});
afterAll(async () => { await pool.end(); });

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

const planilha = (linhas) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), 'Aba');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

// Importador mínimo: cada linha vira um processo "a classificar" com a cor
// (coluna B) como pendência D-B1 — o mesmo desenho do importador da Câmara.
const importadorTeste = {
  fonte: 'camara',
  async importar(ctx, wb) {
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets.Aba, { header: 1, raw: false });
    for (const [i, [nup, cor, assunto]] of linhas.entries()) {
      const dados = { aba: 'Aba', linha: i + 1, colunas: { nup, cor, assunto } };
      if (await ctx.jaImportado({ chave: nup, dados })) continue;
      const id = `proc-${i}`;
      await ctx.q(`INSERT INTO processos (id, numero, assunto, status) VALUES ($1,$2,$3,'A_CLASSIFICAR')`, [id, nup, assunto]);
      await ctx.registrarOrigem({ chave: nup, entidade: 'processo', entidadeId: id, dados });
      await ctx.pendencia({ chave: nup, tipo: 'COR_SEM_LEGENDA', entidade: 'processo', entidadeId: id, valorOriginal: cor });
      ctx.item({ acao: 'criado', chave: nup, entidade: 'processo', entidadeId: id });
    }
  },
};

const LINHAS = [
  ['23082.000001/2026-01', 'B6D7A8', 'Primeiro'],
  ['23082.000002/2026-02', 'B6D7A8', 'Segundo'],
  ['23082.000003/2026-03', 'F4CCCC', 'Terceiro'],
];

const contar = async (tabela) => (await pool.query(`SELECT count(*)::int AS n FROM ${tabela}`)).rows[0].n;

describe('núcleo de importação (O.2/O.3)', () => {
  it('simulação faz a importação inteira e desfaz: relatório completo, nada gravado', async () => {
    const r = await executarImportacao({ importador: importadorTeste, buffer: planilha(LINHAS), simulacao: true, guardar: false });
    expect(r.resumo.criado).toBe(3);
    expect(r.resumo.pendencias).toBe(3);
    expect(await contar('processos')).toBe(0);
    expect(await contar('importacao_origens')).toBe(0);
    expect(await contar('importacao_pendencias')).toBe(0);
    // A execução fica registrada (histórico das conferências do ciclo em paralelo).
    const { rows } = await pool.query('SELECT simulacao, resumo FROM importacoes');
    expect(rows).toHaveLength(1);
    expect(rows[0].simulacao).toBe(true);
    expect(rows[0].resumo.criado).toBe(3);
  });

  it('reexecução é segura: mesma linha = inalterado; linha editada na planilha = divergente, sem sobrescrever', async () => {
    await executarImportacao({ importador: importadorTeste, buffer: planilha(LINHAS), simulacao: false, guardar: false });
    expect(await contar('processos')).toBe(3);

    const r2 = await executarImportacao({ importador: importadorTeste, buffer: planilha(LINHAS), simulacao: false, guardar: false });
    expect(r2.resumo.inalterado).toBe(3);
    expect(r2.resumo.criado).toBe(0);
    expect(await contar('processos')).toBe(3);

    const editada = [...LINHAS];
    editada[0] = ['23082.000001/2026-01', 'B6D7A8', 'Primeiro (corrigido na planilha)'];
    const r3 = await executarImportacao({ importador: importadorTeste, buffer: planilha(editada), simulacao: true, guardar: false });
    expect(r3.resumo.divergente).toBe(1);
    const div = r3.relatorio.find((i) => i.acao === 'divergente');
    expect(div.mudou).toEqual([{ campo: 'colunas', antes: expect.any(Object), agora: expect.any(Object) }]);
    const { rows } = await pool.query("SELECT assunto FROM processos WHERE numero = '23082.000001/2026-01'");
    expect(rows[0].assunto).toBe('Primeiro');
  });

  it('erro no importador desfaz tudo e fica registrado na execução', async () => {
    const quebrado = { fonte: 'camara', async importar(ctx) {
      await ctx.q(`INSERT INTO processos (id, numero, assunto) VALUES ('x','23082.000009/2026-09','x')`);
      throw new Error('falhou no meio');
    } };
    await expect(executarImportacao({ importador: quebrado, buffer: planilha(LINHAS), simulacao: false, guardar: false }))
      .rejects.toThrow('falhou no meio');
    expect(await contar('processos')).toBe(0);
    const { rows } = await pool.query('SELECT erro FROM importacoes');
    expect(rows[0].erro).toBe('falhou no meio');
  });
});

describe('revisão da importação (O.2)', () => {
  beforeEach(async () => {
    await executarImportacao({ importador: importadorTeste, buffer: planilha(LINHAS), simulacao: false, guardar: false });
  });

  it('lista pendências abertas com a decisão que as responde', async () => {
    const res = await asAdmin(request(app).get('/api/importacoes/pendencias?fonte=camara'));
    expect(res.status).toBe(200);
    expect(res.body.itens).toHaveLength(3);
    expect(res.body.itens.every((p) => p.decisao === 'D-B1')).toBe(true);
    expect(res.body.tipos.COR_SEM_LEGENDA.destino).toBe('status_processo');
  });

  it('aplicar em lote: uma resposta muda todos os processos da cor, registra evento e guarda o de-para', async () => {
    const res = await asAdmin(request(app).post('/api/importacoes/pendencias/lote'))
      .send({ fonte: 'camara', tipo: 'COR_SEM_LEGENDA', valorOriginal: 'B6D7A8', acao: 'aplicar', destino: 'RESOLVIDO', nota: 'oficina' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ resolvidas: 2, alterados: 2 });

    const { rows } = await pool.query('SELECT numero, status FROM processos ORDER BY numero');
    expect(rows.map((r) => r.status)).toEqual(['RESOLVIDO', 'RESOLVIDO', 'A_CLASSIFICAR']);
    const { rows: ev } = await pool.query("SELECT tipo, descricao FROM eventos WHERE entidade = 'processo'");
    expect(ev).toHaveLength(2);
    expect(ev[0].descricao).toContain('D-B1');
    const { rows: dp } = await pool.query('SELECT * FROM importacao_depara');
    expect(dp).toMatchObject([{ fonte: 'camara', dominio: 'cor', valor: 'B6D7A8', destino: 'RESOLVIDO' }]);

    // Reimportar não reabre a pendência resolvida.
    await executarImportacao({ importador: importadorTeste, buffer: planilha(LINHAS), simulacao: false, guardar: false });
    const abertas = await asAdmin(request(app).get('/api/importacoes/pendencias?fonte=camara'));
    expect(abertas.body.itens.map((p) => p.valorOriginal)).toEqual(['F4CCCC']);
  });

  it('recusa valor inexistente e não altera nada', async () => {
    const res = await asAdmin(request(app).post('/api/importacoes/pendencias/lote'))
      .send({ fonte: 'camara', tipo: 'COR_SEM_LEGENDA', valorOriginal: 'F4CCCC', acao: 'aplicar', destino: 'INVENTADO' });
    expect(res.status).toBe(400);
    const { rows } = await pool.query("SELECT status FROM processos WHERE numero = '23082.000003/2026-03'");
    expect(rows[0].status).toBe('A_CLASSIFICAR');
  });

  it('conferido e descartar resolvem sem aplicar; a pendência resolvida não aceita nova resolução', async () => {
    const { body } = await asAdmin(request(app).get('/api/importacoes/pendencias?fonte=camara'));
    const alvo = body.itens.find((p) => p.valorOriginal === 'F4CCCC');
    const ok = await asAdmin(request(app).post(`/api/importacoes/pendencias/${alvo.id}/resolver`)).send({ acao: 'descartar', nota: 'não se aplica' });
    expect(ok.status).toBe(200);
    const de_novo = await asAdmin(request(app).post(`/api/importacoes/pendencias/${alvo.id}/resolver`)).send({ acao: 'conferido' });
    expect(de_novo.status).toBe(409);
    const descartadas = await asAdmin(request(app).get('/api/importacoes/pendencias?situacao=DESCARTADA'));
    expect(descartadas.body.itens[0].resolucao).toMatchObject({ acao: 'descartar', nota: 'não se aplica' });
  });

  it('a origem de um registro mostra a linha da planilha como veio', async () => {
    const res = await asAdmin(request(app).get('/api/importacoes/origem/processo/proc-0'));
    expect(res.status).toBe(200);
    expect(res.body.origens[0]).toMatchObject({ fonte: 'camara', chave: '23082.000001/2026-01', dados: { colunas: { assunto: 'Primeiro' } } });
    expect(res.body.pendencias).toHaveLength(1);
  });

  it('só Admin/Gestor acessam a revisão', async () => {
    await seedUser({ id: 'aluno', email: 'aluno@test.com', roles: ['Aluno'] });
    const token = await login('aluno@test.com');
    const res = await request(app).get('/api/importacoes/pendencias').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('aposentadoria das planilhas (O.4)', () => {
  const situacao = (fonte, corpo) => asAdmin(request(app).put(`/api/importacoes/planilhas/${fonte}/situacao`)).send(corpo);

  it('não começa o paralelo sem importação gravada, nem aposenta sem os quatro critérios', async () => {
    const r1 = await situacao('camara', { situacao: 'PARALELO' });
    expect(r1.status).toBe(409);
    await executarImportacao({ importador: importadorTeste, buffer: planilha(LINHAS), simulacao: false, guardar: false });
    expect((await situacao('camara', { situacao: 'PARALELO' })).status).toBe(200);
    const r2 = await situacao('camara', { situacao: 'SOMENTE_LEITURA' });
    expect(r2.status).toBe(409);
    expect(r2.body.criterios.filter((c) => !c.ok).map((c) => c.id)).toEqual(['decisoes', 'ciclo', 'divergencia']);
  });

  it('cumpridos os quatro (decisão respondida, ciclo vencido e reunião, simulação sem divergência) aposenta', async () => {
    await executarImportacao({ importador: importadorTeste, buffer: planilha(LINHAS), simulacao: false, guardar: false });
    await asAdmin(request(app).post('/api/importacoes/pendencias/lote'))
      .send({ fonte: 'camara', tipo: 'COR_SEM_LEGENDA', valorOriginal: 'B6D7A8', acao: 'descartar' });
    await asAdmin(request(app).post('/api/importacoes/pendencias/lote'))
      .send({ fonte: 'camara', tipo: 'COR_SEM_LEGENDA', valorOriginal: 'F4CCCC', acao: 'descartar' });
    await situacao('camara', { situacao: 'PARALELO', desde: '2026-06-01' });
    // Ciclo vencido, mas sem reunião no período e sem simulação: ainda não.
    let a = (await asAdmin(request(app).get('/api/importacoes/planilhas'))).body.find((p) => p.fonte === 'camara').aposentadoria;
    expect(a.criterios.find((c) => c.id === 'ciclo')).toMatchObject({ ok: false });
    expect(a.criterios.find((c) => c.id === 'ciclo').detalhe).toContain('nenhuma reunião');

    await pool.query(`INSERT INTO camara_reunioes (id, data, status) VALUES ('r1', '2026-06-20', 'REALIZADA')`);
    // Simulação sem divergência: a mesma planilha já importada = tudo inalterado.
    await executarImportacao({ importador: importadorTeste, buffer: planilha(LINHAS), simulacao: true, guardar: false });
    a = (await asAdmin(request(app).get('/api/importacoes/planilhas'))).body.find((p) => p.fonte === 'camara').aposentadoria;
    expect(a.criterios.map((c) => [c.id, c.ok])).toEqual([['importada', true], ['decisoes', true], ['ciclo', true], ['divergencia', true]]);
    expect(a.apta).toBe(true);

    const fim = await situacao('camara', { situacao: 'SOMENTE_LEITURA' });
    expect(fim.status).toBe(200);
    expect(fim.body.situacao).toBe('SOMENTE_LEITURA');
    expect(fim.body.somenteLeituraDesde).toBeTruthy();
  });

  it('linha nova na planilha ao fim do ciclo é divergência e barra a aposentadoria', async () => {
    await executarImportacao({ importador: importadorTeste, buffer: planilha(LINHAS), simulacao: false, guardar: false });
    await situacao('camara', { situacao: 'PARALELO', desde: '2026-06-01' });
    const nova = [...LINHAS, ['23082.000009/2026-09', 'F4CCCC', 'Só na planilha']];
    await executarImportacao({ importador: importadorTeste, buffer: planilha(nova), simulacao: true, guardar: false });
    const a = (await asAdmin(request(app).get('/api/importacoes/planilhas'))).body.find((p) => p.fonte === 'camara').aposentadoria;
    expect(a.criterios.find((c) => c.id === 'divergencia')).toMatchObject({ ok: false, detalhe: '1 nova(s), 0 alterada(s), 0 em conflito' });
    const div = await asAdmin(request(app).get('/api/importacoes/planilhas/camara/divergencias'));
    expect(div.body.itens.map((i) => i.chave)).toEqual(['23082.000009/2026-09']);
  });

  it('voltar para "em uso" descarta o ciclo', async () => {
    await executarImportacao({ importador: importadorTeste, buffer: planilha(LINHAS), simulacao: false, guardar: false });
    await situacao('camara', { situacao: 'PARALELO' });
    const r = await situacao('camara', { situacao: 'EM_USO' });
    expect(r.body).toMatchObject({ situacao: 'EM_USO', paraleloDesde: null });
  });
});
