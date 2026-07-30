// Fase J (Prazos e cobranças, PLANO.md): motor de prazos genérico + regras
// concretas para Câmara, PNPD, Contatos e Expedientes. Consolida a Fase 2 de
// requisitos-camara.md e a Fase 3 de requisitos-pnpd.md — mesma capacidade
// aplicada a dois módulos, mais mandato de coordenação e vigência de atos.
//
// Cada regra segue o mesmo desenho: (entidade, campo de data, deslocamento
// em dias, destinatário) — calcula dias até/depois de uma data, e dispara no
// máximo uma vez por marco (dedup em `notificacoes`, chave (tipo, entidade,
// entidade_id)). O e-mail nunca é obrigatório: sem destinatário resolvível,
// a regra não dispara nada (não há para quem avisar) — mas onde há um
// registro auditável natural (a cobrança de relatoria), ele é gravado em
// `eventos` independentemente de e-mail (J.6): substitui "cobrei devolução
// em 05/05" por um evento de verdade.
import { query } from '../db/pool.js';
import { hojeISO } from '../utils/datas.js';
import { enviarEmail } from './email.js';
import { eventosRepo } from '../db/eventosRepo.js';
import { posDoutoradoRepo } from '../db/posDoutoradoRepo.js';

export const diasEntre = (dataAlvo, hoje = hojeISO()) =>
  Math.round((new Date(dataAlvo) - new Date(hoje)) / 86400000);

// pessoa_id é polimórfico em vários lugares do projeto (users.id OU
// pessoas.id) — mesma resolução usada em programasController/posDoutoradoRepo.
export const resolverPessoa = async (id) => {
  if (!id) return { nome: null, email: null };
  const { rows: viaPessoa } = await query('SELECT nome, email_institucional FROM pessoas WHERE id = $1', [id]);
  if (viaPessoa[0]) return { nome: viaPessoa[0].nome, email: viaPessoa[0].email_institucional || null };
  const { rows: viaUser } = await query('SELECT perfil_nome, email, pessoa_id FROM users WHERE id = $1', [id]);
  if (viaUser[0]?.pessoa_id) {
    const { rows } = await query('SELECT nome, email_institucional FROM pessoas WHERE id = $1', [viaUser[0].pessoa_id]);
    if (rows[0]) return { nome: rows[0].nome || viaUser[0].perfil_nome, email: rows[0].email_institucional || viaUser[0].email || null };
  }
  if (viaUser[0]) return { nome: viaUser[0].perfil_nome, email: viaUser[0].email || null };
  return { nome: null, email: null };
};

export const resolverEmail = async (id) => (await resolverPessoa(id)).email;

const jaNotificado = async (tipo, entidade, entidadeId) => {
  const { rows } = await query(
    'SELECT 1 FROM notificacoes WHERE tipo = $1 AND entidade = $2 AND entidade_id = $3 LIMIT 1',
    [tipo, entidade, entidadeId]
  );
  return rows.length > 0;
};

// J.4/J.6 — lembretes D-10/D-5/D-1 antes do prazo de devolução, e cobrança
// automática (evento + e-mail, se houver como notificar) quando atrasa.
export const avaliarRelatoriasCamara = async () => {
  const hoje = hojeISO();
  const { rows } = await query(`
    SELECT r.*, p.numero AS processo_numero, p.assunto AS processo_assunto
    FROM camara_relatorias r
    JOIN processos p ON p.id = r.processo_id
    WHERE r.ativa = TRUE AND r.data_devolucao IS NULL AND r.prazo_devolucao IS NOT NULL
  `);
  let lembretes = 0, cobrancasEvento = 0, cobrancasEmail = 0;
  for (const r of rows) {
    const dias = diasEntre(r.prazo_devolucao, hoje);
    const dados = { nome: r.relator_nome, numeroProcesso: r.processo_numero, assunto: r.processo_assunto, prazoDevolucao: r.prazo_devolucao };

    if ([10, 5, 1].includes(dias)) {
      const entidadeId = `${r.id}:D${dias}`;
      if (!(await jaNotificado('RELATORIA_LEMBRETE', 'relatoria', entidadeId))) {
        const email = await resolverEmail(r.relator_id);
        if (email) {
          await enviarEmail({ destinatarioEmail: email, tipo: 'RELATORIA_LEMBRETE', entidade: 'relatoria', entidadeId, dados: { ...dados, dias: String(dias) } });
          lembretes++;
        }
      }
    }

    if (dias < 0) {
      const eventosProcesso = await eventosRepo.listByEntidade('processo', r.processo_id);
      if (!eventosProcesso.some((e) => e.tipo === 'COBRANCA' && e.origemId === r.id)) {
        await eventosRepo.create({
          entidade: 'processo', entidadeId: r.processo_id, tipo: 'COBRANCA', data: hoje,
          origemTipo: 'relatoria', origemId: r.id,
          descricao: `Cobrança automática: parecer de ${r.relator_nome} pendente desde ${r.prazo_devolucao}.`,
        });
        cobrancasEvento++;
      }
      if (!(await jaNotificado('RELATORIA_COBRANCA', 'relatoria', r.id))) {
        const email = await resolverEmail(r.relator_id);
        if (email) {
          await enviarEmail({ destinatarioEmail: email, tipo: 'RELATORIA_COBRANCA', entidade: 'relatoria', entidadeId: r.id, dados });
          cobrancasEmail++;
        }
      }
    }
  }
  return { lembretes, cobrancasEvento, cobrancasEmail };
};

// J.7/J.8 — D-90/D-30 antes do fim (aviso de vencimento) e D+30/D+90 depois
// do fim sem relatório (cobrança) — marcos de requisitos-pnpd.md §6.3.
export const avaliarPosDoutorado = async () => {
  const lista = await posDoutoradoRepo.getAll();
  let avisos = 0, cobrancas = 0;
  for (const pd of lista) {
    if (!pd.dataFim || !pd.email) continue;

    if (pd.situacao === 'VIGENTE') {
      const dias = diasEntre(pd.dataFim);
      if ([90, 30].includes(dias)) {
        const entidadeId = `${pd.id}:D${dias}`;
        if (!(await jaNotificado('POSDOC_VENCENDO', 'pos_doutorado', entidadeId))) {
          await enviarEmail({
            destinatarioEmail: pd.email, tipo: 'POSDOC_VENCENDO', entidade: 'pos_doutorado', entidadeId,
            dados: { nome: pd.nome, programa: pd.programaNome || '—', dataFim: pd.dataFim, dias: String(dias) },
          });
          avisos++;
        }
      }
    }

    if (pd.situacao === 'ENCERRADO_SEM_RELATORIO') {
      const diasDepois = -diasEntre(pd.dataFim);
      if ([30, 90].includes(diasDepois)) {
        const entidadeId = `${pd.id}:D${diasDepois}`;
        if (!(await jaNotificado('POSDOC_RELATORIO_PENDENTE', 'pos_doutorado', entidadeId))) {
          await enviarEmail({
            destinatarioEmail: pd.email, tipo: 'POSDOC_RELATORIO_PENDENTE', entidade: 'pos_doutorado', entidadeId,
            dados: { nome: pd.nome, dataFim: pd.dataFim },
          });
          cobrancas++;
        }
      }
    }
  }
  return { avisos, cobrancas };
};

// J.9 — mandato de coordenação (vinculos.data_fim_mandato) vencendo em 30 dias.
export const avaliarMandatosVencendo = async () => {
  const { rows } = await query(`
    SELECT v.*, pr.sigla AS programa_sigla, pr.nome AS programa_nome
    FROM vinculos v
    LEFT JOIN programas pr ON pr.id = v.programa_id
    WHERE v.ativo = TRUE AND v.data_fim_mandato IS NOT NULL
      AND v.papel IN ('COORDENADOR_ATUAL', 'COORDENADOR', 'VICE_COORDENADOR', 'SUBSTITUTO')
  `);
  let avisos = 0;
  for (const v of rows) {
    const dias = diasEntre(v.data_fim_mandato);
    if (dias !== 30) continue;
    if (await jaNotificado('MANDATO_VENCENDO', 'vinculo', v.id)) continue;
    const { nome, email } = await resolverPessoa(v.pessoa_id);
    if (!email) continue;
    await enviarEmail({
      destinatarioEmail: email, tipo: 'MANDATO_VENCENDO', entidade: 'vinculo', entidadeId: v.id,
      dados: { nome: nome || '—', papel: v.papel, programa: v.programa_sigla || v.programa_nome || '—', dataFim: v.data_fim_mandato, dias: '30' },
    });
    avisos++;
  }
  return { avisos };
};

// J.9 — vigência de ato (portaria de designação etc.) vencendo em 30 dias.
export const avaliarPortariasVencendo = async () => {
  const { rows } = await query(`
    SELECT * FROM atos WHERE vigencia_fim IS NOT NULL AND situacao IN ('EMITIDO', 'PUBLICADO')
  `);
  let avisos = 0;
  for (const a of rows) {
    const dias = diasEntre(a.vigencia_fim);
    if (dias !== 30) continue;
    if (await jaNotificado('PORTARIA_VENCENDO', 'ato', a.id)) continue;
    const email = await resolverEmail(a.solicitante_pessoa_id);
    if (!email) continue;
    await enviarEmail({
      destinatarioEmail: email, tipo: 'PORTARIA_VENCENDO', entidade: 'ato', entidadeId: a.id,
      dados: { numeroExibicao: a.id, assunto: a.assunto, dataFim: a.vigencia_fim, dias: '30' },
    });
    avisos++;
  }
  return { avisos };
};

// J.10 — reservas de número (Expedientes) pendentes há mais de 15 dias.
export const avaliarReservasPendentes = async () => {
  const { rows } = await query(`
    SELECT * FROM atos WHERE situacao = 'RESERVADO' AND criado_em < now() - interval '15 days'
  `);
  let avisos = 0;
  for (const a of rows) {
    if (await jaNotificado('RESERVA_PENDENTE', 'ato', a.id)) continue;
    const email = await resolverEmail(a.criado_por);
    if (!email) continue;
    await enviarEmail({
      destinatarioEmail: email, tipo: 'RESERVA_PENDENTE', entidade: 'ato', entidadeId: a.id,
      dados: { numeroExibicao: a.id, assunto: a.assunto },
    });
    avisos++;
  }
  return { avisos };
};
