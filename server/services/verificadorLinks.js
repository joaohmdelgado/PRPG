// Fase O.7: verificador periódico de links (painel de qualidade de dados).
//
// Junta as URLs em uso no conteúdo (colunas de link e HTML de notícias,
// páginas e FAQ), confere cada URL distinta uma vez e grava o resultado em
// `links_verificados`:
//   - /uploads/... : o arquivo existe no disco do servidor;
//   - http(s)      : HEAD (e GET se o servidor rejeitar HEAD), redirecionamentos
//                    seguidos à mão (máx. 5), timeout de 10 s;
//   - resto (rotas do site, mailto:, tel:, #) : ignorado.
// QUEBRADO = 404/410, arquivo ausente, host que não existe / recusa conexão.
// INCERTO  = 401/403/429/5xx e timeout: pode ser bloqueio a robô ou queda
// momentânea — aparece separado no painel para conferência humana.
//
// SSRF: o conteúdo é editável por muitos usuários; o servidor só busca hosts
// que resolvem para endereço público (nem loopback, rede privada ou
// link-local), e revalida cada redirecionamento.
import dns from 'dns/promises';
import fs from 'fs/promises';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_UPLOADS = () => process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

// tabela, coluna, tipo ('url' | 'html'), rótulo do campo, rota de edição, filtro SQL extra.
const FONTES = [
  { tabela: 'news', colunas: [['image', 'url', 'imagem de capa'], ['content', 'html', 'texto']], titulo: 'title', editar: '/admin/noticias/editar/' },
  { tabela: 'pages', colunas: [['body_value', 'html', 'texto']], titulo: 'title', editar: '/admin/paginas/editar/' },
  { tabela: 'faq', colunas: [['resposta', 'html', 'resposta']], titulo: 'title', editar: '/admin/faq/editar/' },
  { tabela: 'editais', colunas: [['details_link', 'url', 'link de detalhes'], ['download_link', 'url', 'link de download']], titulo: 'title', editar: '/admin/editais/editar/' },
  { tabela: 'resolucoes', colunas: [['link', 'url', 'link']], titulo: 'title', editar: '/admin/resolucoes/editar/' },
  { tabela: 'formularios', colunas: [['link', 'url', 'link']], titulo: 'title', editar: '/admin/formularios/editar/' },
  { tabela: 'calendarios', colunas: [['pdf_link', 'url', 'PDF']], titulo: 'title', editar: '/admin/calendarios/editar/' },
  { tabela: 'disciplinas', colunas: [['ementa_url', 'url', 'ementa']], titulo: 'title', editar: '/admin/disciplinas/editar/' },
  { tabela: 'teses_dissertacoes', colunas: [['arquivo_url', 'url', 'arquivo']], titulo: 'title', editar: '/admin/teses-dissertacoes/editar/' },
  { tabela: 'programas', colunas: [['logo_url', 'url', 'logo'], ['hero_imagem_url', 'url', 'imagem de capa'], ['regimento_url', 'url', 'regimento'],
    ['regulamento_url', 'url', 'regulamento'], ['sucupira_url', 'url', 'Sucupira'], ['facebook_url', 'url', 'Facebook'],
    ['instagram_url', 'url', 'Instagram'], ['youtube_url', 'url', 'YouTube']], titulo: 'nome', editar: '/admin/programas/editar/' },
  { tabela: 'menu_itens', colunas: [['destino', 'url', 'destino do menu'], ['imagem', 'url', 'imagem']], titulo: 'rotulo', editar: '/admin/portal?item=' },
  { tabela: 'atos', colunas: [['link_externo', 'url', 'link de publicação']], titulo: 'assunto', editar: '/admin/atos/' },
];

// Extrai href/src de um trecho de HTML.
export const linksDoHtml = (html) => {
  const out = [];
  for (const m of String(html || '').matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) out.push(m[1].replace(/&amp;/g, '&').trim());
  return out;
};

// Só interessa: http(s) e /uploads/. Rotas do site, âncoras, mailto etc. ficam de fora.
export const normalizarUrl = (u) => {
  const s = String(u || '').trim();
  if (/^https?:\/\//i.test(s)) return s.replace(/#.*$/, '');
  if (/^\/uploads\//.test(s)) return s.replace(/[?#].*$/, '');
  return null;
};

export async function coletarUsos() {
  const mapa = new Map(); // url -> usos[]
  const add = (url, uso) => {
    const u = normalizarUrl(url);
    if (!u) return;
    if (!mapa.has(u)) mapa.set(u, []);
    const l = mapa.get(u);
    if (l.length < 20 && !l.some((x) => x.id === uso.id && x.campo === uso.campo)) l.push(uso);
  };
  for (const f of FONTES) {
    const cols = f.colunas.map(([c]) => c).join(', ');
    const temStatus = ['news', 'pages', 'faq', 'editais', 'resolucoes', 'formularios', 'calendarios', 'disciplinas', 'teses_dissertacoes'].includes(f.tabela);
    const { rows } = await query(`SELECT id, ${f.titulo} AS titulo, ${cols} FROM ${f.tabela}${temStatus ? " WHERE status <> 'ARQUIVADO'" : ''}`);
    for (const r of rows) {
      for (const [col, tipo, campo] of f.colunas) {
        const uso = { tabela: f.tabela, id: String(r.id), titulo: String(r.titulo || r.id).slice(0, 120), campo, rota: `${f.editar}${r.id}` };
        // news.content é uma lista de parágrafos (TEXT[]); as demais, texto.
        if (tipo === 'html') for (const l of linksDoHtml(Array.isArray(r[col]) ? r[col].join(' ') : r[col])) add(l, uso);
        else add(r[col], uso);
      }
    }
  }
  return mapa;
}

// ---- rede
const ipPrivado = (ip) => {
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    return l === '::1' || l === '::' || l.startsWith('fe80') || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('::ffff:127.') || l.startsWith('::ffff:10.') || l.startsWith('::ffff:192.168.');
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
};

export const hostPermitido = async (hostname, resolver = dns.lookup) => {
  if (net.isIP(hostname)) return !ipPrivado(hostname);
  const enderecos = await resolver(hostname, { all: true });
  return enderecos.length > 0 && enderecos.every((e) => !ipPrivado(e.address));
};

const classificarStatus = (status) => (status >= 200 && status < 400 ? 'OK' : [404, 410].includes(status) ? 'QUEBRADO' : 'INCERTO');

// Confere uma URL. `deps` permite trocar rede/disco nos testes.
export async function verificarUrl(url, deps = {}) {
  const { fetchImpl = fetch, resolver = dns.lookup, existe = (p) => fs.access(p).then(() => true, () => false), timeoutMs = 10000 } = deps;
  if (url.startsWith('/uploads/')) {
    const arquivo = path.join(DIR_UPLOADS(), path.basename(decodeURIComponent(url)));
    const ok = await existe(arquivo);
    return { situacao: ok ? 'OK' : 'QUEBRADO', statusHttp: null, erro: ok ? null : 'arquivo não existe no servidor', interno: true };
  }
  let atual = url;
  try {
    for (let salto = 0; salto <= 5; salto++) {
      const u = new URL(atual);
      if (!(await hostPermitido(u.hostname, resolver))) return { situacao: 'INCERTO', statusHttp: null, erro: 'endereço interno — não verificado', interno: false };
      const req = (method) => fetchImpl(atual, {
        method, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': 'PRPG-UFRPE verificador de links', accept: '*/*' },
      });
      let res = await req('HEAD');
      if (res.status >= 400 || res.status === 0) { await res.body?.cancel?.(); res = await req('GET'); }
      if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.get('location')) {
        await res.body?.cancel?.();
        atual = new URL(res.headers.get('location'), atual).toString();
        continue;
      }
      await res.body?.cancel?.();
      return { situacao: classificarStatus(res.status), statusHttp: res.status, erro: null, interno: false };
    }
    return { situacao: 'INCERTO', statusHttp: null, erro: 'redirecionamentos demais', interno: false };
  } catch (e) {
    const causa = e?.cause?.code || e?.code || e?.name;
    if (['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN'].includes(causa)) return { situacao: 'QUEBRADO', statusHttp: null, erro: `host inacessível (${causa})`, interno: false };
    return { situacao: 'INCERTO', statusHttp: null, erro: causa === 'TimeoutError' ? 'sem resposta em 10 s' : `falha de conexão (${causa || e.message})`, interno: false };
  }
}

let emAndamento = null; // { iniciadoEm, total, feitos }
export const estadoVerificacao = () => emAndamento;

// Verifica todas as URLs em uso. Grava/atualiza `links_verificados` e remove as
// que deixaram de ser usadas. `quebrado_desde` guarda a primeira falha seguida.
export async function verificarLinks({ concorrencia = 6, deps = {}, aoProgredir } = {}) {
  if (emAndamento) return { ocupado: true, ...emAndamento };
  const usos = await coletarUsos();
  const urls = [...usos.keys()];
  emAndamento = { iniciadoEm: new Date().toISOString(), total: urls.length, feitos: 0 };
  const resumo = { total: urls.length, OK: 0, QUEBRADO: 0, INCERTO: 0 };
  try {
    let i = 0;
    const trabalhador = async () => {
      while (i < urls.length) {
        const url = urls[i++];
        const r = await verificarUrl(url, deps);
        resumo[r.situacao]++;
        await query(
          `INSERT INTO links_verificados (url, situacao, status_http, erro, interno, usos, verificado_em, quebrado_desde)
           VALUES ($1,$2,$3,$4,$5,$6, now(), CASE WHEN $2 = 'QUEBRADO' THEN now() END)
           ON CONFLICT (url) DO UPDATE SET situacao = EXCLUDED.situacao, status_http = EXCLUDED.status_http, erro = EXCLUDED.erro,
             interno = EXCLUDED.interno, usos = EXCLUDED.usos, verificado_em = now(),
             quebrado_desde = CASE WHEN EXCLUDED.situacao <> 'QUEBRADO' THEN NULL
               ELSE COALESCE(links_verificados.quebrado_desde, now()) END`,
          [url, r.situacao, r.statusHttp, r.erro, r.interno, JSON.stringify(usos.get(url))]);
        emAndamento.feitos++;
        aoProgredir?.(emAndamento);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concorrencia, Math.max(urls.length, 1)) }, trabalhador));
    await query('DELETE FROM links_verificados WHERE NOT (url = ANY($1))', [urls]);
    return resumo;
  } finally {
    emAndamento = null;
  }
}
