// Contrato das listagens de conteúdo (Fase F.2/F.3 e U.3 de
// docs/revisao-portal-conteudo-2026-09-24.md).
//
// Compatível com o que já existe: sem ?page nem ?limit a resposta continua
// sendo o array inteiro. Com eles, vira { items, total, page, limit, pages }.
//   ?q=        busca textual (sem acento, sem caixa) nos campos `busca` do controller
//   ?ordenar=  campo de ordenação, só um dos `ordenaveis` do controller (outro é ignorado)
//   ?dir=      asc (padrão) | desc
// ?resumo=1 aplica `resumir` (tira campos pesados, como o corpo da notícia,
// que a listagem não exibe).

const LIMITE_MAX = 100;

// Busca textual simples (sem acento, sem caixa) sobre os campos informados.
const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function filtrarTexto(items, termo, campos) {
  const t = normalizar(termo).trim();
  if (!t) return items;
  return items.filter((i) => campos.some((c) => normalizar(typeof c === 'function' ? c(i) : i[c]).includes(t)));
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const vazio = (v) => v === null || v === undefined || v === '';

// Ordena por um dos campos permitidos. `ordenaveis`: { campo: (item) => valor }
// — o cliente só escolhe um nome; nunca um caminho arbitrário do objeto.
// Vazios ficam sempre no fim (nos dois sentidos) e a ordem original desempata,
// então a paginação não repete nem perde itens entre páginas.
export function ordenarLista(items, q = {}, ordenaveis) {
  const campo = q.ordenar;
  if (!campo || !ordenaveis || !Object.hasOwn(ordenaveis, campo)) return items;
  const chave = ordenaveis[campo];
  const sinal = q.dir === 'desc' ? -1 : 1;
  return items
    .map((item, i) => ({ item, i, v: chave(item) }))
    .sort((a, b) => {
      if (vazio(a.v) || vazio(b.v)) return vazio(a.v) === vazio(b.v) ? a.i - b.i : (vazio(a.v) ? 1 : -1);
      const c = typeof a.v === 'number' && typeof b.v === 'number' ? a.v - b.v : collator.compare(String(a.v), String(b.v));
      return c * sinal || a.i - b.i;
    })
    .map((x) => x.item);
}

// `extra`: campos a mais na resposta paginada (ex.: anos disponíveis para o filtro).
// `busca`: campos do ?q= (quando o controller ainda não filtra por q sozinho).
// `ordenaveis`: campos aceitos em ?ordenar=.
export function responderLista(res, items, q = {}, { resumir, extra = {}, busca, ordenaveis } = {}) {
  let out = items;
  if (busca && q.q) out = filtrarTexto(out, q.q, busca);
  out = ordenarLista(out, q, ordenaveis);
  if (q.resumo === '1' && resumir) out = out.map(resumir);
  if (q.page === undefined && q.limit === undefined) return res.json(out);

  const limit = Math.min(Math.max(Number.parseInt(q.limit, 10) || 20, 1), LIMITE_MAX);
  const total = out.length;
  const pages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(Number.parseInt(q.page, 10) || 1, 1), pages);
  return res.json({ items: out.slice((page - 1) * limit, page * limit), total, page, limit, pages, ...extra });
}
