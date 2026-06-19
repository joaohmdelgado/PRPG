import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { API_URL } from '../api';

const getCampusId = (campusName) => {
  return campusName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const mapModalidade = (tipo) => {
  switch (tipo) {
    case 'M': return 'Mestrado Acadêmico';
    case 'D': return 'Doutorado Acadêmico';
    case 'P': return 'Mestrado Profissional';
    default: return tipo;
  }
};

const STATUS_LABELS = {
  ATIVO: 'Ativo',
  SUSPENSO: 'Suspenso',
  EM_AVALIACAO: 'Em Avaliação',
  DESATIVADO: 'Desativado',
};

// Apenas situações que merecem destaque visual (ATIVO não recebe selo).
const STATUS_BADGE_CLS = {
  SUSPENSO: 'bg-amber-100 text-amber-800',
  EM_AVALIACAO: 'bg-blue-100 text-blue-800',
  DESATIVADO: 'bg-red-100 text-red-700',
};

export default function ProgramasStrictoSensu() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRede, setFilterRede] = useState('ALL');
  const [programasData, setProgramasData] = useState({});
  const [allProgramas, setAllProgramas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgramas = async () => {
      try {
        const response = await fetch(`${API_URL}/api/programas`);
        const data = await response.json();
        setAllProgramas(data);
      } catch (error) {
        console.error('Erro ao buscar programas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProgramas();
  }, []);

  useEffect(() => {
    // Group by campus name
    const grouped = {};
    const filtered = allProgramas.filter(prog => {
      const matchSearch = prog.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          prog.sigla.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (prog.area_conhecimento && prog.area_conhecimento.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (prog.linhas && prog.linhas.some(l => (l.nome || l.label || l).toLowerCase().includes(searchTerm.toLowerCase()))) ||
                          (prog.palavras_chave && prog.palavras_chave.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())));
      
      let matchRede = true;
      if (filterRede === 'SIM') matchRede = prog.em_rede === true;
      if (filterRede === 'NAO') matchRede = prog.em_rede === false;

      return matchSearch && matchRede;
    });

    filtered.forEach(prog => {
      const campus = prog.campus || 'SEDE';
      if (!grouped[campus]) {
        grouped[campus] = [];
      }
      grouped[campus].push(prog);
    });

    const campusOrder = ['SEDE', 'UAST', 'UACSA'];
    const orderedGrouped = {};
    
    campusOrder.forEach(c => {
      if (grouped[c]) orderedGrouped[c] = grouped[c];
    });

    Object.keys(grouped).forEach(c => {
      if (!campusOrder.includes(c)) orderedGrouped[c] = grouped[c];
    });

    setProgramasData(orderedGrouped);
  }, [allProgramas, searchTerm, filterRede]);

  const handleExport = (format) => {
    // Generate flat list from currently filtered programs
    const flatData = [];
    Object.values(programasData).forEach(list => {
      list.forEach(prog => {
        flatData.push({
          'Sigla': prog.sigla,
          'Nome': prog.nome,
          'Status': STATUS_LABELS[prog.status] || prog.status || 'Ativo',
          'Campus': prog.campus,
          'Em Rede': prog.em_rede ? 'Sim' : 'Não',
          'Nome da Rede': prog.nome_rede || '',
          'Grande Área': prog.grande_area || '',
          'Área de Conhecimento': prog.area_conhecimento || '',
          'Área de Avaliação': prog.area_avaliacao || '',
          'Modalidades': prog.modalidades.map(m => mapModalidade(m.tipo)).join(', '),
          'Notas CAPES': prog.modalidades.map(m => `${m.tipo}: ${m.nota_capes}`).join(', '),
          'Código CAPES': prog.codigo_capes || '',
          'Coordenador Atual': prog.coordenador_atual ? prog.coordenador_atual.nome : '',
          'Substituto': prog.substituto ? prog.substituto.nome : '',
          'Secretaria': prog.secretaria ? prog.secretaria.nome : ''
        });
      });
    });

    if (flatData.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Programas');

    if (format === 'excel') {
      XLSX.writeFile(workbook, 'programas_prpg.xlsx');
    } else {
      XLSX.writeFile(workbook, 'programas_prpg.csv', { bookType: 'csv' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ufrpe-blue"></div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-graduation-cap text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Programas Stricto Sensu</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">
            Programas de Pós-graduação Stricto Sensu
          </h1>
          <p className="text-white/70 mt-4 text-lg">
            Conheça nossos mestrados e doutorados oferecidos nas diversas unidades da UFRPE.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12 bg-gray-50">
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
                    {Object.keys(programasData).map(campus => (
                      <a
                        key={campus}
                        href={`#${getCampusId(campus)}`}
                        className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700 hover:text-ufrpe-blue group"
                      >
                        <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform"></i>
                        <span className="leading-snug">{campus}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:w-3/4 space-y-8">
              
              {/* Search Bar and Export */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Buscar programas, sigla, áreas ou linhas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none text-sm transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <select 
                    value={filterRede} 
                    onChange={e => setFilterRede(e.target.value)}
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
                  >
                    <option value="ALL">Todos</option>
                    <option value="SIM">Em Rede</option>
                    <option value="NAO">Sem Rede</option>
                  </select>
                  <button onClick={() => handleExport('excel')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors">
                    <i className="fa-solid fa-file-excel mr-2"></i> Excel
                  </button>
                  <button onClick={() => handleExport('csv')} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors">
                    <i className="fa-solid fa-file-csv mr-2"></i> CSV
                  </button>
                </div>
              </div>

              {Object.keys(programasData).length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm animate-in fade-in duration-300">
                  <i className="fa-solid fa-graduation-cap text-gray-300 text-5xl mb-4"></i>
                  <h3 className="text-xl font-bold text-ufrpe-blue mb-2">Nenhum programa encontrado</h3>
                  <p className="text-gray-500">Experimente buscar por outros termos ou limpar a busca.</p>
                </div>
              ) : (
                Object.entries(programasData).map(([campus, list]) => (
                  <div key={campus} id={getCampusId(campus)} className="space-y-6 scroll-mt-28">
                    <div className="mt-8 mb-4">
                      <h2 className="text-3xl font-heading font-black text-ufrpe-blue border-l-8 border-ufrpe-yellow pl-4">
                        {campus}
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {list.map((prog, index) => (
                        <div
                          key={index}
                          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:border-ufrpe-yellow hover:shadow-md transition-all group animate-in fade-in duration-300"
                        >
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <h3 className="font-bold text-lg text-ufrpe-blue group-hover:text-ufrpe-yellow transition-colors leading-tight">
                              {prog.nome} ({prog.sigla})
                            </h3>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap mb-4">
                            {prog.modalidades && prog.modalidades.map((m, mIdx) => (
                              <span
                                key={mIdx}
                                className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-ufrpe-yellow/20 text-ufrpe-blue rounded"
                                title={`Nota CAPES: ${m.nota_capes || 'N/A'}`}
                              >
                                {mapModalidade(m.tipo)} {m.nota_capes && `(Nota ${m.nota_capes})`}
                              </span>
                            ))}
                            {prog.em_rede && (
                              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                Em Rede
                              </span>
                            )}
                            {prog.status && STATUS_BADGE_CLS[prog.status] && (
                              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${STATUS_BADGE_CLS[prog.status]}`}>
                                {STATUS_LABELS[prog.status]}
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100 flex-grow">
                            {prog.area_conhecimento && (
                              <div className="mb-3">
                                <strong className="text-gray-900 block mb-1">Área de Conhecimento:</strong>
                                <span>{prog.area_conhecimento}</span>
                              </div>
                            )}
                            {prog.linhas && prog.linhas.length > 0 && (
                              <div className="mb-3">
                                <strong className="text-gray-900 block mb-1">Linhas de Pesquisa:</strong>
                                <ul className="mt-2">
                                  {prog.linhas.map((linha, liIdx) => (
                                    <li key={liIdx} className="relative pl-3 text-sm text-gray-600 mb-1">
                                      <span className="absolute left-0 top-1 text-ufrpe-yellow text-[8px]">
                                        <i className="fa-solid fa-circle"></i>
                                      </span>
                                      {linha.nome || linha.label || linha}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-xs">
                              {prog.coordenador_atual && prog.coordenador_atual.nome && (
                                <div>
                                  <strong className="text-gray-900">Coordenador(a):</strong> <span className="text-gray-600 block sm:inline sm:ml-1">{prog.coordenador_atual.nome}</span>
                                </div>
                              )}
                              {prog.substituto && prog.substituto.nome && (
                                <div>
                                  <strong className="text-gray-900">Vice/Substituto(a):</strong> <span className="text-gray-600 block sm:inline sm:ml-1">{prog.substituto.nome}</span>
                                </div>
                              )}
                              {prog.secretaria && prog.secretaria.nome && (
                                <div>
                                  <strong className="text-gray-900">Secretário(a):</strong> <span className="text-gray-600 block sm:inline sm:ml-1">{prog.secretaria.nome}</span>
                                </div>
                              )}
                            </div>

                            {(prog.bloco || prog.sala || prog.telefone_secretaria || prog.horario_atendimento || prog.email_programa) && (
                              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                                {(prog.bloco || prog.sala) && (
                                  <div><i className="fa-solid fa-location-dot text-ufrpe-yellow mr-2 w-3.5"></i>{[prog.bloco, prog.sala && `Sala ${prog.sala}`].filter(Boolean).join(' — ')}</div>
                                )}
                                {prog.telefone_secretaria && (
                                  <div><i className="fa-solid fa-phone text-ufrpe-yellow mr-2 w-3.5"></i>{prog.telefone_secretaria}</div>
                                )}
                                {prog.horario_atendimento && (
                                  <div><i className="fa-solid fa-clock text-ufrpe-yellow mr-2 w-3.5"></i>{prog.horario_atendimento}</div>
                                )}
                                {prog.email_programa && (
                                  <div><i className="fa-solid fa-envelope text-ufrpe-yellow mr-2 w-3.5"></i><a href={`mailto:${prog.email_programa}`} className="hover:text-ufrpe-blue break-all">{prog.email_programa}</a></div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-auto">
                            {(prog.regimento_url || prog.regulamento_url || prog.sucupira_url) && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {prog.regimento_url && (
                                  <a href={prog.regimento_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg text-ufrpe-blue hover:bg-gray-100 transition-colors">
                                    <i className="fa-solid fa-file-lines mr-1.5 opacity-60"></i>Regimento
                                  </a>
                                )}
                                {prog.regulamento_url && (
                                  <a href={prog.regulamento_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg text-ufrpe-blue hover:bg-gray-100 transition-colors">
                                    <i className="fa-solid fa-file-signature mr-1.5 opacity-60"></i>Regulamento
                                  </a>
                                )}
                                {prog.sucupira_url && (
                                  <a href={prog.sucupira_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg text-ufrpe-blue hover:bg-gray-100 transition-colors">
                                    <i className="fa-solid fa-chart-column mr-1.5 opacity-60"></i>Sucupira
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
