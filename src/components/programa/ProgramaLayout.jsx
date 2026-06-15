import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePrograma, programaPath } from './ProgramaContext';

// Itens fixos (sempre visíveis) e itens dinâmicos (aparecem quando o programa tem conteúdo).
const NAV_FIXOS = [
  { label: 'Início',   sub: '',        icon: 'fa-house' },
  { label: 'Sobre',    sub: 'sobre',   icon: 'fa-circle-info' },
  { label: 'Notícias', sub: 'noticias', icon: 'fa-newspaper' },
  { label: 'Editais',  sub: 'editais', icon: 'fa-file-lines' },
];
const NAV_DINAMICOS = [
  { label: 'Corpo Docente',  sub: 'pessoas',        icon: 'fa-users',        modulo: 'pessoas' },
  { label: 'Disciplinas',    sub: 'disciplinas',    icon: 'fa-book-open',    modulo: 'disciplinas' },
  { label: 'Teses',          sub: 'teses',          icon: 'fa-graduation-cap', modulo: 'teses' },
  { label: 'FAQ',            sub: 'faq',            icon: 'fa-circle-question', modulo: 'faq' },
  { label: 'Grupos',         sub: 'grupos-pesquisa', icon: 'fa-microscope',   modulo: 'grupos' },
  { label: 'Documentos',     sub: 'documentos',     icon: 'fa-folder-open',  modulo: 'resolucoes' },
];
const NAV_FIXOS_FIM = [
  { label: 'Contato', sub: 'contato', icon: 'fa-envelope' },
];

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

  const sigla = programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla : null;
  const base = `/${slug}`;
  const rest = location.pathname.replace(base, '').replace(/^\//, '');
  const activeSub = rest.split('/')[0];

  const modulos = programa.modulos || {};
  const navDinamicos = NAV_DINAMICOS.filter((item) => (modulos[item.modulo] ?? 0) > 0);
  const NAV = [...NAV_FIXOS, ...navDinamicos, ...NAV_FIXOS_FIM];

  const themeStyle = {
    '--prog-primary': programa.cor_primaria || '#1e2b4f',
    '--prog-accent': programa.cor_secundaria || '#febd11',
  };

  const isActive = (sub) => activeSub === sub;

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
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <ul className="hidden md:flex items-center">
            {NAV.map((item) => (
              <li key={item.sub}>
                <Link
                  to={programaPath(slug, item.sub)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-[3px] transition-colors ${
                    isActive(item.sub)
                      ? 'border-[var(--prog-accent)] text-[var(--prog-primary)]'
                      : 'border-transparent text-gray-600 hover:text-[var(--prog-primary)] hover:border-gray-200'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-xs opacity-70`}></i>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {/* Atalho ao site antigo + busca */}
          <div className="flex items-center gap-2">
            {programa.site && (
              <a href={programa.site} target="_blank" rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-2 text-xs text-gray-400 hover:text-[var(--prog-primary)] transition-colors mr-2">
                <i className="fa-solid fa-arrow-up-right-from-square"></i> Site anterior
              </a>
            )}
            {searchOpen ? (
              <form onSubmit={(e) => { e.preventDefault(); if (searchVal.trim().length >= 2) { navigate(`/${slug}/busca?q=${encodeURIComponent(searchVal.trim())}`); setSearchOpen(false); setSearchVal(''); } }}
                className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Buscar..."
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40 md:w-52 focus:outline-none focus:ring-2 focus:ring-[var(--prog-primary)]/20"
                />
                <button type="button" onClick={() => { setSearchOpen(false); setSearchVal(''); }}
                  className="text-gray-400 hover:text-gray-600 p-1">
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
            <button onClick={() => setOpen(!open)} className="md:hidden py-3 px-1 text-xl text-[var(--prog-primary)]" aria-label="Menu">
              <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>
        {open && (
          <ul className="md:hidden border-t border-gray-100 bg-white">
            {NAV.map((item) => (
              <li key={item.sub} className="border-b border-gray-50 last:border-0">
                <Link
                  to={programaPath(slug, item.sub)}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-5 py-3 text-sm ${
                    isActive(item.sub) ? 'text-[var(--prog-primary)] font-semibold bg-gray-50' : 'text-gray-600'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-xs opacity-70 w-4`}></i>
                  {item.label}
                </Link>
              </li>
            ))}
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
            <ul className="space-y-2 text-sm text-white/70">
              {NAV.map((item) => (
                <li key={item.sub}>
                  <Link to={programaPath(slug, item.sub)} className="hover:text-white transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-angle-right text-[10px] text-[var(--prog-accent)]"></i>{item.label}
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
