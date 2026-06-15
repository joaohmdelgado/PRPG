import React, { useState, useEffect } from 'react';
import { API_URL } from '../../api';
import { usePrograma } from '../../components/programa/ProgramaContext';
import { PageHero, EmptyState } from '../../components/programa/ProgramaUI';
import SafeHtml from '../../components/SafeHtml';

const fmtMes = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;

export default function ProgramaSobre() {
  const { programa, slug } = usePrograma();
  const historico = Array.isArray(programa.historico_coordenadores) ? programa.historico_coordenadores : [];
  const [paginas, setPaginas] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/pages?programa=${encodeURIComponent(slug)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setPaginas(Array.isArray(d) ? d : []));
  }, [slug]);

  return (
    <>
      <PageHero
        icon="fa-circle-info"
        eyebrow="O Programa"
        title={`Sobre o ${programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla : programa.nome}`}
        subtitle={programa.descricao_curta}
      />

      <main className="container mx-auto px-4 py-12 max-w-5xl space-y-8">
        {paginas.length === 0 && historico.length === 0 ? (
          <EmptyState
            icon="fa-file-pen"
            title="Conteúdo em construção"
            hint="As informações institucionais deste programa ainda serão publicadas."
          />
        ) : (
          <>
            {paginas.map((p) => (
              <section key={p.id} id={p.slug} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 md:p-10 scroll-mt-24">
                {p.title && (
                  <h2 className="font-heading font-black text-2xl text-[var(--prog-primary)] mb-2 pb-3 border-b-2 border-[var(--prog-accent)] inline-block">
                    {p.title}
                  </h2>
                )}
                <SafeHtml
                  className="text-gray-700 leading-relaxed html-content prose prose-slate max-w-none mt-4"
                  html={p.body?.value}
                />
              </section>
            ))}

            {historico.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 md:p-10">
                <h2 className="font-heading font-black text-2xl text-[var(--prog-primary)] mb-6 pb-3 border-b-2 border-[var(--prog-accent)] inline-block">
                  Histórico de Coordenação
                </h2>
                <ol className="relative border-l-2 border-[var(--prog-primary)]/10 ml-3 space-y-6">
                  {historico.map((c, i) => (
                    <li key={c.pessoa_id || i} className="ml-6">
                      <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-[var(--prog-primary)]/20 border-2 border-[var(--prog-primary)] flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--prog-primary)] block"></span>
                      </span>
                      <p className="font-semibold text-gray-900">{c.nome || c.perfil_nome || '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtMes(c.data_inicio_mandato) || '?'} — {fmtMes(c.data_fim_mandato) || 'atual'}
                        {c.motivo_encerramento && (
                          <span className="ml-2 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                            {c.motivo_encerramento.replace('_', ' ').toLowerCase()}
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
