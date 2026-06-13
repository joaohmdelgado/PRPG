import React from 'react';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: "Onde está localizada a UFRPE? / ¿Dónde está localizada la UFRPE?",
    a: "A UFRPE, campus central, está localizada no Bairro de Dois Irmãos, região metropolitana de Recife, capital do Estado de Pernambuco. Fica a 17 Km do Aeroporto Internacional do Recife; 12 Km do marco zero; e a 16 Km do Terminal Rodoviário do Recife (TIP)."
  },
  {
    q: "Como funciona o regime acadêmico da PG na UFRPE? / ¿Cómo funciona el régimen académico de la PG en la UFRPE?",
    a: (
      <div className="space-y-3">
        <p>
          A obtenção do título de Mestre ou Doutor pela UFRPE requer a realização de disciplinas ofertadas pelos programas de pós-graduação, elaboração de projeto de pesquisa, condução do projeto de pesquisa para compor o trabalho de Dissertação ou Tese, e a apresentação e defesa do trabalho sob a supervisão de um comitê de orientação.
        </p>
        <div className="flex flex-col gap-2 pt-2 text-xs">
          <a href="http://www.ppgea.ufrpe.br/sites/ppgea.ufrpe.br/files/normas-gerais-prppg_cepe342.2019_alteracao_das_normas_prog._pos-grad._stricto_sensu-mesclado.pdf" target="_blank" rel="noopener noreferrer" className="text-ufrpe-cyan hover:underline font-bold">
            <i className="fa-solid fa-file-pdf mr-1 text-ufrpe-yellow"></i> Normas Gerais
          </a>
          <a href="http://ww2.proplan.ufrpe.br/sites/ww2.proplan.ufrpe.br/files/PRPPG_RG2019_link3.pdf" target="_blank" rel="noopener noreferrer" className="text-ufrpe-cyan hover:underline font-bold">
            <i className="fa-solid fa-file-pdf mr-1 text-ufrpe-yellow"></i> Catálogo dos Cursos
          </a>
          <Link to="/programas" className="text-ufrpe-cyan hover:underline font-bold">
            <i className="fa-solid fa-graduation-cap mr-1 text-ufrpe-yellow"></i> Cursos de Mestrado e Doutorado
          </Link>
        </div>
      </div>
    )
  },
  {
    q: "Financiamentos para cursar PG na UFRPE / Financiamentos para cursar PG en la UFRPE",
    a: "Em sua maioria, os alunos aprovados recebem bolsa de estudo de 24 meses para o Mestrado e 48 meses para o Doutorado. A pesquisa proposta, em comum acordo com o comitê de orientação, é financiada através de projeto principal de pesquisa do orientador ou com recursos de custeio do programa de pós-graduação."
  },
  {
    q: "A UFRPE oferece alojamento e alimentação ao estudante estrangeiro? / ¿La UFRPE ofrece alojamiento y alimentación al estudiante extranjero?",
    a: (
      <div>
        <p className="mb-2">
          A UFRPE oferece almoço e jantar a todos os seus alunos de pós-graduação a custo subsidiado através do Restaurante Universitário. A UFRPE não oferece alojamento para alunos da pós-graduação, sejam brasileiros ou estrangeiros.
        </p>
        <a href="https://restaurantguru.com.br/Restaurante-Universitario-UFRPE-Recife" target="_blank" rel="noopener noreferrer" className="text-xs text-ufrpe-cyan hover:underline font-bold">
          <i className="fa-solid fa-utensils mr-1 text-ufrpe-yellow"></i> Site do Restaurante Universitário
        </a>
      </div>
    )
  },
  {
    q: "Qual a documentação necessária para viajar ao Brasil? / ¿Cuál es la documentación necesaria para viajar al Brasil?",
    a: (
      <div>
        <p className="mb-2">
          Você deverá solicitar um Visto de Estudante (VITEM IV). A carta de aceite do Programa de Pós-Graduação especificando o curso, período previsto e se receberá bolsa de estudos são necessários para o processo.
        </p>
        <a href="https://www.gov.br/mre/pt-br/consulado-lisboa/servicos-consulares/vistos-destinados-a-estrangeiros-para-entrada-no-brasil/visto-de-estudante-vitem-iv" target="_blank" rel="noopener noreferrer" className="text-xs text-ufrpe-cyan hover:underline font-bold">
          <i className="fa-solid fa-passport mr-1 text-ufrpe-yellow"></i> Informações sobre Visto de Estudante
        </a>
      </div>
    )
  },
  {
    q: "Como obter o CPF brasileiro / ¿Cómo obtener el CPF?",
    a: (
      <div>
        <p className="mb-2">
          O futuro aluno pode solicitar o seu CPF (Cadastro de Pessoa Física) através do site da Receita Federal. O CPF é exigido para exercer qualquer atividade no Brasil, incluindo estudar e receber bolsa.
        </p>
        <a href="https://servicos.receita.fazenda.gov.br/Servicos/CPF/InscricaoCpfEstrangeiro/default.asp" target="_blank" rel="noopener noreferrer" className="text-xs text-ufrpe-cyan hover:underline font-bold">
          <i className="fa-solid fa-address-card mr-1 text-ufrpe-yellow"></i> Solicitação de CPF para Estrangeiros
        </a>
      </div>
    )
  },
  {
    q: "Exigências sanitárias (ex. vacinação) / Exigencias sanitarias (ej. Vacunación)",
    a: "Seu cartão de vacinação deverá estar atualizado para as vacinas exigidas em seu país de origem e para ingresso no Brasil. São exigidas vacinas contra Febre Amarela e Tríplice Viral (sarampo, caxumba e rubéola), sendo recomendadas também Influenza A e o esquema completo contra a COVID-19."
  },
  {
    q: "Ao chegar ao Brasil, quais os procedimentos legais adotar? / Al llegar al Brasil, ¿Cuáles son os procedimientos legales?",
    a: (
      <div>
        <p className="mb-2">
          O aluno deverá agendar previamente e obter seu registro obrigatório no Departamento de Polícia Federal em até 90 dias após a entrada no país.
        </p>
        <a href="https://www.gov.br/pf/pt-br/assuntos/imigracao" target="_blank" rel="noopener noreferrer" className="text-xs text-ufrpe-cyan hover:underline font-bold">
          <i className="fa-solid fa-building-shield mr-1 text-ufrpe-yellow"></i> Registro na Polícia Federal (Imigração)
        </a>
      </div>
    )
  },
  {
    q: "Custo médio de vida em Recife / Costo promedio de vida en Recife",
    a: "Para residir em Recife e cursar a pós-graduação, o custo médio mensal varia entre 1.200 a 1.500 reais para moradia (considerando bairros próximos como Dois Irmãos, Várzea, Caxangá, Iputinga), alimentação, transporte e conectividade."
  }
];

const EMBAIXADORES = [
  { country: "Paraguai", flag: "🇵🇾", names: ["Ana Laura Rotela Riveros (ana.rotela@hotmail.com)", "José María Garcete Gómez (garcetegomez@gmail.com)"] },
  { country: "Guatemala", flag: "🇬🇹", names: ["Gabriela Del Carmen Calderón Estrada (gcce17@gmail.com)"] },
  { country: "Peru", flag: "🇵🇪", names: ["Alejandro Risco Mendoza (ariscom22@gmail.com)"] },
  { country: "Honduras", flag: "🇭🇳", names: ["David Nataren Perdomo (d.natharen91@gmail.com)", "Elias Rodolfo Velasquez Moreno (eliasvelasquez21@gmail.com)"] },
  { country: "Guiné-Bissau", flag: "🇬🇼", names: ["Dionísio Gomes Kór (dionisiokor2014@gmail.com)"] },
  { country: "Venezuela", flag: "🇻🇪", names: ["Robert Emilio Mora Luna (robertmora78@yahoo.com)", "Ana Maria Herrera Ângulo (anamariaherreraangulo@yahoo.com)"] },
  { country: "Haiti", flag: "🇭🇹", names: ["Fedner Cadeau (fednercadeau@ymail.com)", "Midouin Lidelias (midouin3178@gmail.com)"] },
  { country: "Colômbia", flag: "🇨🇴", names: ["Alex Steven Valencia Ortiz (asvalenciao@unal.edu.co)", "Dra. Nataly de La Pava Suárez (natalydlp@gmail.com) - Universidad del Magdalena"] },
  { country: "Moçambique", flag: "🇲🇿", names: ["Agostinho Cardoso Hlavanguane (aiversagostinho@gmail.com)", "Dr. Teofilo Paulo Langa (langa.teofelo@gmail.com) - UEM"] },
  { country: "República Dominicana", flag: "🇩🇴", names: ["Dra. Cristina Gómez-Moya (crigomezmoya@gmail.com) - IDIAF"] },
  { country: "Uruguai", flag: "🇺🇾", names: ["Lucia Helena Nunes Buzo (luciabiologa2304@gmail.com)", "Dr. Vitor Cezar Pacheco da Silva (vitorcezar@gmail.com) - UDELAR"] }
];

const DEPOIMENTOS = [
  {
    name: "Geraldo Luís Charles de Cangela (Moçambique)",
    video: "https://prpg.ufrpe.br/sites/default/files/2024-06/GeraldoLuisCharlesdeCangela.mp4",
    text: "Doutor em Engenharia Agrícola (Conceito 6 - CAPES) pela UFRPE. Retornou para Moçambique como docente na Universidade de Zambeze. Ele destaca o impacto direto da experiência na UFRPE no fortalecimento de sua atuação acadêmica e o enriquecimento cultural propiciado pelo intercâmbio."
  },
  {
    name: "Lucía Luñes Buzó (Uruguai)",
    video: "https://prpg.ufrpe.br/sites/default/files/2024-06/LuciaLunesBuzo.mp4",
    text: "Doutora em Ciência do Solo (Conceito 5 - CAPES) pela UFRPE. Atualmente atua como docente e pesquisadora no Uruguai, aplicando os aportes de sua formação e consolidando pontes de cooperação científica entre os países."
  },
  {
    name: "Katerin Manuelita Encina Molina (Peru)",
    video: "https://prpg.ufrpe.br/sites/default/files/2024-06/Katerin%20Manuelita%20Encina%20Molina.mp4",
    text: "Concluiu Mestrado e Doutorado em Ciência do Solo na UFRPE com bolsas CAPES e FACEPE. Atua hoje no Peru e reforça como a infraestrutura de laboratórios e rede de cooperação da UFRPE foram fundamentais para sua carreira."
  }
];

export default function AlunosEstrangeiros() {
  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-passport text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Alunos Estrangeiros</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Alunos Estrangeiros</h1>
          <p className="text-white/70 mt-4 text-lg">
            Informações acadêmicas, guias e contatos para estudantes internacionais na pós-graduação da UFRPE.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4 shrink-0 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-28">
                <div className="bg-gray-50 text-gray-800 p-5 border-b border-gray-100">
                  <h3 className="font-heading font-bold text-base m-0">Navegação</h3>
                </div>
                <div className="p-4 space-y-1">
                  <a href="#info" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 hover:text-ufrpe-blue">
                    <i className="fa-solid fa-circle-info text-ufrpe-yellow"></i> Informações Gerais
                  </a>
                  <a href="#ingressar" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 hover:text-ufrpe-blue">
                    <i className="fa-solid fa-door-open text-ufrpe-yellow"></i> Como Ingressar
                  </a>
                  <a href="#embaixadores" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 hover:text-ufrpe-blue">
                    <i className="fa-solid fa-earth-americas text-ufrpe-yellow"></i> Embaixadores
                  </a>
                  <a href="#depoimentos" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 hover:text-ufrpe-blue">
                    <i className="fa-solid fa-video text-ufrpe-yellow"></i> Depoimentos
                  </a>
                </div>
              </div>

              {/* Contact card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h4 className="font-bold text-ufrpe-blue mb-2 text-sm uppercase">Contato / Contacto</h4>
                <p className="text-xs text-gray-600 mb-1">cippg.prpg@ufrpe.br</p>
              </div>
            </div>

            {/* Main Area */}
            <div className="lg:w-3/4 space-y-12">
              
              {/* Highlight Banner (Fees notice) */}
              <section id="info" className="scroll-mt-28 space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <div className="border-l-4 border-ufrpe-yellow pl-4">
                    <p className="text-gray-800 font-bold leading-relaxed">
                      A UFRPE não cobra taxas escolares dos estudantes. Ainda, estudantes selecionados para cursar o Mestrado ou o Doutorado podem aplicar para receber bolsa de estudo do governo brasileiro mediante editais específicos, ou através do programa de pós-graduação onde realizará o seu curso.
                    </p>
                    <p className="text-gray-500 italic text-sm mt-2 leading-relaxed">
                      La UFRPE no cobra tasas de matrícula y laboratorio a los estudiantes. Además, los estudiantes interesados en cursar una Maestría o Doctorado pueden postularse a una beca del gobierno brasileño a través de convocatorias específicas, o recibir una beca del programa de posgrado.
                    </p>
                  </div>

                  {/* YouTube Embed */}
                  <div className="aspect-video w-full rounded-xl overflow-hidden shadow-sm border border-gray-100 mt-6">
                    <iframe
                      src="https://www.youtube.com/embed/103Xm4fW47U"
                      title="YouTube video player"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>

                {/* FAQs / Informações */}
                <div className="space-y-4">
                  <h2 className="font-heading font-bold text-2xl text-ufrpe-blue pb-2 border-b border-gray-100">
                    Informações Práticas / Información Práctica
                  </h2>
                  <div className="space-y-3">
                    {FAQS.map((faq, idx) => (
                      <details key={idx} className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <summary className="p-4 font-bold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition group-open:text-ufrpe-blue">
                          <span className="text-sm leading-snug">{faq.q}</span>
                          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 group-open:bg-ufrpe-yellow group-open:text-white text-gray-500 transition-colors">
                            <i className="fa-solid fa-chevron-down text-[10px] transition-transform duration-300 group-open:rotate-180"></i>
                          </span>
                        </summary>
                        <div className="p-5 bg-white border-t border-gray-100 text-sm text-gray-600 leading-relaxed">
                          {faq.a}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </section>

              {/* Como Ingressar */}
              <section id="ingressar" className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 scroll-mt-28 space-y-4">
                <h2 className="font-heading font-bold text-2xl text-ufrpe-blue pb-2 border-b border-gray-100">
                  Como ingressar na PG da UFRPE?
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Todos os interessados em cursar pós-graduação na UFRPE devem passar pelo processo de seleção específico para a pós-graduação. Periodicamente, a UFRPE, através da Pró-Reitoria de Pós-Graduação, publica editais de convocação para candidaturas com seus respectivos processos seletivos para Mestrado e Doutorado.
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  O candidato interessado pode se inscrever em duas ocasiões, pois são realizadas duas seleções anuais. São publicados dois editais, um entre os meses de abril-maio, para ingresso em agosto, e outro nos meses de setembro-outubro, para ingresso em março do ano subsequente.
                </p>
                <div className="pt-2">
                  <Link to="/editais" className="inline-flex items-center gap-2 px-5 py-2.5 bg-ufrpe-cyan hover:bg-ufrpe-blue text-white text-sm font-bold rounded-lg transition-colors cursor-pointer shadow-sm">
                    Acessar Editais PRPG
                  </Link>
                </div>
              </section>

              {/* Embaixadores */}
              <section id="embaixadores" className="scroll-mt-28 space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <h2 className="font-heading font-bold text-2xl text-ufrpe-blue pb-2 border-b border-gray-100">
                    Embaixadores da PG no exterior
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    Obtenga más información con profesionales ex-alumnos de la PG de la UFRPE en tu país:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {EMBAIXADORES.map((e, idx) => (
                      <div key={idx} className="p-4 border border-gray-100 rounded-xl hover:shadow-sm hover:border-ufrpe-yellow/50 transition bg-gray-50/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{e.flag}</span>
                          <strong className="text-gray-900 font-bold">{e.country}</strong>
                        </div>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {e.names.map((name, nIdx) => (
                            <li key={nIdx} className="list-disc list-inside">
                              {name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Depoimentos */}
              <section id="depoimentos" className="scroll-mt-28 space-y-6">
                <h2 className="font-heading font-bold text-2xl text-ufrpe-blue">
                  Depoimentos / Testimonios
                </h2>
                <div className="space-y-8">
                  {DEPOIMENTOS.map((dep, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                      <h4 className="font-bold text-gray-800 text-lg border-l-4 border-ufrpe-yellow pl-3">
                        {dep.name}
                      </h4>
                      <div className="rounded-xl overflow-hidden border border-gray-100 bg-black aspect-video max-w-2xl mx-auto shadow-sm">
                        <video controls className="w-full h-full">
                          <source src={dep.video} type="video/mp4" />
                          Seu navegador não suporta a reprodução de vídeo.
                        </video>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed pt-2">
                        {dep.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

            </div>

          </div>
        </div>
      </main>
    </>
  );
}
