import React from 'react';
import { Link } from 'react-router-dom';

export default function Historico() {
  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-clock-rotate-left text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Histórico</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Histórico</h1>
          <p className="text-white/70 mt-4 text-lg">
            A trajetória da Pós-Graduação na UFRPE, desde sua fundação até a consolidação da excelência acadêmica.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow py-16">
        <div className="container mx-auto px-4">
          
          <div className="max-w-4xl mx-auto">
            
            {/* Timeline Intro */}
            <div className="text-center mb-16">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue text-xs font-bold uppercase tracking-wider mb-4 border border-ufrpe-blue/10">Nossa Jornada</span>
              <h2 class="text-3xl font-heading font-black text-ufrpe-blue mb-4">Evolução e Conquistas</h2>
              <div className="w-20 h-1.5 bg-ufrpe-yellow mx-auto rounded-full"></div>
            </div>

            {/* Vertical Timeline */}
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2 hidden md:block"></div>
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 md:hidden"></div>

              {/* 1973 */}
              <div className="relative z-10 mb-12 md:mb-24 md:flex items-center group">
                <div className="flex-1 md:text-right md:pr-12 mb-4 md:mb-0">
                  <div className="inline-block px-4 py-1 rounded-full bg-ufrpe-blue text-white font-bold text-lg mb-3">1973</div>
                  <h3 className="text-xl font-bold text-ufrpe-blue mb-2">Início das Atividades</h3>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">Criação do Curso de Mestrado em Botânica, por meio de convênio firmado com a Universidade Federal de Pernambuco (UFPE).</p>
                </div>
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white shadow-md bg-ufrpe-blue"></div>
                <div className="md:flex-1 md:pl-12"></div>
              </div>

              {/* 1974 - 1976 */}
              <div className="relative z-10 mb-12 md:mb-24 md:flex items-center flex-row-reverse group">
                <div className="flex-1 md:pl-12 mb-4 md:mb-0">
                  <div className="inline-block px-4 py-1 rounded-full bg-ufrpe-blue text-white font-bold text-lg mb-3">1974 - 1976</div>
                  <h3 className="text-xl font-bold text-ufrpe-blue mb-2">Criação da PRPG</h3>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">Em 1974 foi criada a "Coordenadoria Geral de Pesquisa". Em 1975, o novo Estatuto da UFRPE instituiu o Pró-Reitor de Pesquisa e Pós-Graduação, iniciando as atividades da PRPPG (atual PRPG) em 1976.</p>
                </div>
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white shadow-md bg-ufrpe-blue"></div>
                <div className="md:flex-1"></div>
              </div>

              {/* 1977 - 1981 */}
              <div className="relative z-10 mb-12 md:mb-24 md:flex items-center group">
                <div className="flex-1 md:text-right md:pr-12 mb-4 md:mb-0">
                  <div className="inline-block px-4 py-1 rounded-full bg-ufrpe-blue text-white font-bold text-lg mb-3">1977 - 1981</div>
                  <h3 className="text-xl font-bold text-ufrpe-blue mb-2">Foco em Ciências Agrárias</h3>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">Criação dos PPGs em Ciência do Solo (1977), Medicina Veterinária (1978), Administração Rural e Comunicação Rural (1979) e Zootecnia (1981), reforçando o perfil institucional.</p>
                </div>
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white shadow-md bg-ufrpe-blue"></div>
                <div className="md:flex-1 md:pl-12"></div>
              </div>

              {/* 1993 - 1995 */}
              <div className="relative z-10 mb-12 md:mb-24 md:flex items-center flex-row-reverse group">
                <div className="flex-1 md:pl-12 mb-4 md:mb-0">
                  <div className="inline-block px-4 py-1 rounded-full bg-ufrpe-blue text-white font-bold text-lg mb-3">1993</div>
                  <h3 className="text-xl font-bold text-ufrpe-blue mb-2">Primeiro Doutorado</h3>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">Criação do primeiro Curso de Doutorado da Instituição (PPG em Botânica). A primeira tese foi defendida em 20 de dezembro de 1995.</p>
                </div>
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white shadow-md bg-ufrpe-blue"></div>
                <div className="md:flex-1"></div>
              </div>

              {/* 1999 - 2000 */}
              <div className="relative z-10 mb-12 md:mb-24 md:flex items-center group">
                <div className="flex-1 md:text-right md:pr-12 mb-4 md:mb-0">
                  <div className="inline-block px-4 py-1 rounded-full bg-ufrpe-blue text-white font-bold text-lg mb-3">1999</div>
                  <h3 className="text-xl font-bold text-ufrpe-blue mb-2">Doutorado Integrado</h3>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">Proposta e criação do primeiro Doutorado Integrado (PDIZ), em parceria com a UFPB e UFC, iniciando atividades em 2000.</p>
                </div>
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white shadow-md bg-ufrpe-blue"></div>
                <div className="md:flex-1 md:pl-12"></div>
              </div>

              {/* 2001 - 2009 */}
              <div className="relative z-10 mb-12 md:mb-24 md:flex items-center flex-row-reverse group">
                <div className="flex-1 md:pl-12 mb-4 md:mb-0">
                  <div className="inline-block px-4 py-1 rounded-full bg-ufrpe-blue text-white font-bold text-lg mb-3">2001 - 2009</div>
                  <h3 className="text-xl font-bold text-ufrpe-blue mb-2">Expansão de Programas</h3>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">Crescimento de 163% no número de programas, totalizando 21 PPGs. Destaque para as redes RENORBIO e Inovação Tecnológica em Medicamentos.</p>
                </div>
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white shadow-md bg-ufrpe-blue"></div>
                <div className="md:flex-1"></div>
              </div>

              {/* 2010 - 2019 */}
              <div className="relative z-10 mb-12 md:mb-24 md:flex items-center group">
                <div className="flex-1 md:text-right md:pr-12 mb-4 md:mb-0">
                  <div className="inline-block px-4 py-1 rounded-full bg-ufrpe-blue text-white font-bold text-lg mb-3">2010 - 2019</div>
                  <h3 className="text-xl font-bold text-ufrpe-blue mb-2">Interiorização e Redes</h3>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">Total de 42 PPGs alcançado. Início de cursos em Garanhuns, Serra Talhada e Cabo de Santo Agostinho. Implementação de Programas em Rede Nacional (Mestrados Profissionais).</p>
                </div>
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white shadow-md bg-ufrpe-blue"></div>
                <div className="md:flex-1 md:pl-12"></div>
              </div>

              {/* 2017 - 2018 */}
              <div className="relative z-10 mb-12 md:mb-24 md:flex items-center flex-row-reverse group">
                <div className="flex-1 md:pl-12 mb-4 md:mb-0">
                  <div className="inline-block px-4 py-1 rounded-full bg-ufrpe-blue text-white font-bold text-lg mb-3">2017 - 2018</div>
                  <h3 className="text-xl font-bold text-ufrpe-blue mb-2">Excelência e Internacionalização</h3>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">Avaliação nota 6 em dois programas e aprovação do projeto estratégico CAPES-PrInt para consolidação da internacionalização.</p>
                </div>
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white shadow-md bg-ufrpe-blue"></div>
                <div className="md:flex-1"></div>
              </div>

              {/* 2021 */}
              <div className="relative z-10 mb-12 md:flex items-center group">
                <div className="flex-1 md:text-right md:pr-12 mb-4 md:mb-0">
                  <div className="inline-block px-4 py-1 rounded-full bg-ufrpe-blue text-white font-bold text-lg mb-3">2021</div>
                  <h3 className="text-xl font-bold text-ufrpe-blue mb-2">Novas Fronteiras em Rede</h3>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">Aprovação do PPG RENON (Rede Nordeste de Ensino), expandindo ainda mais as fronteiras institucionais.</p>
                </div>
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white shadow-md bg-ufrpe-blue"></div>
                <div className="md:flex-1 md:pl-12"></div>
              </div>
            </div>

            {/* Pró-Reitores Section */}
            <div className="mt-32 pt-16 border-t border-gray-100">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-heading font-black text-ufrpe-blue mb-4 uppercase">Galeria de Pró-Reitores</h2>
                <p className="text-gray-500 max-w-xl mx-auto">Lideranças que conduziram a pesquisa e a pós-graduação na UFRPE ao longo das décadas.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Mário */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition group">
                  <div className="w-12 h-12 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-ufrpe-blue group-hover:text-white transition">MC</div>
                  <div>
                    <h4 className="font-bold text-ufrpe-blue leading-tight mb-0.5">Mário Bezerra de Carvalho</h4>
                    <p className="text-xs text-gray-400 font-medium tracking-wider">1976 — 1979</p>
                  </div>
                </div>
                {/* Luis */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition group">
                  <div className="w-12 h-12 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-ufrpe-blue group-hover:text-white transition">LA</div>
                  <div>
                    <h4 className="font-bold text-ufrpe-blue leading-tight mb-0.5">Luis de Melo Amorim</h4>
                    <p className="text-xs text-gray-400 font-medium tracking-wider">1979 — 1982</p>
                  </div>
                </div>
                {/* Romero */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition group">
                  <div className="w-12 h-12 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-ufrpe-blue group-hover:text-white transition">RM</div>
                  <div>
                    <h4 className="font-bold text-ufrpe-blue leading-tight mb-0.5">Romero Marinho de Moura</h4>
                    <p className="text-xs text-gray-400 font-medium tracking-wider">1982 — 1991</p>
                  </div>
                </div>
                {/* Emidio */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition group">
                  <div className="w-12 h-12 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-ufrpe-blue group-hover:text-white transition">EF</div>
                  <div>
                    <h4 className="font-bold text-ufrpe-blue leading-tight mb-0.5">Emídio Cantídio de Oliveira Filho</h4>
                    <p className="text-xs text-gray-400 font-medium tracking-wider">1991 — 1994</p>
                  </div>
                </div>
                {/* Severino */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition group">
                  <div className="w-12 h-12 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-ufrpe-blue group-hover:text-white transition">SB</div>
                  <div>
                    <h4 className="font-bold text-ufrpe-blue leading-tight mb-0.5">Severino Benone Paes Barbosa</h4>
                    <p className="text-xs text-gray-400 font-medium tracking-wider">1995 — 1999</p>
                  </div>
                </div>
                {/* Aurea */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition group">
                  <div className="w-12 h-12 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-ufrpe-blue group-hover:text-white transition">AW</div>
                  <div>
                    <h4 className="font-bold text-ufrpe-blue leading-tight mb-0.5">Áurea Wischral</h4>
                    <p className="text-xs text-gray-400 font-medium tracking-wider">2000 — 2004</p>
                  </div>
                </div>
                {/* Fernando */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition group">
                  <div className="w-12 h-12 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-ufrpe-blue group-hover:text-white transition">FF</div>
                  <div>
                    <h4 className="font-bold text-ufrpe-blue leading-tight mb-0.5">Fernando José Freire</h4>
                    <p className="text-xs text-gray-400 font-medium tracking-wider">2004 — 2008</p>
                  </div>
                </div>
                {/* Antonia */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition group">
                  <div className="w-12 h-12 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-ufrpe-blue group-hover:text-white transition">AV</div>
                  <div>
                    <h4 className="font-bold text-ufrpe-blue leading-tight mb-0.5">Antonia Sherlânea Chaves Véras</h4>
                    <p className="text-xs text-gray-400 font-medium tracking-wider">2008 — 2012</p>
                  </div>
                </div>
                {/* José */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition group">
                  <div className="w-12 h-12 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-ufrpe-blue group-hover:text-white transition">JD</div>
                  <div>
                    <h4 className="font-bold text-ufrpe-blue leading-tight mb-0.5">José Carlos Batista Dubeux Junior</h4>
                    <p className="text-xs text-gray-400 font-medium tracking-wider">2012 — 2013</p>
                  </div>
                </div>
                {/* Maria */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition group">
                  <div className="w-12 h-12 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-ufrpe-blue group-hover:text-white transition">MG</div>
                  <div>
                    <h4 className="font-bold text-ufrpe-blue leading-tight mb-0.5">Maria Madalena Pessoa Guerra</h4>
                    <p className="text-xs text-gray-400 font-medium tracking-wider">2013</p>
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
