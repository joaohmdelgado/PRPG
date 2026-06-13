import React from 'react';
import { Link } from 'react-router-dom';

const RESIDENCIA_ITEMS = [
  {
    title: "Residência Veterinária - Campus Recife (Sede)",
    description: "Provas, gabaritos e informações sobre o programa de Residência Veterinária realizado no Campus Recife.",
    path: "https://prpg.ufrpe.br/pt-br/residencia-veterinaria-campus-recife-sede",
    isExternal: true,
    icon: "fa-solid fa-graduation-cap"
  },
  {
    title: "Residência Veterinária - Campus Garanhuns (Clínica Médica de Ruminantes)",
    description: "Provas, gabaritos e informações sobre a Residência Veterinária com foco em Clínica Médica de Ruminantes em Garanhuns.",
    path: "https://prpg.ufrpe.br/pt-br/residencia-veterinaria-campus-garanhuns-clinica-de-bovinos",
    isExternal: true,
    icon: "fa-solid fa-cow"
  },
  {
    title: "Editais de Pós-Graduação",
    description: "Consulte editais de seleção abertos e concluídos para programas de Residência e Especialização na UFRPE.",
    path: "/editais",
    isExternal: false,
    icon: "fa-solid fa-file-invoice"
  }
];

export default function ResidenciaProfissional() {
  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-briefcase text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Residência Profissional</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Residência Profissional</h1>
          <p className="text-white/70 mt-4 text-lg">
            Acompanhe informações, gabaritos e editais relativos aos programas de residência profissional da UFRPE.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar */}
            <div className="lg:w-1/4 shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-28 p-6">
                <h3 className="font-heading font-bold text-lg text-ufrpe-blue mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-circle-info text-ufrpe-yellow"></i> Sobre
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Os programas de Residência Profissional em Área de Saúde e Veterinária da UFRPE oferecem treinamento em serviço de alto nível, preparando profissionais graduados para desafios do mercado e da pesquisa clínica nas unidades acadêmicas. Escolha uma das opções ao lado para acessar provas, gabaritos e materiais informativos.
                </p>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:w-3/4 space-y-6">
              {/* Links Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {RESIDENCIA_ITEMS.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-ufrpe-yellow/50 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-ufrpe-yellow/10 text-ufrpe-yellow flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                        <i className={item.icon}></i>
                      </div>
                      <h3 className="font-bold text-gray-800 text-lg group-hover:text-ufrpe-blue transition-colors leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      {item.isExternal ? (
                        <a
                          href={item.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full text-center py-2.5 bg-gray-50 border border-gray-100 text-ufrpe-blue font-bold text-sm rounded-lg hover:bg-ufrpe-blue hover:border-ufrpe-blue hover:text-white transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square text-xs opacity-50"></i>
                          Acessar Site
                        </a>
                      ) : (
                        <Link
                          to={item.path}
                          className="w-full text-center py-2.5 bg-gray-50 border border-gray-100 text-ufrpe-blue font-bold text-sm rounded-lg hover:bg-ufrpe-blue hover:border-ufrpe-blue hover:text-white transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                        >
                          Ver Editais
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
