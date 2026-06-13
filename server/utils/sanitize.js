import DOMPurify from 'isomorphic-dompurify';

// Sanitiza HTML vindo do editor de conteúdo (CKEditor) no servidor,
// removendo scripts/atributos perigosos antes de persistir.
// Defesa em profundidade: o frontend também sanitiza ao renderizar.
export const sanitizeHtml = (dirty) =>
  typeof dirty === 'string' ? DOMPurify.sanitize(dirty) : dirty;

// Sanitiza um campo HTML que pode ser string ou um array de strings
// (ex.: o campo `content` das notícias).
export const sanitizeHtmlField = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeHtml);
  return sanitizeHtml(value);
};

// true apenas para objetos JSON "comuns" (rejeita null, arrays e primitivos).
export const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

// Sanitiza o campo `desc` (HTML) de cada item de um array de documentos
// (usado por formulários e resoluções).
export const sanitizeDocsDesc = (docs) =>
  Array.isArray(docs)
    ? docs.map((d) =>
        isPlainObject(d) && typeof d.desc === 'string'
          ? { ...d, desc: sanitizeHtml(d.desc) }
          : d
      )
    : docs;
