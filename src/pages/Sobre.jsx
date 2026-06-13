import React from 'react';
import { Link } from 'react-router-dom';

export default function Sobre() {
  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-circle-info text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Sobre a PRPG</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Sobre a PRPG</h1>
          <p className="text-white/70 mt-4 text-lg">
            Excelência acadêmica, pesquisa de alto nível e compromisso com o desenvolvimento da região Nordeste e do Brasil.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow">
        {/* About Context */}
        <section className="py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              <div className="lg:w-1/2">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-ufrpe-yellow/20 rounded-3xl blur-xl group-hover:bg-ufrpe-yellow/30 transition duration-700"></div>
                  <img
                    src="https://prpg.ufrpe.br/sites/default/files/2021-02/prpg.jpg"
                    alt="Sede da PRPG"
                    className="rounded-2xl shadow-2xl relative z-10 w-full object-cover"
                  />
                </div>
              </div>
              <div className="lg:w-1/2">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-ufrpe-blue/5 text-ufrpe-blue text-xs font-bold uppercase tracking-widest mb-6 border border-ufrpe-blue/10">
                  Inovação e Tradição
                </span>
                <h2 className="text-3xl md:text-4xl font-heading font-black text-ufrpe-blue mb-8 leading-tight">
                  Uma trajetória dedicada à formação de mestres e doutores.
                </h2>
                <div className="space-y-6 text-gray-600 leading-relaxed">
                  <p>
                    A Pós-graduação da UFRPE teve início em 1974 e evoluiu ao longo dos anos, sendo responsável pela formação de qualidade de mestres e doutores em Ciência e Tecnologia, oriundos de diversos estados do Nordeste do Brasil, contribuindo decisivamente para a formação de novos grupos de pesquisa e programas de pós-graduação na região.
                  </p>
                  <p>
                    Atualmente a UFRPE conta com <strong className="text-ufrpe-blue">42 Programas de Pós-graduação Stricto Sensu (PPG)</strong>, totalizando <strong className="text-ufrpe-blue">59 cursos</strong> em níveis de mestrado acadêmico, doutorado acadêmico, mestrado profissional e doutorado profissional, abrangendo todas as grandes áreas do conhecimento da CAPES.
                  </p>
                  <p>
                    Nosso objetivo é a formação de profissionais de alto nível para a docência, pesquisa e atividade autônoma, fomentando a produção de novos conhecimentos que atendam aos anseios da sociedade e contribuam para o desenvolvimento econômico e social.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Counter Section */}
        <section className="bg-[#151e36] py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <i className="fa-solid fa-chart-line text-[30rem] -bottom-20 -left-20 absolute rotate-12 text-white"></i>
          </div>
          <div className="container mx-auto px-4 relative z-10 text-white">
            <div className="text-center mb-16 px-4">
              <h2 className="text-3xl font-heading font-black mb-4 uppercase tracking-tighter">PRPG em Números</h2>
              <div className="w-16 h-1 bg-ufrpe-yellow mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
              {/* Stat 1 */}
              <div className="text-center group">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-ufrpe-yellow group-hover:text-ufrpe-blue transition-all duration-500 transform group-hover:scale-110">
                  <i className="fa-solid fa-user-graduate text-2xl"></i>
                </div>
                <div className="text-4xl md:text-5xl font-heading font-black text-ufrpe-yellow mb-2">2154</div>
                <p className="text-white/60 text-xs md:text-sm font-bold uppercase tracking-widest">Alunos Stricto Sensu</p>
              </div>
              {/* Stat 2 */}
              <div className="text-center group">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-ufrpe-yellow group-hover:text-ufrpe-blue transition-all duration-500 transform group-hover:scale-110">
                  <i className="fa-solid fa-graduation-cap text-2xl"></i>
                </div>
                <div className="text-4xl md:text-5xl font-heading font-black text-ufrpe-yellow mb-2">635</div>
                <p className="text-white/60 text-xs md:text-sm font-bold uppercase tracking-widest">Alunos Lato Sensu</p>
              </div>
              {/* Stat 3 */}
              <div className="text-center group">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-ufrpe-yellow group-hover:text-ufrpe-blue transition-all duration-500 transform group-hover:scale-110">
                  <i className="fa-solid fa-book text-2xl"></i>
                </div>
                <div className="text-4xl md:text-5xl font-heading font-black text-ufrpe-yellow mb-2">43</div>
                <p className="text-white/60 text-xs md:text-sm font-bold uppercase tracking-widest">Programas Stricto Sensu</p>
              </div>
              {/* Stat 4 */}
              <div className="text-center group">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-ufrpe-yellow group-hover:text-ufrpe-blue transition-all duration-500 transform group-hover:scale-110">
                  <i className="fa-solid fa-certificate text-2xl"></i>
                </div>
                <div className="text-4xl md:text-5xl font-heading font-black text-ufrpe-yellow mb-2">8</div>
                <p className="text-white/60 text-xs md:text-sm font-bold uppercase tracking-widest">Cursos Lato Sensu</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
