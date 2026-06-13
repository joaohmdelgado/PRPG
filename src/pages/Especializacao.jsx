import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const CURSOS_LATO_SENSU = [
  {
    title: "Educação, Inovação e Tecnologia Aplicada (EITA!)",
    link: "http://www.eita.ufrpe.br/",
    dept: "Educação",
    workload: "420 h"
  },
  {
    title: "Ensino de Astronomia e Ciências Afins",
    link: "http://www.ead.ufrpe.br/espec/astronomia",
    dept: "EAD",
    workload: "420 h"
  },
  {
    title: "Especialização em Artes e Tecnologia - Turma 2021",
    link: "",
    dept: "Artes e Tecnologia",
    workload: ""
  },
  {
    title: "Especialização em Gestão Pública Municipal",
    link: "",
    dept: "Administração",
    workload: ""
  },
  {
    title: "Especialização em Questão Agrária",
    link: "",
    dept: "Ciências Sociais",
    workload: ""
  },
  {
    title: "Especializações em Políticas Sociais - CapacitaSUAS",
    link: "",
    dept: "Ciências Sociais",
    workload: ""
  },
  {
    title: "Especializações em Políticas Sociais e Gestão de Política Sociais",
    link: "",
    dept: "Ciências Sociais",
    workload: ""
  },
  {
    title: "III Curso de Especialização em Direitos da Criança e do Adolescente",
    link: "",
    dept: "Ciências Sociais",
    workload: ""
  }
];

export default function Especializacao() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCursos = CURSOS_LATO_SENSU.filter(curso =>
    curso.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (curso.dept && curso.dept.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-certificate text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
        <div className="container mx-auto px-4 relative z-10">
          <nav className="flex text-white/60 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link to="/" className="hover:text-ufrpe-yellow transition-colors">Início</Link>
              </li>
              <li>
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-white">Especialização</span>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-ufrpe-yellow font-medium">Especialização</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Especialização</h1>
          <p className="text-white/70 mt-4 text-lg">
            Cursos de pós-graduação Lato Sensu oferecidos pela UFRPE nas diversas áreas de conhecimento.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar (Contacts and Links) */}
            <div className="lg:w-1/4 shrink-0 space-y-6">
              
              {/* Contact Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-heading font-bold text-lg text-ufrpe-blue mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-address-book text-ufrpe-yellow"></i> Contato
                </h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <p className="flex items-start gap-2">
                    <i className="fa-solid fa-envelope text-ufrpe-yellow mt-1"></i>
                    <span>
                      <strong className="block text-gray-900">E-mail:</strong>
                      latosensu.prpg@ufrpe.br
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fa-solid fa-phone text-ufrpe-yellow mt-1"></i>
                    <span>
                      <strong className="block text-gray-900">Telefone:</strong>
                      (81) 3320-6055
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fa-solid fa-brands fa-whatsapp text-ufrpe-yellow mt-1"></i>
                    <span>
                      <strong className="block text-gray-900">WhatsApp:</strong>
                      (81) 9 9653-7655
                    </span>
                  </p>
                </div>
              </div>

              {/* Norms & Guidelines Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
                <h3 className="font-heading font-bold text-lg text-ufrpe-blue mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-folder-open text-ufrpe-yellow"></i> Documentos
                </h3>
                <a
                  href="https://prpg.ufrpe.br/sites/default/files/legislacao/RECEPE904.2025%20%20APROVA%20NORMAS%20GERAIS%20LATO%20SENSU%20E%20REVOGA%20RECEPE%20226.2020%20E%20293.2019.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group"
                >
                  <i className="fa-solid fa-file-pdf text-ufrpe-yellow group-hover:scale-110 transition-transform"></i>
                  <span className="leading-snug">Normas Gerais</span>
                </a>
                <a
                  href="http://prppg.ufrpe.br/sites/default/files/processo_lato_sensu.jpeg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group"
                >
                  <i className="fa-solid fa-image text-ufrpe-yellow group-hover:scale-110 transition-transform"></i>
                  <span className="leading-snug">Fluxograma de Processos</span>
                </a>
              </div>

            </div>

            {/* Main Area */}
            <div className="lg:w-3/4 space-y-8">
              
              {/* Intro Text */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <p className="text-gray-600 leading-relaxed">
                  Os cursos Lato Sensu, promovidos pela UFRPE, têm cumprido um papel relevante na formação de profissionais que atuam nas diferentes áreas de conhecimento. A primeira pós-graduação Lato Sensu da UFRPE foi realizada em 1974. Há quase 40 anos, a Especialização em Fruticultura deu início a um novo ciclo no processo de desenvolvimento sócio-intelectual dos aprendizes. Novos projetos de especialização foram aprovados e cursos nas áreas de ciências agrícolas, biológicas, humanas, sociais, exatas e da terra foram oferecidos e continuam sendo ofertados.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  A Universidade, através de seus Departamentos, desenvolve cursos à comunidade externa, ao ambiente acadêmico, bem como aos servidores federais interessados em aperfeiçoar sua atuação através da discussão e apreensão de novos aportes teóricos e práticos.
                </p>
                <div className="bg-ufrpe-blue/5 border-l-4 border-ufrpe-yellow p-4 rounded-r-xl">
                  <p className="text-sm text-ufrpe-blue font-bold">
                    Aviso: Os interessados em cursos de Especialização devem acompanhar as notícias postadas no nosso portal principal.
                  </p>
                </div>
              </div>

              {/* Search filter for courses */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Digite para buscar cursos de especialização..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none text-sm transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Accordion List of Courses */}
              <div className="space-y-4">
                <h2 className="font-heading font-bold text-2xl text-ufrpe-blue pb-2 border-b border-gray-100">
                  Cursos Ofertados
                </h2>

                {filteredCursos.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                    <i className="fa-solid fa-folder-open text-gray-300 text-5xl mb-4"></i>
                    <h3 className="font-heading font-bold text-xl text-gray-700 mb-2">Nenhum curso encontrado</h3>
                    <p className="text-gray-500">Tente buscar por termos mais genéricos.</p>
                  </div>
                ) : (
                  filteredCursos.map((curso, idx) => (
                    <details
                      key={idx}
                      open={searchTerm !== ''}
                      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                    >
                      <summary className="p-5 font-bold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition border-b border-transparent group-open:border-gray-100 group-open:bg-gray-50 group-open:text-ufrpe-blue">
                        {curso.title}
                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 group-open:bg-ufrpe-yellow group-open:text-white text-gray-500 transition-colors">
                          <i className="fa-solid fa-chevron-down transition-transform duration-300 group-open:rotate-180"></i>
                        </span>
                      </summary>
                      <div className="p-6 bg-white space-y-4 border-t border-gray-100 text-sm">
                        <div className="grid md:grid-cols-3 gap-6">
                          {curso.dept && (
                            <div>
                              <strong className="block text-gray-900 mb-1">Departamento:</strong>
                              <span className="text-gray-600">{curso.dept}</span>
                            </div>
                          )}
                          {curso.workload && (
                            <div>
                              <strong className="block text-gray-900 mb-1">Carga Horária:</strong>
                              <span className="text-gray-600">{curso.workload}</span>
                            </div>
                          )}
                          {curso.link && (
                            <div>
                              <strong className="block text-gray-900 mb-1">Website:</strong>
                              <a
                                href={curso.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-ufrpe-cyan hover:text-ufrpe-blue font-bold flex items-center gap-1.5"
                              >
                                <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                                Acessar Site do Curso
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </details>
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
