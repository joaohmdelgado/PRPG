// Menu do microsite de um programa (Fase S.1 de
// docs/revisao-portal-conteudo-2026-09-24.md). Segue o padrão que os 29 sites
// atuais dos programas já usam (analises-sites-pos-graduacao/): quatro grupos
// — O Programa / Pessoas / Produção / Admissão — mais Notícias, Documentos e
// Contato. O modelo vive aqui, igual para os 42 programas; o menu é montado a
// cada leitura a partir do que o programa tem de conteúdo, então módulo novo
// ou página nova aparece sem migração.
//
// Não reaproveita `menus`/`menu_itens` (H.1) de propósito: lá o menu é uma
// árvore de destinos gravada inteira. Copiar essa árvore para cada programa
// congelaria o modelo (um módulo novo exigiria editar 42 menus) e não
// expressa "some enquanto está vazio", que é calculado.

// Páginas fixas de todo programa (Fase S.2): criadas vazias para os 42
// (pagesRepo.ensureFixedPages), editáveis no painel e fora do menu enquanto
// estiverem vazias — exceto "Sobre", que sempre mostra ao menos a descrição e
// o histórico de coordenação. Slug = chave, travados (pagesController.js).
export const PAGINAS_FIXAS = [
  { chave: 'sobre', titulo: 'Sobre o Programa' },
  { chave: 'impacto-social', titulo: 'Impacto Social' },
  { chave: 'autoavaliacao', titulo: 'Autoavaliação' },
  { chave: 'infraestrutura', titulo: 'Infraestrutura' },
  { chave: 'internacionalizacao', titulo: 'Internacionalização' },
  { chave: 'planejamento', titulo: 'Planejamento' },
];

// Texto de verdade num HTML do editor (ignora tags, &nbsp; e espaços) —
// "<p>&nbsp;</p>" conta como vazio.
export const temTexto = (html) =>
  !!html && /\S/.test(String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' '));

// Condição SQL equivalente a temTexto() sobre pages.body_value.
export const sqlPaginaComTexto = (alias = '') => {
  const p = alias ? `${alias}.` : '';
  return `(regexp_replace(coalesce(${p}body_value, ''), '<[^>]*>|&nbsp;|&#160;|\\s', '', 'gi') <> '')`;
};

// Entradas de primeiro nível, na ordem padrão. `grupo: true` abre submenu.
// `sempre`: aparece mesmo sem conteúdo; `modulo`: aparece quando
// modulos[modulo] > 0; `pagina`: aparece quando a página fixa tem texto.
export const TOPO = [
  { chave: 'inicio', rotulo: 'Início', sub: '', icone: 'fa-house', sempre: true },
  { chave: 'programa', rotulo: 'O Programa', icone: 'fa-circle-info', grupo: true },
  { chave: 'pessoas', rotulo: 'Pessoas', icone: 'fa-users', grupo: true },
  { chave: 'producao', rotulo: 'Produção', icone: 'fa-flask', grupo: true },
  { chave: 'admissao', rotulo: 'Admissão', icone: 'fa-door-open', grupo: true },
  { chave: 'noticias', rotulo: 'Notícias', sub: 'noticias', icone: 'fa-newspaper', sempre: true },
  { chave: 'documentos', rotulo: 'Documentos', sub: 'documentos', icone: 'fa-folder-open', modulo: 'documentos' },
  { chave: 'contato', rotulo: 'Contato', sub: 'contato', icone: 'fa-envelope', sempre: true },
];

// Itens dos grupos, na ordem padrão. As páginas criadas pelo programa entram
// no fim de "O Programa" (ver montarMenu).
export const ITENS = [
  { chave: 'sobre', grupo: 'programa', rotulo: 'Sobre', sub: 'sobre', sempre: true },
  { chave: 'impacto-social', grupo: 'programa', rotulo: 'Impacto Social', sub: 'impacto-social', pagina: 'impacto-social' },
  { chave: 'linhas', grupo: 'programa', rotulo: 'Linhas de Pesquisa', sub: 'linhas-de-pesquisa', modulo: 'linhas' },
  { chave: 'autoavaliacao', grupo: 'programa', rotulo: 'Autoavaliação', sub: 'autoavaliacao', pagina: 'autoavaliacao' },
  { chave: 'comissoes', grupo: 'programa', rotulo: 'Comissões', sub: 'comissoes', modulo: 'comissoes' },
  { chave: 'disciplinas', grupo: 'programa', rotulo: 'Disciplinas', sub: 'disciplinas', modulo: 'disciplinas' },
  { chave: 'infraestrutura', grupo: 'programa', rotulo: 'Infraestrutura', sub: 'infraestrutura', pagina: 'infraestrutura' },
  { chave: 'internacionalizacao', grupo: 'programa', rotulo: 'Internacionalização', sub: 'internacionalizacao', pagina: 'internacionalizacao' },
  { chave: 'planejamento', grupo: 'programa', rotulo: 'Planejamento', sub: 'planejamento', pagina: 'planejamento' },
  { chave: 'faq', grupo: 'programa', rotulo: 'Perguntas Frequentes', sub: 'faq', modulo: 'faq' },
  { chave: 'docentes', grupo: 'pessoas', rotulo: 'Docentes', sub: 'pessoas', modulo: 'docentes' },
  { chave: 'discentes', grupo: 'pessoas', rotulo: 'Discentes', sub: 'discentes', modulo: 'discentes' },
  { chave: 'egressos', grupo: 'pessoas', rotulo: 'Egressos', sub: 'egressos', modulo: 'egressos' },
  { chave: 'teses', grupo: 'producao', rotulo: 'Teses e Dissertações', sub: 'teses', modulo: 'teses' },
  { chave: 'grupos', grupo: 'producao', rotulo: 'Grupos de Pesquisa', sub: 'grupos-pesquisa', modulo: 'grupos' },
  { chave: 'editais', grupo: 'admissao', rotulo: 'Editais', sub: 'editais', sempre: true },
];

// Sub-rotas fixas do microsite (ProgramaSite.jsx): uma página criada pelo
// programa não pode usar esses slugs (pagesController.js).
export const SUBROTAS_MICROSITE = [
  ...new Set([...TOPO, ...ITENS].map((e) => e.sub).filter(Boolean)),
  'busca',
];

const temConteudo = (entrada, modulos, fixasComTexto) =>
  !!entrada.sempre
  || (!!entrada.modulo && (modulos[entrada.modulo] ?? 0) > 0)
  || (!!entrada.pagina && fixasComTexto.has(entrada.pagina));

// Monta o menu do programa. Devolve só o visível: grupo sem nenhum item
// visível não aparece.
//   modulos — contagem de conteúdo publicado por módulo;
//   paginas — páginas criadas pelo programa ({ id, title, slug }), já
//             filtradas pelo que quem lê pode ver;
//   paginasFixas — chaves das páginas fixas visíveis e com texto.
// Saída: [{ chave, rotulo, icone, sub }] para links e
//        [{ chave, rotulo, icone, itens: [{ chave, rotulo, sub }] }] para grupos.
export function montarMenu({ modulos = {}, paginas = [], paginasFixas = [] } = {}) {
  const fixasComTexto = new Set(paginasFixas);
  const itensPorGrupo = new Map(TOPO.filter((t) => t.grupo).map((t) => [t.chave, []]));
  for (const item of ITENS) {
    if (!temConteudo(item, modulos, fixasComTexto)) continue;
    itensPorGrupo.get(item.grupo).push({ chave: item.chave, rotulo: item.rotulo, sub: item.sub });
  }
  for (const p of paginas) {
    itensPorGrupo.get('programa').push({ chave: `pagina:${p.id}`, rotulo: p.title, sub: p.slug });
  }

  const menu = [];
  for (const t of TOPO) {
    if (t.grupo) {
      const itens = itensPorGrupo.get(t.chave);
      if (itens.length) menu.push({ chave: t.chave, rotulo: t.rotulo, icone: t.icone, itens });
    } else if (temConteudo(t, modulos, fixasComTexto)) {
      menu.push({ chave: t.chave, rotulo: t.rotulo, icone: t.icone, sub: t.sub });
    }
  }
  return menu;
}
