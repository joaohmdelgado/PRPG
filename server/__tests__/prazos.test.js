import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';
import {
  avaliarRelatoriasCamara, avaliarPosDoutorado, avaliarMandatosVencendo,
  avaliarPortariasVencendo, avaliarReservasPendentes,
} from '../services/prazos.js';
import { avaliarPrazos } from '../services/agendador.js';
import { hojeISO } from '../utils/datas.js';

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

// Ancorado em hojeISO() (America/Recife, mesma referência de server/services/prazos.js)
// e não em Date.now()/toISOString() (UTC) — perto da meia-noite UTC os dois
// discordam sobre qual é "hoje", o que quebrava os marcos exatos (D-30 etc.)
// de forma intermitente conforme a hora em que a suíte rodava.
const diasISO = (offset) => {
  const [y, m, d] = hojeISO().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + offset);
  return dt.toISOString().slice(0, 10);
};

const seedPessoaComEmail = async (id, nome, email) => {
  await pool.query('INSERT INTO pessoas (id, nome, email_institucional) VALUES ($1,$2,$3)', [id, nome, email]);
};

describe('prazos — relatoria da Câmara (J.4/J.6)', () => {
  const criarProcessoERelatoria = async (prazoOffset) => {
    await seedPessoaComEmail('pessoa-relator', 'Relator Teste', 'relator@teste.com');
    const proc = await asAdmin(request(app).post('/api/camara/processos'))
      .send({ numero: '23082.111111/2026-01', assunto: 'Processo de teste' });
    await pool.query(
      `INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, prazo_devolucao, ativa, criado_em)
       VALUES ('rel-1', $1, 'pessoa-relator', 'Relator Teste', $2, TRUE, now())`,
      [proc.body.id, diasISO(prazoOffset)]
    );
    return proc.body.id;
  };

  it('envia lembrete a D-10 e não duplica numa segunda avaliação', async () => {
    await criarProcessoERelatoria(10);
    const r1 = await avaliarRelatoriasCamara();
    expect(r1.lembretes).toBe(1);
    const r2 = await avaliarRelatoriasCamara();
    expect(r2.lembretes).toBe(0);

    const { rows } = await pool.query(`SELECT * FROM notificacoes WHERE tipo = 'RELATORIA_LEMBRETE'`);
    expect(rows).toHaveLength(1);
    expect(rows[0].destinatario_email).toBe('relator@teste.com');
  });

  it('registra evento COBRANCA e notificação quando atrasada, sem duplicar', async () => {
    const processoId = await criarProcessoERelatoria(-5);
    const r1 = await avaliarRelatoriasCamara();
    expect(r1.cobrancasEvento).toBe(1);
    expect(r1.cobrancasEmail).toBe(1);

    const eventos = await asAdmin(request(app).get(`/api/camara/processos/${processoId}`));
    expect(eventos.body.eventos.some((e) => e.tipo === 'COBRANCA')).toBe(true);

    const r2 = await avaliarRelatoriasCamara();
    expect(r2.cobrancasEvento).toBe(0);
    expect(r2.cobrancasEmail).toBe(0);

    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM eventos WHERE tipo = 'COBRANCA'`);
    expect(rows[0].n).toBe(1);
  });
});

describe('prazos — estágio pós-doutoral (J.7/J.8)', () => {
  it('avisa D-90 de um estágio vigente', async () => {
    await asAdmin(request(app).post('/api/pos-doutorado')).send({
      pessoaNome: 'Posdoc Vigente', email: 'posdoc@teste.com', supervisorNome: 'Supervisor X',
      projetoTitulo: 'Projeto', dataInicio: diasISO(-90), dataFim: diasISO(90),
    });
    const r1 = await avaliarPosDoutorado();
    expect(r1.avisos).toBe(1);
    const r2 = await avaliarPosDoutorado();
    expect(r2.avisos).toBe(0);
  });

  it('cobra relatório D+30 de um estágio encerrado sem relatório', async () => {
    await asAdmin(request(app).post('/api/pos-doutorado')).send({
      pessoaNome: 'Posdoc Encerrado', email: 'posdoc2@teste.com', supervisorNome: 'Supervisor Y',
      projetoTitulo: 'Projeto', dataInicio: diasISO(-400), dataFim: diasISO(-30),
    });
    const r1 = await avaliarPosDoutorado();
    expect(r1.cobrancas).toBe(1);
    const r2 = await avaliarPosDoutorado();
    expect(r2.cobrancas).toBe(0);
  });
});

describe('prazos — mandato e vigência de ato (J.9)', () => {
  it('avisa mandato de coordenação vencendo em 30 dias', async () => {
    await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES ('prog-j9', 'Programa J9', 'PJ9')`);
    await seedPessoaComEmail('pessoa-coord', 'Coordenador Teste', 'coord@teste.com');
    await pool.query(
      `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, data_fim_mandato, ativo, criado_em)
       VALUES ('vinc-1', 'prog-j9', 'pessoa-coord', 'COORDENADOR_ATUAL', $1, TRUE, now())`,
      [diasISO(30)]
    );
    const r1 = await avaliarMandatosVencendo();
    expect(r1.avisos).toBe(1);
    const r2 = await avaliarMandatosVencendo();
    expect(r2.avisos).toBe(0);
  });

  it('avisa vigência de ato vencendo em 30 dias', async () => {
    await seedPessoaComEmail('pessoa-solicitante', 'Solicitante Teste', 'solicitante@teste.com');
    const ato = await asAdmin(request(app).post('/api/atos')).send({
      serieId: 'PORTARIA_PRPG', ano: new Date().getFullYear(), assunto: 'Portaria de teste', situacao: 'EMITIDO',
    });
    await pool.query('UPDATE atos SET vigencia_fim = $2, solicitante_pessoa_id = $3 WHERE id = $1', [ato.body.id, diasISO(30), 'pessoa-solicitante']);
    const r1 = await avaliarPortariasVencendo();
    expect(r1.avisos).toBe(1);
    const r2 = await avaliarPortariasVencendo();
    expect(r2.avisos).toBe(0);
  });
});

describe('prazos — reservas de expedientes pendentes (J.10)', () => {
  it('avisa reserva pendente há mais de 15 dias', async () => {
    const reservado = await asAdmin(request(app).post('/api/atos/reservar'))
      .send({ serieId: 'OFICIO', ano: new Date().getFullYear(), assunto: 'Ofício antigo' });
    await pool.query(`UPDATE atos SET criado_em = now() - interval '20 days' WHERE id = $1`, [reservado.body.id]);

    const r1 = await avaliarReservasPendentes();
    expect(r1.avisos).toBe(1);
    const r2 = await avaliarReservasPendentes();
    expect(r2.avisos).toBe(0);
  });

  it('não avisa reserva recente (menos de 15 dias)', async () => {
    await asAdmin(request(app).post('/api/atos/reservar')).send({ serieId: 'OFICIO', ano: new Date().getFullYear(), assunto: 'Ofício recente' });
    const r1 = await avaliarReservasPendentes();
    expect(r1.avisos).toBe(0);
  });
});

describe('prazos — agendador consolida todas as regras', () => {
  it('avaliarPrazos() roda as cinco regras sem lançar erro', async () => {
    const resultado = await avaliarPrazos();
    expect(resultado).toHaveProperty('camara');
    expect(resultado).toHaveProperty('posdoc');
    expect(resultado).toHaveProperty('mandatos');
    expect(resultado).toHaveProperty('portarias');
    expect(resultado).toHaveProperty('reservas');
  });
});

describe('agendador fora do processo web (O.5)', () => {
  it('modo só-painel registra o aviso em notificacoes (SO_PAINEL), mesmo com SMTP configurado, e guarda a execução', async () => {
    const { executarAgendador, estadoDoAgendador } = await import('../services/agendador.js');
    const { _resetTransporterCache } = await import('../services/email.js');
    process.env.SMTP_HOST = 'smtp.invalido.test'; process.env.SMTP_USER = 'u'; process.env.SMTP_PASS = 'p';
    _resetTransporterCache();
    try {
      await seedPessoaComEmail('pessoa-relator', 'Relator Teste', 'relator@teste.com');
      const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: '23082.111111/2026-01', assunto: 'P' });
      await pool.query(
        `INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, prazo_devolucao, ativa, criado_em)
         VALUES ('rel-x', $1, 'pessoa-relator', 'Relator Teste', $2, TRUE, now())`, [proc.body.id, diasISO(5)]);

      const r = await executarAgendador({ origem: 'manual' });
      expect(r.modo).toBe('SO_PAINEL');
      expect(r.resumo.camara.lembretes).toBe(1);
      const { rows } = await pool.query('SELECT situacao, tentativas FROM notificacoes');
      expect(rows).toEqual([{ situacao: 'SO_PAINEL', tentativas: 0 }]); // nenhuma tentativa de envio

      const estado = await estadoDoAgendador();
      expect(estado).toMatchObject({ modoAtual: 'SO_PAINEL', atrasado: false });
      expect(estado.ultima).toMatchObject({ origem: 'manual', erro: null });
    } finally {
      delete process.env.SMTP_HOST; delete process.env.SMTP_USER; delete process.env.SMTP_PASS;
      _resetTransporterCache();
    }
  });

  it('sem execução registrada o painel sabe que o agendador não roda', async () => {
    const { estadoDoAgendador } = await import('../services/agendador.js');
    expect(await estadoDoAgendador()).toMatchObject({ ultima: null, atrasado: true });
  });

  it('a API expõe o estado e a execução manual (só Administrator)', async () => {
    const res = await asAdmin(request(app).post('/api/notificacoes/agendador/executar'));
    expect(res.status).toBe(200);
    const est = await asAdmin(request(app).get('/api/notificacoes/agendador'));
    expect(est.body.historico).toHaveLength(1);
    const semToken = await request(app).get('/api/notificacoes/agendador');
    expect(semToken.status).toBe(401);
  });
});
