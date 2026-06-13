import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const RELATORIOS_DATA = [
  {
    edition: "VI",
    title: "VI Relatório de Autoavaliação dos Programas de Pós-Graduação da UFRPE",
    year: "2025",
    target: "Geral",
    link: "http://www.prpg.ufrpe.br/sites/default/files/arquivos-noticias/Relat%C3%B3rio%20Final%20Autoavaliac%CC%A7a%CC%83o%202025%20-%20PUBLICADO.pdf"
  },
  {
    edition: "V",
    title: "V Relatório de Autoavaliação dos Programas de Pós-Graduação da UFRPE",
    year: "2023",
    target: "Geral",
    link: "https://www.prpg.ufrpe.br/sites/default/files/documentos/V%20Relato%CC%81rio%20Autoavaliac%CC%A7a%CC%83o_Referente_ao_Ano_2023.pdf"
  },
  {
    edition: "IV",
    title: "IV Relatório de Autoavaliação dos Programas de Pós-Graduação da UFRPE",
    year: "2022",
    target: "Geral",
    link: "https://prpg.ufrpe.br/sites/default/files/2024-05/Relato%CC%81rio%20Autoavaliac%CC%A7a%CC%83o_Referente_ao_Ano_2022.pdf"
  },
  {
    edition: "III",
    title: "III Relatório de Autoavaliação dos Programas de Pós-Graduação da UFRPE",
    year: "Geral",
    target: "Geral",
    link: "https://prpg.ufrpe.br/sites/default/files/2024-04/III%20RELAT%C3%93RIO%20DE%20AUTOAVALIA%C3%87%C3%83O%20DOS%20PROGRAMAS%20DE%20P%C3%93S-GRADUA%C3%87%C3%83O%20DA%20UFRPE.pdf"
  },
  {
    edition: "II",
    title: "II Relatório de Autoavaliação dos Programas de Pós-Graduação da UFRPE",
    year: "Geral",
    target: "Geral",
    link: "https://prpg.ufrpe.br/sites/default/files/2024-04/II%20RELAT%C3%93RIO%20DE%20AUTOAVALIA%C3%87%C3%83O%20DOS%20PROGRAMAS%20DE%20P%C3%93S-GRADUA%C3%87%C3%83O%20DA%20UFRPE.pdf"
  },
  {
    edition: "I",
    title: "I Relatório de Autoavaliação dos Programas de Pós-Graduação da UFRPE (Técnico-Administrativos)",
    year: "Geral",
    target: "Técnico-Administrativos",
    link: "https://prpg.ufrpe.br/sites/default/files/2024-04/I%20RELAT%C3%93RIO%20DE%20AUTOAVALIA%C3%87%C3%83O%20DOS%20PROGRAMAS%20DE%20P%C3%93S-GRADUA%C3%87%C3%83O%20DA%20UFRPE%20%28TECNICO-ADMINISTRATIVOS%29.pdf"
  },
  {
    edition: "I",
    title: "I Relatório de Autoavaliação dos Programas de Pós-Graduação da UFRPE (Discentes e Docentes)",
    year: "Geral",
    target: "Discentes e Docentes",
    link: "https://prpg.ufrpe.br/sites/default/files/2024-04/I%20RELAT%C3%93RIO%20DE%20AUTOAVALIA%C3%87%C3%83O%20DOS%20PROGRAMAS%20DE%20P%C3%93S-GRADUA%C3%87%C3%83O%20DA%20UFRPE%20%28DISCENTES%20E%20DOCENTES%29.pdf"
  }
];

export default function RelatoriosAutoavaliacao() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRelatorios = RELATORIOS_DATA.filter(rel => 
    rel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.edition.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rel.target.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-chart-pie text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
        <div className="container mx-auto px-4 relative z-10">
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
                  <span className="text-ufrpe-yellow font-medium">Relatórios de Autoavaliação</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Relatórios de Autoavaliação</h1>
          <p className="text-white/70 mt-4 text-lg">
            Acompanhe o processo de autoavaliação dos programas de pós-graduação da UFRPE.
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
                  A autoavaliação institucional na pós-graduação da UFRPE é uma ferramenta fundamental para analisar, diagnosticar e buscar a melhoria contínua da qualidade acadêmica e de gestão de nossos programas. Os relatórios compilam dados, percepções e direcionamentos coletados com discentes, docentes e equipe técnico-administrativa.
                </p>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:w-3/4 space-y-6">
              {/* Search Bar */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Buscar relatórios por edição, título ou público-alvo..."
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

              {/* Reports List */}
              <div className="space-y-4">
                {filteredRelatorios.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                    <i className="fa-solid fa-folder-open text-gray-300 text-5xl mb-4"></i>
                    <h3 className="font-heading font-bold text-xl text-gray-700 mb-2">Nenhum relatório encontrado</h3>
                    <p className="text-gray-500">Tente buscar por termos mais genéricos.</p>
                  </div>
                ) : (
                  filteredRelatorios.map((rel, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md hover:border-ufrpe-yellow/50 transition-all group"
                    >
                      <div className="flex gap-4 items-start">
                        <div className="w-12 h-12 rounded-xl bg-ufrpe-yellow/10 text-ufrpe-yellow flex items-center justify-center font-bold text-lg shrink-0 group-hover:scale-110 transition-transform">
                          {rel.edition}
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="font-bold text-gray-800 text-base md:text-lg group-hover:text-ufrpe-blue transition-colors leading-snug">
                            {rel.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {rel.year !== "Geral" && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                Ano: {rel.year}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-ufrpe-cyan/10 text-ufrpe-cyan font-medium rounded">
                              Público: {rel.target}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <a
                          href={rel.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-5 py-3 bg-ufrpe-cyan hover:bg-ufrpe-blue text-white text-sm font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                        >
                          <i className="fa-solid fa-download"></i>
                          Baixar PDF
                        </a>
                      </div>
                    </div>
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
