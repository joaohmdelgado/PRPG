import { describe, expect, it } from 'vitest';
import { filterAdminPages } from '../../src/pages/admin/adminPagesFilter.js';

const pages = [
  { id: 'geral', title: 'Institucional', slug: 'institucional', body: { value: 'Conteúdo geral' } },
  { id: 'a', title: 'Página A', slug: 'pagina-a', programaId: 'ppg-a', body: { value: 'Conteúdo A' } },
  { id: 'b', title: 'Página B', slug: 'pagina-b', programaId: 'ppg-b', body: { value: 'Conteúdo B' } },
];

describe('filterAdminPages', () => {
  it('mantém páginas institucionais e de programas quando nenhum programa é selecionado', () => {
    expect(filterAdminPages(pages, '', '')).toEqual(pages);
  });

  it('filtra por título, slug ou conteúdo', () => {
    expect(filterAdminPages(pages, 'conteúdo b', '')).toEqual([pages[2]]);
  });
});
