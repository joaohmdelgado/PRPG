import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_URL } from '../api';
import SafeHtml from '../components/SafeHtml';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

export default function Edital() {
  const { id } = useParams();
  const [edital, setEdital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEdital = async () => {
      try {
        const response = await fetch(`${API_URL}/api/editais/${id}`);
        if (response.ok) {
          const data = await response.json();
          setEdital(data);
        } else {
          setError('Edital não encontrado.');
        }
      } catch (err) {
        setError('Erro de conexão ao buscar edital.');
      } finally {
        setLoading(false);
      }
    };
    fetchEdital();
  }, [id]);

  const getLinkUrl = (link) => {
    if (!link) return '#';
    if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('#')) {
      return link;
    }
    return `${API_URL}${link}`;
  };

  const getSituationBadge = (situation) => {
    switch (situation) {
      case 'abertas':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'andamento':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSituationLabel = (situation) => {
    switch (situation) {
      case 'abertas': return 'Inscrições Abertas';
      case 'andamento': return 'Em Andamento';
      default: return 'Concluído';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ufrpe-blue"></div>
      </div>
    );
  }

  if (error || !edital) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <i className="fa-solid fa-circle-exclamation text-gray-300 text-6xl mb-4"></i>
        <h2 className="font-heading font-bold text-3xl text-ufrpe-blue mb-4">Edital não encontrado</h2>
        <p className="text-gray-600 mb-8">{error || 'O edital solicitado não existe ou foi removido.'}</p>
        <Link
          to="/editais"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ufrpe-blue hover:bg-ufrpe-yellow hover:text-ufrpe-blue text-white font-bold rounded-xl transition-all"
        >
          <i className="fa-solid fa-arrow-left"></i> Voltar para Editais
        </Link>
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
                  <Link to="/editais" className="hover:text-ufrpe-yellow transition-colors text-white/60">Editais</Link>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-ufrpe-yellow font-medium truncate max-w-[200px] md:max-w-xs">{edital.title}</span>
                </div>
              </li>
            </ol>
          </nav>
          
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getSituationBadge(edital.situation)}`}>
              {getSituationLabel(edital.situation)}
            </span>
            {edital.numero && (
              <span className="text-xs font-bold bg-white/10 text-ufrpe-yellow px-3 py-1 rounded-md">
                Edital Nº {edital.numero}/{edital.year}
              </span>
            )}
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold leading-tight">
            {edital.title}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Column: Description & Documents */}
            <div className="lg:w-2/3 space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-ufrpe-blue mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <i className="fa-solid fa-file-lines text-ufrpe-yellow"></i> Descrição / Detalhes do Edital
                </h2>
                <SafeHtml
                  className="text-gray-700 leading-relaxed html-content prose prose-blue max-w-none"
                  html={edital.description}
                />
              </div>

              {/* Documentos Relacionados */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-ufrpe-blue mb-6 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <i className="fa-solid fa-paperclip text-ufrpe-yellow"></i> Documentos Relacionados
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Edital Principal */}
                  {edital.downloadLink && (
                    <div className="flex items-center gap-4 bg-blue-50/50 p-4 border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-file-pdf text-xl"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-ufrpe-blue truncate">Edital Oficial</h4>
                        <p className="text-xs text-gray-500">Documento Principal</p>
                      </div>
                      <a
                        href={getLinkUrl(edital.downloadLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-lg transition-all"
                        title="Baixar PDF"
                      >
                        <i className="fa-solid fa-download"></i>
                      </a>
                    </div>
                  )}

                  {/* Resultado Parcial */}
                  {edital.resultadoParcial && (
                    <div className="flex items-center gap-4 bg-amber-50/30 p-4 border border-amber-100 rounded-xl hover:bg-amber-50/65 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-file-pdf text-xl"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-amber-900 truncate">Resultado Parcial</h4>
                        <p className="text-xs text-gray-500">Resultado preliminar</p>
                      </div>
                      <a
                        href={getLinkUrl(edital.resultadoParcial)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white text-amber-700 hover:text-white hover:bg-amber-600 border border-amber-200 rounded-lg transition-all"
                        title="Baixar PDF"
                      >
                        <i className="fa-solid fa-download"></i>
                      </a>
                    </div>
                  )}

                  {/* Resultado Final */}
                  {edital.resultadoFinal && (
                    <div className="flex items-center gap-4 bg-emerald-50/30 p-4 border border-emerald-100 rounded-xl hover:bg-emerald-50/65 transition-colors group">
                      <div className="w-12 h-12 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-file-pdf text-xl"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-emerald-950 truncate">Resultado Final</h4>
                        <p className="text-xs text-gray-500">Resultado conclusivo</p>
                      </div>
                      <a
                        href={getLinkUrl(edital.resultadoFinal)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white text-emerald-700 hover:text-white hover:bg-emerald-600 border border-emerald-200 rounded-lg transition-all"
                        title="Baixar PDF"
                      >
                        <i className="fa-solid fa-download"></i>
                      </a>
                    </div>
                  )}
                </div>

                {/* Erratas */}
                {edital.erratas && edital.erratas.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wider mb-4">
                      Retificações / Erratas ({edital.erratas.length})
                    </h3>
                    <div className="space-y-3">
                      {edital.erratas.map((errata, idx) => (
                        errata.downloadLink && (
                          <div key={errata.id || idx} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-150 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <i className="fa-regular fa-file-pdf text-red-500 text-lg"></i>
                              <span className="text-sm font-semibold text-gray-700">
                                Errata {errata.numero || (idx + 1).toString().padStart(2, '0')}
                              </span>
                            </div>
                            <a
                              href={getLinkUrl(errata.downloadLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-ufrpe-blue hover:text-ufrpe-yellow transition flex items-center gap-1"
                            >
                              <i className="fa-solid fa-download"></i> Baixar Arquivo
                            </a>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Metadata & Action Card */}
            <div className="lg:w-1/3">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 sticky top-28">
                <div>
                  <h3 className="font-bold text-lg text-ufrpe-blue mb-4 pb-2 border-b border-gray-100">
                    Informações Gerais
                  </h3>
                  <div className="space-y-4 text-sm">
                    {edital.publishedAt && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-gray-400 font-medium">Publicação</span>
                        <span className="text-gray-700 font-bold">{formatDate(edital.publishedAt)}</span>
                      </div>
                    )}
                    {edital.field_periodo && edital.field_periodo.data_inicio && edital.field_periodo.data_fim ? (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-gray-50">
                          <span className="text-gray-400 font-medium">Início das Inscrições</span>
                          <span className="text-gray-700 font-bold">{formatDate(edital.field_periodo.data_inicio)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-50">
                          <span className="text-gray-400 font-medium">Fim das Inscrições</span>
                          <span className="text-red-600 font-bold">{formatDate(edital.field_periodo.data_fim)}</span>
                        </div>
                      </>
                    ) : (
                      edital.deadline && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-50">
                          <span className="text-gray-400 font-medium">Inscrições até</span>
                          <span className="text-red-600 font-bold">{formatDate(edital.deadline)}</span>
                        </div>
                      )
                    )}
                    {edital.numero && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-gray-400 font-medium">Número</span>
                        <span className="text-gray-700 font-bold">Nº {edital.numero}/{edital.year}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-400 font-medium">Situação</span>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${getSituationBadge(edital.situation)}`}>
                        {getSituationLabel(edital.situation)}
                      </span>
                    </div>
                  </div>
                </div>

                {edital.downloadLink && (
                  <a
                    href={getLinkUrl(edital.downloadLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-ufrpe-cyan hover:bg-ufrpe-blue text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-file-arrow-down"></i>
                    Baixar Edital Completo
                  </a>
                )}

                <div className="text-center pt-2">
                  <Link
                    to="/editais"
                    className="text-sm font-bold text-gray-500 hover:text-ufrpe-blue transition flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-arrow-left text-xs"></i>
                    Voltar para todos os Editais
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
