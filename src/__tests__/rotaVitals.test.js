import { describe, it, expect } from 'vitest';
import { familiaDaRota } from '../utils/rotaVitals';

// Fase P.6: agrupa endereços com parâmetro (notícia, edital, programa…) numa
// família só, para o p75 do painel ter amostra de verdade.
describe('familiaDaRota', () => {
  it('páginas com endereço fixo saem como estão', () => {
    for (const p of ['/', '/programas', '/editais', '/noticias', '/sobre', '/privacidade', '/busca']) {
      expect(familiaDaRota(p)).toBe(p);
    }
  });

  it('agrupa o parâmetro de notícia, edital, programa, página avulsa, declaração e verificação', () => {
    expect(familiaDaRota('/noticia/workshop-inovacao')).toBe('/noticia/:id');
    expect(familiaDaRota('/editais/12345')).toBe('/editais/:id');
    expect(familiaDaRota('/programas/pgh')).toBe('/programas/:slug');
    expect(familiaDaRota('/p/uma-pagina-qualquer')).toBe('/p/:slug');
    expect(familiaDaRota('/declaracoes/proficiencia/abc-123')).toBe('/declaracoes/proficiencia/:codigo');
    expect(familiaDaRota('/verificar/abc-123')).toBe('/verificar/:codigo');
  });

  it('microsite de programa: raiz, subpáginas fixas, notícia do programa e página própria', () => {
    expect(familiaDaRota('/pgh')).toBe('/:programa');
    expect(familiaDaRota('/pgh/sobre')).toBe('/:programa/sobre');
    expect(familiaDaRota('/pgh/pessoas')).toBe('/:programa/pessoas');
    expect(familiaDaRota('/pgh/noticias')).toBe('/:programa/noticias');
    expect(familiaDaRota('/pgh/noticias/123')).toBe('/:programa/noticias/:id');
    expect(familiaDaRota('/pgh/uma-pagina-criada-pelo-programa')).toBe('/:programa/:pagina');
  });

  it('área restrita (painel, login, minha conta) vira uma família só', () => {
    for (const p of ['/admin', '/admin/noticias', '/admin/programas/editar/pgh', '/entrar', '/minha-conta', '/minha-conta/inscricoes']) {
      expect(familiaDaRota(p)).toBe('/admin');
    }
  });

  it('barras a mais ou faltando não criam uma família nova', () => {
    expect(familiaDaRota('/noticias/')).toBe('/noticias');
    expect(familiaDaRota('//noticias')).toBe('/noticias');
    expect(familiaDaRota('')).toBe('/');
    expect(familiaDaRota(undefined)).toBe('/');
  });
});
