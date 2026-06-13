import React from 'react';
import { Link } from 'react-router-dom';

export default function Financeiro() {
  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-coins text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Financeiro</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Financeiro</h1>
          <p className="text-white/70 mt-4 text-lg">
            Entenda as formas de financiamento e auxílio para a Pós-Graduação na UFRPE.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow py-20 pb-32">
        <div className="container mx-auto px-4 max-w-5xl">
          
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-8 md:p-16">
              <h2 className="text-3xl font-heading font-black text-ufrpe-blue mb-10 border-l-8 border-ufrpe-yellow pl-6">
                Formas de Financiamento da Pós-graduação
              </h2>
              
              <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-8">
                <p>
                  A Pós-graduação é financiada com recursos próprios da UFRPE, assim como recebe recursos externos de vários órgãos, como a Coordenação de Aperfeiçoamento de Pessoal de Nível Superior (<strong className="text-ufrpe-blue">CAPES</strong>), o Conselho Nacional de Desenvolvimento Científico e Tecnológico (<strong class="text-ufrpe-blue">CNPq</strong>), a Fundação de Apoio à Ciência e Tecnologia do Estado de Pernambuco (<strong class="text-ufrpe-blue">FACEPE</strong>) e a Financiadora de Estudos e Projetos (<strong class="text-ufrpe-blue">FINEP</strong>), empresa pública do Ministério da Ciência, Tecnologia e Inovações (MCTI).
                </p>

                <div className="grid md:grid-cols-2 gap-8 my-12">
                  <div className="bg-ufrpe-blue/5 p-8 rounded-2xl border border-ufrpe-blue/10">
                    <h3 className="text-xl font-bold text-ufrpe-blue mb-4 flex items-center gap-3">
                      <i className="fa-solid fa-building-columns"></i> CAPES
                    </h3>
                    <p className="text-sm">
                      Os Programas de Pós-graduação (PPG) de Mestrado e Doutorado acadêmico recebem auxílio por meio do "Programa Demanda Social (DS)" e do "Programa de Apoio à Pesquisa (PROAP)". Programas nota 6 recebem via PROEX.
                    </p>
                  </div>
                  <div className="bg-ufrpe-blue/5 p-8 rounded-2xl border border-ufrpe-blue/10">
                    <h3 className="text-xl font-bold text-ufrpe-blue mb-4 flex items-center gap-3">
                      <i className="fa-solid fa-microscope"></i> CNPq &amp; FACEPE
                    </h3>
                    <p className="text-sm">
                      O CNPq concede bolsas diretamente aos PPG ou pesquisadores via editais anuais. A FACEPE é uma grande fomentadora em Pernambuco, concedendo bolsas Stricto Sensu e financiando projetos de pesquisa.
                    </p>
                  </div>
                </div>

                <p>
                  A <strong className="text-ufrpe-blue">FINEP</strong> é responsável pelo financiamento da estrutura multiusuária de pesquisa na UFRPE, visando consolidar os PPG, como construção de laboratórios, aquisição e manutenção de equipamentos de grande porte.
                </p>

                {/* Specific Programs */}
                <div className="mt-20 space-y-12">
                  <div className="border-t border-gray-100 pt-12">
                    <h3 className="text-2xl font-black text-ufrpe-blue mb-6">Programa de Bolsas Demanda Social da CAPES</h3>
                    <p>
                      Com a finalidade de formar recursos humanos de alto nível necessários ao país, o Programa de Demanda Social (DS) tem por objetivo apoiar discentes de programas de pós-graduação Stricto Sensu oferecidos por Instituições de Ensino Superior (IES) públicas.
                    </p>
                    
                    <div className="flex flex-wrap gap-4 mt-8">
                      <a href="#" className="flex items-center gap-3 bg-gray-100 hover:bg-ufrpe-yellow hover:text-white px-5 py-3 rounded-xl transition font-bold text-sm">
                        <i className="fa-solid fa-file-pdf"></i> Portaria Regulamentadora
                      </a>
                      <a href="#" className="flex items-center gap-3 bg-gray-100 hover:bg-ufrpe-yellow hover:text-white px-5 py-3 rounded-xl transition font-bold text-sm">
                        <i className="fa-solid fa-magnifying-glass-chart"></i> Acompanhamento de Bolsas
                      </a>
                      <Link to="/formularios" className="flex items-center gap-3 bg-gray-100 hover:bg-ufrpe-yellow hover:text-white px-5 py-3 rounded-xl transition font-bold text-sm">
                        <i className="fa-solid fa-file-signature"></i> Termo de Compromisso
                      </Link>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-12">
                    <h3 className="text-2xl font-black text-ufrpe-blue mb-6">PROAP</h3>
                    <p>
                      Tem o objetivo de financiar as atividades dos Programas de Pós-graduação, proporcionando melhores condições para a formação de recursos humanos.
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                      <a href="#" className="p-4 bg-gray-50 rounded-2xl hover:shadow-md transition text-center group">
                        <i className="fa-solid fa-file-lines text-2xl text-ufrpe-blue/40 group-hover:text-ufrpe-yellow mb-3 block"></i>
                        <span className="text-xs font-bold uppercase">Portaria</span>
                      </a>
                      <a href="#" className="p-4 bg-gray-50 rounded-2xl hover:shadow-md transition text-center group">
                        <i className="fa-solid fa-scroll text-2xl text-ufrpe-blue/40 group-hover:text-ufrpe-yellow mb-3 block"></i>
                        <span className="text-xs font-bold uppercase">Resolução</span>
                      </a>
                      <a href="#" className="p-4 bg-gray-50 rounded-2xl hover:shadow-md transition text-center group">
                        <i className="fa-solid fa-book-open text-2xl text-ufrpe-blue/40 group-hover:text-ufrpe-yellow mb-3 block"></i>
                        <span className="text-xs font-bold uppercase">Manual</span>
                      </a>
                      <a href="#" className="p-4 bg-gray-50 rounded-2xl hover:shadow-md transition text-center group">
                        <i className="fa-solid fa-table text-2xl text-ufrpe-blue/40 group-hover:text-ufrpe-yellow mb-3 block"></i>
                        <span className="text-xs font-bold uppercase">Saldo</span>
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
