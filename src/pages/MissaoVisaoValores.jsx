import React from 'react';
import { Link } from 'react-router-dom';

export default function MissaoVisaoValores() {
  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-bullseye text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
        <div className="container mx-auto px-4">
          <nav className="flex text-white/60 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link to="/" className="hover:text-ufrpe-yellow transition-colors">Início</Link>
              </li>
              <li>
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-white">A Pós-Graduação</span>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-ufrpe-yellow font-medium">Missão, Visão e Valores</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Institucional</h1>
          <p className="text-white/70 mt-4 text-lg">Diretrizes estratégicas da Pró-Reitoria de Pós-Graduação.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow py-12">
        <div className="container mx-auto px-4">
          
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar / Navigation */}
            <div className="lg:w-1/4 shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-28">
                <div className="bg-gray-50/50 text-gray-800 p-5 border-b border-gray-100">
                  <h3 className="font-heading font-bold text-lg m-0"><i className="fa-solid fa-list mr-2 text-ufrpe-blue opacity-50"></i> Sumário</h3>
                </div>
                <div className="p-6">
                  <nav className="space-y-2">
                    <a href="#missao" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug font-medium">Nossa Missão</span>
                    </a>
                    <a href="#visao" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug font-medium">Nossa Visão</span>
                    </a>
                    <a href="#valores" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug font-medium">Nossos Valores</span>
                    </a>
                  </nav>
                  
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <Link to="/sobre" className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-ufrpe-blue/10 text-ufrpe-blue rounded-xl hover:bg-ufrpe-blue hover:text-white transition-all font-bold text-sm">
                      Conhecer a PRPG
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:w-3/4 space-y-12">
              
              {/* Section: Missão */}
              <section id="missao" className="scroll-mt-32">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-8 md:p-12 flex-1 flex flex-col justify-center">
                      <h2 className="text-3xl font-heading font-black text-ufrpe-blue mb-6 uppercase tracking-tight">Missão</h2>
                      <p className="text-gray-700 text-lg leading-relaxed italic">
                        "Contribuir para o desenvolvimento da Pós-Graduação da UFRPE, visando a formação de profissionais de excelência que atendam às demandas da sociedade."
                      </p>
                    </div>
                    <div className="md:w-2/5 min-h-[300px] bg-gray-50 flex items-center justify-center">
                      <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/missao.png" alt="Missão PRPG" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section: Visão */}
              <section id="visao" className="scroll-mt-32">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-2/5 min-h-[300px] bg-gray-50 flex items-center justify-center order-2 md:order-1">
                      <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/visao.png" alt="Visão PRPG" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-8 md:p-12 flex-1 flex flex-col justify-center order-1 md:order-2 text-right">
                      <h2 className="text-3xl font-heading font-black text-ufrpe-blue mb-6 uppercase tracking-tight">Visão 2030</h2>
                      <p className="text-gray-700 text-lg leading-relaxed italic">
                        "Consolidar a formação em Pós-Graduação da UFRPE e seu impacto científico, visando a excelência nacional e internacional."
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section: Valores */}
              <section id="valores" className="scroll-mt-32">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-8 md:p-12 flex-1">
                      <h2 className="text-3xl font-heading font-black text-ufrpe-blue mb-8 uppercase tracking-tight">Valores</h2>
                      
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-ufrpe-blue text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition hover:scale-105">Ética</span>
                        <span className="bg-ufrpe-blue text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition hover:scale-105">Diálogo</span>
                        <span className="bg-ufrpe-blue text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition hover:scale-105">Comprometimento</span>
                        <span className="bg-ufrpe-blue text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition hover:scale-105">Iniciativa</span>
                        <span className="bg-ufrpe-blue text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition hover:scale-105">Empatia</span>
                        <span className="bg-ufrpe-blue text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition hover:scale-105">Impessoalidade</span>
                        <span className="bg-ufrpe-blue text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition hover:scale-105">Cooperação</span>
                        <span className="bg-ufrpe-blue text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition hover:scale-105">Integração</span>
                        <span className="bg-ufrpe-blue text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition hover:scale-105">Cuidado com a saúde mental</span>
                      </div>
                    </div>
                    <div className="md:w-2/5 min-h-[300px] bg-gray-50 flex items-center justify-center">
                      <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/valores.png" alt="Valores PRPG" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
