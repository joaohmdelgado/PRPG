import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  {
    label: 'A Pós-Graduação',
    page: null,
    sub: [
      { label: 'Missão, Visão e Valores', path: '/missao-visao-valores' },
      { label: 'Sobre a PRPG', path: '/sobre' },
      { label: 'Histórico', path: '/historico' },
      { label: 'Estrutura Organizacional', path: '/estrutura-organizacional' },
      { label: 'Equipe', path: '/equipe' },
      { label: 'Financeiro', path: '/financeiro' },
      { label: 'Projetos Institucionais', path: 'https://prpg.ufrpe.br/projetos-institucionais', isExternal: true }
    ]
  },
  {
    label: 'Mestrado e Doutorado',
    page: '/programas',
    sub: [
      { label: 'Cursos Stricto Sensu', path: '/programas' },
      { label: 'Calendário Acadêmico', path: '/calendario-academico' },
      { label: 'Catálogo de Cursos', path: 'https://prpg.ufrpe.br/sites/default/files/2024-06/Cat%C3%A1logo%20UFRPE_compressed.pdf', isExternal: true },
      { label: 'Proext-PG', path: '/proext-pg' },
      { label: 'Resoluções Gerais', path: '/resolucoes' },
      { label: 'Relatórios de Autoavaliação', path: '/relatorios-autoavaliacao' }
    ]
  },
  {
    label: 'Especialização',
    page: null,
    sub: [
      { label: 'Especialização', path: '/especializacao' },
      { label: 'Residência Profissional', path: '/residencia-profissional' }
    ]
  },
  {
    label: 'Internacionalização',
    page: null,
    sub: [
      { label: 'Sobre', path: '/sobre-internacionalizacao' },
      { label: 'Alunos Estrangeiros', path: '/alunos-estrangeiros' },
      { label: 'Capes PrInt', path: '/capes-print' },
      { label: 'Mobilidade Estudantil', path: '/mobilidade-estudantil' },
      { label: 'Reconhecimento de Diploma', path: '/reconhecimento' },
      { label: 'Plano Internacionalização', path: 'http://prpg.ufrpe.br/sites/default/files/arquivos-noticias/Plano%20Internacionaliza%C3%A7%C3%A3o%202025%20-%202030%20da%20UFRPE.pdf', isExternal: true }
    ]
  },
  {
    label: 'Documentos',
    page: '/editais',
    sub: [
      { label: 'Editais', path: '/editais' },
      { label: 'Resoluções', path: '/resolucoes' },
      { label: 'Formulários', path: '/formularios' }
    ]
  },
];

export function Topbar({ onOpenMap }) {
  return (
    <div className="bg-ufrpe-blue text-white py-2 text-xs hidden md:block border-b border-white/10 shrink-0">
      <div className="container mx-auto px-4 flex justify-between items-center font-medium uppercase tracking-wider">
        <div className="flex gap-6">
          <a href="mailto:secretaria.prpg@ufrpe.br" className="flex items-center gap-2 hover:text-ufrpe-yellow transition">
            <i className="fa-solid fa-envelope text-ufrpe-yellow"></i> secretaria.prpg@ufrpe.br
          </a>
          <a href="tel:+558133206050" className="flex items-center gap-2 hover:text-ufrpe-yellow transition">
            <i className="fa-solid fa-phone text-ufrpe-yellow"></i> +55 81 3320-6050
          </a>
          <button id="map-toggle" onClick={onOpenMap} className="hidden lg:flex items-center gap-2 hover:text-ufrpe-yellow transition cursor-pointer">
            <i className="fa-solid fa-location-dot text-ufrpe-yellow"></i> Localização
          </button>
        </div>
        <div className="flex gap-4">
          <span className="hover:text-ufrpe-yellow transition cursor-pointer border-r border-white/10 pr-4">Portal UFRPE</span>
          <span className="hover:text-ufrpe-yellow transition cursor-pointer border-r border-white/10 pr-4">SIGAA</span>
          <span className="hover:text-ufrpe-yellow transition cursor-pointer">AVA</span>
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = location.pathname;

  React.useEffect(() => {
    if (mapOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mapOpen]);

  // Close modal on ESC key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMapOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close search modal on click outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      const modal = document.getElementById('search-modal');
      const toggle = document.getElementById('search-toggle');
      if (modal && !modal.contains(e.target) && toggle && !toggle.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/noticias?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <Topbar onOpenMap={() => setMapOpen(true)} />
      <nav className="bg-white shadow-md sticky top-0 z-50 shrink-0 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-4 shrink-0">
            <img
              src="https://prpg.ufrpe.br/themes/prpg_ufrpe/assets/img/Bras%C3%A3o%20UFRPE%20-%20Fundo%20Branco.png"
              alt="UFRPE" className="h-14 md:h-16 w-auto"
              onError={e => e.target.style.display = 'none'}
            />
            <span className="flex flex-col">
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 28, borderBottom: '5px solid #1e2b4f', color: '#1e2b4f', lineHeight: 1, paddingBottom: 2, display: 'block' }}>
                PRPG&nbsp;&nbsp;
              </span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 400, fontSize: 18, borderTop: '3px solid #1e2b4f', color: '#1e2b4f', lineHeight: 1, paddingTop: 4, marginTop: -2, display: 'block' }}>
                Pró-Reitoria de Pós-Graduação
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:block">
            <ul className="flex items-center gap-1 font-medium text-sm text-ufrpe-blue tracking-tight">
              {NAV_ITEMS.map((item, i) => (
                <li key={i} className="relative group px-3 py-4">
                  {item.page ? (
                    <Link
                      to={item.page}
                      className={`hover:text-ufrpe-yellow transition flex items-center gap-1 ${currentPage === item.page ? 'text-ufrpe-yellow font-bold' : ''}`}
                    >
                      {item.label}
                      <i className="fa-solid fa-chevron-down" style={{ fontSize: 10, opacity: 0.5 }}></i>
                    </Link>
                  ) : (
                    <button className="hover:text-ufrpe-yellow transition flex items-center gap-1">
                      {item.label}
                      <i className="fa-solid fa-chevron-down" style={{ fontSize: 10, opacity: 0.5 }}></i>
                    </button>
                  )}
                  
                  <ul className="absolute top-full left-0 bg-white shadow-xl min-w-[260px] rounded-b-xl border-t-2 border-ufrpe-yellow hidden group-hover:block py-2 z-[60]">
                    {item.sub.map((s, j) => (
                      <li key={j}>
                        {s.isExternal ? (
                          <a
                            href={s.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-6 py-2.5 hover:bg-gray-50 hover:text-ufrpe-yellow transition text-sm text-ufrpe-blue normal-case"
                          >
                            {s.label}
                          </a>
                        ) : (
                          <Link
                            to={s.path}
                            className="block px-6 py-2.5 hover:bg-gray-50 hover:text-ufrpe-yellow transition text-sm text-ufrpe-blue normal-case"
                          >
                            {s.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                id="search-toggle"
                onClick={() => setSearchOpen(!searchOpen)}
                className="hidden lg:flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full hover:bg-ufrpe-yellow hover:text-white transition text-ufrpe-blue cursor-pointer"
              >
                <i className="fa-solid fa-search"></i>
              </button>

              {/* Search Modal Overlay (Local) */}
              {searchOpen && (
                <div id="search-modal" className="absolute top-full right-0 mt-4 w-80 bg-white shadow-2xl rounded-2xl p-4 border border-gray-100 z-[70] animate-in fade-in slide-in-from-top-2 duration-300">
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <input
                      type="text"
                      id="search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="O que você procura?"
                      autoFocus
                      className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none text-sm transition-all"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-ufrpe-blue text-white rounded-lg hover:bg-ufrpe-yellow transition-colors cursor-pointer">
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </button>
                  </form>
                  <p className="text-[10px] text-gray-400 mt-3 px-1">Pressione Enter para pesquisar</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-2xl text-ufrpe-blue"
            >
              <i className={`fa-solid ${mobileOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
            <ul className="flex flex-col text-ufrpe-blue font-medium text-sm">
              {NAV_ITEMS.map((item, i) => (
                <li key={i} className="border-b border-gray-50">
                  <div className="block w-full text-left px-4 py-3 bg-gray-50/50 font-bold text-gray-500 tracking-wider text-xs">
                    {item.label}
                  </div>
                  <ul className="bg-white">
                    {item.sub.map((s, j) => (
                      <li key={j} className="border-b border-gray-50 last:border-0">
                        {s.isExternal ? (
                          <a
                            href={s.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setMobileOpen(false)}
                            className="block px-8 py-3 text-xs hover:bg-gray-50 hover:text-ufrpe-yellow transition normal-case"
                          >
                            {s.label}
                          </a>
                        ) : (
                          <Link
                            to={s.path}
                            onClick={() => setMobileOpen(false)}
                            className="block px-8 py-3 text-xs hover:bg-gray-50 hover:text-ufrpe-yellow transition normal-case"
                          >
                            {s.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              <li>
                <Link
                  to="/noticias"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-left px-4 py-4 font-bold hover:text-ufrpe-yellow transition tracking-wider text-xs border-t border-gray-100"
                >
                  Notícias
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>
      {/* Map Modal */}
      {mapOpen && (
        <div id="map-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-ufrpe-blue/70 backdrop-blur-sm" 
            id="map-modal-overlay"
            onClick={() => setMapOpen(false)}
          ></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden animate-in zoom-in duration-300">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-ufrpe-blue flex items-center gap-2">
                <i className="fa-solid fa-location-dot text-ufrpe-yellow"></i> 
                Nossa Localização
              </h3>
              <button 
                onClick={() => setMapOpen(false)} 
                id="close-map" 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="aspect-video w-full">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3950.8570172108657!2d-34.94817!3d-8.013677399999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7ab198ad41794ab%3A0x4536f257f56330d1!2sPr%C3%B3-Reitoria%20de%20Pesquisa%20e%20P%C3%B3s-Gradua%C3%A7%C3%A3o%20da%20UFRPE!5e0!3m2!1spt-BR!2sbr!4v1778710761960!5m2!1spt-BR!2sbr" 
                className="w-full h-full border-0" 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade">
              </iframe>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
