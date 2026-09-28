// Lighthouse CI (Fase P.6 de docs/revisao-portal-conteudo-2026-09-24.md).
// Mede as páginas públicas mais visitadas em perfil de celular (o padrão do
// Lighthouse: 4G lenta, CPU 4x mais lenta) com o site entregue pelo próprio
// servidor — que injeta os metadados de SEO, então a nota de SEO é a real.
//
// Precisa do banco (PostgreSQL) com o schema e a carga inicial, do build em
// dist/ e das variáveis do workflow .github/workflows/desempenho.yml.
// Local:  npm run build && npm run perf:lighthouse
//
// Metas da Fase P: LCP <= 2,5 s, CLS <= 0,1 (o INP só existe em campo: ver
// "Desempenho real" no painel, Qualidade dos dados). O LCP em laboratório fica
// como aviso — enquanto a imagem do banner da home for uma imagem do site antigo
// (sem cache e sem versões WebP), ele não fecha; o resto quebra a construção.
const porta = process.env.PORT || 5000;
const base = `http://localhost:${porta}`;

module.exports = {
  ci: {
    collect: {
      url: [`${base}/`, `${base}/noticias`, `${base}/editais`, `${base}/programas`],
      numberOfRuns: 3,
      startServerCommand: 'node server/index.js',
      startServerReadyPattern: 'Rodando na porta',
      startServerReadyTimeout: 60000,
      settings: { onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.75 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'total-byte-weight': ['warn', { maxNumericValue: 700000 }],
        // Metadados de SEO que a Fase P.4 entrega no HTML inicial.
        'document-title': 'error',
        'meta-description': 'error',
        'canonical': 'error',
        'is-crawlable': 'error',
        'link-text': 'warn',
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
