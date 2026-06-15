import React, { useState, useEffect } from 'react';
import { API_URL } from '../../api';
import { usePrograma } from '../../components/programa/ProgramaContext';
import { PageHero, EmptyState, Spinner } from '../../components/programa/ProgramaUI';

export default function ProgramaGrupos() {
  const { programa, slug } = usePrograma();
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/grupos-pesquisa?programa=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setGrupos(Array.isArray(d) ? d : []))
      .catch(() => setGrupos([]))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div>
      <PageHero icon="fa-microscope" eyebrow={programa.sigla} title="Grupos de Pesquisa" subtitle="Núcleos de investigação do programa" />

      <div className="container mx-auto px-4 py-10">
        {loading ? <Spinner /> : grupos.length === 0 ? (
          <EmptyState icon="fa-microscope" titulo="Nenhum grupo cadastrado" descricao="Os grupos de pesquisa deste programa serão listados aqui em breve." />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {grupos.map((g) => (
              <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <span className="shrink-0 w-10 h-10 rounded-lg bg-[var(--prog-primary)]/10 flex items-center justify-center text-[var(--prog-primary)]">
                    <i className="fa-solid fa-flask text-sm"></i>
                  </span>
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{g.title}</h3>
                </div>
                {g.body?.summary && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">{g.body.summary}</p>
                )}
                {(g.field_lideres_resolved || []).length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Líderes</p>
                    <ul className="space-y-1">
                      {g.field_lideres_resolved.map((l) => (
                        <li key={l.id} className="flex items-center gap-2 text-xs text-gray-600">
                          <i className="fa-solid fa-user text-[var(--prog-primary)] text-[10px]"></i>
                          {l.nome}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
