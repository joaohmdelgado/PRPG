import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePrograma, programaPath } from './ProgramaContext';

// O menu vem montado do servidor (programa.menu — server/utils/micrositeMenu.js,
// Fase S.1): 4 grupos (O Programa / Pessoas / Produção / Admissão) com
// submenu, mais links soltos (Início, Notícias, Documentos, Contato). Só
// chega o que tem conteúdo.

const SOCIALS = [
  { key: 'instagram_url', icon: 'fa-instagram' },
  { key: 'facebook_url', icon: 'fa-facebook-f' },
  { key: 'youtube_url', icon: 'fa-youtube' },
];

// Casca do microsite: barra discreta da PRPG + masthead/menu/footer do programa,
// com cores vindas do próprio programa (fallback para o azul/amarelo da PRPG).
export default function ProgramaLayout({ children }) {
  const { programa, slug } = usePrograma();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [grupoAberto, setGrupoAberto] = useState(null); // chave do grupo com submenu aberto
  const navRef = useRef(null);

  const sigla = programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla : null;
  const base = `/${slug}`;
  const rest = location.pathname.replace(base, '').replace(/^\//, '');
  const activeSub = rest.split('/')[0];

  const NAV = Array.isArray(programa.menu) ? programa.menu : [];
  // Versão "achatada" (sem grupos) para o rodapé, que é só uma lista de links.
  const NAV_FLAT = NAV.flatMap((item) => (item.itens ? item.itens : [item]));

  const themeStyle = {
    '--prog-primary': programa.cor_primaria || '#1e2b4f',
    '--prog-accent': programa.cor_secundaria || '#febd11',
  };

  const isActive = (sub) => activeSub === sub;
  const isGroupActive = (group) => group.itens.some((i) => isActive(i.sub));

  // Fecha o submenu ao clicar fora, com Esc ou ao navegar.
  useEffect(() => {
    if (!grupoAberto) return;
    const onClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setGrupoAberto(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setGrupoAberto(null); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [grupoAberto]);
  useEffect(() => { setGrupoAberto(null); }, [location.pathname]);

  const linkClasse = (ativo) => `flex items-center gap-2 px-3 xl:px-4 py-4 text-sm font-medium border-b-[3px] transition-colors ${
    ativo
      ? 'border-[var(--prog-accent)] text-[var(--prog-primary)]'
      : 'border-transparent text-gray-600 hover:text-[var(--prog-primary)] hover:border-gray-200'
  }`;

  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-50" style={themeStyle}>
      {/* Barra discreta: identifica o portal da PRPG por cima do microsite */}
      <div className="bg-ufrpe-blue text-white/80 text-xs">
        <div className="container mx-auto px-4 h-9 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:text-ufrpe-yellow transition-colors">
            <i className="fa-solid fa-arrow-left text-[10px]"></i>
            <span>Portal da Pós-Graduação · <strong className="font-semibold">PRPG/UFRPE</strong></span>
          </Link>
          <Link to="/programas" className="hidden sm:flex items-center gap-2 hover:text-ufrpe-yellow transition-colors">
            <i className="fa-solid fa-graduation-cap text-[10px]"></i>
            <span>Todos os Programas</span>
          </Link>
        </div>
      </div>

      {/* Masthead do programa */}
      <header className="bg-[var(--prog-primary)] text-white shadow-sm">
        <div className="container mx-auto px-4 py-5 flex items-center gap-4">
          <Link to={base} className="flex items-center gap-4 min-w-0">
            {programa.logo_url ? (
              <img src={programa.logo_url} alt={programa.nome} className="h-12 md:h-14 w-auto shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <span className="shrink-0 h-12 w-12 md:h-14 md:w-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[var(--prog-accent)]">
                <i className="fa-solid fa-landmark text-xl"></i>
              </span>
            )}
            <span className="flex flex-col min-w-0">
              <span className="font-heading font-extrabold text-lg md:text-2xl leading-tight truncate">
                {sigla ? `${sigla} — ${programa.nome}` : programa.nome}
              </span>
              <span className="text-white/70 text-[11px] md:text-xs uppercase tracking-wider">
                Pós-Graduação · UFRPE
              </span>
            </span>
          </Link>
        </div>
      </header>

      {/* Menu próprio do programa (sticky) */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40" aria-label={`Menu do ${sigla || programa.nome}`}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          <ul className="hidden lg:flex items-center" ref={navRef}>
            {NAV.map((item) => {
              if (item.itens) {
                const aberto = grupoAberto === item.chave;
                return (
                  <li key={item.chave} className="relative">
                    <button
                      type="button"
                      onClick={() => setGrupoAberto((v) => (v === item.chave ? null : item.chave))}
                      aria-expanded={aberto}
                      aria-haspopup="true"
                      className={linkClasse(isGroupActive(item))}
                    >
                      <i className={`fa-solid ${item.icone} text-xs opacity-70`} aria-hidden="true"></i>
                      {item.rotulo}
                      <i className={`fa-solid fa-chevron-down text-[9px] opacity-60 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true"></i>
                    </button>
                    {aberto && (
                      <ul className="absolute left-0 top-full bg-white rounded-b-lg shadow-lg border border-gray-100 border-t-0 py-2 min-w-[240px] z-50">
                        {item.itens.map((sub) => (
                          <li key={sub.chave}>
                            <Link
                              to={programaPath(slug, sub.sub)}
                              className={`block px-4 py-2 text-sm truncate ${
                                isActive(sub.sub) ? 'text-[var(--prog-primary)] font-semibold bg-gray-50' : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {sub.rotulo}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }
              return (
                <li key={item.chave}>
                  <Link to={programaPath(slug, item.sub)} className={linkClasse(isActive(item.sub))}>
                    <i className={`fa-solid ${item.icone} text-xs opacity-70`} aria-hidden="true"></i>
                    {item.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* Busca */}
          <div className="flex items-center gap-2">
            {searchOpen ? (
              <form onSubmit={(e) => { e.preventDefault(); if (searchVal.trim().length >= 2) { navigate(`/${slug}/busca?q=${encodeURIComponent(searchVal.trim())}`); setSearchOpen(false); setSearchVal(''); } }}
                className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Buscar..."
                  aria-label="Buscar no site do programa"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40 md:w-52 focus:outline-none focus:ring-2 focus:ring-[var(--prog-primary)]/20"
                />
                <button type="button" onClick={() => { setSearchOpen(false); setSearchVal(''); }}
                  className="text-gray-400 hover:text-gray-600 p-1" aria-label="Fechar busca">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </form>
            ) : (
              <button onClick={() => setSearchOpen(true)}
                className="p-2 text-gray-500 hover:text-[var(--prog-primary)] transition-colors" aria-label="Buscar">
                <i className="fa-solid fa-magnifying-glass text-sm"></i>
              </button>
            )}
            {/* Mobile toggle */}
            <button onClick={() => setOpen(!open)} aria-expanded={open} className="lg:hidden py-3 px-1 text-xl text-[var(--prog-primary)]" aria-label="Menu">
              <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>
        {open && (
          <ul className="lg:hidden border-t border-gray-100 bg-white">
            {NAV.map((item) => {
              if (item.itens) {
                return (
                  <li key={item.chave} className="border-b border-gray-50 last:border-0">
                    <p className="flex items-center gap-3 px-5 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <i className={`fa-solid ${item.icone} text-xs opacity-70 w-4`} aria-hidden="true"></i>
                      {item.rotulo}
                    </p>
                    <ul>
                      {item.itens.map((sub) => (
                        <li key={sub.chave}>
                          <Link
                            to={programaPath(slug, sub.sub)}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 pl-11 pr-5 py-2.5 text-sm ${
                              isActive(sub.sub) ? 'text-[var(--prog-primary)] font-semibold bg-gray-50' : 'text-gray-600'
                            }`}
                          >
                            {sub.rotulo}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }
              return (
                <li key={item.chave} className="border-b border-gray-50 last:border-0">
                  <Link
                    to={programaPath(slug, item.sub)}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3 text-sm ${
                      isActive(item.sub) ? 'text-[var(--prog-primary)] font-semibold bg-gray-50' : 'text-gray-600'
                    }`}
                  >
                    <i className={`fa-solid ${item.icone} text-xs opacity-70 w-4`} aria-hidden="true"></i>
                    {item.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <main className="flex-1">{children}</main>

      {/* Footer do programa */}
      <footer className="bg-[var(--prog-primary)] text-white/80 mt-auto border-t-4 border-[var(--prog-accent)]">
        <div className="container mx-auto px-4 py-12 grid md:grid-cols-3 gap-10">
          <div>
            <h3 className="font-heading font-bold text-xl text-white mb-3">
              {sigla || programa.nome}
            </h3>
            {programa.descricao_curta && (
              <p className="text-sm leading-relaxed text-white/70">{programa.descricao_curta}</p>
            )}
            <div className="flex gap-3 mt-5">
              {SOCIALS.filter((s) => programa[s.key]).map((s) => (
                <a key={s.key} href={programa[s.key]} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-[var(--prog-accent)] hover:text-[var(--prog-primary)] transition-colors">
                  <i className={`fa-brands ${s.icon}`}></i>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Contato</h4>
            <ul className="space-y-3 text-sm text-white/70">
              {programa.endereco && (
                <li className="flex items-start gap-3"><i className="fa-solid fa-location-dot text-[var(--prog-accent)] mt-1"></i><span>{programa.endereco}</span></li>
              )}
              {programa.email_programa && (
                <li className="flex items-center gap-3"><i className="fa-solid fa-envelope text-[var(--prog-accent)]"></i>
                  <a href={`mailto:${programa.email_programa}`} className="hover:text-white break-all">{programa.email_programa}</a></li>
              )}
              {programa.telefone_secretaria && (
                <li className="flex items-center gap-3"><i className="fa-solid fa-phone text-[var(--prog-accent)]"></i><span>{programa.telefone_secretaria}</span></li>
              )}
              {programa.whatsapp && (
                <li className="flex items-center gap-3"><i className="fa-brands fa-whatsapp text-[var(--prog-accent)]"></i><span>{programa.whatsapp}</span></li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Navegação</h4>
            <ul className="space-y-2 text-sm text-white/70 md:columns-2 md:gap-6">
              {NAV_FLAT.map((item) => (
                <li key={item.chave} className="break-inside-avoid">
                  <Link to={programaPath(slug, item.sub)} className="hover:text-white transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-angle-right text-[10px] text-[var(--prog-accent)]"></i>{item.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
            <span>© {new Date().getFullYear()} {programa.nome} — UFRPE</span>
            <Link to="/" className="hover:text-white transition-colors flex items-center gap-2">
              <i className="fa-solid fa-arrow-left text-[10px]"></i> Parte do portal da PRPG/UFRPE
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
