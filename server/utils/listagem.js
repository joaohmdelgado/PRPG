// Contrato das listagens de conteúdo (Fase F.2/F.3 de
// docs/revisao-portal-conteudo-2026-09-24.md).
//
// Compatível com o que já existe: sem ?page nem ?limit a resposta continua
// sendo o array inteiro. Com eles, vira { items, total, page, limit, pages }.
// ?resumo=1 aplica `resumir` (tira campos pesados, como o corpo da notícia,
// que a listagem não exibe).

const LIMITE_MAX = 100;

export function responderLista(res, items, q = {}, { resumir } = {}) {
  let out = items;
  if (q.resumo === '1' && resumir) out = out.map(resumir);
  if (q.page === undefined && q.limit === undefined) return res.json(out);

  const limit = Math.min(Math.max(Number.parseInt(q.limit, 10) || 20, 1), LIMITE_MAX);
  const total = out.length;
  const pages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(Number.parseInt(q.page, 10) || 1, 1), pages);
  return res.json({ items: out.slice((page - 1) * limit, page * limit), total, page, limit, pages });
}

// Busca textual simples (sem acento, sem caixa) sobre os campos informados.
const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function filtrarTexto(items, termo, campos) {
  const t = normalizar(termo).trim();
  if (!t) return items;
  return items.filter((i) => campos.some((c) => normalizar(typeof c === 'function' ? c(i) : i[c]).includes(t)));
}
