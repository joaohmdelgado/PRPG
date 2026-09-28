// Entrega da SPA com metadados (Fase P.4): robots.txt, sitemap.xml, os arquivos
// do build (dist/) e o index.html com título, descrição, canonical, Open Graph
// e JSON-LD de cada endereço, montados a partir do banco.
//
// Ligado quando existe o build: SPA_DIST_DIR (padrão: <projeto>/dist) com um
// index.html — `npm run build` e pronto. Em desenvolvimento o Vite serve o
// site e nada disto responde (só robots.txt e sitemap.xml, que não dependem do
// build). Em produção o servidor pode ser a origem única do site, ou o proxy
// reverso manda para cá as páginas HTML e serve os arquivos estáticos sozinho.
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolverMetadados } from './metadados.js';
import { dadosDoPortal } from './dados.js';
import { injetarMetadados } from './html.js';
import { gerarSitemap, gerarRobots } from './sitemap.js';
import { semIndexar } from './site.js';
import { logUnexpectedError } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dirDist = () => process.env.SPA_DIST_DIR || path.join(__dirname, '../../dist');

// Nada de app aqui: são áreas do servidor (a API já respondeu antes, e o que
// sobrar em /api ou /uploads é 404 de verdade).
const RESERVADOS = /^\/(api|uploads|private-uploads)(\/|$)/;
const ARQUIVO = /\.(js|mjs|css|map|json|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|txt|xml|pdf|webmanifest)$/i;

// O HTML é servido com uma política própria: a da API (helmet) é default-src
// 'none', que impediria a página de carregar qualquer coisa. Esta só trava o
// que importa contra XSS — scripts só do próprio site, sem plugins nem <base>
// e sem ser embutida em outro site — e deixa imagens, fontes e mapas como estão
// (endurecimento completo fica para a Task 12 do plano de prontidão).
const CSP_SPA = "script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'";

// index.html do build, relido só quando o arquivo muda.
let shell = { dir: null, mtime: 0, html: null };
async function lerShell(dir) {
  const arquivo = path.join(dir, 'index.html');
  const { mtimeMs } = await fs.stat(arquivo);
  if (shell.dir !== dir || shell.mtime !== mtimeMs) shell = { dir, mtime: mtimeMs, html: await fs.readFile(arquivo, 'utf8'), };
  return shell.html;
}

// Metadados por endereço ficam 30 s em memória: um rastreador que pede
// centenas de páginas não vira centenas de consultas repetidas, e uma edição
// no painel aparece em segundos.
const TTL_META_MS = 30_000;
const MAX_META = 500;
const cacheMeta = new Map();
async function metadadosDe(caminho) {
  const agora = Date.now();
  const guardado = cacheMeta.get(caminho);
  if (guardado && guardado.ate > agora) return guardado.meta;
  const meta = await resolverMetadados(caminho);
  if (cacheMeta.size >= MAX_META) cacheMeta.delete(cacheMeta.keys().next().value);
  cacheMeta.set(caminho, { meta, ate: agora + TTL_META_MS });
  return meta;
}
export const limparCacheSeo = () => { cacheMeta.clear(); textoEmCache.clear(); portalEmCache = null; };

// Menus e configurações embutidos no HTML: 30 s em memória, como os metadados.
let portalEmCache = null;
async function portalDe() {
  if (portalEmCache && portalEmCache.ate > Date.now()) return portalEmCache.valor;
  const valor = await dadosDoPortal();
  portalEmCache = { valor, ate: Date.now() + TTL_META_MS };
  return valor;
}

// robots.txt e sitemap.xml: 10 min em memória, 1 h para navegador/CDN.
const textoEmCache = new Map();
async function comCache(chave, gerar, ttl = 600_000) {
  const g = textoEmCache.get(chave);
  if (g && g.ate > Date.now()) return g.valor;
  const valor = await gerar();
  textoEmCache.set(chave, { valor, ate: Date.now() + ttl });
  return valor;
}

export function criarRotasSpa() {
  const router = express.Router();

  router.get('/robots.txt', (req, res) => {
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(gerarRobots());
  });

  router.get('/sitemap.xml', async (req, res, next) => {
    try {
      const xml = await comCache('sitemap', gerarSitemap);
      res.type('application/xml').set('Cache-Control', 'public, max-age=3600');
      if (semIndexar()) res.set('X-Robots-Tag', 'noindex');
      res.send(xml);
    } catch (e) { next(e); }
  });

  // Arquivos do build. Os de /assets têm hash no nome: cache de um ano.
  const estaticos = new Map();
  router.use(async (req, res, next) => {
    // index.html cru não sai daqui: cai no tratamento do HTML (redireciona para a raiz).
    if ((req.method !== 'GET' && req.method !== 'HEAD') || RESERVADOS.test(req.path) || req.path === '/index.html') return next();
    const dir = dirDist();
    let handler = estaticos.get(dir);
    if (!handler) {
      handler = express.static(dir, {
        index: false,
        redirect: false,
        setHeaders: (res2, arquivo) => {
          res2.setHeader('X-Content-Type-Options', 'nosniff');
          res2.setHeader('Cache-Control', arquivo.includes(`${path.sep}assets${path.sep}`)
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=3600');
        },
      });
      estaticos.set(dir, handler);
    }
    return handler(req, res, next);
  });

  // Qualquer outro endereço: o index.html com os metadados dele.
  router.get('*', async (req, res, next) => {
    if (RESERVADOS.test(req.path)) return next();
    // Arquivo que não existe (script/estilo/imagem antigos em cache): 404 simples,
    // não uma página HTML no lugar de um .js.
    if (ARQUIVO.test(req.path)) return res.status(404).type('text/plain').send('Não encontrado');
    let html;
    try {
      html = await lerShell(dirDist());
    } catch {
      return next(); // sem build (desenvolvimento): nada a servir aqui
    }
    if (req.path === '/index.html') return res.redirect(301, '/');

    let meta = null;
    try {
      meta = await metadadosDe(req.path);
    } catch (e) {
      // Falha ao consultar o banco não pode tirar o site do ar: serve o HTML sem metadados.
      logUnexpectedError({ requestId: req.requestId, error: e });
    }
    if (meta?.status === 302) return res.redirect(302, meta.redirect);

    // Menus e configurações no HTML (não vale a pena na área restrita, que nem os usa).
    let portal = null;
    if (meta && !meta.restrita) {
      try { portal = await portalDe(); } catch (e) { logUnexpectedError({ requestId: req.requestId, error: e }); }
    }

    res.status(meta?.status || 200);
    res.setHeader('Content-Security-Policy', CSP_SPA);
    res.setHeader('Cache-Control', meta?.status === 404 ? 'no-cache' : 'public, max-age=0, must-revalidate');
    if (meta?.noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.type('html').send(meta ? injetarMetadados(html, meta, portal) : html);
  });

  return router;
}
