import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const MODAL_DATA = {
  secretaria: {
    title: "Secretaria Administrativa",
    content: (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-ufrpe-blue/5 rounded-2xl flex items-center justify-center text-ufrpe-blue shrink-0 font-bold">RC</div>
          <div>
            <h5 className="font-bold text-gray-900 leading-tight">Raquelle Cavalcanti Souza da Silva</h5>
            <p className="text-sm text-gray-500">Secretária Administrativa</p>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-envelope opacity-50"></i> sec.prpg@ufrpe.br
          </p>
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-phone opacity-50"></i> (81) 3320-6050
          </p>
        </div>
      </div>
    )
  },
  excelencia: {
    title: "PPG Stricto sensu de Excelência",
    content: (
      <div className="space-y-8">
        <div className="grid gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-ufrpe-blue/5 rounded-2xl flex items-center justify-center text-ufrpe-blue shrink-0 font-bold">AC</div>
            <div>
              <h5 className="font-bold text-gray-900 leading-tight">Profª. Anete Soares Cavalcanti</h5>
              <p className="text-sm text-gray-500">Coordenadora</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-ufrpe-blue/5 rounded-2xl flex items-center justify-center text-ufrpe-blue shrink-0 font-bold">DJ</div>
            <div>
              <h5 className="font-bold text-gray-900 leading-tight">Diego de Queiroz Jordão</h5>
              <p className="text-sm text-gray-500">Secretário</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-envelope opacity-50"></i> sec.cppg@ufrpe.br
          </p>
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-phone opacity-50"></i> (81) 3320-6052
          </p>
          <p className="flex items-center gap-3 text-sm font-medium text-green-600">
            <i className="fa-brands fa-whatsapp"></i> (81) 99940-1506
          </p>
        </div>
      </div>
    )
  },
  consolidacao: {
    title: "PPG Stricto sensu em Consolidação",
    content: (
      <div className="space-y-8">
        <div className="grid gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-ufrpe-blue/5 rounded-2xl flex items-center justify-center text-ufrpe-blue shrink-0 font-bold">TP</div>
            <div>
              <h5 className="font-bold text-gray-900 leading-tight">Profª. Tatiana Souza Porto</h5>
              <p className="text-sm text-gray-500">Coordenadora</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-ufrpe-blue/5 rounded-2xl flex items-center justify-center text-ufrpe-blue shrink-0 font-bold">AR</div>
            <div>
              <h5 className="font-bold text-gray-900 leading-tight">Analice Regis</h5>
              <p className="text-sm text-gray-500">Secretária</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-envelope opacity-50"></i> cppg.prpg@ufrpe.br
          </p>
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-phone opacity-50"></i> (81) 3320-6052
          </p>
        </div>
      </div>
    )
  },
  internacionalizacao: {
    title: "Internacionalização PPG Stricto sensu",
    content: (
      <div className="space-y-8">
        <div className="grid gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-ufrpe-blue/5 rounded-2xl flex items-center justify-center text-ufrpe-blue shrink-0 font-bold">ES</div>
            <div>
              <h5 className="font-bold text-gray-900 leading-tight">Prof. Edivan Rodrigues de Souza</h5>
              <p className="text-sm text-gray-500">Coordenador</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-ufrpe-blue/5 rounded-2xl flex items-center justify-center text-ufrpe-blue shrink-0 font-bold">NS</div>
            <div>
              <h5 className="font-bold text-gray-900 leading-tight">Nathanyel Santos</h5>
              <p className="text-sm text-gray-500">Secretário</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-envelope opacity-50"></i> cippg.prpg@ufrpe.br
          </p>
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-phone opacity-50"></i> (81) 3320-6051
          </p>
        </div>
      </div>
    )
  },
  latosensu: {
    title: "Cursos de Pós-Graduação Lato sensu",
    content: (
      <div className="space-y-8">
        <div className="grid gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-ufrpe-blue/5 rounded-2xl flex items-center justify-center text-ufrpe-blue shrink-0 font-bold">RN</div>
            <div>
              <h5 className="font-bold text-gray-900 leading-tight">Prof. Ramom Rachide Nunes</h5>
              <p className="text-sm text-gray-500">Coordenador</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-ufrpe-blue/5 rounded-2xl flex items-center justify-center text-ufrpe-blue shrink-0 font-bold">MA</div>
            <div>
              <h5 className="font-bold text-gray-900 leading-tight">Mariana da Conceição Alves</h5>
              <p className="text-sm text-gray-500">Secretária</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-envelope opacity-50"></i> latosensu@ufrpe.br
          </p>
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-phone opacity-50"></i> (81) 3320-6055
          </p>
        </div>
      </div>
    )
  },
  financeiro: {
    title: "Gestão Financeira",
    content: (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-ufrpe-blue/5 rounded-2xl flex items-center justify-center text-ufrpe-blue shrink-0 font-bold">JP</div>
          <div>
            <h5 className="font-bold text-gray-900 leading-tight">João Ferreira dos Santos Pimentel Neto</h5>
            <p className="text-sm text-gray-500">Coordenador de Gestão Financeira</p>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-envelope opacity-50"></i> financeiro.prpg@ufrpe.br
          </p>
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-phone opacity-50"></i> (81) 3320-6056
          </p>
        </div>
      </div>
    )
  },
  clinica: {
    title: "Clínica de Bovinos de Garanhuns",
    content: (
      <div className="space-y-6">
        <p className="text-gray-600 text-sm leading-relaxed">
          Unidade especializada localizada no Agreste pernambucano, dedicada ao atendimento clínico e hospitalar, servindo de base para o ensino prático e pesquisas avançadas em Medicina Veterinária.
        </p>
        <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
          <p className="flex items-start gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-location-dot mt-1 opacity-50"></i> Av. Bom Pastor, s/n, Garanhuns - PE
          </p>
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-envelope opacity-50"></i> cbg.prppg.ufrpe.br
          </p>
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-phone opacity-50"></i> (87) 3761-3233 / 3762-2397
          </p>
        </div>
      </div>
    )
  },
  nubiotec: {
    title: "Núcleo de Biotecnologia (NUBIOTEC)",
    content: (
      <div className="space-y-6">
        <p className="text-gray-600 text-sm leading-relaxed">
          O NUBIOTEC é uma unidade multiusuária vinculada à PRPG/UFRPE, construída com recursos da FINEP. Sua finalidade é desenvolver atividades científicas e tecnológicas visando produtos e serviços biotecnológicos inovadores.
        </p>
        <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-globe opacity-50"></i> nubiotec.prpg@ufrpe.br
          </p>
          <p className="flex items-center gap-3 text-sm font-medium text-ufrpe-blue">
            <i className="fa-solid fa-phone opacity-50"></i> (81) 3320-6057
          </p>
        </div>
      </div>
    )
  }
};

export default function EstruturaOrganizacional() {
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (key) => {
    setActiveModal(key);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveModal(null);
    document.body.style.overflow = '';
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-sitemap text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Estrutura Organizacional</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Estrutura Organizacional</h1>
          <p className="text-white/70 mt-4 text-lg">
            Conheça a organização administrativa e acadêmica da Pró-Reitoria de Pós-Graduação da UFRPE.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            
            {/* Root Node */}
            <div className="flex justify-center mb-16">
              <div className="bg-ufrpe-blue text-white p-8 md:p-12 rounded-3xl shadow-xl w-full max-w-2xl text-center border-b-4 border-ufrpe-yellow relative group overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <h2 className="text-2xl md:text-3xl font-heading font-black mb-2 uppercase tracking-tight">Pró-Reitoria de Pós-Graduação</h2>
                <div className="w-16 h-1 bg-ufrpe-yellow mx-auto rounded-full mb-6"></div>
                <p className="text-white/80 font-medium mb-6">Liderança institucional e estratégica da Pós-Graduação na UFRPE.</p>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => openModal('secretaria')} className="bg-white/10 hover:bg-ufrpe-yellow text-white px-6 py-2.5 rounded-full font-bold text-sm transition flex items-center gap-2 border border-white/20 cursor-pointer">
                    <i className="fa-solid fa-info-circle"></i> Secretaria Administrativa
                  </button>
                </div>
              </div>
            </div>

            {/* Org Divider */}
            <div className="flex flex-col items-center mb-12">
              <div className="w-0.5 h-12 bg-gray-300"></div>
              <div className="w-full h-0.5 bg-gray-300 max-w-4xl"></div>
            </div>

            {/* Grid of Coordinations */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Card 1: Stricto Sensu Excelência */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all border-t-4 border-ufrpe-blue flex flex-col justify-between">
                <div>
                  <h3 className="font-heading font-bold text-ufrpe-blue text-lg leading-snug mb-4">Coord. dos Programas de Pós-Graduação Stricto sensu de Excelência</h3>
                  <p className="text-sm text-gray-600 mb-6">Incentivo e acompanhamento dos programas com os mais altos conceitos na avaliação da CAPES.</p>
                </div>
                <button onClick={() => openModal('excelencia')} className="text-ufrpe-blue font-bold text-sm flex items-center gap-2 hover:text-ufrpe-yellow transition text-left cursor-pointer">
                  Ver detalhes <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>

              {/* Card 2: Stricto Sensu Consolidação */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all border-t-4 border-ufrpe-blue flex flex-col justify-between">
                <div>
                  <h3 className="font-heading font-bold text-ufrpe-blue text-lg leading-snug mb-4">Coord. dos Programas de Pós-Graduação Stricto sensu em Consolidação</h3>
                  <p className="text-sm text-gray-600 mb-6">Apoio ao crescimento e fortalecimento de programas em desenvolvimento na instituição.</p>
                </div>
                <button onClick={() => openModal('consolidacao')} className="text-ufrpe-blue font-bold text-sm flex items-center gap-2 hover:text-ufrpe-yellow transition text-left cursor-pointer">
                  Ver detalhes <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>

              {/* Card 3: Internacionalização */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all border-t-4 border-ufrpe-blue flex flex-col justify-between">
                <div>
                  <h3 className="font-heading font-bold text-ufrpe-blue text-lg leading-snug mb-4">Coord. de Internacionalização dos Programas de Pós-Graduação Stricto sensu</h3>
                  <p className="text-sm text-gray-600 mb-6">Gestão de convênios internacionais, mobilidade acadêmica e projetos de cooperação global.</p>
                </div>
                <button onClick={() => openModal('internacionalizacao')} className="text-ufrpe-blue font-bold text-sm flex items-center gap-2 hover:text-ufrpe-yellow transition text-left cursor-pointer">
                  Ver detalhes <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>

              {/* Card 4: Lato Sensu */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all border-t-4 border-ufrpe-blue flex flex-col justify-between">
                <div>
                  <h3 className="font-heading font-bold text-ufrpe-blue text-lg leading-snug mb-4">Coord. dos Cursos de Pós-Graduação Lato sensu</h3>
                  <p className="text-sm text-gray-600 mb-6">Gestão de cursos de especialização e residências profissionais da universidade.</p>
                </div>
                <button onClick={() => openModal('latosensu')} className="text-ufrpe-blue font-bold text-sm flex items-center gap-2 hover:text-ufrpe-yellow transition text-left cursor-pointer">
                  Ver detalhes <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>

              {/* Card 5: Financeiro */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all border-t-4 border-ufrpe-blue flex flex-col justify-between">
                <div>
                  <h3 className="font-heading font-bold text-ufrpe-blue text-lg leading-snug mb-4">Coord. de Gestão Financeira</h3>
                  <p className="text-sm text-gray-600 mb-6">Responsável pela execução orçamentária e financeira dos recursos da PRPG.</p>
                </div>
                <button onClick={() => openModal('financeiro')} className="text-ufrpe-blue font-bold text-sm flex items-center gap-2 hover:text-ufrpe-yellow transition text-left cursor-pointer">
                  Ver detalhes <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>

              {/* Card 6: Clínica de Bovinos */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all border-t-4 border-ufrpe-blue flex flex-col justify-between">
                <div>
                  <h3 className="font-heading font-bold text-ufrpe-blue text-lg leading-snug mb-4">Coord. da Clínica de Bovinos de Garanhuns</h3>
                  <p className="text-sm text-gray-600 mb-6">Unidade especializada localizada em Garanhuns para ensino e pesquisa em veterinária.</p>
                </div>
                <button onClick={() => openModal('clinica')} className="text-ufrpe-blue font-bold text-sm flex items-center gap-2 hover:text-ufrpe-yellow transition text-left cursor-pointer">
                  Ver detalhes <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>

              {/* Card 7: NUBIOTEC */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all border-t-4 border-ufrpe-blue flex flex-col justify-between">
                <div>
                  <h3 className="font-heading font-bold text-ufrpe-blue text-lg leading-snug mb-4">Coord. do Núcleo de Biotecnologia (NUBIOTEC)</h3>
                  <p className="text-sm text-gray-600 mb-6">Unidade multiusuária de apoio a pesquisas biotecnológicas avançadas.</p>
                </div>
                <button onClick={() => openModal('nubiotec')} className="text-ufrpe-blue font-bold text-sm flex items-center gap-2 hover:text-ufrpe-yellow transition text-left cursor-pointer">
                  Ver detalhes <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {activeModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-ufrpe-blue hover:text-white transition z-10 cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <div className="p-8 md:p-12">
              <h4 className="text-2xl font-black text-ufrpe-blue mb-6 leading-tight">
                {MODAL_DATA[activeModal]?.title}
              </h4>
              {MODAL_DATA[activeModal]?.content}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
