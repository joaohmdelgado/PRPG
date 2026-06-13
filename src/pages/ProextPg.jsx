import React from 'react';
import { Link } from 'react-router-dom';

export default function ProextPg() {
  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-hands-holding-child text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Proext-PG</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Proext-PG</h1>
          <p className="text-white/70 mt-4 text-lg">
            Programa de Extensão da Educação Superior na Pós-Graduação.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar / Documentos */}
            <div className="lg:w-1/4 shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-28">
                <div className="bg-gray-50/50 text-gray-800 p-5 border-b border-gray-100">
                  <h3 className="font-heading font-bold text-lg m-0"><i className="fa-solid fa-folder-open mr-2 text-ufrpe-yellow"></i> Documentos e Links</h3>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                  {/* Categoria 1 */}
                  <div className="mb-6 last:mb-0">
                    <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider pb-2 border-b border-gray-100">Institucionais / Manuais</h4>
                    <div className="space-y-2">
                      <a href="https://prpg.ufrpe.br/sites/default/files/paginas/PROJETO%20INSTITUCIONAL_0.pdf" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-file-pdf text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Projeto Institucional</span>
                      </a>
                      <a href="https://prpg.ufrpe.br/sites/default/files/paginas/MANUAL%20PARA%20UTILIZA%C3%87%C3%83O%20DE%20RECURSOS%20PROEXT-PG.pdf" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-file-pdf text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Manual para Utilização de Recursos</span>
                      </a>
                      <a href="https://prpg.ufrpe.br/sites/default/files/paginas/Of%C3%ADcio%20Circular%20atualizado.pdf" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-file-pdf text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Diretrizes para Utilização de Recursos</span>
                      </a>
                      <a href="https://prpg.ufrpe.br/pt-br/Declara%C3%A7%C3%A3o%20de%20Ci%C3%AAncia" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-link text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Declaração de Ciência</span>
                      </a>
                      <a href="https://prpg.ufrpe.br/pt-br/Or%C3%A7amento%20dos%20Programas%C2%A0" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-link text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Orçamento dos Programas</span>
                      </a>
                    </div>
                  </div>
 
                  {/* Categoria 2 */}
                  <div className="mb-6 last:mb-0">
                    <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider pb-2 border-b border-gray-100">Modelos e Planilhas</h4>
                    <div className="space-y-2">
                      <a href="https://prpg.ufrpe.br/sites/default/files/paginas/ANEXO%20III%20%28PLANILHA%20DE%20PONTUA%C3%87%C3%83O%20DE%20CURR%C3%8DCULO%29%20-%20EDITAL%2004%202025%20PRPG%20%E2%80%93%20SELE%C3%87%C3%83O%20DE%20PARA%20BOLSA%20PROEXT-PG.docx" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-file-word text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Planilha de Pontuação (Edital 04/2025)</span>
                      </a>
                      <a href="https://prpg.ufrpe.br/sites/default/files/paginas/Modelo_relatorio_de_viagem_PROEXT_PG_UFRPE.pdf" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-file-pdf text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Modelo de Relatório de Viagem</span>
                      </a>
                      <a href="https://prpg.ufrpe.br/sites/default/files/paginas/Modelo_resumo_PROEXT_PG_UFRPE.pdf" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-file-pdf text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Modelo de Resumo</span>
                      </a>
                      <a href="https://prpg.ufrpe.br/sites/default/files/paginas/Recibo%20modelo%20A%20-%20PROEXT-PG%20-%20atualizado.docx" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-file-word text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Modelo de Recibo para Diárias</span>
                      </a>
                    </div>
                  </div>
 
                  {/* Categoria 3 */}
                  <div className="mb-6 last:mb-0">
                    <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider pb-2 border-b border-gray-100">Ações e Resultados</h4>
                    <div className="space-y-2">
                      <a href="https://prpg.ufrpe.br/pt-br/Relat%C3%B3rios" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-link text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Relatórios</span>
                      </a>
                      <a href="https://prpg.ufrpe.br/pt-br/acoes-desenvolvidas-pelos-eixos-tematicos" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-link text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Ações Desenvolvidas - Eixos Temáticos</span>
                      </a>
                      <a href="https://prpg.ufrpe.br/sites/default/files/paginas/Eixos_tematicos_e_objetivos_PROEXT_PG.pdf" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-file-pdf text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Eixos Temáticos e PPGs</span>
                      </a>
                      <a href="https://prpg.ufrpe.br/sites/default/files/paginas/Di%C3%A1logos%20PROEXT-PGUFRPE%20%281%29.pdf" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-file-pdf text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Diálogos PROEXT-PG/UFRPE</span>
                      </a>
                      <a href="https://www.prpg.ufrpe.br/pt-br/nova-data-marcada-da-ii-oficina-de-extensao-na-pos-graduacao-dialogos-proext-pgufrpe-integracao-dos" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-link text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">II Oficina de Extensão na PG</span>
                      </a>
                    </div>
                  </div>
 
                  {/* Categoria 4 */}
                  <div className="mb-6 last:mb-0">
                    <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider pb-2 border-b border-gray-100">Tutoriais</h4>
                    <div className="space-y-2">
                      <a href="https://prpg.ufrpe.br/sites/default/files/paginas/Tutorial_submissao_projeto_sigaa.pdf" target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-file-pdf text-ufrpe-yellow mt-1 group-hover:scale-110 transition-transform"></i>
                        <span className="leading-snug">Tutorial Submissão SIGAA</span>
                      </a>
                    </div>
                  </div>
 
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:w-3/4 space-y-12">
              
              <section>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h2 className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue mb-6 pb-4 border-b-2 border-ufrpe-yellow">O Programa</h2>

                  <div className="bg-gray-50 border-l-4 border-ufrpe-blue p-6 rounded-r-xl mb-8">
                    <p className="text-lg font-bold text-gray-800">
                      O Programa de Extensão da Educação Superior na Pós-Graduação (PROEXT-PG) visa fortalecer as atividades de extensão nos programas de pós-graduação, integrando ensino, pesquisa e extensão em diálogo com a sociedade.
                    </p>
                  </div>

                  <p className="text-gray-600 leading-relaxed">
                    O objetivo é apoiar políticas públicas relevantes e sustentáveis, promovendo cidadania, democracia e qualidade de vida, além de reduzir desigualdades no Sistema Nacional de Pós-Graduação (SNPG). A UFRPE, através de seu programa institucional, busca consolidar ações interdisciplinares que envolvem alunos de graduação e pós-graduação em projetos voltados para agricultura, educação, saúde e tecnologia em Pernambuco. Essas iniciativas pretendem responder às demandas sociais e estreitar parcerias com diferentes setores, contribuindo diretamente para o bem-estar da população e o desenvolvimento regional.
                  </p>
                </div>
              </section>

              <section id="objetivos">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h2 className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue mb-8 pb-4 border-b-2 border-ufrpe-yellow">Objetivos do PROEXT-PG</h2>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="flex gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-full bg-ufrpe-cyan/10 text-ufrpe-cyan flex items-center justify-center text-xl">
                        <i className="fa-solid fa-puzzle-piece"></i>
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-800 mb-2">Integração de Saberes</h5>
                        <p className="text-sm text-gray-600">Promover a integração entre ensino, pesquisa e extensão nos programas de pós-graduação</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-full bg-ufrpe-cyan/10 text-ufrpe-cyan flex items-center justify-center text-xl">
                        <i className="fa-solid fa-comments"></i>
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-800 mb-2">Diálogo com a Sociedade</h5>
                        <p className="text-sm text-gray-600">Estabelecer diálogo contínuo com diferentes setores da sociedade</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-full bg-ufrpe-cyan/10 text-ufrpe-cyan flex items-center justify-center text-xl">
                        <i className="fa-solid fa-map-location-dot"></i>
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-800 mb-2">Desenvolvimento Regional</h5>
                        <p className="text-sm text-gray-600">Contribuir para o desenvolvimento regional através de projetos interdisciplinares</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-full bg-ufrpe-cyan/10 text-ufrpe-cyan flex items-center justify-center text-xl">
                        <i className="fa-solid fa-scale-balanced"></i>
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-800 mb-2">Redução de Desigualdades</h5>
                        <p className="text-sm text-gray-600">Reduzir desigualdades no Sistema Nacional de Pós-Graduação</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section id="acoes-proext-pg">
                <h2 className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue mb-8">Ações do PROEXT-PG</h2>

                <div className="space-y-4">
                  {/* Categoria 1 */}
                  <details className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" open>
                    <summary className="p-5 font-bold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition border-b border-transparent group-open:border-gray-100 group-open:bg-gray-50 group-open:text-ufrpe-blue">
                      Ações gerais do PROEXT-PG
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 group-open:bg-ufrpe-yellow group-open:text-white text-gray-500 transition-colors">
                        <i className="fa-solid fa-chevron-down transition-transform duration-300 group-open:rotate-180"></i>
                      </span>
                    </summary>
                    <div className="p-6 bg-white space-y-4 border-t border-gray-100">
                      <div className="flex flex-col md:flex-row gap-6 border p-4 rounded-xl border-gray-100 shadow-sm hover:shadow transition">
                        <div className="shrink-0">
                          <div 
                            className="w-full md:w-32 h-32 md:h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden bg-cover bg-center" 
                            style={{ backgroundImage: "url('https://prpg.ufrpe.br/sites/default/files/styles/noticia_capa/public/Programa%20de%20Internacionaliza%C3%A7%C3%A3o%20%2817%29.png')" }}
                          />
                        </div>
                        <div className="flex-grow">
                          <h5 className="font-bold text-ufrpe-blue text-lg mb-2">I Oficina de Extensão na Pós-Graduação</h5>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
                            <span><i className="fa-solid fa-link mr-1"></i> Site: <a href="https://proext.pg.ufrpe.br/i-oficina-extensao-pg" className="text-ufrpe-blue hover:text-ufrpe-yellow transition" target="_blank" rel="noopener noreferrer">proext.pg.ufrpe.br</a></span>
                            <span><i className="fa-solid fa-calendar mr-1"></i> Data: 13/08/2024</span>
                          </div>
                          <p className="text-sm text-gray-600">O evento teve troca de experiências e construção coletiva de estratégias extensionistas.</p>
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Categoria 2 */}
                  <details className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <summary className="p-5 font-bold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition border-b border-transparent group-open:border-gray-100 group-open:bg-gray-50 group-open:text-ufrpe-blue">
                      Eixo Temático: Educação Alimentar e Impactos na Saúde
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 group-open:bg-ufrpe-yellow group-open:text-white text-gray-500 transition-colors">
                        <i className="fa-solid fa-chevron-down transition-transform duration-300 group-open:rotate-180"></i>
                      </span>
                    </summary>
                    <div className="p-6 bg-white space-y-4 border-t border-gray-100">
                      <div className="flex flex-col md:flex-row gap-6 border p-4 rounded-xl border-gray-100 shadow-sm hover:shadow transition">
                        <div className="shrink-0">
                          <div 
                            className="w-full md:w-32 h-32 md:h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden bg-cover bg-center" 
                            style={{ backgroundImage: "url('https://prpg.ufrpe.br/sites/default/files/styles/noticia_capa/public/visita-xukuru.jpg')" }}
                          />
                        </div>
                        <div className="flex-grow">
                          <h5 className="font-bold text-ufrpe-blue text-lg mb-2">Visita Técnica à Aldeia Xukuru do Ororubá</h5>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
                            <span><i className="fa-solid fa-link mr-1"></i> Site: <a href="https://proext.pg.ufrpe.br/visita-xukuru-ororuba" className="text-ufrpe-blue hover:text-ufrpe-yellow transition" target="_blank" rel="noopener noreferrer">proext.pg.ufrpe.br</a></span>
                            <span><i className="fa-solid fa-calendar mr-1"></i> Data: 14/11/2025</span>
                          </div>
                          <p className="text-sm text-gray-600">Visita técnica realizada visando, através de um diálogo intercultural, o reconhecimento das necessidades e prioridades do território da comunidade indígena Xukuru do Ororubá.</p>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </section>
            </div>
            
          </div>
        </div>
      </main>
    </>
  );
}
