// Utilitários de texto para os metadados de SEO (Fase P.4).

// Escapa para atributo/conteúdo HTML.
export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const ENTIDADES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

// Texto puro de um trecho de HTML (o conteúdo vem do editor): sem tags, sem
// script/style, entidades comuns decodificadas e espaços colapsados.
export const semHtml = (html) => String(html ?? '')
  .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
  // Tags de bloco separam palavras; as de texto (b, i, a…) somem sem deixar espaço
  // ("<b>mestrado</b>." vira "mestrado.", e não "mestrado .").
  .replace(/<\/?(p|div|br|li|ul|ol|h[1-6]|tr|td|th|table|section|article|blockquote|figure|figcaption)\b[^>]*>/gi, ' ')
  .replace(/<[^>]*>/g, '')
  .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' ';
    }
    return ENTIDADES[e.toLowerCase()] ?? m;
  })
  .replace(/\s+/g, ' ')
  .trim();

// Descrição para meta description: até `max` caracteres, cortando em palavra.
export function resumir(html, max = 160) {
  const t = semHtml(html);
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  const espaco = corte.lastIndexOf(' ');
  return `${(espaco > max * 0.6 ? corte.slice(0, espaco) : corte).replace(/[\s,.;:–—-]+$/, '')}…`;
}

// JSON para dentro de <script type="application/ld+json">: nada que feche a
// tag ou abra HTML, mesmo que o título de uma notícia contenha "</script>".
const BARRA = String.fromCharCode(92);
const SEPARADORES = String.fromCharCode(0x2028, 0x2029);
const PERIGOSOS = new RegExp(`[<>&${SEPARADORES}]`, 'g');
const escapar = (c) => `${BARRA}u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
export const jsonSeguro = (obj) => JSON.stringify(obj).replace(PERIGOSOS, escapar);
