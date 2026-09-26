// Endereços públicos do site (Fase P.4). PUBLIC_SITE_URL é a origem que o
// visitante e os buscadores usam (a mesma do QR code das declarações).

export const urlSite = () => (process.env.PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

// Origem da API/uploads como o front a enxerga (VITE_API_URL). Quando o site e
// a API estão no mesmo endereço, é a mesma de PUBLIC_SITE_URL.
export const urlApi = () => (process.env.PUBLIC_API_URL || urlSite()).replace(/\/+$/, '');

// Site em homologação/pré-lançamento: nada deve ser indexado (SEO_NOINDEX=true).
export const semIndexar = () => process.env.SEO_NOINDEX === 'true';

export const absoluta = (caminho) => `${urlSite()}${String(caminho).startsWith('/') ? '' : '/'}${caminho}`;
const doUpload = (caminho) => `${urlApi()}${caminho}`;

const RASTER = /\.(jpe?g|png|webp)$/i;

// Endereço absoluto de uma imagem para og:image/JSON-LD. Upload local vira a
// versão WebP de `largura` px (o original pode ter vários MB — os redes
// sociais recusam arquivos grandes); imagem de outro site segue como está.
export function imagemAbsoluta(url, largura = 1280) {
  if (!url || typeof url !== 'string') return null;
  if (/^https:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads/')) return doUpload(RASTER.test(url) ? `${url}?w=${largura}` : url);
  return null;
}

// Dados para <link rel="preload" as="image"> de uma imagem local (com srcset).
export function preloadDeImagem(url, sizes = '100vw') {
  if (!url) return null;
  if (url.startsWith('/uploads/') && RASTER.test(url)) {
    const larguras = [480, 800, 1280, 1920];
    return {
      href: doUpload(`${url}?w=800`),
      srcset: larguras.map((w) => `${doUpload(`${url}?w=${w}`)} ${w}w`).join(', '),
      sizes,
    };
  }
  return /^https:\/\//i.test(url) ? { href: url } : null;
}
