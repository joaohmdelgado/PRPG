import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api';
import SafeHtml from '../components/SafeHtml';

export default function CalendarioAcademico() {
  const [calendariosData, setCalendariosData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalendarios = async () => {
      try {
        const response = await fetch(`${API_URL}/api/calendarios`);
        const data = await response.json();
        setCalendariosData(data);
      } catch (error) {
        console.error('Erro ao buscar calendários:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendarios();
  }, []);

  const currentCalendar = calendariosData.find(c => c.isCurrent);
  const pastCalendars = calendariosData.filter(c => !c.isCurrent);

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
        <i className="fa-solid fa-calendar-days text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
        <div className="container mx-auto px-4">
          <nav className="flex text-white/60 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link to="/" className="hover:text-ufrpe-yellow transition-colors">Início</Link>
              </li>
              <li>
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-white">Mestrado e Doutorado</span>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-ufrpe-yellow font-medium">Calendário Acadêmico</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Calendário Acadêmico</h1>
          <p className="text-white/70 mt-4 text-lg">
            Acompanhe prazos, períodos de matrícula, início de aulas e demais eventos da Pós-Graduação.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Sidebar / Sumário */}
            <div className="lg:w-1/4 shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-28">
                <div className="bg-gray-50 text-gray-800 p-5 border-b border-gray-100">
                  <h3 className="font-heading font-bold text-lg m-0">
                    <i className="fa-solid fa-list mr-2 text-ufrpe-blue opacity-70"></i> Sumário
                  </h3>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                  <div className="space-y-2">
                    <a href="#ano-corrente" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug">Ano Corrente ({currentCalendar?.ano})</span>
                    </a>
                    <a href="#anos-anteriores" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug">Anos Anteriores</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:w-3/4 space-y-12">
              
              {/* Highlighted Current Year Calendar */}
              {currentCalendar && (
                <section id="ano-corrente" className="scroll-mt-28">
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 md:p-8 bg-gray-55/20 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-ufrpe-yellow/15 text-ufrpe-blue text-xs font-bold uppercase tracking-wider mb-2">
                          Ano Letivo Corrente
                        </span>
                        <h2 className="text-2xl md:text-3xl font-heading font-black text-ufrpe-blue">
                          {currentCalendar.title}
                        </h2>
                      </div>
                      <a 
                        href={currentCalendar.pdfLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-ufrpe-blue hover:bg-ufrpe-yellow text-white hover:text-ufrpe-blue font-bold rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
                      >
                        <i className="fa-solid fa-file-pdf"></i> Baixar PDF Completo
                      </a>
                    </div>
                    <div className="p-6 md:p-8">
                      {currentCalendar.description && (
                        <SafeHtml
                          className="text-gray-600 mb-8 leading-relaxed html-content prose prose-sm max-w-none"
                          html={currentCalendar.description}
                        />
                      )}

                      {currentCalendar.milestones && currentCalendar.milestones.length > 0 && (
                        <>
                          <h3 className="font-heading font-bold text-xl text-ufrpe-blue mb-6 flex items-center gap-2">
                            <i className="fa-solid fa-calendar-check text-ufrpe-yellow"></i> Principais Prazos e Datas
                          </h3>

                          <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 bg-gray-50 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500 p-4">
                              <div>Atividade / Evento</div>
                              <div className="mt-2 md:mt-0">Período / Data</div>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {currentCalendar.milestones.map((m, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 p-4 text-sm text-gray-700 hover:bg-gray-50/50 transition">
                                  <div className="font-semibold text-gray-900">{m.event}</div>
                                  <div className="mt-1 md:mt-0 text-gray-500 flex items-center gap-2">
                                    <i className="fa-regular fa-clock text-xs text-ufrpe-yellow"></i> {m.date}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Past Years Calendars */}
              {pastCalendars.length > 0 && (
                <section id="anos-anteriores" className="scroll-mt-28">
                  <h2 className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue mb-6 pb-4 border-b-2 border-ufrpe-yellow">
                    Calendários de Anos Anteriores
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {pastCalendars.map((c, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-md">
                              Ano {c.ano}
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-lg mb-2 leading-snug">{c.title}</h3>
                          {c.description && (
                            <SafeHtml
                              className="text-sm text-gray-500 mb-6 html-content prose prose-sm max-w-none"
                              html={c.description}
                            />
                          )}
                        </div>
                        <a
                          href={c.pdfLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full text-center py-2.5 bg-gray-50 border border-gray-100 text-ufrpe-blue font-bold text-sm rounded-lg hover:bg-ufrpe-blue hover:text-white transition-all cursor-pointer"
                        >
                          <i className="fa-solid fa-download mr-2 opacity-50"></i> Baixar PDF ({c.ano})
                        </a>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>

          </div>
        </div>
      </main>
    </>
  );
}
