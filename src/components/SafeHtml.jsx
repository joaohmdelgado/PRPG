import React from 'react';
import DOMPurify from 'dompurify';

// Renderiza HTML vindo do editor de conteúdo (CKEditor) de forma segura,
// removendo scripts e atributos perigosos para evitar XSS armazenado.
// Use no lugar de `dangerouslySetInnerHTML` para qualquer conteúdo editável.
const SafeHtml = ({ html, as: Tag = 'div', className }) => (
  <Tag
    className={className}
    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html || '') }}
  />
);

export default SafeHtml;
