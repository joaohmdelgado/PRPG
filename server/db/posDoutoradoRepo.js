// Fase C (PNPD, PLANO.md): pos_doutorados é a extensão de um
// vinculo(papel='POS_DOUTORANDO') — pessoa, programa, período e situação
// derivada vêm do vínculo (ver arquitetura-dados.md §5.12); esta tabela só
// guarda o que é específico do estágio (projeto, supervisão, prestação de
// contas). Sem `posdoc_eventos` própria: usa a tabela genérica `eventos`
// (entidade='pos_doutorado'), já criada na Fase A.6.
import crypto from 'crypto';
import { query } from './pool.js';
import { derivarSituacao } from '../utils/vigencia.js';
import { hojeISO } from '../utils/datas.js';
import { resolverOuCriarPessoa } from './pessoasRepo.js';

// Fase D: resolverOuCriarPessoa mudou para server/db/pessoasRepo.js (reusada
// por teses/disciplinas/bolsas). Reexportado aqui por compatibilidade.
export { resolverOuCriarPessoa };

const fromRow = (r) => {
  // Identidade do pós-doutorando: users.id ou pessoas.id (legado), mesma
  // resolução polimórfica de vinculos.pessoa_id usada em programasController.
  const pessoa = r.u_id
    ? { id: r.u_id, nome: r.u_perfil_nome, email: r.u_email, cpf: r.u_perfil_cpf, telefones: r.u_perfil_telefones }
    : (r.p_json || null);

  const hoje = hojeISO();
  const base = derivarSituacao({
    dataInicio: r.data_inicio_mandato, dataFim: r.data_fim_mandato, situacaoManual: r.situacao_manual,
  }, hoje);
  let situacao = base;
  if (base === 'FUTURO') situacao = 'APROVADO';
  else if (base === 'ENCERRADO') situacao = r.relatorio_entregue_em ? 'ENCERRADO' : 'ENCERRADO_SEM_RELATORIO';

  const diasRestantes = r.data_fim_mandato
    ? Math.round((new Date(r.data_fim_mandato) - new Date(hoje)) / 86400000)
    : null;

  return {
    id: r.id, vinculoId: r.vinculo_id,
    pessoaId: r.vinculo_pessoa_id, nome: pessoa?.nome || null, cpf: pessoa?.cpf || null,
    email: pessoa?.email || pessoa?.email_institucional || null,
    telefone: pessoa?.telefones || null,
    nacionalidade: pessoa?.nacionalidade || null, estrangeiro: pessoa?.estrangeiro ?? false,
    lattesUrl: pessoa?.lattes || null, orcid: pessoa?.orcid || null,

    programaId: r.programa_id, programaSigla: r.programa_sigla, programaNome: r.programa_nome,
    programaOriginal: r.programa_original,

    supervisorId: r.supervisor_id, supervisorNome: r.supervisor_nome_real, supervisorOriginal: r.supervisor_original,
    cossupervisorId: r.cossupervisor_id, cossupervisorNome: r.cossupervisor_nome_real,

    projetoTitulo: r.projeto_titulo, projetoResumo: r.projeto_resumo,
    linhaPesquisaId: r.linha_pesquisa_id, linhaPesquisaNome: r.linha_pesquisa_nome,

    modalidade: r.modalidade, agenciaFomento: r.agencia_fomento,
    vinculoOrigem: r.vinculo_origem, instituicaoOrigem: r.instituicao_origem,

    dataInicio: r.data_inicio_mandato, dataFim: r.data_fim_mandato,
    dataInicioAprox: r.data_inicio_aprox, dataFimAprox: r.data_fim_aprox,
    periodoOriginal: r.periodo_original,

    situacao, situacaoManual: r.situacao_manual, situacaoMotivo: r.motivo_encerramento,
    diasRestantes, vencendo: diasRestantes != null && diasRestantes >= 0 && diasRestantes <= 90,
    relatorioPendente: situacao === 'ENCERRADO_SEM_RELATORIO',

    processoId: r.processo_id, processoNumero: r.processo_numero,
    atoId: r.ato_id, dataAprovacaoColegiado: r.data_aprovacao_colegiado,
    renovacaoDeId: r.renovacao_de_id, relatorioEntregueEm: r.relatorio_entregue_em,

    observacoes: r.observacoes,
    criadoEm: r.criado_em, atualizadoEm: r.atualizado_em, criadoPor: r.criado_por, atualizadoPor: r.atualizado_por,
  };
};

const JOIN_SELECT = `
  SELECT pd.*, v.programa_id, v.pessoa_id AS vinculo_pessoa_id,
    v.data_inicio_mandato, v.data_fim_mandato, v.situacao_manual, v.motivo_encerramento, v.ato_id,
    u.id AS u_id, u.email AS u_email, u.perfil_nome AS u_perfil_nome,
    u.perfil_cpf AS u_perfil_cpf, u.perfil_telefones AS u_perfil_telefones,
    row_to_json(p.*) AS p_json,
    sup.nome AS supervisor_nome_real, cos.nome AS cossupervisor_nome_real,
    pr.sigla AS programa_sigla, pr.nome AS programa_nome,
    proc.numero AS processo_numero, lp.nome AS linha_pesquisa_nome
  FROM pos_doutorados pd
  JOIN vinculos v ON v.id = pd.vinculo_id
  LEFT JOIN users u ON u.id = v.pessoa_id
  LEFT JOIN pessoas p ON p.id = v.pessoa_id
  LEFT JOIN pessoas sup ON sup.id = pd.supervisor_id
  LEFT JOIN pessoas cos ON cos.id = pd.cossupervisor_id
  LEFT JOIN programas pr ON pr.id = v.programa_id
  LEFT JOIN processos proc ON proc.id = pd.processo_id
  LEFT JOIN linhas_pesquisa lp ON lp.id = pd.linha_pesquisa_id
`;

export const posDoutoradoRepo = {
  async getById(id) {
    const { rows } = await query(`${JOIN_SELECT} WHERE pd.id = $1`, [id]);
    return rows[0] ? fromRow(rows[0]) : null;
  },
  async getByVinculoId(vinculoId) {
    const { rows } = await query(`${JOIN_SELECT} WHERE pd.vinculo_id = $1`, [vinculoId]);
    return rows[0] ? fromRow(rows[0]) : null;
  },
  async getAll({ programa, supervisor, modalidade, q } = {}) {
    const where = [];
    const params = [];
    if (programa) { params.push(programa); where.push(`v.programa_id = $${params.length}`); }
    if (supervisor) { params.push(supervisor); where.push(`pd.supervisor_id = $${params.length}`); }
    if (modalidade) { params.push(modalidade); where.push(`pd.modalidade = $${params.length}`); }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(pd.projeto_titulo ILIKE $${params.length} OR proc.numero ILIKE $${params.length} OR sup.nome ILIKE $${params.length})`);
    }
    const sql = `${JOIN_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY v.data_fim_mandato ASC NULLS LAST, pd.criado_em DESC`;
    const { rows } = await query(sql, params);
    return rows.map(fromRow);
  },
  // Cria o vínculo (papel=POS_DOUTORANDO) e o registro de estágio numa só
  // operação — são duas tabelas, mas uma entidade do ponto de vista da API.
  async create(data, actor) {
    const vinculoId = crypto.randomUUID();
    await query(
      `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, data_inicio_mandato, data_fim_mandato, ativo, criado_em)
       VALUES ($1,$2,$3,'POS_DOUTORANDO',$4,$5,TRUE,now())`,
      [vinculoId, data.programaId || null, data.pessoaId, data.dataInicio || null, data.dataFim || null]
    );
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO pos_doutorados (
         id, vinculo_id, supervisor_id, cossupervisor_id, projeto_titulo, projeto_resumo,
         linha_pesquisa_id, modalidade, agencia_fomento, vinculo_origem, instituicao_origem,
         processo_id, renovacao_de_id, data_aprovacao_colegiado,
         periodo_original, programa_original, supervisor_original,
         data_inicio_aprox, data_fim_aprox, observacoes, criado_por, atualizado_por
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$21)`,
      [id, vinculoId, data.supervisorId || null, data.cossupervisorId || null,
       data.projetoTitulo, data.projetoResumo || null, data.linhaPesquisaId || null,
       data.modalidade || 'VOLUNTARIO', data.agenciaFomento || null, data.vinculoOrigem || null,
       data.instituicaoOrigem || null, data.processoId || null, data.renovacaoDeId || null,
       data.dataAprovacaoColegiado || null, data.periodoOriginal || null, data.programaOriginal || null,
       data.supervisorOriginal || null, !!data.dataInicioAprox, !!data.dataFimAprox,
       data.observacoes || null, actor || null]
    );
    return this.getById(id);
  },
  async update(id, data, actor) {
    const existing = await this.getById(id);
    if (!existing) return null;
    await query(
      `UPDATE vinculos SET programa_id = COALESCE($2, programa_id),
         data_inicio_mandato = COALESCE($3, data_inicio_mandato),
         data_fim_mandato = COALESCE($4, data_fim_mandato)
       WHERE id = $1`,
      [existing.vinculoId, data.programaId, data.dataInicio, data.dataFim]
    );
    await query(
      `UPDATE pos_doutorados SET
         supervisor_id = COALESCE($2, supervisor_id), cossupervisor_id = $3,
         projeto_titulo = COALESCE($4, projeto_titulo), projeto_resumo = $5,
         linha_pesquisa_id = $6, modalidade = COALESCE($7, modalidade),
         agencia_fomento = $8, vinculo_origem = $9, instituicao_origem = $10,
         processo_id = $11, observacoes = $12,
         atualizado_em = now(), atualizado_por = $13
       WHERE id = $1`,
      [id, data.supervisorId, data.cossupervisorId ?? existing.cossupervisorId ?? null,
       data.projetoTitulo, data.projetoResumo ?? existing.projetoResumo ?? null,
       data.linhaPesquisaId ?? existing.linhaPesquisaId ?? null, data.modalidade,
       data.agenciaFomento ?? existing.agenciaFomento ?? null, data.vinculoOrigem ?? existing.vinculoOrigem ?? null,
       data.instituicaoOrigem ?? existing.instituicaoOrigem ?? null,
       data.processoId ?? existing.processoId ?? null, data.observacoes ?? existing.observacoes ?? null, actor || null]
    );
    return this.getById(id);
  },
  async setSituacaoManual(id, situacaoManual, actor) {
    const existing = await this.getById(id);
    if (!existing) return null;
    await query('UPDATE vinculos SET situacao_manual = $2 WHERE id = $1', [existing.vinculoId, situacaoManual || null]);
    return this.getById(id);
  },
  async registrarRelatorio(id, dataEntrega, actor) {
    await query(
      `UPDATE pos_doutorados SET relatorio_entregue_em = $2, atualizado_em = now(), atualizado_por = $3 WHERE id = $1`,
      [id, dataEntrega, actor || null]
    );
    return this.getById(id);
  },
  // Prorrogação/renovação (§10.2): cria um registro-filho encadeado, copiando
  // pessoa, programa, supervisor e projeto — nunca sobrescreve o original.
  async prorrogar(id, { dataInicio, dataFim }, actor) {
    const original = await this.getById(id);
    if (!original) return null;
    return this.create({
      pessoaId: original.pessoaId, programaId: original.programaId,
      dataInicio, dataFim,
      supervisorId: original.supervisorId, cossupervisorId: original.cossupervisorId,
      projetoTitulo: original.projetoTitulo, projetoResumo: original.projetoResumo,
      linhaPesquisaId: original.linhaPesquisaId, modalidade: original.modalidade,
      agenciaFomento: original.agenciaFomento, vinculoOrigem: original.vinculoOrigem,
      instituicaoOrigem: original.instituicaoOrigem, processoId: original.processoId,
      renovacaoDeId: id,
    }, actor);
  },
  // pos_doutorados.vinculo_id tem ON DELETE CASCADE: apagar o vínculo basta.
  async remove(id) {
    const existing = await this.getById(id);
    if (!existing) return false;
    await query('DELETE FROM vinculos WHERE id = $1', [existing.vinculoId]);
    return true;
  },
};
