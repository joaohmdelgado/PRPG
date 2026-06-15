import React, { useState, useEffect } from 'react';
import { API_URL } from '../../api';
import { usePrograma } from '../../components/programa/ProgramaContext';
import { PageHero, EmptyState, Spinner } from '../../components/programa/ProgramaUI';

const TIPOS = { OB: 'Obrigatória', OP: 'Optativa', EL: 'Eletiva' };

export default function ProgramaDisciplinas() {
  const { programa, slug } = usePrograma();
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/disciplinas?programa=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDisciplinas(Array.isArray(d) ? d : []))
      .catch(() => setDisciplinas([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const filtradas = disciplinas.filter((d) => {
    const ok = !busca || d.title?.toLowerCase().includes(busca.toLowerCase()) || d.field_docente?.toLowerCase().includes(busca.toLowerCase());
    const okTipo = !tipo || d.field_tipo_disciplina === tipo;
    return ok && okTipo;
  });

  const tipos = [...new Set(disciplinas.map((d) => d.field_tipo_disciplina).filter(Boolean))];

  return (
    <div>
      <PageHero icon="fa-book-open" eyebrow={programa.sigla} title="Disciplinas" subtitle="Grade curricular do programa" />

      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            placeholder="Buscar disciplina ou docente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--prog-primary)] focus:border-transparent"
          />
          {tipos.length > 0 && (
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">Todos os tipos</option>
              {tipos.map((t) => <option key={t} value={t}>{TIPOS[t] || t}</option>)}
            </select>
          )}
        </div>

        {loading ? <Spinner /> : filtradas.length === 0 ? (
          <EmptyState icon="fa-book-open" titulo="Nenhuma disciplina encontrada" descricao={busca || tipo ? 'Tente outros filtros.' : 'Este programa ainda não cadastrou disciplinas.'} />
        ) : (
          <div className="space-y-3">
            {filtradas.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[var(--prog-primary)]/30 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{d.title}</h3>
                    {d.field_docente_resolved?.nome && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <i className="fa-solid fa-chalkboard-teacher text-[var(--prog-primary)]"></i>
                        {d.field_docente_resolved.nome}
                      </p>
                    )}
                    {d.field_ementa && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">{d.field_ementa}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {d.field_tipo_disciplina && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--prog-primary)]/10 text-[var(--prog-primary)]">
                        {TIPOS[d.field_tipo_disciplina] || d.field_tipo_disciplina}
                      </span>
                    )}
                    {d.field_carga_horaria && (
                      <span className="text-xs text-gray-400">{d.field_carga_horaria}h</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
