import { createContext, useContext } from 'react';

// Compartilha o programa carregado (e seu slug) com todas as subpáginas do
// microsite, evitando refetch a cada navegação interna.
export const ProgramaContext = createContext(null);

export const usePrograma = () => useContext(ProgramaContext);

// Monta um caminho absoluto dentro do microsite (ex.: programaPath('pgh','sobre') -> '/pgh/sobre').
export const programaPath = (slug, sub = '') => `/${slug}${sub ? `/${sub}` : ''}`;
