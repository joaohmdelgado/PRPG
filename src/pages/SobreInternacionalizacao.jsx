import React from 'react';
import { Link } from 'react-router-dom';

const COMPETENCIAS = [
  {
    num: "I",
    text: "Definir políticas de internacionalização para os Programas de Pós-Graduação Stricto Sensu."
  },
  {
    num: "II",
    text: "Fortalecer os programas internacionais de apoio à Pós-Graduação Stricto sensu."
  },
  {
    num: "III",
    text: "Estimular o intercâmbio de professores e alunos oriundos de instituições estrangeiras para colaborarem com a formação dos pós-graduandos."
  },
  {
    num: "IV",
    text: "Auxiliar os Coordenadores de Programas de Pós-Graduação Stricto sensu no recebimento de alunos e professores estrangeiros."
  },
  {
    num: "V",
    text: "Analisar Termos de Cooperação Acadêmica, inclusive de Cotutela de Doutorado e Dupla titulação."
  }
];

const HISTORICO_COORDENADORES = [
  {
    name: "Prof. Jorge Braz Torres",
    period: "05/04/2023 a 20/05/2024"
  },
  {
    name: "Prof. Clístenes Williams Araújo do Nascimento",
    period: "29/05/2021 a 05/04/2023"
  }
];

export default function SobreInternacionalizacao() {
  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-earth-americas text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
        <div className="container mx-auto px-4 relative z-10">
          <nav className="flex text-white/60 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link to="/" className="hover:text-ufrpe-yellow transition-colors">Início</Link>
              </li>
              <li>
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-white">Internacionalização</span>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-ufrpe-yellow font-medium">Sobre</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Sobre a Internacionalização</h1>
          <p className="text-white/70 mt-4 text-lg">
            Coordenação de Internacionalização dos Programas de Pós-Graduação Stricto Sensu da UFRPE.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar (Contacts and History) */}
            <div className="lg:w-1/4 shrink-0 space-y-6">
              
              {/* Contact Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-heading font-bold text-lg text-ufrpe-blue mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-address-book text-ufrpe-yellow"></i> Contatos
                </h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <div>
                    <strong className="block text-gray-900">Coordenador Atual:</strong>
                    <span>Prof. Edivan Rodrigues de Souza</span>
                  </div>
                  <div>
                    <strong className="block text-gray-900">Secretário:</strong>
                    <span>Nathanyel Santos</span>
                  </div>
                  <p className="flex items-start gap-2 pt-2 border-t border-gray-100">
                    <i className="fa-solid fa-envelope text-ufrpe-yellow mt-1"></i>
                    <span>
                      <strong className="block text-gray-900">E-mail:</strong>
                      cippg.prpg@ufrpe.br
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fa-solid fa-phone text-ufrpe-yellow mt-1"></i>
                    <span>
                      <strong className="block text-gray-900">Telefone:</strong>
                      (81) 3320-6051
                    </span>
                  </p>
                </div>
              </div>

              {/* History Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-heading font-bold text-lg text-ufrpe-blue mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-ufrpe-yellow"></i> Gestões Anteriores
                </h3>
                <div className="relative pl-4 border-l border-gray-200 space-y-6 text-sm">
                  {HISTORICO_COORDENADORES.map((c, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-ufrpe-yellow border-2 border-white ring-4 ring-ufrpe-yellow/10"></span>
                      <strong className="block text-gray-900 leading-tight">{c.name}</strong>
                      <span className="text-xs text-gray-500">{c.period}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Main Area */}
            <div className="lg:w-3/4 space-y-8">
              
              {/* Introduction */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h2 className="font-heading font-bold text-2xl text-ufrpe-blue pb-2 border-b border-gray-100">
                  Apresentação
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  A coordenação de Internacionalização dos Programas de Pós-Graduação Stricto sensu da Pró-reitoria de pós-graduação (PRPG) foi criada em 11 de agosto pela resolução 030-A/2020, que regula a estrutura organizacional da UFRPE.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  A necessidade de uma coordenação especializada em tratar de pautas que envolvam ações de internacionalização desenvolvidas no âmbito dos Programas de Pós-Graduação Stricto Sensu da UFRPE se deu devido à necessidade de ampliar e consolidar esse tipo de ação nos Programas de pós-graduação, uma vez que está diretamente relacionada com a qualidade da pesquisa e da nota dos Cursos avaliados pela Coordenação de Aperfeiçoamento de Pessoal de Nível Superior (CAPES).
                </p>
              </div>

              {/* Competencies */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h2 className="font-heading font-bold text-2xl text-ufrpe-blue pb-2 border-b border-gray-100">
                  Competências da Coordenação
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {COMPETENCIAS.map((c, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-ufrpe-yellow/10 text-ufrpe-yellow flex items-center justify-center font-bold text-sm shrink-0">
                        {c.num}
                      </div>
                      <p className="text-gray-700 leading-relaxed text-sm pt-1">
                        {c.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    </>
  );
}
