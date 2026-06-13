import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Simple Carousel Component
function CustomCarousel({ images, id }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative group rounded-xl overflow-hidden shadow-md border border-gray-100 bg-black aspect-[4/3] flex flex-col justify-between">
      {/* Slides */}
      <div className="relative flex-grow flex items-center justify-center overflow-hidden">
        {images.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center ${
              idx === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <img
              src={img.src}
              alt={img.alt}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback Placholder if image fails */}
            <div className="hidden absolute inset-0 bg-gradient-to-br from-ufrpe-blue to-ufrpe-blue/80 text-white flex-col items-center justify-center p-6 text-center">
              <i className="fa-solid fa-image text-3xl text-ufrpe-yellow mb-2"></i>
              <span className="text-xs uppercase font-bold tracking-wider opacity-60">Galeria {id}</span>
              <p className="font-medium text-sm mt-1">{img.alt}</p>
            </div>
            {img.caption && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-white text-xs text-center z-20">
                {img.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-ufrpe-yellow text-white flex items-center justify-center transition cursor-pointer"
        aria-label="Anterior"
      >
        <i className="fa-solid fa-chevron-left text-sm"></i>
      </button>
      <button
        onClick={handleNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-ufrpe-yellow text-white flex items-center justify-center transition cursor-pointer"
        aria-label="Próximo"
      >
        <i className="fa-solid fa-chevron-right text-sm"></i>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
              idx === activeIndex ? "bg-ufrpe-yellow w-4" : "bg-white/50 hover:bg-white"
            }`}
            aria-label={`Ir para slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function MobilidadeEstudantil() {
  const gcubImages = [
    { src: "https://prpg.ufrpe.br/sites/default/files/evento-GCUB-1_0.png", alt: "Evento GCUB 1", caption: "Palestra sobre Internacionalização" },
    { src: "https://prpg.ufrpe.br/sites/default/files/evento-GCUB-2.jpg", alt: "Evento GCUB 2", caption: "Professora Rossana Silva e vice-reitora" },
    { src: "https://prpg.ufrpe.br/sites/default/files/evento-GCUB-3.jpg", alt: "Plateia GCUB", caption: "Plateia no CEGOE UFRPE" },
    { src: "https://prpg.ufrpe.br/sites/default/files/evento-GCUB-4_1.jpg", alt: "Evento GCUB 4", caption: "Representantes e coordenadores" },
    { src: "https://prpg.ufrpe.br/sites/default/files/evento-GCUB-5.jpg", alt: "Evento GCUB 5", caption: "Abertura oficial do evento" }
  ];

  const pdseImages = [
    { src: "https://prpg.ufrpe.br/sites/default/files/d31c8ab1-058b-4a5f-9cf1-0d3ca4ee5464.JPG", alt: "PDSE UFRPE 1" },
    { src: "https://prpg.ufrpe.br/sites/default/files/3e45c5d0-64bd-4211-9925-3e7322dc3d1a.JPG", alt: "PDSE UFRPE 2" },
    { src: "https://prpg.ufrpe.br/sites/default/files/0653c455-a71e-4ac0-93c4-291920b5fb2a.JPG", alt: "PDSE UFRPE 3" },
    { src: "https://prpg.ufrpe.br/sites/default/files/c7896ce0-efbb-4c5d-bb09-9bb4420eb9dd.JPG", alt: "PDSE UFRPE 4" },
    { src: "https://prpg.ufrpe.br/sites/default/files/54bba236-de5c-4278-80a0-17d88161dd19.JPG", alt: "PDSE UFRPE 5" }
  ];

  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-plane-departure text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Mobilidade Estudantil</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Mobilidade Estudantil</h1>
          <p className="text-white/70 mt-4 text-lg">
            Oportunidades de intercâmbio científico, bolsas sanduíche e cooperação internacional na UFRPE.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4 space-y-16">
          
          {/* SEÇÃO 1: Evento GCUB */}
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Content */}
              <div className="lg:w-2/3 space-y-6">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                  <span className="bg-ufrpe-yellow/10 text-ufrpe-yellow px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Evento Institucional
                  </span>
                  <span className="text-xs text-gray-400">8 de julho de 2024</span>
                </div>
                <h2 className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue leading-tight">
                  UFRPE sedia palestra com Diretora Executiva do GCUB
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  A Universidade Federal Rural de Pernambuco sediou a palestra com a Diretora Executiva do Grupo de Cooperação Internacional de Universidades Brasileiras (GCUB), Professora Rossana Silva, organizada pela Coordenação de Internacionalização dos Programas de Pós-Graduação da UFRPE (CIP-PRPG). Presentes no anfiteatro do CEGOE estiveram gestores, professores, pesquisadores, alunos e estrangeiros de diversas áreas da UFRPE, além de representantes convidados da UPE e da UFPE.
                </p>

                <div className="bg-gray-50 border-l-4 border-ufrpe-yellow p-6 rounded-r-xl">
                  <p className="text-gray-700 italic">
                    "A internacionalização fortalece o papel das instituições de ensino em um mundo cada vez mais globalizado, além de promover a troca de conhecimentos e impulsionar o desenvolvimento de pesquisas."
                  </p>
                  <span className="block text-xs font-bold text-gray-500 mt-2">— Profa. Rossana Silva, Diretora Executiva do GCUB</span>
                </div>

                <p className="text-gray-600 leading-relaxed">
                  A importância estratégica do GCUB e as oportunidades que a organização oferece foram mencionadas pela Vice-Reitora da UFRPE, Professora Socorro Lima: <span className="italic font-serif">"Não é só o intercâmbio de pessoas, mas de conhecimentos. Não tem como, no mundo contemporâneo, globalizado, pensar a educação superior e a ciência sem essa troca com o que há de melhor nos outros países"</span>.
                </p>

                <p className="text-gray-600 leading-relaxed">
                  Com o início da terceira edição do programa <strong>GCUB-Mob</strong>, avaliadores da UFRPE, UFPE e UPE receberam orientações detalhadas sobre a análise técnica de mais de 17 mil candidaturas oriundas de 125 países pelo coordenador da CIP-PRPG, Professor Edivan Rodrigues de Souza.
                </p>
                
                {/* Embedded Inline Image */}
                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm mt-6">
                  <img 
                    src="https://prpg.ufrpe.br/sites/default/files/WhatsApp%20Image%202024-07-08%20at%2016.43.23.jpeg" 
                    alt="Registro da palestra GCUB" 
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="bg-gray-50 px-4 py-3 text-xs text-gray-500 text-center border-t border-gray-100">
                    Registro da palestra com a Diretora Executiva do GCUB na UFRPE
                  </div>
                </div>
              </div>

              {/* Sidebar Carousel */}
              <div className="lg:w-1/3 shrink-0">
                <div className="sticky top-24 space-y-4">
                  <h3 className="font-heading font-bold text-lg text-ufrpe-blue flex items-center gap-2">
                    <i className="fa-solid fa-images text-ufrpe-yellow"></i> Galeria do Evento
                  </h3>
                  <CustomCarousel images={gcubImages} id="GCUB" />
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: Move La América */}
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Content */}
              <div className="lg:w-2/3 space-y-6">
                <h2 className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue leading-tight border-b border-gray-100 pb-4">
                  Primeira edição do Programa Move La América da CAPES
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Os Programas de Pós-Graduação da UFRPE estão participando ativamente da primeira Edição do Programa de Mobilidade Acadêmica Internacional da CAPES, <strong>Move La América</strong>. A UFRPE está recebendo 6 discentes de Pós-Graduação em 2025 nos níveis de mestrado-sanduíche e doutorado-sanduíche nesta primeira edição.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Os discentes são oriundos de países da América do Sul e Caribe, incluindo Peru (Anderson Dominguez-Villanueva e Leonardo Humberto Mendoza Carbajal), Argentina (Felipe Otero e Maria Victoria Coronel), Colômbia (Camila A. Vasquez Moscoso) e Panamá (Fernando Villarreal Troestch). Eles participam de pesquisas na pós-graduação em <em>Biodiversidade</em>, <em>Biometria e Estatística Aplicada</em>, <em>Engenharia Ambiental</em> e <em>Fitopatologia</em>.
                </p>

                <div className="bg-ufrpe-blue/5 border-l-4 border-ufrpe-blue p-6 rounded-r-xl">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    O <strong>Programa Move La América</strong> visa complementar os esforços de internacionalização atraindo acadêmicos da América Latina e Caribe, fortalecendo a rede global de produção de ciência.
                  </p>
                </div>
                
                <p className="text-gray-600 leading-relaxed text-sm">
                  Na primeira edição a CAPES ofertou 1.000 bolsas de mestrado e 600 bolsas de doutorado. Além das mensalidades, a CAPES financia auxílio deslocamento, auxílio instalação, seguro saúde e bolsas de estímulo para co-orientadores locais.
                </p>
              </div>

              {/* Sidebar Video */}
              <div className="lg:w-1/3 shrink-0 space-y-4">
                <h3 className="font-heading font-bold text-lg text-ufrpe-blue flex items-center gap-2">
                  <i className="fa-solid fa-circle-play text-ufrpe-yellow"></i> Vídeo Institucional
                </h3>
                <div className="bg-black rounded-xl overflow-hidden shadow-md border border-gray-100 aspect-video relative">
                  <video 
                    controls 
                    className="w-full h-full object-contain"
                    poster="https://prpg.ufrpe.br/themes/prpg_ufrpe/assets/img/Bras%C3%A3o%20UFRPE%20-%20Fundo%20Branco.png"
                  >
                    <source src="https://prpg.ufrpe.br/sites/default/files/video/MOVE%20LA%20AMERICA%20UFRPE.mp4" type="video/mp4" />
                    Seu navegador não suporta o elemento de vídeo.
                  </video>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Conheça mais sobre o Programa Move La América da CAPES na UFRPE
                </p>
              </div>
            </div>
          </section>

          {/* SEÇÃO 3: PDSE */}
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Content */}
              <div className="lg:w-2/3 space-y-6">
                <h2 className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue leading-tight border-b border-gray-100 pb-4">
                  Programa Institucional de Doutorado Sanduíche no Exterior (PDSE)
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  O Programa Institucional de Doutorado Sanduíche no Exterior (PDSE) é uma iniciativa estratégica de internacionalização da CAPES voltada à ampliação da formação de doutorandos brasileiros por meio de estágios de pesquisa em instituições internacionais de excelência.
                </p>
                
                <div className="space-y-3">
                  <h4 className="font-heading font-bold text-ufrpe-blue text-base">Impactos do Programa na UFRPE:</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    <li className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <i className="fa-solid fa-circle-check text-ufrpe-yellow mt-1"></i>
                      <span>Atualização técnico-científica em laboratórios globais</span>
                    </li>
                    <li className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <i className="fa-solid fa-circle-check text-ufrpe-yellow mt-1"></i>
                      <span>Estímulo à cooperação e artigos científicos conjuntos</span>
                    </li>
                    <li className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <i className="fa-solid fa-circle-check text-ufrpe-yellow mt-1"></i>
                      <span>Integração de docentes com redes internacionais de inovação</span>
                    </li>
                    <li className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <i className="fa-solid fa-circle-check text-ufrpe-yellow mt-1"></i>
                      <span>Valoração da pós-graduação local frente ao cenário internacional</span>
                    </li>
                  </ul>
                </div>

                <p className="text-gray-600 leading-relaxed text-sm pt-2">
                  Com mais de <strong>165 doutorandos</strong> da UFRPE contemplados e enviados para estágios no exterior até 2025, o PDSE consolida parcerias duradouras com as melhores universidades da Europa, América do Norte e outros continentes.
                </p>
              </div>

              {/* Sidebar Carousel */}
              <div className="lg:w-1/3 shrink-0">
                <div className="space-y-4">
                  <h3 className="font-heading font-bold text-lg text-ufrpe-blue flex items-center gap-2">
                    <i className="fa-solid fa-images text-ufrpe-yellow"></i> Galeria PDSE
                  </h3>
                  <CustomCarousel images={pdseImages} id="PDSE" />
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
