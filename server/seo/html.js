// Injeção dos metadados no index.html da SPA (Fase P.4). O front continua o
// mesmo — depois de carregar, ele troca o título ao navegar —; o que muda é o
// HTML que chega primeiro, o que buscadores e pré-visualizações de link leem.
import { esc, jsonSeguro } from './texto.js';
import { NOME_SITE } from './metadados.js';

const meta = (atributo, chave, conteudo) => (conteudo ? `<meta ${atributo}="${esc(chave)}" content="${esc(conteudo)}">` : '');

const SUFIXO = ` | ${NOME_SITE}`;

export function blocoDeMetadados(m) {
  // Na pré-visualização de link o nome do site já aparece (og:site_name): sem o sufixo.
  const completo = m.titulo || NOME_SITE;
  const titulo = completo.endsWith(SUFIXO) ? completo.slice(0, -SUFIXO.length) : completo;
  const linhas = [];
  if (m.descricao) linhas.push(meta('name', 'description', m.descricao));
  if (m.noindex) linhas.push('<meta name="robots" content="noindex, nofollow">');
  if (m.canonical && !m.noindex) linhas.push(`<link rel="canonical" href="${esc(m.canonical)}">`);

  if (!m.noindex) {
    linhas.push(
      meta('property', 'og:site_name', NOME_SITE),
      meta('property', 'og:locale', 'pt_BR'),
      meta('property', 'og:type', m.tipo || 'website'),
      meta('property', 'og:url', m.canonical),
      meta('property', 'og:title', titulo),
      meta('property', 'og:description', m.descricao),
      meta('property', 'og:image', m.imagem),
      meta('property', 'og:image:alt', m.imagem ? m.imagemAlt || titulo : ''),
      meta('name', 'twitter:card', m.imagem ? 'summary_large_image' : 'summary'),
      meta('name', 'twitter:title', titulo),
      meta('name', 'twitter:description', m.descricao),
      meta('name', 'twitter:image', m.imagem),
    );
    if (m.tipo === 'article') {
      linhas.push(
        meta('property', 'article:published_time', m.publicadoEm),
        meta('property', 'article:modified_time', m.modificadoEm),
      );
    }
    // A imagem principal (LCP) começa a baixar junto com o HTML, sem esperar o JavaScript.
    if (m.preload?.href) {
      linhas.push(`<link rel="preload" as="image" href="${esc(m.preload.href)}"${m.preload.srcset ? ` imagesrcset="${esc(m.preload.srcset)}" imagesizes="${esc(m.preload.sizes || '100vw')}"` : ''} fetchpriority="high">`);
    }
    for (const dado of m.jsonld || []) linhas.push(`<script type="application/ld+json">${jsonSeguro(dado)}</script>`);
  }
  return linhas.filter(Boolean).map((l) => `    ${l}`).join('\n');
}

export function injetarMetadados(html, m, portal = null) {
  const titulo = m.titulo || NOME_SITE;
  const bloco = [blocoDeMetadados(m), portal ? `    <script id="dados-portal" type="application/json">${jsonSeguro(portal)}</script>` : ''].filter(Boolean).join('\n');
  // Funções como substituto: o título vem do banco e pode conter "$&", "$'" etc.
  const comTitulo = /<title>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${esc(titulo)}</title>`)
    : html.replace(/<\/head>/i, () => `    <title>${esc(titulo)}</title>\n</head>`);
  return comTitulo.replace(/<\/head>/i, () => `${bloco}\n</head>`);
}
