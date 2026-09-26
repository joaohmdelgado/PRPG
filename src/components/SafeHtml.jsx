import React from 'react';
import DOMPurify from 'dompurify';
import { API_URL } from '../api';
import { srcSetImagem } from './Imagem';

// Imagens/links do editor são gravados como /uploads/... (relativo — ver
// components/admin/ckeditor.js). Quando a API roda em outro endereço que o
// site, aponta esses caminhos para ela.
const absolutizarUploads = (html) =>
  API_URL ? html.replace(/(\s(?:src|href)=["'])\/uploads\//g, `$1${API_URL}/uploads/`) : html;

// Imagens dentro do texto (Fase P.3): carregamento tardio e, para as enviadas
// pelo painel, as versões WebP em várias larguras (ver Imagem.jsx). Roda depois
// do DOMPurify, então os atributos já são os permitidos.
const SIZES_TEXTO = '(min-width: 768px) 720px, 100vw';
const otimizarImagens = (html) => html.replace(/<img\b[^>]*>/gi, (tag) => {
  let out = tag;
  const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1];
  const srcset = src && !/\ssrcset=/i.test(tag) ? srcSetImagem(src) : undefined;
  if (srcset) out = out.replace(/^<img/i, `<img srcset="${srcset}" sizes="${SIZES_TEXTO}"`);
  if (!/\sloading=/i.test(out)) out = out.replace(/^<img/i, '<img loading="lazy" decoding="async"');
  return out;
});

// Renderiza HTML vindo do editor de conteúdo (CKEditor) de forma segura,
// removendo scripts e atributos perigosos para evitar XSS armazenado.
// Use no lugar de `dangerouslySetInnerHTML` para qualquer conteúdo editável.
const SafeHtml = ({ html, as: Tag = 'div', className }) => (
  <Tag
    className={className}
    dangerouslySetInnerHTML={{ __html: absolutizarUploads(otimizarImagens(DOMPurify.sanitize(html || ''))) }}
  />
);

export default SafeHtml;
