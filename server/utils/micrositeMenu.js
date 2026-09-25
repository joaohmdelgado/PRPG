import { estaPublicado } from './publicacao.js';

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

export const GRUPOS = TOPO.filter((t) => t.grupo).map((t) => t.chave);
export const ROTULO_MAX = 60;
// Início é a âncora do menu: pode mudar de nome, mas não some nem sai do topo.
const FIXO_NO_TOPO = 'inicio';

// Ajustes por programa (Fase S.3 — tabela programa_menu_itens): só as
// diferenças em relação ao modelo. `rotulo`/`grupo`/`ordem` nulos = padrão.
// Uma chave sem ajuste (ex.: página criada depois do último ajuste) fica
// na posição padrão — páginas novas, no fim de "O Programa".
//
// Monta o menu do programa.
//   modulos — contagem de conteúdo publicado por módulo;
//   paginas — páginas criadas pelo programa ({ id, title, slug }), já
//             filtradas pelo que quem lê pode ver;
//   paginasFixas — chaves das páginas fixas visíveis e com texto;
//   ajustes — linhas de programa_menu_itens;
//   todos — true para o editor do painel: devolve também o que está oculto ou
//           sem conteúdo, com os campos de edição (rotuloPadrao, grupoPadrao,
//           oculto, temConteudo, tipo).
// Saída pública (todos=false): só o visível; grupo sem item visível some.
//   [{ chave, rotulo, icone, sub }] para links e
//   [{ chave, rotulo, icone, itens: [{ chave, rotulo, sub }] }] para grupos.
export function montarMenu({ modulos = {}, paginas = [], paginasFixas = [], ajustes = [], todos = false } = {}) {
  const fixasComTexto = new Set(paginasFixas);
  const ajuste = new Map(ajustes.map((a) => [a.chave, a]));
  const rotuloDe = (e, padrao) => ajuste.get(e)?.rotulo || padrao;
  const ocultoDe = (e) => e !== FIXO_NO_TOPO && !!ajuste.get(e)?.oculto;
  const ordemDe = (e, padrao) => {
    const o = ajuste.get(e)?.ordem;
    return Number.isInteger(o) ? o : padrao;
  };

  // Itens (segundo nível), com o grupo efetivo e a chave de ordenação.
  const itens = [
    ...ITENS.map((it, i) => ({
      chave: it.chave, rotuloPadrao: it.rotulo, sub: it.sub, grupoPadrao: it.grupo,
      tipo: it.pagina ? 'pagina-fixa' : it.modulo ? 'modulo' : 'fixo',
      temConteudo: temConteudo(it, modulos, fixasComTexto), padrao: i,
    })),
    ...paginas.map((p, i) => ({
      chave: `pagina:${p.id}`, rotuloPadrao: p.title, sub: p.slug, grupoPadrao: 'programa',
      tipo: 'pagina', temConteudo: true, padrao: 1000 + i,
    })),
  ].map((it) => {
    const grupo = GRUPOS.includes(ajuste.get(it.chave)?.grupo) ? ajuste.get(it.chave).grupo : it.grupoPadrao;
    return {
      ...it, grupo, rotulo: rotuloDe(it.chave, it.rotuloPadrao), oculto: ocultoDe(it.chave),
      ordem: ordemDe(it.chave, it.padrao),
    };
  });
  const porOrdem = (a, b) => a.ordem - b.ordem || a.padrao - b.padrao;

  const topo = TOPO.map((t, i) => ({ ...t, padrao: i, ordem: t.chave === FIXO_NO_TOPO ? -1 : ordemDe(t.chave, i) }))
    .sort(porOrdem);

  const menu = [];
  for (const t of topo) {
    const base = { chave: t.chave, rotulo: rotuloDe(t.chave, t.rotulo), icone: t.icone };
    const extra = todos ? { rotuloPadrao: t.rotulo, oculto: ocultoDe(t.chave) } : {};
    if (t.grupo) {
      const doGrupo = itens.filter((it) => it.grupo === t.chave).sort(porOrdem);
      if (todos) {
        menu.push({
          ...base, ...extra, tipo: 'grupo',
          itens: doGrupo.map(({ chave, rotulo, rotuloPadrao, sub, grupo, grupoPadrao, tipo, temConteudo: tc, oculto }) =>
            ({ chave, rotulo, rotuloPadrao, sub, grupo, grupoPadrao, tipo, temConteudo: tc, oculto })),
        });
        continue;
      }
      if (ocultoDe(t.chave)) continue;
      const visiveis = doGrupo.filter((it) => it.temConteudo && !it.oculto)
        .map(({ chave, rotulo, sub }) => ({ chave, rotulo, sub }));
      if (visiveis.length) menu.push({ ...base, itens: visiveis });
    } else if (todos) {
      menu.push({ ...base, ...extra, sub: t.sub, tipo: 'link', fixo: t.chave === FIXO_NO_TOPO,
        temConteudo: temConteudo(t, modulos, fixasComTexto) });
    } else if (temConteudo(t, modulos, fixasComTexto) && !ocultoDe(t.chave)) {
      menu.push({ ...base, sub: t.sub });
    }
  }
  return menu;
}

// Valida o que o editor do painel manda (PUT /programas/:id/menu) e devolve
// as linhas a gravar, só com o que difere do padrão. `paginaIds` = ids das
// páginas criadas pelo programa (únicas chaves "pagina:<id>" aceitas).
// Lança Error com mensagem para o usuário quando algo não confere.
export function validarAjustes(entrada, paginaIds = []) {
  if (!Array.isArray(entrada)) throw new Error('Envie a lista de itens do menu.');
  const padraoTopo = new Map(TOPO.map((t) => [t.chave, t]));
  const padraoItem = new Map(ITENS.map((it) => [it.chave, it]));
  const paginas = new Set(paginaIds.map((id) => `pagina:${id}`));
  const vistos = new Set();
  const linhas = [];
  for (const e of entrada) {
    const chave = typeof e?.chave === 'string' ? e.chave : '';
    const noTopo = padraoTopo.get(chave);
    const item = padraoItem.get(chave);
    if (!noTopo && !item && !paginas.has(chave)) throw new Error(`Item de menu desconhecido: ${chave || '(vazio)'}.`);
    if (vistos.has(chave)) throw new Error(`Item repetido no menu: ${chave}.`);
    vistos.add(chave);

    const rotulo = typeof e.rotulo === 'string' ? e.rotulo.trim() : '';
    if (rotulo.length > ROTULO_MAX) throw new Error(`O nome "${rotulo.slice(0, 20)}…" passa de ${ROTULO_MAX} caracteres.`);
    let grupo = e.grupo ?? null;
    if (grupo !== null && (noTopo || !GRUPOS.includes(grupo))) throw new Error(`Grupo inválido para ${chave}.`);
    const ordem = e.ordem ?? null;
    if (ordem !== null && !(Number.isInteger(ordem) && ordem >= 0 && ordem < 10000)) throw new Error(`Ordem inválida para ${chave}.`);
    const oculto = e.oculto === true && chave !== FIXO_NO_TOPO;

    const rotuloPadrao = noTopo?.rotulo ?? item?.rotulo;
    const grupoPadrao = noTopo ? null : (item?.grupo ?? 'programa');
    if (grupo === grupoPadrao) grupo = null;
    linhas.push({
      chave,
      rotulo: rotulo && rotulo !== rotuloPadrao ? rotulo : null,
      grupo,
      ordem,
      oculto,
    });
  }
  return linhas;
}

// Checklist de publicação do microsite (Fase S.4): o mínimo para o site de um
// programa não sair vazio. Cada item diz onde se resolve no painel
// (`onde`: 'programa' = formulário do programa; 'sobre' = página fixa Sobre;
// 'linhas' = linhas de pesquisa do programa).
//   programa — linha de `programas`;
//   sobre — página fixa "Sobre" (ou null);
//   temCoordenacao — há vínculo ativo COORDENADOR_ATUAL;
//   linhas — quantidade de linhas de pesquisa.
export function checklistPublicacao({ programa, sobre, temCoordenacao, linhas }) {
  const preenchido = (v) => typeof v === 'string' && v.trim() !== '';
  const itens = [
    { chave: 'logo', rotulo: 'Logo', ok: preenchido(programa.logo_url), onde: 'programa',
      dica: 'Envie a logo em "Identidade Visual".' },
    { chave: 'cores', rotulo: 'Cores', ok: preenchido(programa.cor_primaria) && preenchido(programa.cor_secundaria), onde: 'programa',
      dica: 'Escolha a cor primária e a de destaque (sem elas o site usa o azul e o amarelo da PRPG).' },
    { chave: 'descricao', rotulo: 'Descrição curta', ok: preenchido(programa.descricao_curta), onde: 'programa',
      dica: 'Uma frase que resume o programa — aparece no topo e no rodapé.' },
    { chave: 'sobre', rotulo: 'Página "Sobre"', ok: !!sobre && estaPublicado(sobre) && temTexto(sobre.body?.value), onde: 'sobre',
      dica: 'Escreva e publique a página "Sobre o Programa".' },
    { chave: 'coordenacao', rotulo: 'Coordenação', ok: !!temCoordenacao, onde: 'programa',
      dica: 'Informe quem coordena o programa.' },
    { chave: 'contatos', rotulo: 'Contatos', ok: preenchido(programa.email_programa) || preenchido(programa.telefone_secretaria), onde: 'programa',
      dica: 'E-mail ou telefone da secretaria.' },
    { chave: 'linhas', rotulo: 'Linhas de pesquisa', ok: linhas > 0, onde: 'linhas',
      dica: 'Cadastre ao menos uma linha de pesquisa.' },
  ];
  const feitos = itens.filter((i) => i.ok).length;
  return { itens, feitos, total: itens.length, percentual: Math.round((feitos / itens.length) * 100) };
}
