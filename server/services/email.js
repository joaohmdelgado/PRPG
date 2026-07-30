// Fase I (Notificações, PLANO.md): serviço de envio de e-mail. Capacidade
// nova — o projeto não enviava e-mail até aqui. D-C5 (existe SMTP
// institucional?) segue em aberto; por isso o desenho trata a ausência de
// SMTP como caminho normal, não exceção: toda tentativa é registrada em
// `notificacoes`, com ou sem envio real (ver PLANO.md, critério de pronto).
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { query } from '../db/pool.js';

const smtpConfigurado = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// Transporte criado sob demanda (não no import) para que testes possam
// configurar/limpar SMTP_* por caso sem reiniciar o processo.
let transporterCache = null;
const getTransporter = () => {
  if (!smtpConfigurado()) return null;
  if (!transporterCache) {
    transporterCache = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporterCache;
};

// Só para os testes: força a recriação do transporte na próxima chamada.
export const _resetTransporterCache = () => { transporterCache = null; };

const interpolar = (texto, dados = {}) =>
  String(texto || '').replace(/\{\{(\w+)\}\}/g, (_, chave) => (dados[chave] ?? ''));

const buscarModelo = async (tipo) => {
  const { rows } = await query(
    `SELECT rotulo, meta FROM vocabularios WHERE dominio = 'notificacao.modelo' AND valor = $1 LIMIT 1`,
    [tipo]
  );
  return rows[0] || null;
};

// Monta e registra a notificação; tenta enviar de imediato se o SMTP estiver
// configurado. Nunca lança — falha de envio é estado (`situacao='ERRO'`),
// não exceção, para que o chamador (controller, agendador) não precise de
// try/catch específico de e-mail.
export const enviarEmail = async ({ destinatarioEmail, destinatarioPessoaId, tipo, entidade, entidadeId, dados }, actor) => {
  const modelo = await buscarModelo(tipo);
  const assunto = interpolar(modelo?.meta?.assunto || tipo, dados);
  const corpo = interpolar(modelo?.meta?.corpo || '', dados);

  const id = crypto.randomUUID();
  const semSmtp = !smtpConfigurado();
  await query(
    `INSERT INTO notificacoes
       (id, destinatario_email, destinatario_pessoa_id, tipo, entidade, entidade_id, assunto, corpo, situacao, erro, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, destinatarioEmail, destinatarioPessoaId || null, tipo, entidade || null, entidadeId || null,
     assunto, corpo, semSmtp ? 'SEM_SMTP' : 'PENDENTE',
     semSmtp ? 'SMTP não configurado — intenção registrada, e-mail não enviado.' : null, actor || null]
  );

  if (semSmtp) return { id, situacao: 'SEM_SMTP' };
  return tentarEnviar(id);
};

const tentarEnviar = async (id) => {
  const { rows } = await query('SELECT * FROM notificacoes WHERE id = $1', [id]);
  const n = rows[0];
  if (!n) return null;

  const transporter = getTransporter();
  if (!transporter) {
    await query(
      `UPDATE notificacoes SET situacao = 'SEM_SMTP', erro = 'SMTP não configurado — intenção registrada, e-mail não enviado.' WHERE id = $1`,
      [id]
    );
    return { id, situacao: 'SEM_SMTP' };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: n.destinatario_email,
      subject: n.assunto,
      text: n.corpo,
    });
    await query(
      `UPDATE notificacoes SET situacao = 'ENVIADO', enviado_em = now(), erro = NULL, tentativas = tentativas + 1 WHERE id = $1`,
      [id]
    );
    return { id, situacao: 'ENVIADO' };
  } catch (e) {
    await query(
      `UPDATE notificacoes SET situacao = 'ERRO', erro = $2, tentativas = tentativas + 1 WHERE id = $1`,
      [id, e.message]
    );
    return { id, situacao: 'ERRO', erro: e.message };
  }
};

// Reprocessamento manual (tela de acompanhamento, I.6) — só faz sentido para
// ERRO ou SEM_SMTP; ENVIADO não se reenvia sozinho (evita duplicar e-mail).
export const reenviar = async (id) => {
  const { rows } = await query('SELECT situacao FROM notificacoes WHERE id = $1', [id]);
  if (!rows[0] || rows[0].situacao === 'ENVIADO') return null;
  return tentarEnviar(id);
};
