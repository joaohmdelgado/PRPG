import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Editais() {
  const [search, setSearch] = useState("");
  const [situation, setSituation] = useState("");
  const [year, setYear] = useState("");
  const [editaisData, setEditaisData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEditais = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/editais');
        const data = await response.json();
        
        const grouped = {
          'mestrado-doutorado': { id: 'mestrado-doutorado', title: 'Mestrado e Doutorado', items: [] },
          'especializacao': { id: 'especializacao', title: 'Especialização', items: [] },
          'residencia': { id: 'residencia', title: 'Residência', items: [] },
          'internacionalizacao': { id: 'internacionalizacao', title: 'Internacionalização', items: [] }
        };

        data.forEach(edital => {
          if (grouped[edital.categoryId]) {
            let borderClass = 'border-l-8 border-gray-300';
            let badgeClass = 'bg-gray-200 text-gray-700';

            if (edital.situation === 'abertas') {
              borderClass = 'border-l-8 border-ufrpe-cyan';
              badgeClass = 'bg-cyan-100 text-cyan-800';
            } else if (edital.situation === 'andamento') {
              borderClass = 'border-l-8 border-ufrpe-yellow';
              badgeClass = 'bg-yellow-100 text-yellow-800';
            }

            const formatDate = (d) => {
              if (!d) return '';
              const parts = d.split('-');
              if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
              return d;
            };

            grouped[edital.categoryId].items.push({
              ...edital,
              publishedAt: formatDate(edital.publishedAt),
              deadline: formatDate(edital.deadline),
              borderClass,
              badgeClass
            });
          }
        });

        const finalData = Object.values(grouped).filter(cat => cat.items.length > 0);
        setEditaisData(finalData);
      } catch (error) {
        console.error('Erro ao buscar editais:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEditais();
  }, []);

  const getLinkUrl = (link) => {
    if (!link) return '#';
    if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('#')) {
      return link;
    }
    return `http://localhost:5000${link}`;
  };

  const filteredData = editaisData.map(section => {
    const filteredItems = section.items.filter(edital => {
      const matchesSearch = search === "" || 
        edital.title.toLowerCase().includes(search.toLowerCase()) || 
        (edital.description && edital.description.toLowerCase().includes(search.toLowerCase())) ||
        (edital.numero && edital.numero.toLowerCase().includes(search.toLowerCase()));
      const matchesSituation = situation === "" || edital.situation === situation;
      const matchesYear = year === "" || edital.year.toString() === year;
      return matchesSearch && matchesSituation && matchesYear;
    });
    return { ...section, items: filteredItems };
  }).filter(section => section.items.length > 0);

  const totalFilteredCount = filteredData.reduce((acc, curr) => acc + curr.items.length, 0);
  const hasActiveFilters = search !== "" || situation !== "" || year !== "";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ufrpe-blue"></div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-scroll text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
        <div className="container mx-auto px-4">
          <nav className="flex text-white/60 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link to="/" className="hover:text-ufrpe-yellow transition-colors">Início</Link>
              </li>
              <li>
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-white">Documentos</span>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-ufrpe-yellow font-medium">Editais</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Painel de Editais</h1>
          <p className="text-white/70 mt-4 text-lg">
            Acompanhe todos os editais, processos seletivos e chamadas públicas da Pró-Reitoria de Pós-Graduação.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar / Navigation */}
            <div className="lg:w-1/4 shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-28">
                <div className="bg-gray-50 text-gray-800 m-0 p-5 border-b border-gray-100">
                  <h3 className="font-heading font-bold text-lg m-0">
                    <i className="fa-solid fa-list mr-2 text-ufrpe-blue opacity-70"></i> Categorias
                  </h3>
                </div>
                <div className="p-6">
                  <nav className="space-y-2">
                    {editaisData.map(section => (
                      <a 
                        key={section.id} 
                        href={`#${section.id}`} 
                        className="flex gap-3 w-full text-left p-2.5 rounded-lg transition text-sm text-gray-700 hover:bg-gray-50 hover:text-ufrpe-blue group"
                      >
                        <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                        <span className="leading-snug">{section.title}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:w-3/4">
              
              {/* Filters Form */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 z-20 relative">
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full relative pt-2">
                    <label className="absolute -top-1 left-2 bg-white px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Buscar edital
                    </label>
                    <div className="relative">
                      <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ex: Edital Proext, Seleção Mestrado..."
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-blue focus:border-ufrpe-blue outline-none transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="w-full md:w-48 relative pt-2">
                    <label className="absolute -top-1 left-2 bg-white px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Situação
                    </label>
                    <select
                      value={situation}
                      onChange={(e) => setSituation(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-blue focus:border-ufrpe-blue outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Todas</option>
                      <option value="abertas">Inscrições Abertas</option>
                      <option value="andamento">Em Andamento</option>
                      <option value="concluido">Concluído</option>
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
                  </div>

                  <div className="w-full md:w-32 relative pt-2">
                    <label className="absolute -top-1 left-2 bg-white px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Ano
                    </label>
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-blue focus:border-ufrpe-blue outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Todos</option>
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setSituation("");
                        setYear("");
                      }}
                      className="w-full md:w-auto px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </form>
              </div>

              {/* Editais List grouped by Category */}
              <div className="space-y-10">
                {totalFilteredCount === 0 ? (
                  <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
                    <i className="fa-solid fa-folder-open text-4xl mb-4 text-gray-300"></i>
                    <p className="font-medium">Nenhum edital encontrado com os filtros selecionados.</p>
                    <button
                      onClick={() => {
                        setSearch("");
                        setSituation("");
                        setYear("");
                      }}
                      className="mt-4 px-6 py-2.5 bg-ufrpe-blue hover:bg-ufrpe-yellow text-white font-bold rounded-lg transition-colors text-sm cursor-pointer"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                ) : (
                  filteredData.map(section => (
                    <section key={section.id} id={section.id} className="scroll-mt-28">
                      <h2 className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue mb-6 pb-4 border-b-2 border-ufrpe-yellow flex items-center justify-between">
                        <span>{section.title}</span>
                        <span className="text-xs font-sans font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                          {section.items.length} {section.items.length === 1 ? 'edital' : 'editais'}
                        </span>
                      </h2>

                      <div className="space-y-4">
                        {section.items.map(edital => (
                          <div
                            key={edital.id}
                            className={`bg-white p-6 rounded-2xl shadow-sm ${edital.borderClass} hover:shadow-md transition`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                  <span className={`${edital.badgeClass} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider`}>
                                    {edital.situationLabel}
                                  </span>
                                  {edital.numero && (
                                    <span className="text-xs font-bold bg-ufrpe-blue/10 text-ufrpe-blue px-2.5 py-1 rounded-md">
                                      Nº {edital.numero}/{edital.year}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                                    <i className="fa-regular fa-calendar mr-1"></i> Publicado em: {edital.publishedAt}
                                  </span>
                                  {edital.deadline && (
                                    <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                                      <i className="fa-regular fa-clock mr-1"></i> Inscrições até: {edital.deadline}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-heading font-bold text-xl md:text-2xl text-ufrpe-blue hover:text-ufrpe-yellow transition-colors leading-tight mb-2">
                                  <Link to={`/editais/${edital.id}`}>{edital.title}</Link>
                                </h3>
                                <div className="text-gray-600 text-sm prose prose-sm max-w-none html-content mb-4" dangerouslySetInnerHTML={{ __html: edital.description }} />

                                {/* Documentos Relacionados */}
                                {(edital.resultadoParcial || edital.resultadoFinal || (edital.erratas && edital.erratas.length > 0)) && (
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                      <i className="fa-solid fa-paperclip mr-1.5 text-ufrpe-blue opacity-70"></i> Documentos do Processo
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {edital.resultadoParcial && (
                                        <a
                                          href={getLinkUrl(edital.resultadoParcial)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                        >
                                          <i className="fa-regular fa-file-pdf text-red-500"></i> Resultado Parcial
                                        </a>
                                      )}
                                      {edital.resultadoFinal && (
                                        <a
                                          href={getLinkUrl(edital.resultadoFinal)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                        >
                                          <i className="fa-regular fa-file-pdf text-red-500"></i> Resultado Final
                                        </a>
                                      )}
                                      {edital.erratas && edital.erratas.map((errata) => (
                                        errata.downloadLink && (
                                          <a
                                            key={errata.id}
                                            href={getLinkUrl(errata.downloadLink)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                          >
                                            <i className="fa-regular fa-file-pdf text-red-500"></i> {errata.numero ? `Errata ${errata.numero}` : (errata.title || 'Errata')}
                                          </a>
                                        )
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto">
                                <a
                                  href={getLinkUrl(edital.downloadLink)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-5 py-2.5 bg-ufrpe-cyan text-white text-sm font-bold rounded-lg hover:bg-ufrpe-blue transition-colors flex items-center justify-center gap-2 w-full lg:w-auto"
                                >
                                  <i className="fa-solid fa-download"></i> Baixar Edital
                                </a>
                                <Link
                                  to={`/editais/${edital.id}`}
                                  className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 w-full lg:w-auto"
                                >
                                  Ver Detalhes
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}
