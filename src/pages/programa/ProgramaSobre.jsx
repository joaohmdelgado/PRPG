import React from 'react';
import { usePrograma } from '../../components/programa/ProgramaContext';
import { PageHero, EmptyState } from '../../components/programa/ProgramaUI';
import SafeHtml from '../../components/SafeHtml';

export default function ProgramaSobre() {
  const { programa } = usePrograma();
  const paginas = Array.isArray(programa.paginas) ? programa.paginas : [];

  return (
    <>
      <PageHero
        icon="fa-circle-info"
        eyebrow="O Programa"
        title={`Sobre o ${programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla : programa.nome}`}
        subtitle={programa.descricao_curta}
      />

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {paginas.length === 0 ? (
          <EmptyState
            icon="fa-file-pen"
            title="Conteúdo em construção"
            hint="As informações institucionais deste programa ainda serão publicadas."
          />
        ) : (
          <div className="space-y-8">
            {paginas.map((p) => (
              <section key={p.id || p.secao} id={p.secao} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 md:p-10 scroll-mt-24">
                {p.titulo && (
                  <h2 className="font-heading font-black text-2xl text-[var(--prog-primary)] mb-2 pb-3 border-b-2 border-[var(--prog-accent)] inline-block">
                    {p.titulo}
                  </h2>
                )}
                <SafeHtml
                  className="text-gray-700 leading-relaxed html-content prose prose-slate max-w-none mt-4"
                  html={p.body?.value}
                />
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
