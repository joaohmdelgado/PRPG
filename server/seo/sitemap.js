// sitemap.xml e robots.txt gerados do banco (Fase P.4). Só entra o que é
// público e canônico: publicado (e, se agendado, já na data), sem duplicatas
// entre o endereço do portal e o do microsite, e sem áreas restritas.
import { query } from '../db/pool.js';
import { sqlPublicado } from '../utils/publicacao.js';
import { absoluta, semIndexar } from './site.js';
import { esc, semHtml } from './texto.js';
import { PAGINAS_ROTEADAS } from './metadados.js';

// Limite do protocolo: 50.000 endereços por arquivo. Com o volume do portal
// (centenas), um único arquivo basta; se passar disso, as notícias mais
// antigas ficam de fora (e o log avisa) até haver um índice de sitemaps.
const MAX_URLS = 50000;

const FIXAS = ['/', '/programas', '/editais', '/noticias', '/resolucoes', '/formularios', '/calendario-academico', '/teses', '/equipe', '/estrutura-organizacional'];

const dia = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? (/^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : null) : d.toISOString().slice(0, 10);
};

export async function coletarUrls() {
  const urls = new Map(); // caminho -> lastmod
  const add = (caminho, quando) => { if (!urls.has(caminho)) urls.set(caminho, dia(quando)); };
  for (const f of FIXAS) add(f, null);

  const { rows: programas } = await query('SELECT id, slug, microsite_ativo, atualizado_em FROM programas WHERE slug IS NOT NULL ORDER BY slug');
  const site = new Map(programas.filter((p) => p.microsite_ativo).map((p) => [p.id, p.slug]));
  for (const p of programas) {
    add(`/programas/${p.slug}`, p.atualizado_em);
    if (p.microsite_ativo) add(`/${p.slug}`, p.atualizado_em);
  }

  // Páginas com texto (as fixas de programa nascem vazias e ficam de fora).
  const { rows: paginas } = await query(
    `SELECT p.slug, p.programa_id, p.body_value, p.atualizado_em FROM pages p
      WHERE p.slug IS NOT NULL AND ${sqlPublicado('p')} ORDER BY p.slug`,
  );
  for (const p of paginas) {
    if (!semHtml(p.body_value)) continue;
    if (!p.programa_id) add(PAGINAS_ROTEADAS.includes(p.slug) ? `/${p.slug}` : `/p/${p.slug}`, p.atualizado_em);
    else if (site.has(p.programa_id)) add(`/${site.get(p.programa_id)}/${p.slug}`, p.atualizado_em);
  }

  const { rows: editais } = await query(
    `SELECT e.id, e.atualizado_em, e.published_at FROM editais e WHERE ${sqlPublicado('e')} ORDER BY e.published_at DESC NULLS LAST, e.id`,
  );
  for (const e of editais) add(`/editais/${e.id}`, e.atualizado_em || e.published_at);

  // Notícias: a mais recente primeiro, para o corte (se houver) tirar as mais antigas.
  const { rows: noticias } = await query(
    `SELECT n.id, n.programa_id, n.date, n.atualizado_em FROM news n WHERE ${sqlPublicado('n')} ORDER BY n.date DESC NULLS LAST, n.id`,
  );
  for (const n of noticias) {
    const slug = n.programa_id ? site.get(n.programa_id) : null;
    add(slug ? `/${slug}/noticias/${n.id}` : `/noticia/${n.id}`, n.atualizado_em || n.date);
  }
  for (const slug of new Set(noticias.map((n) => site.get(n.programa_id)).filter(Boolean))) add(`/${slug}/noticias`, null);

  if (urls.size > MAX_URLS) {
    console.warn(`[sitemap] ${urls.size} endereços; só os primeiros ${MAX_URLS} entram (crie um índice de sitemaps).`);
    return [...urls].slice(0, MAX_URLS);
  }
  return [...urls];
}

export async function gerarSitemap() {
  const urls = await coletarUrls();
  const itens = urls.map(([caminho, mod]) => `  <url><loc>${esc(absoluta(caminho))}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${itens.join('\n')}\n</urlset>\n`;
}

export function gerarRobots() {
  if (semIndexar()) return 'User-agent: *\nDisallow: /\n';
  return [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /entrar',
    'Disallow: /minha-conta',
    'Disallow: /api/',
    'Disallow: /verificar/',
    'Disallow: /declaracoes/',
    'Disallow: /busca',
    'Disallow: /proficiencia/inscricao/sucesso',
    'Allow: /uploads/',
    '',
    `Sitemap: ${absoluta('/sitemap.xml')}`,
    '',
  ].join('\n');
}
