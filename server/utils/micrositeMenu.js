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

// Entradas de primeiro nível, na ordem padrão. `grupo: true` abre submenu.
// `sempre`: aparece mesmo sem conteúdo; `modulo`: aparece quando
// modulos[modulo] > 0.
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
  { chave: 'linhas', grupo: 'programa', rotulo: 'Linhas de Pesquisa', sub: 'linhas-de-pesquisa', modulo: 'linhas' },
  { chave: 'comissoes', grupo: 'programa', rotulo: 'Comissões', sub: 'comissoes', modulo: 'comissoes' },
  { chave: 'disciplinas', grupo: 'programa', rotulo: 'Disciplinas', sub: 'disciplinas', modulo: 'disciplinas' },
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

const temConteudo = (entrada, modulos) =>
  !!entrada.sempre || (!!entrada.modulo && (modulos[entrada.modulo] ?? 0) > 0);

// Monta o menu do programa. Devolve só o visível: grupo sem nenhum item
// visível não aparece.
//   modulos — contagem de conteúdo publicado por módulo;
//   paginas — páginas criadas pelo programa ({ id, title, slug }), já
//             filtradas pelo que quem lê pode ver.
// Saída: [{ chave, rotulo, icone, sub }] para links e
//        [{ chave, rotulo, icone, itens: [{ chave, rotulo, sub }] }] para grupos.
export function montarMenu({ modulos = {}, paginas = [] } = {}) {
  const itensPorGrupo = new Map(TOPO.filter((t) => t.grupo).map((t) => [t.chave, []]));
  for (const item of ITENS) {
    if (!temConteudo(item, modulos)) continue;
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
    } else if (temConteudo(t, modulos)) {
      menu.push({ chave: t.chave, rotulo: t.rotulo, icone: t.icone, sub: t.sub });
    }
  }
  return menu;
}
