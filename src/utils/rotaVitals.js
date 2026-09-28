// Família de rota para agrupar as medições de desempenho real (Fase P.6 de
// docs/revisao-portal-conteudo-2026-09-24.md): "/noticia/abc" e "/noticia/xyz"
// viram a mesma linha "/noticia/:id" no painel — senão cada notícia teria a
// sua própria linha com uma amostra só, e o p75 não diria nada.
//
// Espelha as rotas de src/App.jsx e as subpáginas fixas do microsite
// (server/seo/metadados.js:SUBPAGINAS) — ao mexer numa rota pública, conferir
// aqui também (rotaVitals.test.js aponta a divergência se a família não bate
// com nenhum padrão conhecido).

// Páginas com endereço fixo (sem parâmetro) — mostradas como estão.
const PAGINAS_FIXAS = new Set([
  '/', '/programas', '/calendario-academico', '/editais', '/resolucoes', '/formularios',
  '/noticias', '/teses', '/equipe', '/estrutura-organizacional', '/busca',
  '/proficiencia/inscricao', '/proficiencia/inscricao/sucesso',
  '/sobre', '/missao-visao-valores', '/historico', '/financeiro', '/proext-pg',
  '/relatorios-autoavaliacao', '/especializacao', '/residencia-profissional',
  '/sobre-internacionalizacao', '/alunos-estrangeiros', '/capes-print',
  '/mobilidade-estudantil', '/reconhecimento', '/privacidade',
]);

// Rotas com um segmento variável (id/slug/código) — o padrão fica com :nome.
const PADROES = [
  [/^\/noticia\/[^/]+$/, '/noticia/:id'],
  [/^\/editais\/[^/]+$/, '/editais/:id'],
  [/^\/programas\/[^/]+$/, '/programas/:slug'],
  [/^\/p\/[^/]+$/, '/p/:slug'],
  [/^\/declaracoes\/proficiencia\/[^/]+$/, '/declaracoes/proficiencia/:codigo'],
  [/^\/verificar\/[^/]+$/, '/verificar/:codigo'],
];

// Subpáginas fixas do microsite (src/pages/programa/ProgramaSite.jsx) — o
// slug do programa vira :programa, o resto do endereço fica como está.
const SUBPAGINAS_PROGRAMA = new Set([
  'sobre', 'noticias', 'editais', 'busca', 'comissoes', 'discentes', 'egressos',
  'linhas-de-pesquisa', 'pessoas', 'disciplinas', 'teses', 'faq', 'grupos-pesquisa',
  'documentos', 'contato',
]);

const AREA_RESTRITA = /^\/(admin|entrar|minha-conta)(\/|$)/;

const normalizar = (pathname) => {
  const p = String(pathname || '/').replace(/\/{2,}/g, '/');
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
};

export function familiaDaRota(pathname) {
  const caminho = normalizar(pathname);
  if (AREA_RESTRITA.test(caminho)) return '/admin';
  if (PAGINAS_FIXAS.has(caminho)) return caminho;
  for (const [regex, modelo] of PADROES) if (regex.test(caminho)) return modelo;

  // O que sobra é o microsite de um programa: /:programaSlug/* em App.jsx.
  const partes = caminho.split('/').filter(Boolean);
  if (partes.length === 0) return caminho; // já coberto por PAGINAS_FIXAS, mas por garantia
  if (partes.length === 1) return '/:programa';
  const [, segundo, terceiro] = partes;
  if (SUBPAGINAS_PROGRAMA.has(segundo)) {
    return segundo === 'noticias' && terceiro ? '/:programa/noticias/:id' : `/:programa/${segundo}`;
  }
  // Página própria do programa (/<programaSlug>/<pageSlug>) — endereço da S.3/ProgramaPagina.
  return '/:programa/:pagina';
}
