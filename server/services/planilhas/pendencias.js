// Fase O.2: catálogo das pendências de revisão que os importadores de
// planilha criam, e o que "aplicar" faz com cada uma.
//
// Uma pendência é um ponto em que a planilha não diz o bastante e alguém
// precisa interpretar — quase sempre uma decisão do PLANO.md §4 (`decisao`).
// Três jeitos de resolver, na tela "Revisão da importação":
//   - aplicar: escolhe um valor (`destino`) e o sistema grava nos registros
//     afetados; vale para todas as pendências abertas com a mesma grafia de
//     uma vez (uma resposta da oficina fecha o lote inteiro) e fica guardado
//     como de-para para as próximas importações;
//   - conferido: alguém olhou, corrigiu no próprio cadastro se precisava;
//   - descartar: não se aplica.
// `destino` diz o que a tela oferece para escolher: programa | unidade |
// status_processo | papel_vinculo | pessoa | confirmar (sim/não) | null
// (sem aplicar — só conferir/descartar).
import crypto from 'crypto';

export const TIPOS_PENDENCIA = {
  // ---- Contatos (requisitos-contatos.md §7)
  PROGRAMA_SEM_CORRESPONDENCIA: {
    rotulo: 'Programa da planilha sem correspondência no cadastro',
    decisao: 'D-G5/D-G6', destino: 'programa',
    ajuda: 'Nenhum programa é criado automaticamente. Ligue a um programa existente e importe de novo — a linha entra; ou descarte.',
  },
  SIGLA_DIVERGENTE: { rotulo: 'Sigla diferente da do cadastro', decisao: null, destino: null },
  NOTA_CAPES_A_CONFIRMAR: {
    rotulo: 'Nota CAPES fora da escala (ex.: "A")', decisao: 'D-G3', destino: null,
    ajuda: 'Gravada como veio, sem conversão.',
  },
  NOTA_CAPES_DIVERGENTE: { rotulo: 'Nota CAPES diferente da do cadastro', decisao: null, destino: null },
  PAPEL_A_CONFIRMAR: {
    rotulo: 'Vice-coordenador formal ou substituto eventual?', decisao: 'D-G2', destino: 'papel_vinculo',
    opcoes: ['VICE_COORDENADOR', 'SUBSTITUTO_EVENTUAL'],
  },
  VINCULO_DIVERGENTE: {
    rotulo: 'Cadastro tem outra pessoa no mesmo papel', decisao: null, destino: null,
    ajuda: 'O vínculo do cadastro não foi encerrado. Confira qual está certo e ajuste em Programas.',
  },
  CONTATOS_A_CONFERIR: {
    rotulo: 'Contatos classificados automaticamente', decisao: 'D-G1', destino: null,
    ajuda: 'E-mails e telefones separados da célula e atribuídos à pessoa ou ao programa por padrão. Todos entram como não públicos.',
  },
  TELEFONE_SEM_DDD: { rotulo: 'Telefone sem DDD', decisao: null, destino: null, ajuda: 'O DDD não foi presumido.' },

  // ---- Expedientes (requisitos-expedientes.md §10)
  DATA_INVALIDA: { rotulo: 'Data que não é data', decisao: null, destino: null },
  ANO_DIVERGENTE: { rotulo: 'Ano da data diferente do ano da aba', decisao: null, destino: null },
  RESERVAS_EM_BRANCO: {
    rotulo: 'Números sem conteúdo entre números usados', decisao: 'D-E3', destino: 'confirmar',
    ajuda: 'Aplicar cria esses números como CANCELADO ("reservado e não utilizado (planilha)"). A grade pré-numerada depois do último número nunca é importada.',
  },
  SERIE_INCOMPLETA: { rotulo: 'Série com sub-registro aparente', decisao: 'D-E2', destino: null },
  DESTINATARIO_SEM_UNIDADE: {
    rotulo: 'Destinatário sem unidade no cadastro', decisao: null, destino: 'unidade',
    ajuda: 'Aplicar liga os atos à unidade e guarda a grafia como apelido dela. Unidade que não existe se cadastra em Câmara → Unidades. O texto original do destinatário continua no ato.',
  },
  SETOR_SEM_UNIDADE: {
    rotulo: 'Setor de origem sem unidade no cadastro', decisao: null, destino: 'unidade',
  },
  USUARIO_SEM_PESSOA: {
    rotulo: 'Quem expediu: nome da planilha sem pessoa', decisao: 'D-E6', destino: 'pessoa',
  },
  NUMERO_REPETIDO: {
    rotulo: 'Mesmo número duas vezes na planilha', decisao: null, destino: null,
    ajuda: 'A primeira linha foi importada; esta não. Se for outro documento (ex.: outra série), cadastre-o em Expedientes.',
  },
  EDITAL_A_CONCILIAR: {
    rotulo: 'Edital do livro sem página correspondente no site', decisao: 'D-E5', destino: null,
  },

  // ---- Câmara (requisitos-camara.md §12)
  COR_SEM_LEGENDA: {
    rotulo: 'Situação indicada só pela cor da linha', decisao: 'D-B1', destino: 'status_processo',
    ajuda: 'O processo entrou como "A classificar". Aplicar define a situação de todos os processos com esta cor.',
  },
  RESPONSAVEL_SEM_UNIDADE: { rotulo: 'Setor responsável sem unidade', decisao: null, destino: 'unidade' },
  NUP_FORA_DO_PADRAO: { rotulo: 'Número de processo fora do padrão', decisao: null, destino: null },
  ABA_NAO_IMPORTADA: { rotulo: 'Aba não importada', decisao: 'D-G8', destino: null },

  // ---- PNPD (requisitos-pnpd.md §13)
  CPF_INVALIDO: { rotulo: 'CPF fora do padrão ou com dígito inválido', decisao: null, destino: null },
  CPF_AUSENTE: { rotulo: 'Sem CPF', decisao: null, destino: null },
  PERIODO_NAO_INTERPRETADO: {
    rotulo: 'Período vazio ou em aberto', decisao: 'D-C8', destino: null,
    ajuda: 'Entrou sem as datas que faltam — não conta como vigente nem como encerrado.',
  },
  DATA_AJUSTADA: { rotulo: 'Data inexistente ajustada ao último dia do mês', decisao: null, destino: null },
  PROGRAMA_PNPD_SEM_CORRESPONDENCIA: {
    rotulo: 'Programa do estágio sem correspondência', decisao: 'D-C3', destino: 'programa',
    ajuda: 'Aplicar liga todos os estágios com esta grafia ao programa escolhido.',
  },
  PERIODO_SOBREPOSTO: { rotulo: 'Períodos sobrepostos da mesma pessoa', decisao: 'D-C9', destino: null },
  RENOVACAO_SUGERIDA: {
    rotulo: 'Possível renovação de estágio anterior', decisao: 'D-C9', destino: 'confirmar',
    ajuda: 'Aplicar liga o estágio ao anterior como renovação.',
  },
  ATIVO_DIVERGENTE: {
    rotulo: 'Coluna "Ativo?" diverge das datas', decisao: null, destino: null,
    ajuda: 'Prevalecem as datas. Se a coluna estava certa, registre a situação manual no estágio.',
  },
};

export const SITUACOES = ['ABERTA', 'RESOLVIDA', 'DESCARTADA'];

// Ids dos registros afetados por uma pendência: a própria entidade, ou a lista
// em sugestao.ids (pendência por grafia, que cobre vários registros).
const idsAfetados = (p) => {
  const ids = Array.isArray(p.sugestao?.ids) ? p.sugestao.ids : [];
  return p.entidade_id ? [p.entidade_id, ...ids] : ids;
};

const evento = (q, { entidade, entidadeId, tipo, descricao, actor }) => q(
  `INSERT INTO eventos (id, entidade, entidade_id, tipo, data, descricao, criado_por)
   VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6)`,
  [crypto.randomUUID(), entidade, entidadeId, tipo, descricao, actor || null]
);

// Aplica `destino` aos registros de uma pendência. `q` é o query de uma
// transação. Devolve quantos registros mudaram. Lança 400 (status) quando o
// destino é inválido — a transação do chamador desfaz tudo.
export const HANDLERS = {
  async COR_SEM_LEGENDA(q, p, destino, actor) {
    let n = 0;
    for (const id of idsAfetados(p)) {
      const { rowCount } = await q(
        `UPDATE processos SET status = $2, atualizado_por = $3, atualizado_em = now()
         WHERE id = $1 AND status = 'A_CLASSIFICAR'`, [id, destino, actor]);
      if (rowCount) {
        n += rowCount;
        await evento(q, { entidade: 'processo', entidadeId: id, tipo: 'STATUS', actor,
          descricao: `Situação definida na revisão da importação: cor #${p.valor_original} = ${destino} (D-B1).` });
      }
    }
    return n;
  },
  async PAPEL_A_CONFIRMAR(q, p, destino) {
    if (!TIPOS_PENDENCIA.PAPEL_A_CONFIRMAR.opcoes.includes(destino)) throw Object.assign(new Error('Papel inválido.'), { status: 400, expose: true });
    let n = 0;
    for (const id of idsAfetados(p)) {
      n += (await q('UPDATE vinculos SET papel = $2 WHERE id = $1', [id, destino])).rowCount;
    }
    return n;
  },
  async DESTINATARIO_SEM_UNIDADE(q, p, destino) {
    const { rowCount } = await q(
      'UPDATE atos SET destinatario_unidade_id = $2 WHERE id = ANY($1) AND destinatario_unidade_id IS NULL',
      [idsAfetados(p), destino]);
    await adicionarApelido(q, destino, p.valor_original);
    return rowCount;
  },
  async SETOR_SEM_UNIDADE(q, p, destino) {
    const { rowCount } = await q(
      'UPDATE atos SET unidade_origem_id = $2 WHERE id = ANY($1) AND unidade_origem_id IS NULL',
      [idsAfetados(p), destino]);
    await adicionarApelido(q, destino, p.valor_original);
    return rowCount;
  },
  async RESPONSAVEL_SEM_UNIDADE(q, p, destino) {
    const { rowCount } = await q(
      'UPDATE processos SET unidade_responsavel_id = $2 WHERE id = ANY($1) AND unidade_responsavel_id IS NULL',
      [idsAfetados(p), destino]);
    await adicionarApelido(q, destino, p.valor_original);
    return rowCount;
  },
  async USUARIO_SEM_PESSOA(q, p, destino) {
    const { rowCount } = await q(
      'UPDATE atos SET solicitante_pessoa_id = $2 WHERE id = ANY($1) AND solicitante_pessoa_id IS NULL',
      [idsAfetados(p), destino]);
    return rowCount;
  },
  async PROGRAMA_PNPD_SEM_CORRESPONDENCIA(q, p, destino) {
    const { rowCount } = await q(
      `UPDATE vinculos v SET programa_id = $2
         FROM pos_doutorados pd
        WHERE pd.vinculo_id = v.id AND pd.id = ANY($1) AND v.programa_id IS NULL`,
      [idsAfetados(p), destino]);
    return rowCount;
  },
  // A linha da planilha não foi importada (nenhum programa é criado sozinho):
  // o de-para gravado faz a próxima importação trazê-la.
  async PROGRAMA_SEM_CORRESPONDENCIA() { return 0; },
  async RESERVAS_EM_BRANCO(q, p, destino, actor) {
    if (destino !== 'sim') return 0;
    const { serieId, ano, numeros = [] } = p.sugestao || {};
    let n = 0;
    for (const seq of numeros) {
      const { rowCount } = await q(
        `INSERT INTO atos (id, serie_id, ano, sequencial, situacao, situacao_motivo, assunto, obs_original, criado_por)
         VALUES ($1,$2,$3,$4,'CANCELADO','reservado e não utilizado (planilha)','(número reservado e não utilizado)',$5,$6)
         ON CONFLICT (serie_id, ano, sequencial) DO NOTHING`,
        [crypto.randomUUID(), serieId, ano, seq, `Planilha: número ${seq}/${ano} sem conteúdo.`, actor]);
      n += rowCount;
    }
    return n;
  },
  async RENOVACAO_SUGERIDA(q, p, destino) {
    if (destino !== 'sim') return 0;
    const anterior = p.sugestao?.anteriorId;
    if (!anterior || !p.entidade_id) return 0;
    return (await q('UPDATE pos_doutorados SET renovacao_de_id = $2 WHERE id = $1 AND renovacao_de_id IS NULL',
      [p.entidade_id, anterior])).rowCount;
  },
};

// Domínio do de-para guardado ao aplicar (a próxima importação reaproveita).
export const DOMINIO_DEPARA = {
  COR_SEM_LEGENDA: 'cor',
  PAPEL_A_CONFIRMAR: 'papel',
  DESTINATARIO_SEM_UNIDADE: 'unidade',
  SETOR_SEM_UNIDADE: 'unidade',
  RESPONSAVEL_SEM_UNIDADE: 'unidade',
  USUARIO_SEM_PESSOA: 'pessoa',
  PROGRAMA_PNPD_SEM_CORRESPONDENCIA: 'programa',
  PROGRAMA_SEM_CORRESPONDENCIA: 'programa',
};

async function adicionarApelido(q, unidadeId, grafia) {
  if (!grafia) return;
  await q(
    `UPDATE unidades SET aliases = array_append(COALESCE(aliases, '{}'), $2)
     WHERE id = $1 AND NOT ($2 = ANY(COALESCE(aliases, '{}')))`,
    [unidadeId, grafia]);
}
