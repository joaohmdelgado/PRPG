import React from 'react';
import { API_URL, urlMidia } from '../api';

// Imagem do portal (Fase P.3 de docs/revisao-portal-conteudo-2026-09-24.md).
//
// Para o que foi enviado pelo painel (/uploads/…), pede à API versões WebP em
// larguras fixas (`?w=`, ver server/services/imagens.js) e deixa o navegador
// escolher pelo tamanho da tela e pelo espaço da imagem (`sizes`). O que vem de
// outro site (Unsplash, site antigo) não pode ser convertido e sai como estava.
//
// Abaixo da dobra a imagem só é baixada perto de aparecer (loading="lazy");
// a imagem principal da página (LCP) usa `prioridade`, que a baixa já e
// com fetchpriority alto. Informe `largura` e `altura` quando forem conhecidas
// (ou reserve o espaço por CSS, com aspect-ratio) para a página não pular.

// Mesmas larguras de server/services/imagens.js.
export const LARGURAS_IMAGEM = [240, 480, 800, 1280, 1920];
const RASTER = /\.(jpe?g|png|webp)$/i;

// '/uploads/x.jpg' de uma imagem local (relativa ou já com a base da API); senão, null.
export function caminhoLocal(src) {
  if (!src || typeof src !== 'string') return null;
  if (src.startsWith('/uploads/')) return src;
  if (src.startsWith(`${API_URL}/uploads/`)) return src.slice(API_URL.length);
  return null;
}

export const srcSetImagem = (src) => {
  const local = caminhoLocal(src);
  if (!local || !RASTER.test(local.split('?')[0])) return undefined;
  return LARGURAS_IMAGEM.map((w) => `${API_URL}${local}?w=${w} ${w}w`).join(', ');
};

// Versão usada como `src` de reserva (navegadores sem srcset): média, e não o original.
export const srcImagem = (src) => {
  const local = caminhoLocal(src);
  return local && RASTER.test(local.split('?')[0]) ? `${API_URL}${local}?w=800` : urlMidia(src);
};

export default function Imagem({ src, alt = '', sizes = '100vw', largura, altura, prioridade = false, ...resto }) {
  if (!src) return null;
  const srcSet = srcSetImagem(src);
  return (
    <img
      src={srcImagem(src)}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={largura}
      height={altura}
      loading={prioridade ? 'eager' : 'lazy'}
      decoding={prioridade ? 'auto' : 'async'}
      fetchPriority={prioridade ? 'high' : undefined}
      {...resto}
    />
  );
}
