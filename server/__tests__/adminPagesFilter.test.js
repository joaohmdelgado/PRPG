import { describe, expect, it } from 'vitest';
import { filterAdminPages, semFixasVaziasDePrograma } from '../../src/pages/admin/adminPagesFilter.js';

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

  it('mantém somente as páginas do programa selecionado', () => {
    expect(filterAdminPages(pages, '', 'ppg-a')).toEqual([pages[1]]);
  });

  it('retorna uma lista vazia quando o programa escolhido não possui páginas', () => {
    expect(filterAdminPages(pages, '', 'ppg-sem-paginas')).toEqual([]);
  });
});

describe('semFixasVaziasDePrograma', () => {
  it('esconde só as páginas fixas de programa sem texto', () => {
    const lista = [
      { id: 'geral-fixa', chave: 'sobre', body: { value: '' } }, // institucional da PRPG: fica
      { id: 'fixa-vazia', chave: 'infraestrutura', programaId: 'p', body: { value: '<p>&nbsp;</p>' } },
      { id: 'fixa-cheia', chave: 'sobre', programaId: 'p', body: { value: '<p>Texto</p>' } },
      { id: 'comum-vazia', programaId: 'p', body: { value: '' } },
    ];
    expect(semFixasVaziasDePrograma(lista).map((p) => p.id)).toEqual(['geral-fixa', 'fixa-cheia', 'comum-vazia']);
  });
});
