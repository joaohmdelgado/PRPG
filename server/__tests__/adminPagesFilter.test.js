import { describe, expect, it } from 'vitest';
import { semFixasVaziasDePrograma } from '../utils/paginasFixas.js';

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
