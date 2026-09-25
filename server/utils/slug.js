// Slug único do projeto (Fase R.7). Antes havia 7 cópias com pequenas
// diferenças — e a de notícias não removia acento ("Notícia" virava "not-cia").
export const slugify = (s) =>
  String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Primeiro slug livre a partir de `base`: base, base-2, base-3...
// `ocupado(slug)` diz se já existe (pode ser async).
export async function slugUnico(base, ocupado) {
  let slug = base;
  for (let n = 2; await ocupado(slug); n++) slug = `${base}-${n}`;
  return slug;
}
