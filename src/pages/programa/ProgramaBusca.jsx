import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_URL } from '../../api';
import { usePrograma, programaPath } from '../../components/programa/ProgramaContext';

const TIPO_META = {
  noticia:    { label: 'Notícia',    icon: 'fa-newspaper',       color: 'text-blue-600',   bg: 'bg-blue-50' },
  edital:     { label: 'Edital',     icon: 'fa-file-lines',      color: 'text-green-600',  bg: 'bg-green-50' },
  disciplina: { label: 'Disciplina', icon: 'fa-book-open',       color: 'text-purple-600', bg: 'bg-purple-50' },
  tese:       { label: 'Tese/Diss.', icon: 'fa-graduation-cap',  color: 'text-orange-600', bg: 'bg-orange-50' },
  faq:        { label: 'FAQ',        icon: 'fa-circle-question',  color: 'text-teal-600',   bg: 'bg-teal-50' },
  grupo:      { label: 'Grupo',      icon: 'fa-microscope',       color: 'text-pink-600',   bg: 'bg-pink-50' },
};

const TIPO_SUB = {
  noticia: (id) => `noticias/${id}`,
  edital:  (id) => `editais`,
  disciplina: () => 'disciplinas',
  tese:    () => 'teses',
  faq:     () => 'faq',
  grupo:   () => 'grupos-pesquisa',
};

function highlight(text, q) {
  if (!text || !q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? <mark key={i} className="bg-[var(--prog-accent)]/30 rounded px-0.5">{p}</mark> : p
  );
}

export default function ProgramaBusca() {
  const { slug } = usePrograma();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [input, setInput] = useState(q);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(false);
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/programas/slug/${encodeURIComponent(slug)}/busca?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { setResults(Array.isArray(d) ? d : []); setSearched(true); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [q, slug]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (input.trim()) setSearchParams({ q: input.trim() });
  };

  return (
    <section className="py-10 px-4 max-w-3xl mx-auto">
      <h1 className="font-heading font-bold text-2xl text-[var(--prog-primary)] mb-6">Busca no programa</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Buscar notícias, editais, disciplinas, teses, FAQ..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--prog-primary)]/30 bg-white"
          />
        </div>
        <button type="submit"
          className="px-5 py-3 bg-[var(--prog-primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          Buscar
        </button>
      </form>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--prog-primary)]"></div>
        </div>
      )}

      {!loading && searched && q.length >= 2 && (
        <p className="text-sm text-gray-500 mb-4">
          {results.length === 0
            ? `Nenhum resultado para "${q}".`
            : `${results.length} resultado${results.length !== 1 ? 's' : ''} para "${q}"`}
        </p>
      )}

      {!loading && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((r, i) => {
            const meta = TIPO_META[r.tipo] || TIPO_META.noticia;
            const subPath = TIPO_SUB[r.tipo]?.(r.id) || '';
            return (
              <li key={i}>
                <Link to={programaPath(slug, subPath)}
                  className="block bg-white rounded-xl border border-gray-100 hover:border-[var(--prog-primary)]/20 hover:shadow-md transition-all p-4">
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 mt-0.5 w-7 h-7 rounded-lg ${meta.bg} ${meta.color} flex items-center justify-center text-xs`}>
                      <i className={`fa-solid ${meta.icon}`}></i>
                    </span>
                    <div className="min-w-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                      <p className="font-semibold text-gray-900 text-sm leading-snug mt-0.5">
                        {highlight(r.titulo, q)}
                      </p>
                      {r.resumo && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{highlight(r.resumo, q)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !searched && q.length < 2 && (
        <div className="text-center py-16 text-gray-400">
          <i className="fa-solid fa-magnifying-glass text-4xl mb-4 block opacity-30"></i>
          <p className="text-sm">Digite ao menos 2 caracteres para buscar.</p>
        </div>
      )}
    </section>
  );
}
