// Imagens do portal (Fase P.3 de docs/revisao-portal-conteudo-2026-09-24.md).
//
// O que o editor envia (foto de celular de vários MB, PNG de captura de tela)
// não deve ser o que o visitante baixa. Cada imagem raster enviada ganha
// versões WebP em larguras fixas, guardadas em server/uploads-derivados/ —
// pasta separada dos uploads: é cache regenerável, fica fora do backup e
// nunca contém nada que não possa ser refeito a partir do original.
//
//   /uploads/<arquivo>          → o original, como sempre
//   /uploads/<arquivo>?w=800    → WebP com no máximo 800 px de largura
//
// As versões são geradas no upload e, para o que já estava no disco, sob
// demanda na primeira visita (depois vêm do cache). Só as larguras da lista
// LARGURAS são aceitas: o visitante não escolhe um tamanho arbitrário, então o
// espaço em disco por imagem é limitado (5 arquivos). Os metadados (EXIF,
// inclusive GPS) não vão para a versão derivada.
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PASTA_UPLOADS = path.join(__dirname, '../uploads');
export const PASTA_DERIVADOS = path.join(__dirname, '../uploads-derivados');

export const LARGURAS = [240, 480, 800, 1280, 1920];
const EXTENSOES_RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const QUALIDADE = 78;
// Imagem gigante (decompression bomb) é recusada em vez de estourar a memória.
const LIMITE_PIXELS = 80_000_000;

// O cache do libvips segura o arquivo aberto no Windows e impediria apagá-lo.
sharp.cache(false);

export const ehImagemRaster = (nome) => EXTENSOES_RASTER.has(path.extname(String(nome)).toLowerCase());

const semExtensao = (nome) => path.basename(nome, path.extname(nome));
const caminhoDerivado = (nome, largura) => path.join(PASTA_DERIVADOS, `${semExtensao(nome)}-${largura}.webp`);
const abrir = (arquivo) => sharp(arquivo, { limitInputPixels: LIMITE_PIXELS });

// Largura e altura como o navegador as mostra (já com a orientação do EXIF).
export async function dimensoes(nome) {
  const meta = await abrir(path.join(PASTA_UPLOADS, path.basename(nome))).metadata();
  const girada = meta.orientation >= 5 && meta.orientation <= 8;
  return { largura: girada ? meta.height : meta.width, altura: girada ? meta.width : meta.height };
}

// Gerações em andamento, para duas visitas simultâneas não converterem a mesma
// imagem duas vezes.
const emAndamento = new Map();

async function gerar(nome, largura) {
  const destino = caminhoDerivado(nome, largura);
  try {
    await fs.access(destino);
    return destino;
  } catch { /* ainda não existe */ }

  if (!emAndamento.has(destino)) {
    const trabalho = (async () => {
      await fs.mkdir(PASTA_DERIVADOS, { recursive: true });
      // Grava em arquivo temporário e renomeia: quem lê nunca vê meia imagem.
      const temporario = `${destino}.${process.pid}-${Math.random().toString(36).slice(2)}.tmp`;
      try {
        await abrir(path.join(PASTA_UPLOADS, nome))
          .rotate()
          .resize({ width: largura, withoutEnlargement: true })
          .webp({ quality: QUALIDADE })
          .toFile(temporario);
        await fs.rename(temporario, destino);
      } catch (e) {
        await fs.unlink(temporario).catch(() => {});
        throw e;
      }
      return destino;
    })().finally(() => emAndamento.delete(destino));
    emAndamento.set(destino, trabalho);
  }
  return emAndamento.get(destino);
}

// Caminho da versão WebP de `nome` com a largura pedida, gerando-a se preciso.
// null = não se aplica (largura fora da lista, não é imagem raster, arquivo
// inexistente ou ilegível): quem chama serve o original.
export async function variante(nome, largura) {
  const base = path.basename(String(nome));
  if (base !== nome || !LARGURAS.includes(Number(largura)) || !ehImagemRaster(base)) return null;
  try {
    await fs.access(path.join(PASTA_UPLOADS, base));
    return await gerar(base, Number(largura));
  } catch (e) {
    if (e.code !== 'ENOENT') console.error(`[imagens] falha ao gerar ${base} @${largura}:`, e.message);
    return null;
  }
}

// Gera todas as larguras de uma imagem recém-enviada. Devolve as dimensões do
// original (para o formulário e a biblioteca de mídia) ou null se não for
// imagem raster. Uma falha na conversão não derruba o upload: o original
// continua servindo e a versão nasce na primeira visita.
export async function prepararImagem(nome) {
  if (!ehImagemRaster(nome)) return null;
  try {
    const dims = await dimensoes(nome);
    for (const largura of LARGURAS) await gerar(path.basename(nome), largura);
    return dims;
  } catch (e) {
    console.error(`[imagens] não foi possível preparar ${nome}:`, e.message);
    return null;
  }
}

// Remove as versões derivadas de um arquivo apagado.
export async function apagarVariantes(nome) {
  const prefixo = `${semExtensao(path.basename(String(nome)))}-`;
  let arquivos = [];
  try { arquivos = await fs.readdir(PASTA_DERIVADOS); } catch { return; }
  await Promise.all(arquivos
    .filter((f) => f.startsWith(prefixo) && f.endsWith('.webp'))
    .map((f) => fs.unlink(path.join(PASTA_DERIVADOS, f)).catch(() => {})));
}

// Middleware de /uploads: com ?w=<largura> devolve a versão WebP; sem ela (ou
// quando não se aplica) segue para o servidor de arquivos estáticos.
export async function servirVariante(req, res, next) {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || req.query.w === undefined) return next();
  try {
    const nome = decodeURIComponent(req.path.replace(/^\//, ''));
    const arquivo = await variante(nome, req.query.w);
    if (!arquivo) return next();
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.type('image/webp');
    // `root` (e não o caminho absoluto) para o nome de pastas com ponto acima
    // do projeto não fazer o servidor de arquivos recusar o pedido.
    return res.sendFile(path.basename(arquivo), { root: PASTA_DERIVADOS, maxAge: '30d', immutable: true }, (err) => {
      if (err && !res.headersSent) next();
    });
  } catch {
    return next();
  }
}
