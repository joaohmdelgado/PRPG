import React from 'react';
import { usePrograma } from '../../components/programa/ProgramaContext';
import { PageHero, EmptyState } from '../../components/programa/ProgramaUI';

// "Linhas de Pesquisa" do grupo "O Programa" (Fase S.1). As linhas já vêm no
// programa carregado (programa.linhas), sem outra requisição.
export default function ProgramaLinhas() {
  const { programa } = usePrograma();
  const linhas = Array.isArray(programa.linhas) ? programa.linhas : [];

  return (
    <>
      <PageHero icon="fa-flask" eyebrow="O Programa" title="Linhas de Pesquisa" />
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {linhas.length === 0 ? (
          <EmptyState icon="fa-flask" title="Nenhuma linha de pesquisa cadastrada" />
        ) : (
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {linhas.map((linha, i) => (
              <li key={linha.id ?? i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-[var(--prog-primary)]/10 text-[var(--prog-primary)] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="font-semibold text-gray-800 leading-snug pt-1.5">{linha.nome}</p>
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  );
}
