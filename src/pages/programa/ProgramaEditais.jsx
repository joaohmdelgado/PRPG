import React, { useEffect, useState } from 'react';
import { API_URL } from '../../api';
import { usePrograma } from '../../components/programa/ProgramaContext';
import { PageHero, EmptyState, Spinner, formatDate } from '../../components/programa/ProgramaUI';

const STATUS_CLS = {
  abertas: 'bg-green-100 text-green-700',
  andamento: 'bg-amber-100 text-amber-700',
  concluido: 'bg-gray-100 text-gray-600',
};

export default function ProgramaEditais() {
  const { programa, slug } = usePrograma();
  const [editais, setEditais] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`${API_URL}/api/editais?programa=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (active) setEditais(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  return (
    <>
      <PageHero icon="fa-file-lines" eyebrow="Admissão" title="Editais e Seleções"
        subtitle={`Processos seletivos e chamadas do programa ${programa.nome}.`} />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {loading ? (
          <Spinner />
        ) : editais.length === 0 ? (
          <EmptyState icon="fa-folder-open" title="Nenhum edital publicado"
            hint="Quando houver processos seletivos abertos, eles aparecerão aqui." />
        ) : (
          <div className="space-y-4">
            {editais.map((e) => (
              <div key={e.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-[var(--prog-accent)] transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <h3 className="font-heading font-bold text-lg text-[var(--prog-primary)] leading-snug flex-1">{e.title}</h3>
                  {e.situationLabel && (
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${STATUS_CLS[e.situation] || STATUS_CLS.concluido}`}>
                      {e.situationLabel}
                    </span>
                  )}
                </div>
                {e.description && <p className="text-sm text-gray-600 mb-4">{e.description}</p>}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500 mb-4">
                  {e.publishedAt && <span><i className="fa-regular fa-calendar mr-1.5 text-[var(--prog-accent)]"></i>Publicado: {formatDate(e.publishedAt)}</span>}
                  {e.deadline && <span><i className="fa-regular fa-clock mr-1.5 text-[var(--prog-accent)]"></i>Prazo: {formatDate(e.deadline)}</span>}
                  {e.numero && <span><i className="fa-solid fa-hashtag mr-1.5 text-[var(--prog-accent)]"></i>{e.numero}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {e.downloadLink && e.downloadLink !== '#' && (
                    <a href={e.downloadLink} target="_blank" rel="noopener noreferrer"
                      className="text-sm px-4 py-2 rounded-lg bg-[var(--prog-primary)] text-white font-semibold hover:opacity-90 transition-opacity">
                      <i className="fa-solid fa-download mr-2"></i>Edital
                    </a>
                  )}
                  {e.detailsLink && e.detailsLink !== '#' && (
                    <a href={e.detailsLink} target="_blank" rel="noopener noreferrer"
                      className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-[var(--prog-primary)] font-semibold hover:bg-gray-50 transition-colors">
                      <i className="fa-solid fa-circle-info mr-2"></i>Detalhes
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
