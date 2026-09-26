import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_URL, apiFetch, lerJson } from '../../api';
import { usePrograma, programaPath } from '../../components/programa/ProgramaContext';
import { PageHero, EmptyState, Spinner, formatDate, ErrorState } from '../../components/programa/ProgramaUI';
import Icone from '../../components/Icone';

const POR_PAGINA = 9;

export default function ProgramaNoticias() {
  const { programa, slug } = usePrograma();
  // Busca e página ficam na URL e a filtragem acontece no servidor: antes o
  // microsite baixava todas as notícias do programa, com o corpo (Fase P.2).
  const [searchParams, setSearchParams] = useSearchParams();
  const busca = searchParams.get('busca') || '';
  const pagina = Math.max(Number.parseInt(searchParams.get('pagina'), 10) || 1, 1);
  const [resultado, setResultado] = useState({ items: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [search, setSearch] = useState(busca);

  const setParam = (chave, valor) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    if (valor) next.set(chave, valor); else next.delete(chave);
    if (chave !== 'pagina') next.delete('pagina');
    return next;
  }, { replace: chave === 'busca' });

  // Espera a pessoa parar de digitar antes de consultar.
  useEffect(() => { setSearch(busca); }, [busca]);
  useEffect(() => {
    if (search === busca) return undefined;
    const t = setTimeout(() => setParam('busca', search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErro(null);
    const params = new URLSearchParams({ programa: slug, resumo: '1', page: String(pagina), limit: String(POR_PAGINA) });
    if (busca) params.set('q', busca);
    lerJson(`/api/news?${params}`, { auth: false })
      .then((d) => { if (active) setResultado(d); })
      .catch((e) => { if (active) setErro(e); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, busca, pagina]);

  const filtered = resultado.items || [];

  return (
    <>
      <PageHero icon="fa-newspaper" eyebrow="Comunicação" title="Notícias"
        subtitle={`Novidades, comunicados e eventos do programa ${programa.nome}.`} />

      <div className="container mx-auto px-4 py-12">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 relative max-w-xl">
          <Icone nome="fa-solid fa-search" className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar notícia..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--prog-accent)] text-sm"
          />
        </div>

        {loading ? (
          <Spinner />
        ) : erro ? (
          <ErrorState erro={erro} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="fa-newspaper" title="Nenhuma notícia encontrada"
            hint={search ? 'Tente outro termo de busca.' : 'Ainda não há notícias publicadas para este programa.'} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filtered.map((n) => (
              <Link key={n.id} to={programaPath(slug, `noticias/${n.id}`)}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 flex flex-col">
                {n.image && (
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                    <img src={n.image.startsWith('http') ? n.image : `${API_URL}${n.image}`} alt={n.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    {n.category && (
                      <span className="absolute top-3 left-3 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-[var(--prog-accent)] text-[var(--prog-primary)] shadow">
                        {n.category}
                      </span>
                    )}
                  </div>
                )}
                <div className="p-5 flex flex-col flex-grow">
                  <span className="text-xs text-gray-400 mb-2"><Icone nome="fa-regular fa-calendar" className="mr-1.5" />{formatDate(n.date)}</span>
                  <h3 className="font-heading font-bold text-[var(--prog-primary)] leading-snug mb-2 group-hover:opacity-80">{n.title}</h3>
                  {n.excerpt && <p className="text-sm text-gray-600 line-clamp-3 mb-3">{n.excerpt}</p>}
                  <span className="mt-auto text-sm font-semibold text-[var(--prog-primary)] flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                    Ler notícia <Icone nome="fa-solid fa-arrow-right" className="text-xs" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && !erro && resultado.pages > 1 && (
          <nav aria-label="Paginação" className="flex justify-center items-center gap-3 mt-10">
            <button type="button" disabled={pagina <= 1} onClick={() => { setParam('pagina', pagina > 2 ? String(pagina - 1) : ''); window.scrollTo({ top: 0 }); }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-[var(--prog-primary)] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              Anterior
            </button>
            <span className="text-sm text-gray-600" aria-live="polite">Página {resultado.page} de {resultado.pages}</span>
            <button type="button" disabled={pagina >= resultado.pages} onClick={() => { setParam('pagina', String(pagina + 1)); window.scrollTo({ top: 0 }); }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-[var(--prog-primary)] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              Próxima
            </button>
          </nav>
        )}
      </div>
    </>
  );
}
