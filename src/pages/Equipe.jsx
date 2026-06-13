import React from 'react';
import { Link } from 'react-router-dom';

export default function Equipe() {
  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-users text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Equipe</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Equipe PRPG</h1>
          <p className="text-white/70 mt-4 text-lg">Conheça os profissionais dedicados ao desenvolvimento e excelência da Pós-Graduação na UFRPE.</p>
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
                    <a href="#pro-reitoria" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug">Pró-Reitoria</span>
                    </a>
                    <a href="#secretaria" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug">Secretaria Geral</span>
                    </a>
                    <a href="#financeiro" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug">Setor Financeiro</span>
                    </a>
                    <a href="#excelencia" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug">PPG de Excelência</span>
                    </a>
                    <a href="#consolidacao" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug">PPG em Consolidação</span>
                    </a>
                    <a href="#internacionalizacao" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug">Internacionalização</span>
                    </a>
                    <a href="#lato-sensu" className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group">
                      <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                      <span className="leading-snug">Lato Sensu</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-20">
              
              {/* Pró-Reitoria */}
              <section id="pro-reitoria" className="scroll-mt-32">
                <h2 className="text-2xl font-black text-ufrpe-blue mb-8 uppercase tracking-widest flex items-center gap-3">
                  <span className="w-8 h-1 bg-ufrpe-yellow rounded-full"></span> Pró-Reitoria
                </h2>
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 items-center">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shrink-0 border-4 border-gray-50">
                    <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/rinaldo.jpeg" alt="Rinaldo Aparecido Mota" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">Prof. Rinaldo Aparecido Mota</h3>
                    <p className="text-ufrpe-blue font-bold text-sm uppercase tracking-wider mb-4">Pró-Reitor</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                      <a href="mailto:proreitor.prpg@ufrpe.br" className="flex items-center gap-2 text-gray-500 hover:text-ufrpe-blue transition">
                        <i className="fa-solid fa-envelope text-ufrpe-yellow"></i> proreitor.prpg@ufrpe.br
                      </a>
                      <span className="flex items-center gap-2 text-gray-500">
                        <i className="fa-solid fa-phone text-ufrpe-yellow"></i> (81) 3320-6050
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Secretaria Geral */}
              <section id="secretaria" className="scroll-mt-32">
                <h2 className="text-2xl font-black text-ufrpe-blue mb-8 uppercase tracking-widest flex items-center gap-3">
                  <span className="w-8 h-1 bg-ufrpe-yellow rounded-full"></span> Secretaria Geral
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Membro */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:border-ufrpe-blue/20 transition group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center text-gray-400 group-hover:text-ufrpe-blue transition shrink-0">
                        <i className="fa-solid fa-user text-2xl"></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 leading-tight">Raquelle Cavalcanti Souza da Silva</h4>
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Secretária</span>
                      </div>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-gray-50">
                      <p className="text-xs text-gray-500 flex items-center gap-2"><i class="fa-solid fa-phone text-ufrpe-blue/30"></i> 81 99937-8589</p>
                      <p className="text-xs text-gray-400">Atendimento via WhatsApp disponível</p>
                    </div>
                  </div>
                  {/* Laura */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:border-ufrpe-blue/20 transition group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0">
                        <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/laura.jpeg" alt="Laura Vila Nova" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 leading-tight">Laura Vila Nova</h4>
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Secretária</span>
                      </div>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-gray-50">
                      <p className="text-xs text-gray-500 flex items-center gap-2"><i class="fa-solid fa-phone text-ufrpe-blue/30"></i> 81 3320-6050</p>
                      <p className="text-xs text-gray-400">Atendimento via WhatsApp disponível</p>
                    </div>
                  </div>
                  {/* Maria Isabel */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:border-ufrpe-blue/20 transition group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0">
                        <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/isabel.jpeg" alt="Maria Isabel" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 leading-tight">Maria Isabel de Moraes Gomes</h4>
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Secretária</span>
                      </div>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-gray-50">
                      <p className="text-xs text-gray-500 flex items-center gap-2"><i class="fa-solid fa-phone text-ufrpe-blue/30"></i> 81 99979-1596</p>
                      <p className="text-xs text-gray-400">Atendimento via WhatsApp disponível</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Setor Financeiro */}
              <section id="financeiro" className="scroll-mt-32">
                <h2 className="text-2xl font-black text-ufrpe-blue mb-8 uppercase tracking-widest flex items-center gap-3">
                  <span className="w-8 h-1 bg-ufrpe-yellow rounded-full"></span> Setor Financeiro
                </h2>
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 items-center">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0">
                    <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/joao-ferreira.jpeg" alt="João Ferreira" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">João Ferreira dos Santos Pimentel Neto</h3>
                    <p className="text-ufrpe-blue font-bold text-xs uppercase tracking-wider mb-4">Coordenador Financeiro</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm">
                      <a href="mailto:financeiro.prpg@ufrpe.br" className="flex items-center gap-2 text-gray-500 hover:text-ufrpe-blue transition">
                        <i className="fa-solid fa-envelope text-ufrpe-yellow"></i> financeiro.prpg@ufrpe.br
                      </a>
                      <span className="flex items-center gap-2 text-gray-500">
                        <i className="fa-solid fa-phone text-ufrpe-yellow"></i> (81) 3320-6056
                      </span>
                      <span className="flex items-center gap-2 text-gray-500">
                        <i className="fa-solid fa-mobile-screen text-ufrpe-yellow"></i> 81 99940-6369
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Excellence */}
              <section id="excelencia" className="scroll-mt-32">
                <h2 className="text-2xl font-black text-ufrpe-blue mb-8 uppercase tracking-widest flex items-center gap-3 leading-tight">
                  <span className="w-8 h-1 bg-ufrpe-yellow rounded-full"></span> PPG Stricto Sensu de Excelência
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Anete */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6 group">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 grayscale group-hover:grayscale-0 transition duration-500">
                      <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/anete.jpeg" alt="Anete" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight">Profª. Anete Soares Cavalcanti</h4>
                      <p className="text-[10px] text-ufrpe-blue font-black uppercase mt-1">Coordenadora</p>
                    </div>
                  </div>
                  {/* Diego */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6 group">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 grayscale group-hover:grayscale-0 transition duration-500">
                      <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-04/diego.jpeg" alt="Diego" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight">Diego de Queiroz Jordão</h4>
                      <p className="text-[10px] text-ufrpe-blue font-black uppercase mt-1">Secretário</p>
                      <p className="text-[10px] text-gray-400 mt-2">81 99940-1506</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Consolidação */}
              <section id="consolidacao" className="scroll-mt-32">
                <h2 className="text-2xl font-black text-ufrpe-blue mb-8 uppercase tracking-widest flex items-center gap-3 leading-tight">
                  <span className="w-8 h-1 bg-ufrpe-yellow rounded-full"></span> PPG Stricto Sensu em Consolidação
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Tatiana */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6 group">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 grayscale group-hover:grayscale-0 transition duration-500">
                      <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/tatiana.jpeg" alt="Tatiana" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight">Profª. Tatiana Souza Porto</h4>
                      <p className="text-[10px] text-ufrpe-blue font-black uppercase mt-1">Coordenadora</p>
                    </div>
                  </div>
                  {/* Analice */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6 group">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 grayscale group-hover:grayscale-0 transition duration-500">
                      <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/Analice.jpeg" alt="Analice" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight">Analice Regis</h4>
                      <p className="text-[10px] text-ufrpe-blue font-black uppercase mt-1">Secretária</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Internacionalizacao */}
              <section id="internacionalizacao" className="scroll-mt-32">
                <h2 className="text-2xl font-black text-ufrpe-blue mb-8 uppercase tracking-widest flex items-center gap-3 leading-tight">
                  <span className="w-8 h-1 bg-ufrpe-yellow rounded-full"></span> Internacionalização de PPGs
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm group">
                    <h4 className="font-bold text-gray-900 leading-tight mb-1">Prof. Yuri Jacques Agra Bezerra da Silva</h4>
                    <p className="text-[10px] text-ufrpe-blue font-black uppercase">Coordenador</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4 group">
                    <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0">
                      <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/nathanyel.jpeg" alt="Nathanyel" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight">Nathanyel Santos</h4>
                      <p className="text-[10px] text-ufrpe-blue font-black uppercase mb-2">Secretário</p>
                      <p className="text-[10px] text-gray-400 leading-none">31 8352-0270</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Lato Sensu */}
              <section id="lato-sensu" className="scroll-mt-32">
                <h2 className="text-2xl font-black text-ufrpe-blue mb-8 uppercase tracking-widest flex items-center gap-3 leading-tight">
                  <span className="w-8 h-1 bg-ufrpe-yellow rounded-full"></span> Cursos de Lato Sensu
                </h2>
                <div className="grid md:grid-cols-2 gap-6 pb-20 border-b border-gray-100">
                  {/* Ramon */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4 group">
                    <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0 grayscale group-hover:grayscale-0 transition duration-500">
                      <img src="https://prpg.ufrpe.br/sites/default/files/styles/image_300/public/2021-02/rachide.jpeg" alt="Ramon" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight">Prof. Ramom Rachide Nunes</h4>
                      <p className="text-[10px] text-ufrpe-blue font-black uppercase mt-1">Coordenador</p>
                    </div>
                  </div>
                  {/* Mariana */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm group">
                    <h4 className="font-bold text-gray-900 leading-tight mb-1">Mariana da Conceição Alves</h4>
                    <p className="text-[10px] text-ufrpe-blue font-black uppercase mb-2">Secretária</p>
                    <p className="text-[10px] text-gray-400">81 99653-7655</p>
                  </div>
                </div>
              </section>

              {/* Admin SITES */}
              <section className="bg-gray-100/50 p-8 rounded-3xl text-center">
                <h3 className="font-bold text-gray-900 mb-2 uppercase text-xs tracking-widest opacity-50">Administração de Conteúdo Digital</h3>
                <p className="font-bold text-ufrpe-blue">João Henrique de Medeiros Delgado</p>
                <p className="text-xs text-gray-500 mt-2">Suporte e Atualizações: 81 99992-4710 (WhatsApp)</p>
              </section>

            </div>
          </div>
 
        </div>
      </main>
    </>
  );
}
