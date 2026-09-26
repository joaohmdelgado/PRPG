// Metadados de SEO por rota (Fase P.4 de docs/revisao-portal-conteudo-2026-09-24.md,
// decisão D-R4: injeção pelo servidor agora, SSR completo só se a Fase H
// mostrar que precisa).
//
// O site é uma SPA: sem isto, o buscador e a pré-visualização de link (WhatsApp,
// LinkedIn) só enxergam o <title> genérico do index.html. Aqui cada endereço
// público é resolvido para título, descrição, canonical, imagem, JSON-LD e
// situação HTTP (uma notícia que não existe responde 404 de verdade, e não uma
// página "não encontrada" com status 200), a partir do banco.
//
// As rotas espelham src/App.jsx. Endereços conhecidos do front que este módulo
// não reconhece caem em 404 + noindex.
import * as db from './dados.js';
import { absoluta, imagemAbsoluta, preloadDeImagem, semIndexar } from './site.js';
import { resumir, semHtml } from './texto.js';

export const NOME_SITE = 'PRPG UFRPE';
export const NOME_COMPLETO = 'Pró-Reitoria de Pós-Graduação da UFRPE';
const TITULO_HOME = 'PRPG UFRPE — Pró-Reitoria de Pós-Graduação';
const DESCRICAO_PADRAO = 'Portal da Pró-Reitoria de Pós-Graduação da Universidade Federal Rural de Pernambuco: programas de mestrado e doutorado, editais, resoluções, formulários e notícias.';

// Páginas institucionais com endereço próprio (/sobre, /historico…): as
// mesmas de src/App.jsx (um teste confere que as duas listas não divergem).
export const PAGINAS_ROTEADAS = [
  'sobre', 'missao-visao-valores', 'historico', 'financeiro', 'proext-pg', 'relatorios-autoavaliacao',
  'especializacao', 'residencia-profissional', 'sobre-internacionalizacao', 'alunos-estrangeiros',
  'capes-print', 'mobilidade-estudantil', 'reconhecimento', 'privacidade',
];

// Rotas fixas: [título, descrição]. Os textos são os mesmos do cabeçalho de cada página.
const FIXAS = {
  '/programas': ['Programas de Pós-graduação Stricto Sensu', 'Conheça nossos mestrados e doutorados oferecidos nas diversas unidades da UFRPE.'],
  '/calendario-academico': ['Calendário Acadêmico', 'Acompanhe prazos, períodos de matrícula, início de aulas e demais eventos da Pós-Graduação.'],
  '/editais': ['Painel de Editais', 'Editais, processos seletivos e chamadas públicas da Pró-Reitoria de Pós-Graduação e dos programas.'],
  '/resolucoes': ['Resoluções e Legislações', 'Consulte aqui as resoluções, portarias e normas referentes à Pró-Reitoria de Pós-Graduação.'],
  '/formularios': ['Formulários', 'Consulte e baixe os formulários necessários para os processos da Pró-Reitoria de Pós-Graduação.'],
  '/noticias': ['Histórico de Notícias', 'Acompanhe todas as novidades, eventos e comunicados da Pró-Reitoria de Pós-Graduação.'],
  '/teses': ['Teses e Dissertações', 'Trabalhos defendidos nos programas de pós-graduação da UFRPE.'],
  '/equipe': ['Equipe PRPG', 'Conheça os profissionais dedicados ao desenvolvimento e excelência da Pós-Graduação na UFRPE.'],
  '/estrutura-organizacional': ['Estrutura Organizacional', 'Conheça a organização administrativa e acadêmica da Pró-Reitoria de Pós-Graduação da UFRPE.'],
  '/proficiencia/inscricao': ['Inscrição — Proficiência em Línguas', 'Inscreva-se no exame de proficiência em línguas dos programas de pós-graduação da UFRPE.'],
};

// Subpáginas do microsite de um programa (src/pages/programa/ProgramaSite.jsx).
const SUBPAGINAS = {
  sobre: 'Sobre', noticias: 'Notícias', editais: 'Editais', busca: 'Busca', comissoes: 'Comissões',
  discentes: 'Discentes', egressos: 'Egressos', 'linhas-de-pesquisa': 'Linhas de Pesquisa', pessoas: 'Docentes',
  disciplinas: 'Disciplinas', teses: 'Teses e Dissertações', faq: 'Perguntas Frequentes',
  'grupos-pesquisa': 'Grupos de Pesquisa', documentos: 'Documentos', contato: 'Contato',
};

// Áreas que nunca devem ser indexadas: restritas, com dado pessoal ou sem
// conteúdo próprio (resultado de busca, "inscrição enviada").
const RESTRITAS = [
  [/^\/(admin|entrar|minha-conta)(\/|$)/, 'Área restrita'],
  [/^\/verificar\//, 'Verificação de declaração'],
  [/^\/declaracoes\//, 'Verificação de declaração'],
  [/^\/proficiencia\/inscricao\/sucesso$/, 'Inscrição enviada'],
  [/^\/busca$/, 'Buscar no portal'],
];

const tituloDaPagina = (t) => `${t} | ${NOME_SITE}`;
const primeiroTexto = (...opcoes) => opcoes.find((o) => o && String(o).trim());

const migalhas = (itens) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: itens.map(([nome, caminho], i) => ({
    '@type': 'ListItem', position: i + 1, name: nome, item: absoluta(caminho),
  })),
});

const organizacao = (cfg) => {
  const logo = imagemAbsoluta(cfg.identidade?.logo, 480);
  const contato = cfg.contato || {};
  return {
    '@type': 'Organization',
    '@id': absoluta('/#organizacao'),
    name: NOME_COMPLETO,
    alternateName: 'PRPG',
    url: absoluta('/'),
    ...(logo ? { logo } : {}),
    parentOrganization: { '@type': 'CollegeOrUniversity', name: 'Universidade Federal Rural de Pernambuco', alternateName: 'UFRPE' },
    ...(contato.email || contato.telefone
      ? { contactPoint: { '@type': 'ContactPoint', contactType: 'secretaria', ...(contato.email ? { email: contato.email } : {}), ...(contato.telefone ? { telephone: contato.telefone } : {}), availableLanguage: 'pt-BR' } }
      : {}),
  };
};

const naoEncontrada = () => ({ status: 404, titulo: 'Página não encontrada', descricao: 'O endereço acessado não existe no portal da PRPG.', noindex: true });
const restrita = (titulo) => ({ status: 200, titulo, noindex: true });

// Campos comuns de uma página indexável.
const pagina = (caminho, dados) => ({ status: 200, canonical: absoluta(caminho), tipo: 'website', ...dados });

async function home(cfg) {
  const h = cfg.home || {};
  const descricao = primeiroTexto(cfg.seo?.descricao, h.texto, DESCRICAO_PADRAO);
  const imagem = primeiroTexto(cfg.seo?.imagem, h.imagem, cfg.identidade?.logo);
  return pagina('/', {
    titulo: TITULO_HOME,
    tituloCompleto: true,
    descricao: resumir(descricao),
    imagem: imagemAbsoluta(imagem),
    preload: preloadDeImagem(h.imagem, '100vw'),
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: NOME_SITE, url: absoluta('/'), inLanguage: 'pt-BR', publisher: { '@id': absoluta('/#organizacao') } },
      { '@context': 'https://schema.org', ...organizacao(cfg) },
    ],
  });
}

async function paginaGeral(slug, cfg, caminhoCanonico) {
  const p = await db.pagina(slug, null);
  if (!p || !p.publico) return naoEncontrada();
  const descricao = primeiroTexto(semHtml(p.body_summary), p.body_value) || '';
  return pagina(caminhoCanonico, {
    titulo: tituloDaPagina(p.title),
    descricao: resumir(descricao) || DESCRICAO_PADRAO,
    imagem: imagemAbsoluta(primeiroTexto(cfg.seo?.imagem, cfg.home?.imagem)),
    modificadoEm: p.atualizado_em,
    jsonld: [migalhas([['Início', '/'], [p.title, caminhoCanonico]])],
  });
}

// A notícia tem um endereço canônico só: o do microsite do programa quando ele
// está no ar, senão o do portal (as duas rotas mostram o mesmo texto).
async function caminhoDaNoticia(n) {
  if (!n.programa_id) return `/noticia/${n.id}`;
  const prog = await db.programaPorId(n.programa_id);
  return prog?.slug && prog.microsite_ativo ? `/${prog.slug}/noticias/${n.id}` : `/noticia/${n.id}`;
}

const dataIso = (d) => (d instanceof Date ? d.toISOString() : d ? String(d) : undefined);

async function noticiaMeta(id, cfg, trilhaBase) {
  const n = await db.noticia(id);
  if (!n || !n.publico) return naoEncontrada();
  const canonico = await caminhoDaNoticia(n);
  const imagem = imagemAbsoluta(n.image) || imagemAbsoluta(primeiroTexto(cfg.seo?.imagem, cfg.home?.imagem));
  const publicado = dataIso(n.publicado_em) || n.date || undefined;
  const autor = n.author && !/ascom|prpg|ufrpe|assessoria/i.test(n.author)
    ? { '@type': 'Person', name: n.author }
    : { '@type': 'Organization', name: n.author || NOME_COMPLETO };
  const org = organizacao(cfg);
  return pagina(canonico, {
    titulo: tituloDaPagina(n.title),
    descricao: resumir(n.excerpt) || DESCRICAO_PADRAO,
    imagem,
    imagemAlt: n.imagem_alt || n.title,
    tipo: 'article',
    publicadoEm: publicado,
    modificadoEm: dataIso(n.atualizado_em),
    preload: preloadDeImagem(n.image, '(min-width: 1024px) 1024px, 100vw'),
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: String(n.title).slice(0, 110),
        ...(n.excerpt ? { description: resumir(n.excerpt, 300) } : {}),
        ...(imagem ? { image: [imagem] } : {}),
        ...(publicado ? { datePublished: publicado } : {}),
        dateModified: dataIso(n.atualizado_em) || publicado,
        author: autor,
        publisher: { '@type': 'Organization', name: org.name, url: org.url, ...(org.logo ? { logo: { '@type': 'ImageObject', url: org.logo } } : {}) },
        mainEntityOfPage: { '@type': 'WebPage', '@id': absoluta(canonico) },
        inLanguage: 'pt-BR',
      },
      migalhas([...trilhaBase, [n.title, canonico]]),
    ],
  });
}

async function editalMeta(id, cfg) {
  const e = await db.edital(id);
  if (!e || !e.publico) return naoEncontrada();
  const caminho = `/editais/${e.id}`;
  return pagina(caminho, {
    titulo: tituloDaPagina(e.title),
    descricao: resumir(e.description) || FIXAS['/editais'][1],
    imagem: imagemAbsoluta(primeiroTexto(cfg.seo?.imagem, cfg.home?.imagem)),
    modificadoEm: dataIso(e.atualizado_em),
    jsonld: [migalhas([['Início', '/'], ['Editais', '/editais'], [e.title, caminho]])],
  });
}

async function programaAutomatica(slug, cfg) {
  const prog = await db.programaPorSlug(slug);
  if (!prog) return naoEncontrada();
  const caminho = `/programas/${prog.slug}`;
  return pagina(caminho, {
    titulo: tituloDaPagina(nomeDoPrograma(prog)),
    descricao: resumir(primeiroTexto(prog.descricao_curta, prog.area_conhecimento && `Programa de Pós-Graduação em ${prog.nome} da UFRPE. Área: ${prog.area_conhecimento}.`, `Programa de Pós-Graduação ${prog.nome} da UFRPE.`)),
    imagem: imagemAbsoluta(primeiroTexto(prog.logo_url, prog.hero_imagem_url, cfg.seo?.imagem, cfg.home?.imagem)),
    modificadoEm: dataIso(prog.atualizado_em),
    jsonld: [migalhas([['Início', '/'], ['Programas', '/programas'], [prog.nome, caminho]])],
  });
}

const nomeDoPrograma = (prog) => `${prog.sigla && prog.sigla !== 'S/SIGLA' ? `${prog.sigla} — ` : ''}${prog.nome}`;

async function micrositeMeta(prog, resto, cfg) {
  const base = `/${prog.slug}`;
  const imagemPadrao = imagemAbsoluta(primeiroTexto(prog.hero_imagem_url, prog.logo_url, cfg.seo?.imagem, cfg.home?.imagem));
  const trilhaProg = [['PRPG', '/'], [prog.nome, base]];

  if (resto.length === 0) {
    return pagina(base, {
      titulo: tituloDaPagina(nomeDoPrograma(prog)),
      descricao: resumir(primeiroTexto(prog.descricao_curta, `Programa de Pós-Graduação ${prog.nome} da UFRPE.`)),
      imagem: imagemPadrao,
      modificadoEm: dataIso(prog.atualizado_em),
      jsonld: [migalhas(trilhaProg)],
    });
  }
  const [sub, id, ...sobra] = resto;
  if (sobra.length > 0) return naoEncontrada();

  if (sub === 'noticias' && id) {
    return noticiaMeta(id, cfg, [...trilhaProg, ['Notícias', `${base}/noticias`]]);
  }
  if (id) return naoEncontrada();

  if (Object.hasOwn(SUBPAGINAS, sub)) {
    const rotulo = SUBPAGINAS[sub];
    const caminho = `${base}/${sub}`;
    // "Sobre" é uma página fixa do programa: o texto dela descreve melhor que o resumo do programa.
    const fixa = sub === 'sobre' ? await db.pagina(sub, prog.id) : null;
    const textoFixa = fixa?.publico ? primeiroTexto(semHtml(fixa.body_summary), fixa.body_value) : null;
    return pagina(caminho, {
      titulo: tituloDaPagina(`${rotulo} — ${prog.nome}`),
      descricao: resumir(primeiroTexto(textoFixa, prog.descricao_curta, `${rotulo} do programa de Pós-Graduação ${prog.nome} da UFRPE.`)),
      imagem: imagemPadrao,
      noindex: sub === 'busca',
      jsonld: [migalhas([...trilhaProg, [rotulo, caminho]])],
    });
  }

  const p = await db.pagina(sub, prog.id);
  if (!p || !p.publico || !semHtml(p.body_value)) return naoEncontrada();
  const caminho = `${base}/${sub}`;
  return pagina(caminho, {
    titulo: tituloDaPagina(`${p.title} — ${prog.nome}`),
    descricao: resumir(primeiroTexto(semHtml(p.body_summary), p.body_value)) || DESCRICAO_PADRAO,
    imagem: imagemPadrao,
    modificadoEm: dataIso(p.atualizado_em),
    jsonld: [migalhas([...trilhaProg, [p.title, caminho]])],
  });
}

const normalizar = (pathname) => {
  let p = String(pathname || '/');
  try { p = decodeURIComponent(p); } catch { /* endereço malformado: segue como veio */ }
  p = p.replace(/\/{2,}/g, '/');
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
};

// Resolve o que o servidor sabe sobre o endereço. Nunca lança por dado ruim:
// erro de banco sobe para quem chamou, que serve o HTML sem metadados.
export async function resolverMetadados(pathname) {
  const caminho = normalizar(pathname);
  const meta = await resolver(caminho);
  // Homologação/pré-lançamento: nada é indexado.
  if (semIndexar()) meta.noindex = true;
  return meta;
}

async function resolver(caminho) {
  for (const [regex, titulo] of RESTRITAS) if (regex.test(caminho)) return restrita(titulo);

  const cfg = await db.configuracoes();
  if (caminho === '/') return home(cfg);
  if (FIXAS[caminho]) {
    const [titulo, descricao] = FIXAS[caminho];
    return pagina(caminho, {
      titulo: tituloDaPagina(titulo),
      descricao,
      imagem: imagemAbsoluta(primeiroTexto(cfg.seo?.imagem, cfg.home?.imagem)),
      jsonld: [migalhas([['Início', '/'], [titulo, caminho]])],
    });
  }

  const partes = caminho.split('/').filter(Boolean);
  const [primeiro, segundo, ...resto] = partes;

  // Endereços do portal com formato próprio.
  if (partes.length === 1 && PAGINAS_ROTEADAS.includes(primeiro)) return paginaGeral(primeiro, cfg, caminho);
  if (primeiro === 'noticia' && segundo && resto.length === 0) return noticiaMeta(segundo, cfg, [['Início', '/'], ['Notícias', '/noticias']]);
  if (primeiro === 'editais' && segundo && resto.length === 0) return editalMeta(segundo, cfg);
  if (primeiro === 'programas' && segundo && resto.length === 0) return programaAutomatica(segundo, cfg);
  if (primeiro === 'p' && segundo && resto.length === 0) return paginaGeral(segundo, cfg, caminho);

  // /<slug>/...: microsite de programa ou página geral com endereço próprio
  // (mesma ordem de resolução de src/pages/programa/ProgramaSite.jsx).
  const prog = await db.programaPorSlug(primeiro);
  if (prog) {
    // Microsite fora do ar: o destino é a página automática do programa.
    if (!prog.microsite_ativo) return { status: 302, redirect: `/programas/${prog.slug}` };
    return micrositeMeta(prog, partes.slice(1), cfg);
  }
  if (partes.length === 1) return paginaGeral(primeiro, cfg, caminho);
  return naoEncontrada();
}
