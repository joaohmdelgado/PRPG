import { query } from '../db/pool.js';

// Resumo do programa para selos e links no portal (Fase N): sigla (sem o
// marcador "S/SIGLA"), nome, slug e se tem microsite ativo. O link público é
// o microsite quando ativo; senão a página automática /programas/<slug> (N.2).
export const linkPrograma = (p) => (p?.slug ? (p.site ? `/${p.slug}` : `/programas/${p.slug}`) : null);

export async function mapaProgramas() {
  const { rows } = await query('SELECT id, slug, sigla, nome, microsite_ativo FROM programas');
  return new Map(rows.map((p) => {
    const resumo = {
      id: p.id, slug: p.slug, nome: p.nome, site: !!p.microsite_ativo,
      sigla: p.sigla && p.sigla !== 'S/SIGLA' ? p.sigla : null,
    };
    return [p.id, { ...resumo, link: linkPrograma(resumo) }];
  }));
}

// Anexa `programa` (resumo ou null) a cada item que tem programaId.
export const anexarPrograma = (items, mapa) =>
  items.map((i) => ({ ...i, programa: i.programaId ? mapa.get(i.programaId) || null : null }));
