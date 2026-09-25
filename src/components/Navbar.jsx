import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useMenu, useConfig, linkTelefone } from '../hooks/usePortal';
import LinkDestino from './LinkDestino';

// Itens do menu, links da faixa superior, contato e logo vêm do banco
// (Fase H.1 — editados no painel em "Menus e portal").

export function Topbar({ onOpenMap }) {
  const contato = useConfig('contato');
  const topo = useMenu('topo');
  return (
    <div className="bg-ufrpe-blue text-white py-2 text-xs hidden md:block border-b border-white/10 shrink-0">
      <div className="container mx-auto px-4 flex justify-between items-center font-medium uppercase tracking-wider">
        <div className="flex gap-6">
          {contato.email && (
            <a href={`mailto:${contato.email}`} className="flex items-center gap-2 hover:text-ufrpe-yellow transition">
              <i className="fa-solid fa-envelope text-ufrpe-yellow" aria-hidden="true"></i> {contato.email}
            </a>
          )}
          {contato.telefone && (
            <a href={linkTelefone(contato.telefone)} className="flex items-center gap-2 hover:text-ufrpe-yellow transition">
              <i className="fa-solid fa-phone text-ufrpe-yellow" aria-hidden="true"></i> {contato.telefone}
            </a>
          )}
          {contato.mapa && (
            <button id="map-toggle" onClick={onOpenMap} className="hidden lg:flex items-center gap-2 hover:text-ufrpe-yellow transition cursor-pointer">
              <i className="fa-solid fa-location-dot text-ufrpe-yellow" aria-hidden="true"></i> Localização
            </button>
          )}
        </div>
        <div className="flex gap-4">
          {topo.map((item, i) => (
            <LinkDestino key={item.id} destino={item.destino}
              className={`hover:text-ufrpe-yellow transition ${i < topo.length - 1 ? 'border-r border-white/10 pr-4' : ''}`}>
              {item.rotulo}
            </LinkDestino>
          ))}
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
  const principal = useMenu('principal');
  const contato = useConfig('contato');
  const { logo } = useConfig('identidade');

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
      // Busca do portal (Fase H.5): antes ia sempre para /noticias?search=.
      navigate(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setMobileOpen(false);
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
            {logo && (
              <img
                src={logo}
                alt="UFRPE" className="h-14 md:h-16 w-auto"
                onError={e => e.target.style.display = 'none'}
              />
            )}
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
              {principal.map((item) => {
                const filhos = item.filhos || [];
                const ativo = item.destino && (currentPage === item.destino || (item.destino !== '/' && currentPage.startsWith(`${item.destino}/`)));
                const classe = `hover:text-ufrpe-yellow transition flex items-center gap-1 ${ativo ? 'text-ufrpe-yellow font-bold' : ''}`;
                const seta = filhos.length > 0 && <i className="fa-solid fa-chevron-down" style={{ fontSize: 10, opacity: 0.5 }} aria-hidden="true"></i>;
                return (
                  <li key={item.id} className="relative group px-3 py-4">
                    {item.destino ? (
                      <LinkDestino destino={item.destino} className={classe} aria-current={ativo ? 'page' : undefined}>
                        {item.rotulo}{seta}
                      </LinkDestino>
                    ) : (
                      <button type="button" className={classe} aria-haspopup="true">
                        {item.rotulo}{seta}
                      </button>
                    )}
                    {filhos.length > 0 && (
                      // group-focus-within: o submenu também abre pelo teclado (Tab).
                      <ul className="absolute top-full left-0 bg-white shadow-xl min-w-[260px] rounded-b-xl border-t-2 border-ufrpe-yellow hidden group-hover:block group-focus-within:block py-2 z-[60]">
                        {filhos.map((s) => (
                          <li key={s.id}>
                            <LinkDestino
                              destino={s.destino}
                              className="block px-6 py-2.5 hover:bg-gray-50 hover:text-ufrpe-yellow focus:bg-gray-50 transition text-sm text-ufrpe-blue normal-case"
                            >
                              {s.rotulo}
                            </LinkDestino>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                id="search-toggle"
                type="button"
                aria-label="Buscar no portal"
                aria-expanded={searchOpen}
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
                      aria-label="O que você procura?"
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
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileOpen}
              className="lg:hidden text-2xl text-ufrpe-blue"
            >
              <i className={`fa-solid ${mobileOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
            {/* A busca também no celular (antes só aparecia a partir de 1024 px). */}
            <form role="search" onSubmit={handleSearchSubmit} className="p-4 flex gap-2 border-b border-gray-100">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no portal"
                aria-label="Buscar no portal"
                className="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              />
              <button type="submit" aria-label="Buscar" className="px-3 bg-ufrpe-blue text-white rounded-lg"><i className="fa-solid fa-search" aria-hidden="true"></i></button>
            </form>
            <ul className="flex flex-col text-ufrpe-blue font-medium text-sm">
              {principal.map((item) => {
                const filhos = item.filhos || [];
                if (!filhos.length) {
                  return (
                    <li key={item.id} className="border-b border-gray-50">
                      <LinkDestino
                        destino={item.destino}
                        onClick={() => setMobileOpen(false)}
                        className="block w-full text-left px-4 py-4 font-bold hover:text-ufrpe-yellow transition tracking-wider text-xs"
                      >
                        {item.rotulo}
                      </LinkDestino>
                    </li>
                  );
                }
                return (
                  <li key={item.id} className="border-b border-gray-50">
                    <div className="block w-full text-left px-4 py-3 bg-gray-50/50 font-bold text-gray-500 tracking-wider text-xs">
                      {item.rotulo}
                    </div>
                    <ul className="bg-white">
                      {filhos.map((s) => (
                        <li key={s.id} className="border-b border-gray-50 last:border-0">
                          <LinkDestino
                            destino={s.destino}
                            onClick={() => setMobileOpen(false)}
                            className="block px-8 py-3 text-xs hover:bg-gray-50 hover:text-ufrpe-yellow transition normal-case"
                          >
                            {s.rotulo}
                          </LinkDestino>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>
      {/* Map Modal */}
      {mapOpen && contato.mapa && (
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
                src={contato.mapa} 
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
