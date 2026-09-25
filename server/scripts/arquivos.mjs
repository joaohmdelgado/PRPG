// Manutenção da biblioteca de mídia (Fase F.5 de
// docs/revisao-portal-conteudo-2026-09-24.md).
//
//   node server/scripts/arquivos.mjs --registrar-locais
//     Registra em `arquivos` (com SHA-256) os arquivos que já estão em
//     server/uploads mas nunca foram registrados (uploads anteriores à Fase A.5).
//
//   node server/scripts/arquivos.mjs --externos
//     Inventário (só leitura) das URLs de arquivo externas gravadas no conteúdo:
//     site antigo (prpg.ufrpe.br), sites de programa, Google Drive, Unsplash.
//     Esses links quebram quando o site antigo for desligado.
//
//   node server/scripts/arquivos.mjs --externos --executar
//     Baixa os arquivos dos hosts institucionais (HOSTS_BAIXAVEIS), grava em
//     server/uploads, registra na biblioteca e troca as referências no
//     conteúdo. Google Drive e Unsplash só são listados (links de página, não
//     de arquivo; e imagem de banco não é acervo da PRPG) — tratar à mão.
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pool, query } from '../db/pool.js';
import { USOS, substituirReferencias } from '../db/arquivosUsos.js';
import { sha256Arquivo, arquivosRepo } from '../db/anexosRepo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA = path.join(__dirname, '../uploads');

const MIME_POR_EXT = {
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
};
const HOSTS_BAIXAVEIS = ['prpg.ufrpe.br', 'www.prpg.ufrpe.br', 'prppg.ufrpe.br', 'profiap.ufrpe.br'];
const HOSTS_INVENTARIO = [...HOSTS_BAIXAVEIS, 'drive.google.com', 'docs.google.com', 'images.unsplash.com'];

const args = new Set(process.argv.slice(2));

async function registrarLocais() {
  const nomes = (await fs.readdir(PASTA)).filter((n) => MIME_POR_EXT[path.extname(n).toLowerCase()]);
  const { rows } = await query("SELECT url FROM arquivos WHERE url LIKE '/uploads/%'");
  const registrados = new Set(rows.map((r) => r.url));
  let novos = 0;
  for (const nome of nomes) {
    const url = `/uploads/${nome}`;
    if (registrados.has(url)) continue;
    const caminho = path.join(PASTA, nome);
    const { size } = await fs.stat(caminho);
    await arquivosRepo.create({
      url, nomeOriginal: nome, mime: MIME_POR_EXT[path.extname(nome).toLowerCase()],
      tamanhoBytes: size, sha256: await sha256Arquivo(caminho),
    });
    novos++;
  }
  // Preenche o SHA-256 dos já registrados que não o têm.
  const { rows: semSha } = await query("SELECT id, url FROM arquivos WHERE sha256 IS NULL AND url LIKE '/uploads/%'");
  let comSha = 0;
  for (const a of semSha) {
    const caminho = path.join(PASTA, path.basename(a.url));
    const existe = await fs.access(caminho).then(() => true, () => false);
    if (!existe) continue;
    await query('UPDATE arquivos SET sha256 = $1 WHERE id = $2', [await sha256Arquivo(caminho), a.id]);
    comSha++;
  }
  console.log(`[arquivos] ${nomes.length} arquivo(s) em server/uploads; ${novos} registrado(s) agora; SHA-256 preenchido em ${comSha}.`);
}

// URLs externas citadas no conteúdo, com onde aparecem.
async function inventarioExterno() {
  const achados = new Map(); // url -> [{tipo, id, titulo}]
  for (const u of USOS) {
    if (u.modo === 'id' || u.imutavel) continue;
    const col = u.modo === 'array' ? `array_to_string(${u.coluna}, ' ')` : u.modo === 'json' ? `${u.coluna}::text` : u.coluna;
    const { rows } = await query(`SELECT ${u.idColuna || 'id'} AS id, ${u.titulo}::text AS titulo, ${col} AS texto FROM ${u.tabela} WHERE ${col} ~ 'https?://'`);
    for (const r of rows) {
      for (const url of String(r.texto).match(/https?:\/\/[^\s"'<>)]+/g) || []) {
        let host;
        try { host = new URL(url).host; } catch { continue; }
        if (!HOSTS_INVENTARIO.includes(host)) continue;
        if (!achados.has(url)) achados.set(url, []);
        achados.get(url).push({ tipo: u.tipo, id: r.id, titulo: r.titulo });
      }
    }
  }
  return achados;
}

async function baixarEReescrever(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  const mime = MIME_POR_EXT[ext];
  if (!mime) return { url, resultado: 'ignorado (não parece arquivo: sem extensão PDF/imagem)' };
  const resp = await fetch(url);
  if (!resp.ok) return { url, resultado: `falhou (HTTP ${resp.status})` };
  const nome = `${Date.now()}-${crypto.randomInt(1e9)}${ext}`;
  const caminho = path.join(PASTA, nome);
  await fs.writeFile(caminho, Buffer.from(await resp.arrayBuffer()));
  const sha256 = await sha256Arquivo(caminho);
  let arquivo = await arquivosRepo.findPublicoPorSha(sha256);
  if (arquivo) {
    await fs.unlink(caminho);
  } else {
    const { size } = await fs.stat(caminho);
    arquivo = await arquivosRepo.create({
      url: `/uploads/${nome}`, nomeOriginal: decodeURIComponent(path.basename(new URL(url).pathname)),
      mime, tamanhoBytes: size, sha256,
    });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const n = await substituirReferencias(client, url, arquivo.url);
    await client.query('COMMIT');
    return { url, resultado: `importado → ${arquivo.url} (${n} referência(s))` };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function externos() {
  const achados = await inventarioExterno();
  const porHost = {};
  for (const url of achados.keys()) {
    const host = new URL(url).host;
    porHost[host] = (porHost[host] || 0) + 1;
  }
  console.log(`[arquivos] ${achados.size} URL(s) externa(s) distinta(s) no conteúdo:`, porHost);
  for (const [url, onde] of achados) {
    console.log(`  - ${url}\n      em: ${onde.map((o) => `${o.tipo} "${(o.titulo || o.id).slice(0, 60)}"`).join('; ')}`);
  }
  if (!args.has('--executar')) {
    console.log('\n[arquivos] Só leitura. Para baixar os de hosts institucionais e reescrever as referências, rode com --executar.');
    return;
  }
  for (const url of achados.keys()) {
    if (!HOSTS_BAIXAVEIS.includes(new URL(url).host)) continue;
    try {
      const r = await baixarEReescrever(url);
      console.log(`  ${r.resultado}: ${r.url}`);
    } catch (e) {
      console.log(`  erro (${e.message}): ${url}`);
    }
  }
}

try {
  if (args.has('--registrar-locais')) await registrarLocais();
  if (args.has('--externos')) await externos();
  if (!args.has('--registrar-locais') && !args.has('--externos')) {
    console.log('Uso: node server/scripts/arquivos.mjs --registrar-locais | --externos [--executar]');
  }
} finally {
  await pool.end();
}
