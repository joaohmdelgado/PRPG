import React from 'react';
import DOMPurify from 'dompurify';
import { API_URL } from '../api';

// Imagens/links do editor são gravados como /uploads/... (relativo — ver
// components/admin/ckeditor.js). Quando a API roda em outro endereço que o
// site, aponta esses caminhos para ela.
const absolutizarUploads = (html) =>
  API_URL ? html.replace(/(\s(?:src|href)=["'])\/uploads\//g, `$1${API_URL}/uploads/`) : html;

// Renderiza HTML vindo do editor de conteúdo (CKEditor) de forma segura,
// removendo scripts e atributos perigosos para evitar XSS armazenado.
// Use no lugar de `dangerouslySetInnerHTML` para qualquer conteúdo editável.
const SafeHtml = ({ html, as: Tag = 'div', className }) => (
  <Tag
    className={className}
    dangerouslySetInnerHTML={{ __html: absolutizarUploads(DOMPurify.sanitize(html || '')) }}
  />
);

export default SafeHtml;
