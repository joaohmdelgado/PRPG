import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api';
import SafeHtml from '../components/SafeHtml';

export default function Resolucoes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [resolucoesData, setResolucoesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResolucoes = async () => {
      try {
        const response = await fetch(`${API_URL}/api/resolucoes`);
        const data = await response.json();

        // As seções principais com ordem de exibição pré-definida
        const sectionOrder = ['mestrado-doutorado', 'internacionalizacao', 'lato-sensu', 'apoio-financeiro', 'outras'];
        const sectionTitles = {
          'mestrado-doutorado': 'Mestrado e Doutorado',
          'internacionalizacao': 'Internacionalização',
          'lato-sensu': 'Lato sensu',
          'apoio-financeiro': 'Apoio Financeiro',
          'outras': 'Outras / Institucional'
        };

        const sectionsMap = {};

        data.forEach(item => {
          const { sectionId, sectionTitle, categoryTitle, title, desc, link } = item;
          const sid = sectionId || 'outras';
          
          if (!sectionsMap[sid]) {
            sectionsMap[sid] = {
              id: sid,
              title: sectionTitle || sectionTitles[sid] || sid,
              categoriesMap: {}
};
          }

          const catTitle = categoryTitle || 'Geral';
          if (!sectionsMap[sid].categoriesMap[catTitle]) {
            sectionsMap[sid].categoriesMap[catTitle] = {
              title: catTitle,
              docs: []
            };
          }

          sectionsMap[sid].categoriesMap[catTitle].docs.push({
            title,
            desc,
            link
          });
        });

        const structuredData = sectionOrder
          .filter(sid => sectionsMap[sid])
          .map(sid => {
            const section = sectionsMap[sid];
            const categories = Object.values(section.categoriesMap);
            return {
              id: section.id,
              title: section.title,
              categories
            };
          });

        Object.keys(sectionsMap).forEach(sid => {
          if (!sectionOrder.includes(sid)) {
            const section = sectionsMap[sid];
            const categories = Object.values(section.categoriesMap);
            structuredData.push({
              id: section.id,
              title: section.title,
              categories
            });
          }
        });

        setResolucoesData(structuredData);
      } catch (error) {
        console.error('Erro ao buscar resoluções:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResolucoes();
  }, []);

  // Filter content based on search term
  const filteredData = resolucoesData.map(section => {
    const filteredCategories = section.categories.map(cat => {
      const filteredDocs = cat.docs.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.desc && doc.desc.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      return { ...cat, docs: filteredDocs };
    }).filter(cat => cat.docs.length > 0);

    return { ...section, categories: filteredCategories };
  }).filter(section => section.categories.length > 0);

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
        <i className="fa-solid fa-gavel text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Resoluções</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Resoluções e Legislações</h1>
          <p className="text-white/70 mt-4 text-lg">
            Consulte aqui as resoluções, portarias e normas referentes à Pró-Reitoria de Pós-Graduação.
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
                <div className="bg-gray-50 text-gray-800 p-5 border-b border-gray-100">
                  <h3 className="font-heading font-bold text-lg m-0">
                    <i className="fa-solid fa-list mr-2 text-ufrpe-blue opacity-70"></i> Sumário
                  </h3>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                  <div className="space-y-2">
                      {resolucoesData.map(section => (
                        <a
                          key={section.id}
                          href={`#${section.id}`}
                          className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group"
                        >
                          <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                          <span className="leading-snug">{section.title}</span>
                        </a>
                      ))}
                    </div>
                  
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <a
                      href="#"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-100 text-gray-600 border border-gray-200 rounded-xl hover:bg-ufrpe-yellow hover:text-ufrpe-blue hover:border-ufrpe-yellow transition-all font-bold text-sm"
                    >
                      <i className="fa-solid fa-clock-rotate-left"></i> Resoluções Revogadas
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:w-3/4 space-y-12">
              
              {/* Search Bar */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Digite para buscar resoluções pelo título ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none text-sm transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {filteredData.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm animate-in fade-in duration-300">
                  <i className="fa-solid fa-folder-open text-gray-300 text-5xl mb-4"></i>
                  <h3 className="text-xl font-bold text-ufrpe-blue mb-2">Nenhuma resolução encontrada</h3>
                  <p className="text-gray-500">Experimente buscar por outros termos ou limpar a busca.</p>
                </div>
              ) : (
                filteredData.map(section => (
                  <section key={section.id} id={section.id} className="scroll-mt-28">
                    <h2 className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue mb-6 pb-4 border-b-2 border-ufrpe-yellow">
                      {section.title}
                    </h2>
                    
                    <div className="space-y-4">
                      {section.categories.map((cat, catIdx) => (
                        <details
                          key={catIdx}
                          open={searchTerm ? true : undefined}
                          className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                        >
                          <summary className="p-5 font-bold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition border-b border-transparent group-open:border-gray-100 group-open:bg-gray-50 group-open:text-ufrpe-blue">
                            {cat.title}
                            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 group-open:bg-ufrpe-yellow group-open:text-white text-gray-500 transition-colors">
                              <i className="fa-solid fa-chevron-down transition-transform duration-300 group-open:rotate-180"></i>
                            </span>
                          </summary>
                          <div className="p-6 bg-white space-y-6 border-t border-gray-100">
                            {cat.docs.map((doc, docIdx) => (
                              <div
                                key={docIdx}
                                className="pb-6 border-b border-gray-100 last:border-0 last:pb-0"
                              >
                                <h4 className="font-bold text-ufrpe-blue text-lg mb-1">{doc.title}</h4>
                                {doc.desc && (
                                  <SafeHtml
                                    className="text-sm text-gray-600 mb-4 html-content prose prose-sm max-w-none"
                                    html={doc.desc}
                                  />
                                )}
                                <a
                                  href={doc.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-ufrpe-cyan hover:bg-ufrpe-blue text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  <i className="fa-solid fa-download"></i> Baixar Documento
                                </a>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
