// B.11 (docs/analise-fk-vinculos-pessoa-id-b3.md): a pessoa por trás de um
// vínculo (`vinculos.pessoa_id`, `camara_relatorias.relator_id`, ambos com FK
// para pessoas desde a migração 2026-09-30_b11b). O login, quando existe, é o
// `users` com users.pessoa_id = pessoa. A entrada do painel ainda chega como
// users.id: `idsDaMesmaPessoa` e `pessoaCanonica` convertem.
import { query } from './pool.js';
import { resolverOuCriarPessoa } from './pessoasRepo.js';

// LEFT JOINs que resolvem a pessoa (p) e o login (u), quando existe, por trás
// de `col` (um pessoas.id).
export const joinPessoa = (col, { u = 'u', p = 'p' } = {}) => `
  LEFT JOIN pessoas ${p} ON ${p}.id = ${col}
  LEFT JOIN users ${u} ON ${u}.pessoa_id = ${col}`;

// O pessoas.id de `col` (já é ele; mantido para quem usa o módulo).
export const pessoaReal = (col) => col;

// Condição "o vínculo em `col` é do usuário `u`" (para JOIN ... ON / WHERE).
export const doUsuario = (col, { u = 'u' } = {}) => `${col} = ${u}.pessoa_id`;

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
