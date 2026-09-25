import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool, query } from './pool.js';
import { contatosRepo } from './contatosRepo.js';
import { hojeISO } from '../utils/datas.js';

// Equipe e Estrutura Organizacional da PRPG (Fase H.4): setores em
// `unidades` (árvore por unidade_pai_id a partir de 'prpg'), pessoas em
// `vinculos` com unidade_id e contatos públicos em `contatos` — a mesma fonte
// da Agenda de Contatos. Antes, duas páginas JSX repetiam (e divergiam sobre)
// quem é quem.

const ARQUIVO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'estrutura-prpg.json');
export const RAIZ = 'prpg';

// Carga inicial: só roda enquanto não há nenhum vínculo de setor (nem
// encerrado), para nunca desfazer o que foi editado no painel depois — e
// volta a rodar se o seed de dev (TRUNCATE ... CASCADE) apagar os vínculos.
// Devolve quantas pessoas vinculou.
export async function garantirEstruturaPrpg() {
  const { rows } = await query(
    'SELECT EXISTS (SELECT 1 FROM unidades WHERE id = $1) AS raiz, EXISTS (SELECT 1 FROM vinculos WHERE unidade_id IS NOT NULL) AS equipe',
    [RAIZ]
  );
  if (rows[0].raiz && rows[0].equipe) return 0;
  const dados = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const u of dados.unidades) {
      const existe = (await client.query('SELECT nome FROM unidades WHERE id = $1', [u.id])).rows[0];
      if (!existe) {
        await client.query(
          `INSERT INTO unidades (id, sigla, nome, tipo, interna_prpg) VALUES ($1, $2, $3, $4, TRUE)`,
          [u.id, u.sigla, u.nome, u.tipo || 'SETOR']
        );
      } else if (u.nome && u.nome !== existe.nome) {
        // Nome público; a grafia antiga continua reconhecida (importadores).
        await client.query(
          `UPDATE unidades SET nome = $2, aliases = array_append(coalesce(aliases, '{}'), $3) WHERE id = $1`,
          [u.id, u.nome, existe.nome]
        );
      }
      await client.query(
        `UPDATE unidades SET unidade_pai_id = $2, descricao = coalesce($3, descricao), ordem = $4,
           exibir_no_site = $5, interna_prpg = TRUE WHERE id = $1`,
        [u.id, u.pai, u.descricao || null, u.ordem ?? 0, u.exibir !== false]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  for (const u of dados.unidades) await substituirContatosDaUnidade(u.id, u.contatos || []);
  for (const m of dados.membros) await adicionarMembro(m.unidade, m);
  return dados.membros.length;
}

// Reaproveita a pessoa se já houver cadastro com o mesmo nome (pessoas ou
// perfil de usuário); senão cria uma pessoa mínima.
async function pessoaPorNome(nome) {
  const { rows } = await query(
    `SELECT id FROM pessoas WHERE lower(nome) = lower($1)
     UNION ALL SELECT coalesce(pessoa_id, id) FROM users WHERE lower(perfil_nome) = lower($1)
     LIMIT 1`,
    [nome.trim()]
  );
  if (rows[0]) return rows[0].id;
  const id = crypto.randomUUID();
  await query('INSERT INTO pessoas (id, nome) VALUES ($1, $2)', [id, nome.trim()]);
  return id;
}

// Cria o vínculo de uma pessoa com um setor, com os contatos da função.
export async function adicionarMembro(unidadeId, { pessoaId, nome, papel, funcao, ordem = 0, foto, contatos = [] }, actor = null) {
  const pid = pessoaId || await pessoaPorNome(nome);
  if (foto) await query('UPDATE pessoas SET foto_url = $2 WHERE id = $1', [pid, foto]);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO vinculos (id, unidade_id, pessoa_id, papel, funcao, ordem, ativo, data_inicio_mandato)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, NULL)`,
    [id, unidadeId, pid, papel || 'SERVIDOR', funcao || null, ordem]
  );
  await substituirContatosDoVinculo(id, pid, contatos, actor);
  return id;
}

// Os contatos da função ficam na pessoa, marcados com o vínculo (assim somem
// do site quando o vínculo é encerrado, e a agenda continua achando a pessoa).
export async function substituirContatosDoVinculo(vinculoId, pessoaId, contatos, actor = null) {
  await query('DELETE FROM contatos WHERE vinculo_id = $1', [vinculoId]);
  for (const [ordem, c] of (contatos || []).entries()) {
    if (!c?.tipo || !String(c.valor || '').trim()) continue;
    await contatosRepo.create({
      tipo: c.tipo, valor: c.valor, entidade: 'pessoa', entidadeId: pessoaId,
      vinculoId, publico: c.publico !== false, rotulo: 'institucional', ordem,
    }, actor);
  }
}

export async function substituirContatosDaUnidade(unidadeId, contatos, actor = null) {
  await query(`DELETE FROM contatos WHERE entidade = 'unidade' AND entidade_id = $1`, [unidadeId]);
  for (const [ordem, c] of (contatos || []).entries()) {
    if (!c?.tipo || !String(c.valor || '').trim()) continue;
    await contatosRepo.create({
      tipo: c.tipo, valor: c.valor, entidade: 'unidade', entidadeId: unidadeId,
      publico: c.publico !== false, ordem,
    }, actor);
  }
}

const contatoPublico = (c) => ({ id: c.id, tipo: c.tipo, valor: c.valor, exibicao: c.valor_exibicao || c.valor, publico: c.publico });

// Árvore a partir da raiz. `todos`: para o painel — inclui setores fora do
// site, vínculos encerrados não (histórico fica na tabela) e contatos não públicos.
export async function carregarEstrutura({ todos = false } = {}) {
  const hoje = hojeISO();
  const { rows: unidades } = await query(
    `WITH RECURSIVE arvore AS (
       SELECT * FROM unidades WHERE id = $1
       UNION ALL SELECT u.* FROM unidades u JOIN arvore a ON u.unidade_pai_id = a.id
     )
     SELECT * FROM arvore ${todos ? '' : 'WHERE exibir_no_site AND coalesce(ativo, TRUE)'}
     ORDER BY ordem, nome`,
    [RAIZ]
  );
  if (!unidades.length) return null;
  const ids = unidades.map((u) => u.id);

  const { rows: membros } = await query(
    `SELECT v.id, v.unidade_id, v.pessoa_id, v.papel, v.funcao, v.ordem,
            coalesce(p.nome, u.perfil_nome) AS nome, coalesce(p.foto_url, u.perfil_foto_url) AS foto,
            voc.rotulo AS papel_rotulo
       FROM vinculos v
       LEFT JOIN pessoas p ON p.id = v.pessoa_id
       LEFT JOIN users u ON u.id = v.pessoa_id
       LEFT JOIN vocabularios voc ON voc.dominio = 'vinculo.papel' AND voc.valor = v.papel AND voc.programa_id IS NULL
      WHERE v.unidade_id = ANY($1) AND v.ativo IS NOT FALSE
        AND (v.data_fim_mandato IS NULL OR v.data_fim_mandato >= $2)
      ORDER BY v.ordem, nome`,
    [ids, hoje]
  );
  const { rows: contatos } = await query(
    `SELECT * FROM contatos
      WHERE ((entidade = 'unidade' AND entidade_id = ANY($1)) OR vinculo_id = ANY($2))
        ${todos ? '' : 'AND publico'}
      ORDER BY ordem, criado_em`,
    [ids, membros.map((m) => m.id)]
  );

  const porUnidade = new Map(unidades.map((u) => [u.id, {
    id: u.id, sigla: u.sigla, nome: u.nome, descricao: u.descricao, ordem: u.ordem,
    exibirNoSite: u.exibir_no_site, paiId: u.unidade_pai_id,
    contatos: contatos.filter((c) => c.entidade === 'unidade' && c.entidade_id === u.id).map(contatoPublico),
    membros: [], filhos: [],
  }]));
  for (const m of membros) {
    porUnidade.get(m.unidade_id)?.membros.push({
      id: m.id, pessoaId: m.pessoa_id, nome: m.nome, foto: m.foto, papel: m.papel,
      funcao: m.funcao || m.papel_rotulo || null, funcaoPropria: m.funcao, ordem: m.ordem,
      contatos: contatos.filter((c) => c.vinculo_id === m.id).map(contatoPublico),
    });
  }
  for (const u of porUnidade.values()) {
    if (u.id !== RAIZ) porUnidade.get(u.paiId)?.filhos.push(u);
  }
  return porUnidade.get(RAIZ) || null;
}
