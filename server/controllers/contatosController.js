// Fase G.2 (PLANO.md): controller da agenda de contatos — ver
// requisitos-contatos.md §6. `contatos` é polimórfica (entidade='pessoa'|
// 'programa'|'unidade'); aqui cobrimos pessoa e programa, os dois consumidos
// pela tela de agenda.
//
// Os "cargos" da agenda usam os papéis de vinculos.papel HOJE gravados
// (COORDENADOR_ATUAL/SUBSTITUTO/TAE) — a consolidação para o vocabulário-alvo
// (COORDENADOR/VICE_COORDENADOR/SECRETARIO, vocabularios dominio='vinculo.papel')
// é migração de dado que exige a conferência da secretaria (D-G2) e fica para
// quando o importador (G.4) rodar.
import { isPlainObject } from '../utils/sanitize.js';
import { query } from '../db/pool.js';
import { contatosRepo } from '../db/contatosRepo.js';

export const CARGOS = {
  COORDENADOR_ATUAL: 'Coordenadores',
  SUBSTITUTO: 'Vice-coordenadores / Substitutos',
  TAE: 'Secretários',
};

// Resolve, para cada vínculo do papel pedido, a pessoa "de identidade"
// (pessoas.id) por trás do vinculos.pessoa_id polimórfico (users.id ou
// pessoas.id legado) — mesma resolução usada em B.2/B.3.
const AGENDA_SELECT = `
  SELECT v.id AS vinculo_id, v.papel, v.programa_id, v.data_inicio_mandato,
    v.carater, v.ato_id,
    pr.sigla AS programa_sigla, pr.nome AS programa_nome, pr.campus,
    u.id AS user_id, u.email AS user_email, u.perfil_nome AS user_nome,
    u.perfil_foto_url AS user_foto_url,
    -- contatos.entidade_id (entidade='pessoa') referencia pessoas.id; cai para
    -- users.id quando o usuario ainda nao tem pessoa vinculada (users.pessoa_id
    -- e preenchido pelo backfill da A.2, nem sempre presente, ex. em testes).
    COALESCE(up.id, p.id, u.id) AS pessoa_id,
    COALESCE(up.nome, u.perfil_nome, p.nome) AS nome,
    COALESCE(up.foto_url, u.perfil_foto_url, p.foto_url) AS foto_url
  FROM vinculos v
  LEFT JOIN programas pr ON pr.id = v.programa_id
  LEFT JOIN users u ON u.id = v.pessoa_id
  LEFT JOIN pessoas up ON up.id = u.pessoa_id
  LEFT JOIN pessoas p ON p.id = v.pessoa_id
  WHERE v.ativo = TRUE
`;

// GET /api/contatos/agenda?papel=COORDENADOR_ATUAL|SUBSTITUTO|TAE (omitido = todos os três)
export const getAgenda = async (req, res) => {
  const { papel, q } = req.query;
  const papeis = papel ? [papel] : Object.keys(CARGOS);
  const { rows: vinculos } = await query(`${AGENDA_SELECT} AND v.papel = ANY($1) ORDER BY pr.sigla ASC NULLS LAST`, [papeis]);

  const pessoaIds = [...new Set(vinculos.map((v) => v.pessoa_id).filter(Boolean))];
  const contatosPorPessoa = {};
  if (pessoaIds.length) {
    const { rows: contatosRows } = await query(
      `SELECT * FROM contatos WHERE entidade = 'pessoa' AND entidade_id = ANY($1) ORDER BY principal DESC, ordem ASC`,
      [pessoaIds]
    );
    for (const c of contatosRows) {
      (contatosPorPessoa[c.entidade_id] ||= []).push({
        id: c.id, tipo: c.tipo, valor: c.valor, valorExibicao: c.valor_exibicao,
        rotulo: c.rotulo, principal: c.principal, publico: c.publico,
      });
    }
  }

  let result = vinculos.map((v) => ({
    vinculoId: v.vinculo_id, papel: v.papel, cargoLabel: CARGOS[v.papel] || v.papel,
    pessoaId: v.pessoa_id, nome: v.nome || v.user_email || '(sem nome)',
    fotoUrl: v.foto_url || null,
    programaId: v.programa_id, programaSigla: v.programa_sigla, programaNome: v.programa_nome,
    campus: v.campus, carater: v.carater, dataInicioMandato: v.data_inicio_mandato, atoId: v.ato_id,
    contatos: v.pessoa_id ? (contatosPorPessoa[v.pessoa_id] || []) : [],
  }));

  if (q) {
    const alvo = q.trim().toLowerCase();
    result = result.filter((r) =>
      [r.nome, r.programaSigla, r.programaNome, ...r.contatos.map((c) => c.valorExibicao || c.valor)]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(alvo))
    );
  }

  res.json(result);
};

// GET /api/contatos/agenda/contadores — chips com contador por cargo.
export const getContadores = async (req, res) => {
  const { rows } = await query(
    `SELECT papel, count(*)::int AS n FROM vinculos
     WHERE ativo = TRUE AND papel = ANY($1) GROUP BY papel`,
    [Object.keys(CARGOS)]
  );
  const porPapel = Object.fromEntries(rows.map((r) => [r.papel, r.n]));
  const total = rows.reduce((acc, r) => acc + r.n, 0);
  res.json({ ...Object.fromEntries(Object.keys(CARGOS).map((p) => [p, porPapel[p] || 0])), TODOS: total });
};

// GET /api/contatos/agenda/exportar.xlsx
export const exportAgendaXlsx = async (req, res) => {
  const XLSX = await import('xlsx');
  const { rows: vinculos } = await query(`${AGENDA_SELECT} AND v.papel = ANY($1) ORDER BY pr.sigla ASC NULLS LAST`, [Object.keys(CARGOS)]);
  const pessoaIds = [...new Set(vinculos.map((v) => v.pessoa_id).filter(Boolean))];
  const { rows: contatosRows } = pessoaIds.length
    ? await query(`SELECT * FROM contatos WHERE entidade = 'pessoa' AND entidade_id = ANY($1)`, [pessoaIds])
    : { rows: [] };
  const contatosPorPessoa = {};
  for (const c of contatosRows) (contatosPorPessoa[c.entidade_id] ||= []).push(c);

  const sheetRows = vinculos.map((v) => {
    const cs = v.pessoa_id ? (contatosPorPessoa[v.pessoa_id] || []) : [];
    return {
      Cargo: CARGOS[v.papel] || v.papel, Programa: v.programa_sigla || '', Nome: v.nome || '',
      'E-mail': cs.find((c) => c.tipo === 'EMAIL')?.valor_exibicao || '',
      Telefone: cs.find((c) => ['TELEFONE', 'CELULAR', 'WHATSAPP'].includes(c.tipo))?.valor_exibicao || '',
      'Desde': v.data_inicio_mandato || '',
    };
  });
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Agenda');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="agenda-contatos.xlsx"');
  res.send(buffer);
};

// ============================ CRUD de contatos ============================

export const getContatosByPessoa = async (req, res) => {
  res.json(await contatosRepo.listByEntidade('pessoa', req.params.pessoaId));
};

export const createContatoPessoa = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.tipo || !req.body.valor) {
    return res.status(400).json({ message: 'Informe o tipo e o valor do contato.' });
  }
  const created = await contatosRepo.create(
    { ...req.body, entidade: 'pessoa', entidadeId: req.params.pessoaId }, req.user?.id
  );
  res.status(201).json(created);
};

export const getContatosByPrograma = async (req, res) => {
  res.json(await contatosRepo.listByEntidade('programa', req.params.programaId));
};

export const createContatoPrograma = async (req, res) => {
  if (!isPlainObject(req.body) || !req.body.tipo || !req.body.valor) {
    return res.status(400).json({ message: 'Informe o tipo e o valor do contato.' });
  }
  const created = await contatosRepo.create(
    { ...req.body, entidade: 'programa', entidadeId: req.params.programaId }, req.user?.id
  );
  res.status(201).json(created);
};

export const updateContato = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const updated = await contatosRepo.update(req.params.id, req.body, req.user?.id);
  if (updated) res.json(updated);
  else res.status(404).json({ message: 'Contato não encontrado.' });
};

export const deleteContato = async (req, res) => {
  const ok = await contatosRepo.remove(req.params.id);
  if (ok) res.json({ message: 'Contato removido com sucesso.' });
  else res.status(404).json({ message: 'Contato não encontrado.' });
};
