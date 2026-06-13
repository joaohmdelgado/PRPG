import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_URL } from '../api';

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

export default function Noticias() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [noticiasData, setNoticiasData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(`${API_URL}/api/news`);
        const data = await response.json();
        setNoticiasData(data);
      } catch (error) {
        console.error('Erro ao buscar notícias:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  // Sync search state if URL parameter changes
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);
  
  // Apply filtering
  const filteredNoticias = noticiasData.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.excerpt.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === '' || item.categorySlug === category;
    const matchesYear = year === '' || item.year === year;
    return matchesSearch && matchesCategory && matchesYear;
  });

  // Pagination settings (can be extended)
  const itemsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredNoticias.length / itemsPerPage);
  
  const paginatedNoticias = filteredNoticias.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getCategoryBadgeClass = (categorySlug) => {
    switch (categorySlug) {
      case 'pesquisa':
        return 'bg-ufrpe-cyan text-white';
      case 'editais':
        return 'bg-ufrpe-yellow text-ufrpe-blue';
      case 'institucional':
        return 'bg-blue-600 text-white';
      case 'internacional':
        return 'bg-purple-600 text-white';
      case 'eventos':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getCategoryBadgeTextClass = (categorySlug) => {
    switch (categorySlug) {
      case 'pesquisa':
        return 'text-ufrpe-cyan';
      case 'editais':
        return 'text-ufrpe-yellow-hover';
      case 'institucional':
        return 'text-blue-600';
      case 'internacional':
        return 'text-purple-600';
      case 'eventos':
        return 'text-green-600';
      default:
        return 'text-gray-600';
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
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-bullhorn text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
        <div className="container mx-auto px-4">
          <nav className="flex text-white/60 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link to="/" className="hover:text-ufrpe-yellow transition-colors">Início</Link>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-ufrpe-yellow font-medium">Notícias</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Histórico de Notícias</h1>
          <p className="text-white/70 mt-4 text-lg">
            Acompanhe todas as novidades, eventos e comunicados da Pró-Reitoria de Pós-Graduação.
          </p>
        </div>
      </div>

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
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearch(val);
                      setCurrentPage(1);
                      setSearchParams((prev) => {
                        if (val) {
                          prev.set('search', val);
                        } else {
                          prev.delete('search');
                        }
                        return prev;
                      });
                    }}
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
                  onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-blue focus:border-ufrpe-blue outline-none transition-all appearance-none cursor-pointer text-sm"
                >
                  <option value="">Todas</option>
                  <option value="pesquisa">Pesquisa</option>
                  <option value="institucional">Institucional</option>
                  <option value="eventos">Eventos</option>
                  <option value="internacional">Internacional</option>
                  <option value="editais">Editais</option>
                </select>
                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
              </div>

              <div className="w-full md:w-32 relative pt-2">
                <label className="absolute -top-1 left-2 bg-white px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Ano
                </label>
                <select
                  value={year}
                  onChange={(e) => { setYear(e.target.value); setCurrentPage(1); }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-blue focus:border-ufrpe-blue outline-none transition-all appearance-none cursor-pointer text-sm"
                >
                  <option value="">Todos</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
                <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
              </div>
            </div>
          </div>

          {/* News Grid */}
          {paginatedNoticias.length === 0 ? (
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
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className={`absolute top-4 left-4 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md ${getCategoryBadgeClass(item.categorySlug)}`}>
                      {item.category}
                    </div>
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
                      className={`mt-auto font-semibold text-sm flex items-center gap-2 group-hover:translate-x-1 transition-transform ${getCategoryBadgeTextClass(item.categorySlug)}`}
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
