import { query } from './pool.js';

// Histórico de versões leve (Fase F.7). Quem grava é o update dos
// repositórios publicáveis (repository.js e calendariosRepo): antes de
// sobrescrever um item, a versão anterior vai para `revisoes`.

// Quantas versões anteriores cada item guarda (as mais antigas saem).
export const MAX_REVISOES = 30;

// Campos que mudam a cada gravação sem ser conteúdo: não contam como
// alteração nem entram na restauração.
const CAMPOS_CONTROLE = ['criado_em', 'atualizado_em', 'criado_por', 'atualizado_por'];

const semControle = (obj) => {
  const out = { ...obj };
  for (const c of CAMPOS_CONTROLE) delete out[c];
  return out;
};

// true se `antes` e `depois` (objetos da API) diferem em algum campo de conteúdo.
export const mudouConteudo = (antes, depois) =>
  JSON.stringify(semControle(antes)) !== JSON.stringify(semControle(depois));

// Guarda `antes` (o item como estava) se o salvamento mudou alguma coisa.
// Falha aqui não desfaz o salvamento já feito — só é registrada no log.
export async function registrarRevisao(entidade, antes, depois) {
  if (!antes || !depois || !mudouConteudo(antes, depois)) return;
  try {
    await query(
      `INSERT INTO revisoes (entidade, entidade_id, snapshot, versao_de, autor)
       VALUES ($1, $2, $3, $4, (SELECT id FROM users WHERE id = $5))`,
      [entidade, String(antes.id), JSON.stringify(antes), antes.atualizado_em ?? null, antes.atualizado_por ?? null]
    );
    await query(
      `DELETE FROM revisoes WHERE entidade = $1 AND entidade_id = $2 AND id NOT IN (
         SELECT id FROM revisoes WHERE entidade = $1 AND entidade_id = $2 ORDER BY id DESC LIMIT $3)`,
      [entidade, String(antes.id), MAX_REVISOES]
    );
  } catch (e) {
    console.error(`[revisoes] falha ao guardar versão de ${entidade}/${antes.id}:`, e);
  }
}

export async function apagarRevisoes(entidade, entidadeId) {
  await query('DELETE FROM revisoes WHERE entidade = $1 AND entidade_id = $2', [entidade, String(entidadeId)]);
}

// Lista (sem o snapshot, que pode ser grande), da mais recente à mais antiga.
export async function listarRevisoes(entidade, entidadeId) {
  const { rows } = await query(
    `SELECT r.id, r.versao_de, r.criado_em, r.autor,
            COALESCE(NULLIF(u.perfil_nome, ''), u.email) AS autor_nome,
            r.snapshot->>'title' AS titulo
       FROM revisoes r LEFT JOIN users u ON u.id = r.autor
      WHERE r.entidade = $1 AND r.entidade_id = $2
      ORDER BY r.id DESC`,
    [entidade, String(entidadeId)]
  );
  return rows.map((r) => ({
    id: Number(r.id), versaoDe: r.versao_de, substituidaEm: r.criado_em,
    autor: r.autor, autorNome: r.autor_nome ?? null, titulo: r.titulo ?? null,
  }));
}

export async function obterRevisao(id) {
  const { rows } = await query('SELECT * FROM revisoes WHERE id = $1', [id]);
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.id), entidade: r.entidade, entidadeId: r.entidade_id,
    snapshot: r.snapshot, versaoDe: r.versao_de, autor: r.autor,
  };
}

// Campos do snapshot que uma restauração devolve ao item: o conteúdo. Ficam
// de fora a identidade, os campos de controle e o que decide ONDE e QUANDO o
// item aparece (situação, data de publicação, programa) — restaurar o texto
// de uma versão antiga não deve publicá-lo, despublicá-lo, movê-lo de
// programa, trocar o endereço (slug/chave) nem a posição na lista (ordem).
const CAMPOS_FIXOS = ['id', 'status', 'publicadoEm', 'programaId', 'slug', 'chave', 'ordem'];
export function camposRestauraveis(snapshot) {
  const out = semControle(snapshot);
  for (const c of CAMPOS_FIXOS) delete out[c];
  return out;
}
