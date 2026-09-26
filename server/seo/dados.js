// Consultas dos metadados de SEO (Fase P.4): só o que uma página precisa para
// montar título, descrição, imagem e JSON-LD — nunca o corpo inteiro.
import { query } from '../db/pool.js';
import { sqlPublicado } from '../utils/publicacao.js';

export async function configuracoes() {
  const { rows } = await query('SELECT chave, valor FROM configuracoes');
  return Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
}

// `publico`: já publicado e, se agendado, na data — o mesmo critério da API.
export async function noticia(id) {
  const { rows } = await query(
    `SELECT n.id, n.title, n.excerpt, n.image, n.imagem_alt, n.date, n.author, n.category, n.programa_id,
            n.publicado_em, n.atualizado_em, ${sqlPublicado('n')} AS publico
       FROM news n WHERE n.id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function edital(id) {
  const { rows } = await query(
    `SELECT e.id, e.title, e.numero, e.description, e.published_at, e.programa_id, e.atualizado_em,
            ${sqlPublicado('e')} AS publico
       FROM editais e WHERE e.id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function programaPorSlug(slug) {
  const { rows } = await query(
    `SELECT id, nome, sigla, slug, descricao_curta, logo_url, hero_imagem_url, microsite_ativo,
            area_conhecimento, atualizado_em
       FROM programas WHERE slug = $1`,
    [slug],
  );
  return rows[0] || null;
}

export async function programaPorId(id) {
  const { rows } = await query('SELECT slug, microsite_ativo FROM programas WHERE id = $1', [id]);
  return rows[0] || null;
}

// Página do portal (programaId nulo) ou de um programa, pelo endereço.
export async function pagina(slug, programaId = null) {
  const { rows } = await query(
    `SELECT p.id, p.title, p.slug, p.body_summary, p.body_value, p.atualizado_em, ${sqlPublicado('p')} AS publico
       FROM pages p
      WHERE p.slug = $1 AND p.programa_id IS NOT DISTINCT FROM $2`,
    [slug, programaId],
  );
  return rows[0] || null;
}
