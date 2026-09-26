// Fase P.3: gera as versões WebP (server/uploads-derivados/) das imagens que já
// estavam em server/uploads antes do pipeline — para a primeira visita de cada
// uma não pagar a conversão. Uploads novos já são preparados no envio; sem rodar
// isto, o servidor converte sob demanda. Pode rodar quantas vezes quiser (o que
// já existe é pulado).  Uso: `npm run imagens`
import fs from 'fs/promises';
import path from 'path';
import { PASTA_UPLOADS, PASTA_DERIVADOS, ehImagemRaster, prepararImagem } from '../services/imagens.js';

const tamanhoTotal = async (pasta, filtro = () => true) => {
  let total = 0;
  for (const nome of await fs.readdir(pasta).catch(() => [])) {
    if (filtro(nome)) total += (await fs.stat(path.join(pasta, nome))).size;
  }
  return total;
};
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

const nomes = (await fs.readdir(PASTA_UPLOADS).catch(() => [])).filter(ehImagemRaster);
let preparadas = 0;
for (const nome of nomes) {
  if (await prepararImagem(nome)) preparadas += 1;
}
console.log(`[Imagens] ${nomes.length} imagem(ns) em server/uploads; ${preparadas} preparada(s).`);
console.log(`[Imagens] originais: ${mb(await tamanhoTotal(PASTA_UPLOADS, ehImagemRaster))}; versões WebP: ${mb(await tamanhoTotal(PASTA_DERIVADOS))}.`);
