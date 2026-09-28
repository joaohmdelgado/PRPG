// Orçamento de desempenho do front (Fase P.6 de docs/revisao-portal-conteudo-2026-09-24.md).
//
// Constrói o site numa pasta temporária (com o manifest do Vite), mede em KB
// comprimidos (gzip) o que cada visitante baixa e compara com
// orcamento-desempenho.json. Sai com código 1 se algum limite estourar — para
// rodar no CI a cada mudança: `npm run perf:bundle`.
//
//   carregamento inicial  o JS que o index.html puxa (entrada + preloads), o CSS e as fontes
//   proibido no início    módulos que só devem sair sob demanda (planilhas, painel, editor…)
//   chunk máximo          nenhum arquivo de JS passa do limite (exceções nomeadas)
//   rotas                 JS total de uma página pública: carregamento inicial + o que a rota importa
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const orcamento = JSON.parse(fs.readFileSync(path.join(raiz, 'orcamento-desempenho.json'), 'utf8'));

const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'prpg-orcamento-'));
try {
  await build({ root: raiz, logLevel: 'error', build: { outDir: saida, emptyOutDir: true, manifest: true } });
  const manifest = JSON.parse(fs.readFileSync(path.join(saida, '.vite/manifest.json'), 'utf8'));

  const gz = new Map();
  const tamanho = (arquivo) => {
    if (!gz.has(arquivo)) gz.set(arquivo, zlib.gzipSync(fs.readFileSync(path.join(saida, arquivo)), { level: 9 }).length);
    return gz.get(arquivo);
  };
  const kb = (bytes) => bytes / 1024;
  const fmt = (n) => `${n.toFixed(1)} KB`;

  // Fecho estático de um módulo: ele e tudo o que importa sem `import()`.
  const fecho = (chave, visto = new Set()) => {
    if (visto.has(chave) || !manifest[chave]) return visto;
    visto.add(chave);
    for (const dep of manifest[chave].imports || []) fecho(dep, visto);
    return visto;
  };
  const jsDe = (chaves) => [...new Set([...chaves].map((c) => manifest[c].file).filter((f) => f.endsWith('.js')))];
  const somaKB = (arquivos) => kb(arquivos.reduce((t, f) => t + tamanho(f), 0));

  const falhas = [];
  const linhas = [];
  const conferir = (nome, medido, limite) => {
    const ok = medido <= limite;
    linhas.push(`${ok ? '✓' : '✗'} ${nome.padEnd(46)} ${fmt(medido).padStart(10)}  (limite ${limite} KB)`);
    if (!ok) falhas.push(`${nome}: ${fmt(medido)} > ${limite} KB`);
  };

  // --- carregamento inicial ---
  const chaveEntrada = Object.keys(manifest).find((k) => manifest[k].isEntry);
  const inicial = fecho(chaveEntrada);
  const jsInicial = jsDe(inicial);
  const cssInicial = [...inicial].flatMap((c) => manifest[c].css || []);
  const html = fs.readFileSync(path.join(saida, 'index.html'), 'utf8');
  const fontes = [...html.matchAll(/rel="preload"[^>]*href="\/([^"]+\.woff2)"/g)].map((m) => m[1]);
  const { carregamentoInicial: cfg } = orcamento;
  conferir('JS do carregamento inicial (entrada + preloads)', somaKB(jsInicial), cfg.jsKB);
  conferir('CSS do carregamento inicial', somaKB(cssInicial), cfg.cssKB);
  conferir(`Fontes pré-carregadas (${fontes.length})`, somaKB(fontes), cfg.fontesKB);

  // --- o que não pode estar no início ---
  for (const nome of orcamento.proibidoNoCarregamentoInicial) {
    const achados = [...inicial].filter((c) => manifest[c].name === nome || c.includes(`/${nome}.`) || manifest[c].file.includes(`/${nome}-`));
    linhas.push(`${achados.length === 0 ? '✓' : '✗'} ${`"${nome}" fora do carregamento inicial`.padEnd(46)} ${achados.length === 0 ? 'sob demanda' : 'NO INÍCIO'}`);
    if (achados.length) falhas.push(`"${nome}" está no carregamento inicial`);
  }

  // --- nenhum chunk gigante ---
  const porNome = (m) => m.name || path.basename(m.file).replace(/-[\w-]{8}\.js$/, '');
  const grandes = Object.values(manifest)
    .filter((m) => m.file.endsWith('.js'))
    .map((m) => ({ nome: porNome(m), kb: kb(tamanho(m.file)) }))
    .filter((c) => c.kb > (orcamento.chunkExcecoesKB[c.nome] ?? orcamento.chunkMaxKB));
  linhas.push(`${grandes.length === 0 ? '✓' : '✗'} ${`Nenhum chunk acima de ${orcamento.chunkMaxKB} KB`.padEnd(46)} ${grandes.length === 0 ? 'ok' : grandes.map((c) => `${c.nome} ${fmt(c.kb)}`).join(', ')}`);
  for (const c of grandes) falhas.push(`chunk "${c.nome}" com ${fmt(c.kb)} (limite ${orcamento.chunkExcecoesKB[c.nome] ?? orcamento.chunkMaxKB} KB)`);

  // --- páginas públicas: início + o que a rota importa ---
  for (const [rota, { modulo, jsKB }] of Object.entries(orcamento.rotas)) {
    if (!manifest[modulo]) { falhas.push(`rota ${rota}: módulo ${modulo} não está no build`); continue; }
    const todos = jsDe(new Set([...inicial, ...fecho(modulo)]));
    conferir(`Rota ${rota} (JS total)`, somaKB(todos), jsKB);
  }

  console.log(`\nOrçamento de desempenho — gzip, build de ${new Date().toISOString().slice(0, 10)}\n`);
  console.log(linhas.join('\n'));
  if (falhas.length) {
    console.error(`\n${falhas.length} limite(s) estourado(s):\n- ${falhas.join('\n- ')}`);
    process.exitCode = 1;
  } else {
    console.log('\nDentro do orçamento.');
  }
} finally {
  fs.rmSync(saida, { recursive: true, force: true });
}
