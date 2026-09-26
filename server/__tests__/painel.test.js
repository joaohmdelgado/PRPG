import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, login, seedUser } from './helpers.js';
import { hojeISO } from '../utils/datas.js';

// Fase O.6: painel de pendências (página inicial do admin).

let adminToken;
beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});
afterAll(async () => { await pool.end(); });

// O alerta "agendador parado" é correto num banco de teste sem execução; os testes
// que não tratam dele registram uma execução recente.
const agendadorRodou = () => pool.query("INSERT INTO agendador_execucoes (modo, concluido_em, resumo) VALUES ('SO_PAINEL', now(), '{}')");

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const diasISO = (n) => {
  const [y, m, d] = hojeISO().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
};
const secao = (corpo, id) => corpo.secoes.find((s) => s.id === id);
const pendencias = async () => (await asAdmin(request(app).get('/api/painel/pendencias'))).body;

describe('painel de pendências (O.6)', () => {
  it('exige login e papel de gestão', async () => {
    expect((await request(app).get('/api/painel/pendencias')).status).toBe(401);
    await seedUser({ id: 'aluno', email: 'aluno@test.com', roles: ['Aluno'] });
    const token = await login('aluno@test.com');
    expect((await request(app).get('/api/painel/pendencias').set('Authorization', `Bearer ${token}`)).status).toBe(403);
  });

  it('sem dados: nada atrasado; seções vazias mostram a mensagem de "em dia"', async () => {
    await agendadorRodou();
    const p = await pendencias();
    expect(p.alertas).toBe(0);
    expect(secao(p, 'relatorias_atrasadas')).toMatchObject({ total: 0, vazio: 'Nenhuma relatoria atrasada.' });
  });

  it('relatorias atrasadas, reservas em aberto, editais com prazo, rascunhos, pós-docs e cadastros incompletos', async () => {
    await agendadorRodou();
    await pool.query("INSERT INTO programas (id, nome, sigla) VALUES ('p1', 'Programa Um', 'S/SIGLA')");
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: '23082.111111/2026-01', assunto: 'P' });
    await pool.query(
      `INSERT INTO camara_relatorias (id, processo_id, relator_nome, prazo_devolucao, ativa) VALUES
       ('r-atr', $1, 'Relator Atrasado', $2, TRUE), ('r-ok', $1, 'Relator Em Dia', $3, TRUE)`,
      [proc.body.id, diasISO(-4), diasISO(30)]);
    await pool.query(
      `INSERT INTO atos (id, serie_id, ano, sequencial, situacao, assunto, criado_em)
       VALUES ('a-res', 'OFICIO', 2026, 9, 'RESERVADO', 'Reserva antiga', now() - interval '20 days')`);
    await pool.query(
      `INSERT INTO editais (id, title, status, publicado_em, periodo_data_fim, deadline)
       VALUES ('e1', 'Edital que fecha logo', 'PUBLICADO', NULL, $1, $1), ('e2', 'Edital longe', 'PUBLICADO', NULL, $2, $2),
              ('e3', 'Edital em rascunho', 'RASCUNHO', NULL, $1, $1)`, [diasISO(5), diasISO(60)]);
    await pool.query(`INSERT INTO news (id, title, status) VALUES ('n1', 'Notícia em rascunho', 'RASCUNHO')`);

    const p = await pendencias();
    expect(secao(p, 'relatorias_atrasadas')).toMatchObject({ total: 1, severidade: 'alta' });
    expect(secao(p, 'relatorias_atrasadas').itens[0]).toMatchObject({ rotulo: 'Relator Atrasado — 23082.111111/2026-01', detalhe: expect.stringContaining('4 dia(s) de atraso') });
    expect(secao(p, 'reservas_abertas')).toMatchObject({ total: 1, severidade: 'alta' });
    expect(secao(p, 'reservas_abertas').itens[0].rotulo).toBe('OFÍCIO Nº 9/2026');
    expect(secao(p, 'editais_prazo').itens.map((i) => i.rotulo)).toEqual(['Edital que fecha logo']);
    expect(secao(p, 'rascunhos').itens.map((i) => i.rotulo).sort()).toEqual(['Edital em rascunho', 'Notícia em rascunho']);
    expect(secao(p, 'programas_sem_sigla').itens.map((i) => i.rotulo)).toContain('Programa Um');
    expect(secao(p, 'programas_sem_coordenacao').total).toBe(1);
    // alertas = alta + media (relatoria, reserva, edital), nunca as de conferência
    expect(p.alertas).toBe(3);
  });

  it('pós-doc vencendo e período incompleto', async () => {
    await pool.query("INSERT INTO programas (id, nome, sigla) VALUES ('p1', 'Programa Um', 'PPU')");
    const criar = (nome, ini, fim) => asAdmin(request(app).post('/api/pos-doutorado')).send({
      pessoaNome: nome, supervisorNome: 'Docente Supervisor', programaId: 'p1', projetoTitulo: 'Proj', dataInicio: ini, dataFim: fim,
    });
    const a = await criar('Vence Logo', diasISO(-300), diasISO(40));
    expect(a.status).toBe(201);
    await criar('Sem Fim', diasISO(-10), null);
    const p = await pendencias();
    expect(secao(p, 'posdocs_vencendo').itens[0].rotulo).toBe('Vence Logo — PPU');
    expect(secao(p, 'posdocs_incompletos').itens.map((i) => i.rotulo)).toEqual(['Sem Fim']);
  });

  it('Gestor de Programa só vê o que é do seu programa', async () => {
    await pool.query("INSERT INTO programas (id, nome, sigla) VALUES ('pa', 'Programa A', 'PA'), ('pb', 'Programa B', 'PB')");
    await pool.query(`INSERT INTO news (id, title, status, programa_id) VALUES ('na', 'Rascunho A', 'RASCUNHO', 'pa'), ('nb', 'Rascunho B', 'RASCUNHO', 'pb')`);
    await pool.query(`INSERT INTO atos (id, serie_id, ano, sequencial, situacao, assunto) VALUES ('a1', 'OFICIO', 2026, 1, 'RESERVADO', 'x')`);
    await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'gestor@pa.com', password: 'senha123', roles: ['GestorPrograma'], programaId: 'pa', perfil_geral: { nome: 'Gestor A' } });
    const token = await login('gestor@pa.com');
    const res = await request(app).get('/api/painel/pendencias').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.escopo).toBe('programa');
    expect(secao(res.body, 'rascunhos').itens.map((i) => i.rotulo)).toEqual(['Rascunho A']);
    expect(secao(res.body, 'reservas_abertas')).toBeUndefined();
    expect(secao(res.body, 'programas_sem_sigla')).toMatchObject({ total: 0 });
    expect(secao(res.body, 'programas_sem_coordenacao').itens.map((i) => i.rotulo)).toEqual(['Programa A']);
  });

  it('agendador parado aparece como alerta para o Administrator', async () => {
    const p = await pendencias();
    expect(secao(p, 'agendador_parado')).toMatchObject({ severidade: 'alta', total: 1 });
  });
});
