// B.11 (docs/analise-fk-vinculos-pessoa-id-b3.md): a pessoa por trás de um
// vínculo (`vinculos.pessoa_id`, `camara_relatorias.relator_id`). Tudo que lê
// essas colunas passa por aqui. Durante a transição a coluna guarda um
// users.id (legado) OU um pessoas.id; depois da migração de dado (Task 10)
// só pessoas.id, e a Task 11 troca estes trechos pela forma final sem mexer
// em quem os usa.
import { query } from './pool.js';
import { resolverOuCriarPessoa } from './pessoasRepo.js';

// LEFT JOINs que resolvem o login (u) e a pessoa (p) por trás de `col`,
// qualquer que seja a forma gravada. users.id e pessoas.id não colidem
// (conferido em docs/operations/b11-pre-verificacao.sql), então casa no
// máximo um `users`.
export const joinPessoa = (col, { u = 'u', p = 'p' } = {}) => `
  LEFT JOIN users ${u} ON (${u}.id = ${col} OR ${u}.pessoa_id = ${col})
  LEFT JOIN pessoas ${p} ON ${p}.id = COALESCE(${u}.pessoa_id, ${col})`;

// O pessoas.id por trás de `col` (users.id só no caso legado de usuário
// ainda sem pessoa). Exige `u` no FROM (joinPessoa).
export const pessoaReal = (col, { u = 'u' } = {}) => `COALESCE(${u}.pessoa_id, ${col})`;

// Condição "o vínculo em `col` é do usuário `u`" (para JOIN ... ON / WHERE).
export const doUsuario = (col, { u = 'u' } = {}) => `${col} IN (${u}.id, ${u}.pessoa_id)`;

// Dados da pessoa: `pessoas` primeiro (D-B11b), o usuário como reserva.
export const campoPessoa = (colPessoa, colUsuario, { u = 'u', p = 'p' } = {}) =>
  `COALESCE(NULLIF(${p}.${colPessoa}, ''), NULLIF(${u}.${colUsuario}, ''))`;
export const nomePessoa = ({ u = 'u', p = 'p' } = {}) =>
  `COALESCE(NULLIF(${p}.nome, ''), NULLIF(${u}.perfil_nome, ''), ${u}.email)`;
// E-mail para falar com a pessoa: o institucional; sem ele, o de login.
export const emailPessoa = ({ u = 'u', p = 'p' } = {}) =>
  `COALESCE(NULLIF(${p}.email_institucional, ''), ${u}.email)`;

// Todos os ids que identificam o mesmo ser humano que `id` (users.id e/ou
// pessoas.id), para comparar/filtrar com `= ANY($n)` — o painel manda
// users.id; o banco pode ter qualquer um dos dois.
export async function idsDaMesmaPessoa(id) {
  if (!id) return [];
  const { rows } = await query('SELECT id, pessoa_id FROM users WHERE id = $1 OR pessoa_id = $1', [id]);
  const ids = new Set([id]);
  for (const r of rows) {
    ids.add(r.id);
    if (r.pessoa_id) ids.add(r.pessoa_id);
  }
  return [...ids];
}

export class PessoaNaoEncontrada extends Error {
  constructor() {
    super('Pessoa não encontrada: selecione um usuário ou uma pessoa já cadastrada.');
    this.status = 400;
    this.expose = true;
  }
}

// Escrita (B.11): o id que chega (users.id do painel ou pessoas.id) vira o
// pessoas.id a gravar — criando a pessoa de um usuário que ainda não tinha
// uma. Vazio -> null; id que não é de ninguém -> PessoaNaoEncontrada (400).
export async function pessoaCanonica(id) {
  if (!id) return null;
  const pessoaId = await resolverOuCriarPessoa({ pessoaId: id });
  if (!pessoaId) throw new PessoaNaoEncontrada();
  return pessoaId;
}
