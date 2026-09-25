import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_URL, apiFetch } from '../api';
import useVocabulario, { corDe } from '../hooks/useVocabulario';
import CabecalhoPagina from '../components/CabecalhoPagina';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (regex.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = months[parseInt(month, 10) - 1];
    return `${parseInt(day, 10)} de ${monthName}, ${year}`;
  }
  return dateStr;
};

const POR_PAGINA = 6;

export default function Noticias() {
  // Filtros e página ficam na URL (link compartilhável, voltar do navegador
  // funciona). A filtragem e a paginação acontecem no servidor (Fase F.3):
  // antes a página baixava todas as notícias, com o corpo completo.
  const [searchParams, setSearchParams] = useSearchParams();
  const busca = searchParams.get('search') || '';
  const category = searchParams.get('categoria') || '';
  const year = searchParams.get('ano') || '';
  const currentPage = Math.max(Number.parseInt(searchParams.get('pagina'), 10) || 1, 1);

  const [search, setSearch] = useState(busca);
  const [resultado, setResultado] = useState({ items: [], pages: 1, total: 0, anos: [] });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  // Categorias e cores dos selos vêm do painel (Classificações — Fase F.4).
  const { itens: categorias } = useVocabulario('noticia.categoria');

  // Atualiza a URL; qualquer mudança de filtro volta para a página 1.
  const setFiltro = (chave, valor) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    if (valor) next.set(chave, valor); else next.delete(chave);
    if (chave !== 'pagina') next.delete('pagina');
    return next;
  });

  // Busca digitada: espera a pessoa parar de digitar antes de consultar.
  useEffect(() => { setSearch(busca); }, [busca]);
  useEffect(() => {
    if (search === busca) return undefined;
    const t = setTimeout(() => setFiltro('search', search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let vivo = true;
    const params = new URLSearchParams({ resumo: '1', escopo: 'portal', page: String(currentPage), limit: String(POR_PAGINA) });
    if (busca) params.set('q', busca);
    if (category) params.set('categoria', category);
    if (year) params.set('ano', year);
    setErro(false);
    apiFetch(`/api/news?${params}`, { auth: false })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((data) => { if (vivo) setResultado(data); })
      .catch(() => { if (vivo) setErro(true); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [busca, category, year, currentPage]);

  const paginatedNoticias = resultado.items;
  const totalPages = resultado.pages;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setFiltro('pagina', page > 1 ? String(page) : '');
      window.scrollTo({ top: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center py-24">
        <div className="text-xl text-gray-500">Carregando notícias...</div>
      </div>
    );
  }

  return (
    <>
      <CabecalhoPagina
        icone="fa-solid fa-bullhorn"
        titulo="Histórico de Notícias"
        subtitulo="Acompanhe todas as novidades, eventos e comunicados da Pró-Reitoria de Pós-Graduação."
      />

      {/* Main Content */}
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          
          {/* Filters */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 z-20 relative">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full relative pt-2">
                <label className="absolute -top-1 left-2 bg-white px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Buscar notícia
                </label>
                <div className="relative">
                  <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Buscar notícia"
                    placeholder="Ex: Evento de Pós-Graduação..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-blue focus:border-ufrpe-blue outline-none transition-all text-sm"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-48 relative pt-2">
                <label className="absolute -top-1 left-2 bg-white px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setFiltro('categoria', e.target.value)}
                  aria-label="Categoria"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-blue focus:border-ufrpe-blue outline-none transition-all appearance-none cursor-pointer text-sm"
                >
                  <option value="">Todas</option>
                  {categorias.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
              </div>

              <div className="w-full md:w-32 relative pt-2">
                <label className="absolute -top-1 left-2 bg-white px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Ano
                </label>
                <select
                  value={year}
                  onChange={(e) => setFiltro('ano', e.target.value)}
                  aria-label="Ano"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-blue focus:border-ufrpe-blue outline-none transition-all appearance-none cursor-pointer text-sm"
                >
                  <option value="">Todos</option>
                  {(resultado.anos || []).map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
              </div>
            </div>
          </div>

          {/* News Grid */}
          {erro ? (
            <div role="alert" className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm max-w-lg mx-auto">
              <i className="fa-solid fa-triangle-exclamation text-gray-300 text-5xl mb-4" aria-hidden="true"></i>
              <h3 className="font-heading font-bold text-xl text-gray-700 mb-2">Não foi possível carregar as notícias</h3>
              <p className="text-gray-500">Tente novamente em alguns instantes.</p>
            </div>
          ) : paginatedNoticias.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm max-w-lg mx-auto">
              <i className="fa-solid fa-newspaper text-gray-300 text-5xl mb-4"></i>
              <h3 className="font-heading font-bold text-xl text-gray-700 mb-2">Nenhuma notícia encontrada</h3>
              <p className="text-gray-500">Tente ajustar seus filtros de busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedNoticias.map((item) => (
                <div key={item.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100 flex flex-col h-full">
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-200">
                    <img
                      src={item.image?.startsWith('http') ? item.image : `${API_URL}${item.image}`}
                      alt={item.imagemAlt || ""}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    {item.category && (
                      <div className={`absolute top-4 left-4 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md ${corDe(categorias, item.categorySlug)}`}>
                        {item.category}
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                      <i className="fa-regular fa-calendar"></i> {formatDate(item.date)}
                    </div>
                    
                    <h3 className="font-heading font-bold text-xl text-ufrpe-blue mb-3 group-hover:text-ufrpe-cyan transition leading-tight">
                      <Link to={`/noticia/${item.id}`}>
                        {item.title}
                      </Link>
                    </h3>
                    
                    <p className="text-gray-600 text-sm line-clamp-3 mb-4">{item.excerpt}</p>
                    
                    <Link
                      to={`/noticia/${item.id}`}
                      className={`mt-auto font-semibold text-sm flex items-center gap-2 group-hover:translate-x-1 transition-transform text-ufrpe-blue`}
                    >
                      Ler notícia <i className="fa-solid fa-arrow-right text-xs"></i>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-12">
              <nav className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-colors cursor-pointer ${
                      currentPage === page
                        ? 'bg-ufrpe-blue text-white shadow-sm'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-ufrpe-blue'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>
              </nav>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
