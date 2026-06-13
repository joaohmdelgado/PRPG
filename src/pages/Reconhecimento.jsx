import React from 'react';
import { Link } from 'react-router-dom';

const DOCUMENT_ITEMS = [
  {
    num: "I",
    title: "Formulário de Solicitação",
    desc: "Formulário de solicitação preenchido contendo os dados pessoais e, quando aplicável, informações de vinculação institucional no Brasil (Anexo IV)."
  },
  {
    num: "II",
    title: "Documentos Pessoais",
    desc: "Documento de identidade com foto, CPF, título de eleitor com comprovante de quitação, dispensa militar (para homens), certidão de nascimento/casamento e comprovante de residência. Para estrangeiros, cópia da cédula de identidade de estrangeiro com comprovação de permanência regular expedida pela Polícia Federal."
  },
  {
    num: "III",
    title: "Diploma Estrangeiro",
    desc: "Cópia do diploma devidamente registrado pela instituição estrangeira responsável pela diplomação, em conformidade com as leis do país de origem e acordos internacionais."
  },
  {
    num: "IV",
    title: "Trabalho Acadêmico (Tese ou Dissertação)",
    desc: "Exemplar em arquivo digital da tese, dissertação ou trabalho equivalente com aprovação documentada, ata de defesa oficial com data, participantes da banca examinadora e currículos resumidos dos avaliadores."
  },
  {
    num: "V",
    title: "Histórico Escolar",
    desc: "Histórico emitido pela instituição estrangeira descrevendo disciplinas, notas, conceitos, carga horária e matriz curricular do curso."
  },
  {
    num: "VI",
    title: "Trabalhos Publicados e Produção Científica",
    desc: "Descrição resumida das atividades de pesquisa e cópias de trabalhos científicos resultantes da dissertação ou tese, publicados ou apresentados em congressos."
  },
  {
    num: "VII",
    title: "Avaliação Externa do Programa",
    desc: "Resultados da avaliação externa do curso ou programa de pós-graduação estrangeiro e dados sobre sua reputação acadêmica."
  },
  {
    num: "VIII",
    title: "Declaração de Autenticidade",
    desc: "Declaração assinada de autenticidade e veracidade de todas as informações e documentos anexados (Anexo V)."
  },
  {
    num: "IX",
    title: "Termo de Exclusividade",
    desc: "Termo atestando que não há processo concomitante de reconhecimento para o mesmo diploma em outra instituição nacional (Anexo VI)."
  },
  {
    num: "X",
    title: "Comprovação de Estada no Exterior",
    desc: "Documento comprovando o período de permanência física no exterior durante a realização dos estudos."
  },
  {
    num: "XI",
    title: "Taxa do Processo",
    desc: "Comprovante de pagamento das taxas financeiras associadas ao trâmite de reconhecimento."
  }
];

export default function Reconhecimento() {
  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-stamp text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Reconhecimento de Diploma</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Reconhecimento de Diploma Estrangeiro</h1>
          <p className="text-white/70 mt-4 text-lg">
            Procedimentos para reconhecimento de títulos de Mestrado e Doutorado emitidos no exterior.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Main Content Area */}
            <div className="lg:w-3/4 space-y-8">
              
              {/* Introduction & Legal Frame */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h2 className="font-heading font-bold text-2xl text-ufrpe-blue pb-2 border-b border-gray-100">
                  Amparo Legal e Diretrizes
                </h2>
                <div className="text-gray-600 leading-relaxed space-y-4">
                  <p>
                    O reconhecimento de diploma estrangeiro de pós-graduação stricto sensu é regulamentado pela Lei nº 9.394/1996 (LDB), especificamente no Art. 48, § 3º:
                  </p>
                  <blockquote className="bg-gray-50 border-l-4 border-ufrpe-yellow p-4 rounded-r-lg italic text-sm font-serif my-4">
                    "Os diplomas de Mestrado e de Doutorado expedidos por universidades estrangeiras só poderão ser reconhecidos por universidades que possuam cursos de pós-graduação reconhecidos e avaliados, na mesma área de conhecimento e em nível equivalente ou superior."
                  </blockquote>
                  <p>
                    O processo é regido no âmbito nacional pela <strong>Resolução CNE/CES nº 2 de 2024</strong> e na UFRPE pelas diretrizes da <strong>Resolução CEPE/UFRPE nº 926 de 2025</strong>.
                  </p>
                </div>
              </div>

              {/* Portal Carolina Bori Banner */}
              <div className="bg-gradient-to-r from-ufrpe-blue to-ufrpe-blue/90 text-white p-8 rounded-2xl shadow-md space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h3 className="font-heading font-bold text-xl text-ufrpe-yellow">Plataforma Carolina Bori</h3>
                    <p className="text-white/80 text-sm mt-2 max-w-xl">
                      A submissão oficial e o acompanhamento de todos os processos de revalidação e reconhecimento de diplomas no Brasil são realizados obrigatoriamente através do portal Carolina Bori do MEC.
                    </p>
                  </div>
                  <a 
                    href="https://carolinabori.mec.gov.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-ufrpe-yellow text-ufrpe-blue font-bold rounded-xl hover:bg-white transition shrink-0 shadow-sm text-sm"
                  >
                    Acessar Plataforma <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  </a>
                </div>
              </div>

              {/* Required Documents List */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h2 className="font-heading font-bold text-2xl text-ufrpe-blue pb-2 border-b border-gray-100">
                  Documentação Exigida para Análise
                </h2>
                <p className="text-sm text-gray-500">
                  Prepare os seguintes documentos em formato digital compatível para anexação na plataforma:
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {DOCUMENT_ITEMS.map((doc, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition border border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-ufrpe-yellow/10 text-ufrpe-yellow flex items-center justify-center font-bold text-sm shrink-0">
                        {doc.num}
                      </div>
                      <div>
                        <h4 className="font-heading font-bold text-sm text-ufrpe-blue mb-1">{doc.title}</h4>
                        <p className="text-gray-600 text-xs leading-relaxed">{doc.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Sidebar */}
            <div className="lg:w-1/4 shrink-0 space-y-6">
              
              {/* Process Deadlines */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-heading font-bold text-lg text-ufrpe-blue mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-clock text-ufrpe-yellow"></i> Prazos de Análise
                </h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <strong className="block text-gray-900 text-xs uppercase tracking-wider text-ufrpe-blue">Tramitação Comum</strong>
                    <span className="text-2xl font-black text-ufrpe-blue block mt-1">180 dias</span>
                    <span className="text-xs text-gray-500">Prazo limite regulamentar.</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <strong className="block text-gray-900 text-xs uppercase tracking-wider text-ufrpe-yellow">Tramitação Simplificada</strong>
                    <span className="text-2xl font-black text-ufrpe-yellow block mt-1">90 dias</span>
                    <span className="text-xs text-gray-500">Prazo limite regulamentar.</span>
                  </div>
                </div>
              </div>

              {/* Legislation Links */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-heading font-bold text-lg text-ufrpe-blue mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-file-pdf text-ufrpe-yellow"></i> Legislação e Normas
                </h3>
                <div className="space-y-3">
                  <a 
                    href="https://prpg.ufrpe.br/sites/default/files/legislacao/RECEPE926.2025_NOVAS_NORMAS_REVALIDAO_E_RECONHECIMENTO_DE_TTULO_ESTRANGEIRO_0.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition text-xs text-gray-700 font-medium"
                  >
                    <i className="fa-solid fa-file-pdf text-red-500 text-lg"></i>
                    <span>Resolução CEPE/UFRPE nº 926/2025</span>
                  </a>
                  <a 
                    href="https://cad.capes.gov.br/ato-administrativo-detalhar?idAtoAdmElastic=17085"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition text-xs text-gray-700 font-medium"
                  >
                    <i className="fa-solid fa-circle-info text-ufrpe-blue text-lg"></i>
                    <span>Resolução CNE/CES nº 2/2024</span>
                  </a>
                </div>
              </div>

              {/* Office Contact */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-heading font-bold text-lg text-ufrpe-blue mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-address-book text-ufrpe-yellow"></i> Contato Técnico
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Dúvidas pontuais sobre homologações de diplomas estrangeiros de Pós-Graduação na UFRPE podem ser direcionadas ao setor responsável:
                </p>
                <div className="space-y-3 text-sm text-gray-700">
                  <p className="flex items-start gap-2 pt-2 border-t border-gray-100">
                    <i className="fa-solid fa-envelope text-ufrpe-yellow mt-1"></i>
                    <span>
                      <strong className="block text-gray-900 text-xs">E-mail:</strong>
                      reconhecimento.prpg@ufrpe.br
                    </span>
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    </>
  );
}
