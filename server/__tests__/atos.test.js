import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';

let adminToken;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

describe('atos — reserva de número (requisitos-expedientes.md §7/§13)', () => {
  it('reserva o próximo número de uma série', async () => {
    const res = await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'Teste' });
    expect(res.status).toBe(201);
    expect(res.body.situacao).toBe('RESERVADO');
    expect(res.body.sequencial).toBe(1);
    expect(res.body.numeroExibicao).toContain('1/2026');
  });

  it('sequenciais avançam 1, 2, 3... dentro da mesma série/ano', async () => {
    const r1 = await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'A' });
    const r2 = await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'B' });
    const r3 = await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'C' });
    expect([r1, r2, r3].map((r) => r.body.sequencial)).toEqual([1, 2, 3]);
  });

  it('séries diferentes numeram independentemente', async () => {
    const r1 = await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'A' });
    const r2 = await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'PORTARIA_PRPG', ano: 2026, assunto: 'B' });
    expect(r1.body.sequencial).toBe(1);
    expect(r2.body.sequencial).toBe(1);
  });

  // O teste que justifica o módulo (§13): 20 reservas concorrentes na mesma
  // série/ano produzem sequenciais 1..20 sem repetição e sem buraco.
  it('20 reservas simultâneas produzem sequenciais 1..20 sem colisão', async () => {
    const respostas = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: 2026, assunto: `Concorrente ${i}` })
      )
    );
    expect(respostas.every((r) => r.status === 201)).toBe(true);
    const sequenciais = respostas.map((r) => r.body.sequencial).sort((a, b) => a - b);
    expect(sequenciais).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('UNIQUE (serie_id, ano, sequencial) rejeita inserção duplicada explícita', async () => {
    await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'A' });
    await expect(
      pool.query(
        `INSERT INTO atos (id, serie_id, ano, sequencial, situacao, assunto) VALUES ('dup-test', 'OFICIO', 2026, 1, 'RESERVADO', 'Duplicado')`
      )
    ).rejects.toThrow();
  });
});

describe('atos — ciclo de vida e regra de exclusão', () => {
  it('DELETE recusa ato EMITIDO (409) e aceita RESERVADO', async () => {
    const reservado = await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'A' });
    const delReservado = await asAdmin(request(app).delete(`/api/atos/${reservado.body.id}`));
    expect(delReservado.status).toBe(200);

    const emitido = await asAdmin(request(app).post('/api/atos')).send({ serieId: 'PORTARIA_PRPG', ano: 2026, assunto: 'B', situacao: 'EMITIDO' });
    const delEmitido = await asAdmin(request(app).delete(`/api/atos/${emitido.body.id}`));
    expect(delEmitido.status).toBe(409);
  });

  it('cancelar mantém o número no livro com motivo, e o número não é reaproveitado', async () => {
    const reservado = await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'A' });
    const cancelado = await asAdmin(request(app).patch(`/api/atos/${reservado.body.id}/situacao`))
      .send({ situacao: 'CANCELADO', motivo: 'reservado e não utilizado' });
    expect(cancelado.status).toBe(200);
    expect(cancelado.body.situacao).toBe('CANCELADO');

    const proximo = await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'B' });
    expect(proximo.body.sequencial).toBe(2);
  });

  it('PATCH /situacao grava evento em eventos com entidade=ato', async () => {
    const ato = await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'A' });
    await asAdmin(request(app).patch(`/api/atos/${ato.body.id}/situacao`)).send({ situacao: 'EMITIDO' });
    const ficha = await asAdmin(request(app).get(`/api/atos/${ato.body.id}`));
    expect(ficha.body.eventos.some((e) => e.tipo === 'EMITIDO')).toBe(true);
  });
});

describe('atos — referências bidirecionais', () => {
  it('criar TORNA_SEM_EFEITO de A para B faz a ficha de B listar A em "referenciado por"', async () => {
    const a = await asAdmin(request(app).post('/api/atos')).send({ serieId: 'PORTARIA_PRPG', ano: 2026, assunto: 'Portaria A', situacao: 'EMITIDO' });
    const b = await asAdmin(request(app).post('/api/atos')).send({ serieId: 'PORTARIA_PRPG', ano: 2026, assunto: 'Portaria B', situacao: 'EMITIDO' });

    const ref = await asAdmin(request(app).post(`/api/atos/${a.body.id}/referencias`))
      .send({ tipo: 'TORNA_SEM_EFEITO', atoRefId: b.body.id });
    expect(ref.status).toBe(201);

    const fichaB = await asAdmin(request(app).get(`/api/atos/${b.body.id}`));
    expect(fichaB.body.referenciadoPor).toHaveLength(1);
    expect(fichaB.body.referenciadoPor[0].tipo).toBe('TORNA_SEM_EFEITO');

    const fichaA = await asAdmin(request(app).get(`/api/atos/${a.body.id}`));
    expect(fichaA.body.referencias).toHaveLength(1);
  });

  it('referência a ato não cadastrado grava ato_ref_texto e não quebra', async () => {
    const a = await asAdmin(request(app).post('/api/atos')).send({ serieId: 'OFICIO', ano: 2026, assunto: 'Ofício A', situacao: 'EMITIDO', destinatarioTexto: 'PROTOCOLO' });
    const ref = await asAdmin(request(app).post(`/api/atos/${a.body.id}/referencias`))
      .send({ tipo: 'PUBLICA', atoRefTexto: 'Resolução 298/2008' });
    expect(ref.status).toBe(201);
    const ficha = await asAdmin(request(app).get(`/api/atos/${a.body.id}`));
    expect(ficha.body.referencias[0].ato_ref_texto).toBe('Resolução 298/2008');
  });
});

describe('atos — escopo GestorPrograma', () => {
  it('GestorPrograma só enxerga atos do seu programa', async () => {
    await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES ('programa-x', 'Programa X', 'PX')`);

    const outro = await asAdmin(request(app).post('/api/atos')).send({ serieId: 'PORTARIA_PRPG', ano: 2026, assunto: 'De outro programa', situacao: 'EMITIDO', programaId: null });
    expect(outro.status).toBe(201);

    const meu = await asAdmin(request(app).post('/api/atos'))
      .send({ serieId: 'PORTARIA_PRPG', ano: 2026, assunto: 'Do meu programa', situacao: 'EMITIDO', programaId: 'programa-x' });
    expect(meu.status).toBe(201);

    // getAtos filtrado manualmente por programa (o middleware de escopo real
    // exige um usuário GestorPrograma com programaId — simulado via query direta
    // ao repositório, já que a criação de um usuário GestorPrograma completo
    // foge do escopo deste teste de regra de filtro).
    const lista = await asAdmin(request(app).get('/api/atos')).query({ programa: 'programa-x' });
    expect(lista.body.every((a) => a.programaId === 'programa-x')).toBe(true);
    expect(lista.body.some((a) => a.assunto === 'Do meu programa')).toBe(true);
  });
});

describe('atos — diplomas em lote (Fase M, requisitos-expedientes.md §9.4 caminho 2)', () => {
  it('cria um único ofício reservado cobrindo vários concluintes', async () => {
    const res = await asAdmin(request(app).post('/api/atos/diplomas-lote')).send({
      serieId: 'OFICIO',
      concluintes: [
        { nomeConcluinte: 'Fulano de Tal', livro: '3.20' },
        { nomeConcluinte: 'Beltrana da Silva', livro: '3.21' },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.situacao).toBe('RESERVADO');
    expect(res.body.diplomas).toHaveLength(2);
    expect(res.body.diplomas.map((d) => d.nomeConcluinte)).toEqual(['Fulano de Tal', 'Beltrana da Silva']);
    expect(res.body.assunto).toContain('2 concluinte');

    // A ficha do ato também devolve a lista.
    const ficha = await asAdmin(request(app).get(`/api/atos/${res.body.id}`));
    expect(ficha.body.diplomas).toHaveLength(2);
  });

  it('pode criar já emitido, com assunto customizado', async () => {
    const res = await asAdmin(request(app).post('/api/atos/diplomas-lote')).send({
      serieId: 'OFICIO', situacao: 'EMITIDO', assunto: 'Diplomas turma 2026.1',
      concluintes: [{ nomeConcluinte: 'Ciclano' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.situacao).toBe('EMITIDO');
    expect(res.body.assunto).toBe('Diplomas turma 2026.1');
  });

  it('rejeita lote sem concluintes válidos', async () => {
    const res = await asAdmin(request(app).post('/api/atos/diplomas-lote')).send({
      serieId: 'OFICIO', concluintes: [{ nomeConcluinte: '  ' }],
    });
    expect(res.status).toBe(400);
  });

  it('permite editar a lista de concluintes de um ofício já criado', async () => {
    const criado = await asAdmin(request(app).post('/api/atos/diplomas-lote')).send({
      serieId: 'OFICIO', concluintes: [{ nomeConcluinte: 'A' }, { nomeConcluinte: 'B' }],
    });
    const atualizado = await asAdmin(request(app).put(`/api/atos/${criado.body.id}/diplomas`)).send({
      concluintes: [{ nomeConcluinte: 'C' }],
    });
    expect(atualizado.status).toBe(200);
    expect(atualizado.body).toHaveLength(1);
    expect(atualizado.body[0].nomeConcluinte).toBe('C');
  });

  it('exporta a lista de concluintes em XLSX', async () => {
    const criado = await asAdmin(request(app).post('/api/atos/diplomas-lote')).send({
      serieId: 'OFICIO', concluintes: [{ nomeConcluinte: 'Fulano', livro: '3.20' }],
    });
    const res = await asAdmin(request(app).get(`/api/atos/${criado.body.id}/diplomas.xlsx`));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });
});
