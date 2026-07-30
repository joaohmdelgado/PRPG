// Fase I.6 (PLANO.md): tela de acompanhamento de envios. Ver services/email.js.
import { query } from '../db/pool.js';
import { enviarEmail, reenviar } from '../services/email.js';

const fromRow = (r) => ({
  id: r.id, destinatarioEmail: r.destinatario_email, destinatarioPessoaId: r.destinatario_pessoa_id,
  tipo: r.tipo, entidade: r.entidade, entidadeId: r.entidade_id,
  assunto: r.assunto, corpo: r.corpo, situacao: r.situacao, erro: r.erro,
  enviadoEm: r.enviado_em, tentativas: r.tentativas, criadoEm: r.criado_em, criadoPor: r.criado_por,
});

export const getNotificacoes = async (req, res) => {
  const { situacao, tipo } = req.query;
  const where = [];
  const params = [];
  if (situacao) { params.push(situacao); where.push(`situacao = $${params.length}`); }
  if (tipo) { params.push(tipo); where.push(`tipo = $${params.length}`); }
  const { rows } = await query(
    `SELECT * FROM notificacoes ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY criado_em DESC LIMIT 500`,
    params
  );
  res.json(rows.map(fromRow));
};

export const reenviarNotificacao = async (req, res) => {
  const resultado = await reenviar(req.params.id);
  if (!resultado) return res.status(404).json({ message: 'Notificação não encontrada ou já enviada.' });
  res.json(resultado);
};

// Critério de pronto da Fase I: "um e-mail de teste sai pelo SMTP institucional
// e fica registrado". Envia para o próprio usuário autenticado.
export const enviarTeste = async (req, res) => {
  if (!req.user?.email) return res.status(400).json({ message: 'Usuário sem e-mail cadastrado.' });
  const resultado = await enviarEmail({
    destinatarioEmail: req.user.email, tipo: 'TESTE', entidade: null, entidadeId: null, dados: {},
  }, req.user?.id);
  res.status(201).json(resultado);
};
