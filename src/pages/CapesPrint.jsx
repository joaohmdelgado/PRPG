import React from 'react';
import { Link } from 'react-router-dom';

const OBJECTIVES = [
  {
    icon: "fa-map",
    title: "Strategic Consolidation",
    text: "Building, implementing, and consolidating strategic plans for the internationalization of the participating institutions in priority areas of knowledge."
  },
  {
    icon: "fa-network-wired",
    title: "Research Networks",
    text: "Encouraging the formation of international research networks to improve the quality of academic scientific production in graduate programs."
  },
  {
    icon: "fa-globe",
    title: "Support Expansion",
    text: "Expanding actions to support internationalization in graduate programs of the participating institutions."
  },
  {
    icon: "fa-people-arrows",
    title: "Academic Mobility",
    text: "Promoting the mobility of faculty and graduate students, emphasizing sandwich scholarships, missions, and sabbatical of UFRPE faculty abroad and foreign faculty visiting UFRPE."
  },
  {
    icon: "fa-seedling",
    title: "International Environment",
    text: "Creating an international environment in graduate programs of the participating institutions."
  },
  {
    icon: "fa-puzzle-piece",
    title: "CAPES Action Integration",
    text: "Integrating CAPES PrInt project with other Capes' actions into an internationalization effort."
  }
];

const THEMES = [
  {
    num: "1",
    title: "Agricultural Production Systems, Biodiversity, and Sustainability",
    desc: "Research actions addressing sustainability and biodiversity in agrarian sciences and regional ecosystems."
  },
  {
    num: "2",
    title: "Future-Bearing Technologies",
    desc: "Innovative technological solutions, computing advancements, and future-oriented industrial processes."
  }
];

export default function CapesPrint() {
  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-globe text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
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
                  <span className="text-ufrpe-yellow font-medium">Capes PrInt</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold">Capes PrInt</h1>
          <p className="text-white/70 mt-4 text-lg">
            Institutional Internationalization Program - CAPES PrInt at UFRPE.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Main Area */}
            <div className="lg:w-3/4 space-y-8">
              
              {/* Introduction */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h2 className="font-heading font-bold text-2xl text-ufrpe-blue pb-2 border-b border-gray-100 flex items-center gap-2">
                  <i className="fa-solid fa-circle-info text-ufrpe-yellow"></i> Program Presentation
                </h2>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="space-y-4 text-gray-600 leading-relaxed flex-1">
                    <p>
                      The Institutional Internationalization Program (PrInt) is a program launched by the Coordination for the Improvement of Higher Education Personnel (CAPES) in Brazil.
                    </p>
                    <p>
                      UFRPE had its CAPES PrInt project approved among 35 Brazilian Higher Education Institutions (out of 101 applicants). The project receives a budget of <strong>R$ 13 million</strong> to be invested in selected priority themes.
                    </p>
                    <p>
                      These funds are made available through internal calls for internationalization actions of the 17 Graduate Programs of UFRPE taking part in the CAPES PrInt project.
                    </p>
                  </div>
                  <div className="w-full md:w-80 shrink-0 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 p-4 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-ufrpe-blue/10 text-ufrpe-blue flex items-center justify-center text-2xl font-bold mb-3">
                      CAPES
                    </div>
                    <span className="text-xs uppercase font-bold tracking-wider text-gray-500">Institutional Program</span>
                    <h4 className="font-heading font-bold text-lg text-ufrpe-blue mt-1">CAPES PrInt UFRPE</h4>
                    <p className="text-xs text-gray-500 mt-2">
                      Funding global research networks, sandwich Ph.D. scholarships, and visiting scholar missions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Objectives Grid */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h2 className="font-heading font-bold text-2xl text-ufrpe-blue pb-2 border-b border-gray-100">
                  Program Objectives
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {OBJECTIVES.map((obj, idx) => (
                    <div key={idx} className="flex gap-4 p-5 rounded-xl hover:bg-gray-50 transition-all border border-gray-100">
                      <div className="w-10 h-10 rounded-lg bg-ufrpe-yellow/10 text-ufrpe-yellow flex items-center justify-center text-lg shrink-0">
                        <i className={`fa-solid ${obj.icon}`}></i>
                      </div>
                      <div>
                        <h4 className="font-heading font-bold text-base text-ufrpe-blue mb-1">{obj.title}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">{obj.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Themes */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h2 className="font-heading font-bold text-2xl text-ufrpe-blue pb-2 border-b border-gray-100">
                  Priority Themes & Priority Areas
                </h2>
                <p className="text-gray-600 leading-relaxed text-sm">
                  The resources allocated to UFRPE are invested in internationalization projects, collaborative research, and academic mobility under two priority thematic axes:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {THEMES.map((theme, idx) => (
                    <div key={idx} className="bg-gray-50 p-6 rounded-xl border border-gray-100 relative overflow-hidden">
                      <span className="absolute right-4 bottom-2 text-6xl font-black text-ufrpe-yellow/10 select-none">
                        {theme.num}
                      </span>
                      <h4 className="font-heading font-bold text-base text-ufrpe-blue mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-ufrpe-yellow text-white text-xs flex items-center justify-center font-bold">
                          {theme.num}
                        </span>
                        {theme.title}
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed relative z-10">{theme.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Sidebar */}
            <div className="lg:w-1/4 shrink-0 space-y-6">
              
              {/* Official Link Card */}
              <div className="bg-ufrpe-blue text-white rounded-2xl shadow-md p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-8 -translate-y-8"></div>
                <h3 className="font-heading font-bold text-lg mb-3">More Information</h3>
                <p className="text-white/80 text-sm mb-4 leading-relaxed">
                  Access the dedicated portal for CAPES PrInt at UFRPE to consult internal calls, active projects, forms, and results.
                </p>
                <a 
                  href="http://www.print.ufrpe.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-ufrpe-yellow text-ufrpe-blue font-bold rounded-xl hover:bg-white transition text-center text-sm shadow-sm"
                >
                  Visit print.ufrpe.br <i className="fa-solid fa-arrow-up-right-from-square ml-2"></i>
                </a>
              </div>

              {/* Quick Contacts */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-heading font-bold text-lg text-ufrpe-blue mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-address-book text-ufrpe-yellow"></i> Contacts
                </h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <p className="flex items-start gap-2">
                    <i className="fa-solid fa-envelope text-ufrpe-yellow mt-1"></i>
                    <span>
                      <strong className="block text-gray-900">E-mail:</strong>
                      cippg.prpg@ufrpe.br
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fa-solid fa-phone text-ufrpe-yellow mt-1"></i>
                    <span>
                      <strong className="block text-gray-900">Phone:</strong>
                      +55 (81) 3320-6051
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
