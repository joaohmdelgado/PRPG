import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, ExternalLink, ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import { isProgramaGestor, getGestorPrograma, clearSession } from '../auth';
import { INICIO, gruposDoPainel } from './admin/menuPainel';
import RouteFocusManager from './ui/RouteFocusManager';
import useFocusTrap from '../hooks/useFocusTrap';
import useMediaQuery from '../hooks/useMediaQuery';
import useAssociarRotulos from '../hooks/useAssociarRotulos';

const GRUPOS_ABERTOS_KEY = 'painel.gruposAbertos';

const lerAbertos = () => {
  try {
    const v = JSON.parse(localStorage.getItem(GRUPOS_ABERTOS_KEY) || 'null');
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearSession();
    navigate('/admin/login');
  };

  const isActive = (path, exact) => (exact
    ? location.pathname.replace(/\/$/, '') === path
    : location.pathname.startsWith(path));

  const userRoles = JSON.parse(localStorage.getItem('roles') || '[]');
  const isSuperAdmin = userRoles.includes('Administrator') || userRoles.includes('Gestor');
  const gestorPrograma = isProgramaGestor();
  const programa = getGestorPrograma();
  const username = localStorage.getItem('username') || 'Admin';
  const roleLabel = gestorPrograma ? 'Gestor de Programa' : (userRoles[0] || 'Usuário');
  const initial = username.trim().charAt(0).toUpperCase() || 'A';
  const siglaPrograma = programa?.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla : programa?.nome;

  // Abaixo de 1024 px o menu vira um drawer: fechado fica fora da tela E fora da
  // ordem de foco (inert); aberto prende o foco, Escape fecha e o foco volta ao botão.
  const desktop = useMediaQuery('(min-width: 1024px)', true);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const asideRef = useRef(null);
  const mainRef = useRef(null);
  const drawerAtivo = !desktop && drawerAberto;
  useFocusTrap(asideRef, drawerAtivo, { onEscape: () => setDrawerAberto(false) });
  useAssociarRotulos(mainRef);
  useEffect(() => { setDrawerAberto(false); }, [location.pathname]);
  useEffect(() => { if (desktop) setDrawerAberto(false); }, [desktop]);

  const grupos = gruposDoPainel({ superAdmin: isSuperAdmin, gestorPrograma, programaId: programa?.id, roles: userRoles });

  // Grupo da rota atual sempre aberto; os demais seguem a escolha da pessoa
  // (guardada no navegador). Sem escolha, só o grupo da rota atual.
  const grupoAtual = grupos.find((g) => g.itens.some((i) => isActive(i.to, i.exact)))?.id;
  const [abertos, setAbertos] = useState(() => lerAbertos() || []);
  const estaAberto = (id) => id === grupoAtual || abertos.includes(id);
  const alternar = (id) => setAbertos((prev) => {
    const proximo = estaAberto(id) ? prev.filter((x) => x !== id) : [...prev, id];
    try { localStorage.setItem(GRUPOS_ABERTOS_KEY, JSON.stringify(proximo)); } catch { /* sem armazenamento */ }
    return proximo;
  });
  useEffect(() => {
    // Ao entrar num grupo por outro caminho (busca, link), ele passa a ficar aberto.
    if (grupoAtual && !abertos.includes(grupoAtual)) setAbertos((prev) => [...prev, grupoAtual]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoAtual]);

  const NavItem = ({ to, label, icon: Icon, exact }) => {
    const active = isActive(to, exact);
    return (
      <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          active
            ? 'bg-ufrpe-yellow text-ufrpe-blue font-semibold'
            : 'text-white/75 hover:text-white hover:bg-white/10'
        }`}
      >
        <Icon
          size={18}
          aria-hidden="true"
          className={active ? 'text-ufrpe-blue shrink-0' : 'text-white/50 group-hover:text-ufrpe-yellow shrink-0 transition-colors'}
        />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-dvh bg-gray-100">
      <a href="#conteudo-painel"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[80] focus:bg-white focus:text-ufrpe-blue focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg">
        Ir para o conteúdo
      </a>
      <RouteFocusManager alvoId="conteudo-painel" />

      {drawerAtivo && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" aria-hidden="true" onClick={() => setDrawerAberto(false)} />}

      {/* Menu: coluna fixa no desktop, drawer no celular/tablet */}
      <aside
        id="menu-painel"
        ref={asideRef}
        inert={!desktop && !drawerAberto ? true : undefined}
        role={drawerAtivo ? 'dialog' : undefined}
        aria-modal={drawerAtivo ? 'true' : undefined}
        aria-label={drawerAtivo ? 'Menu do painel' : undefined}
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] lg:static lg:w-64 lg:max-w-none lg:z-auto bg-ufrpe-blue text-white flex flex-col shrink-0 transition-transform duration-200 motion-reduce:transition-none ${drawerAberto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="px-6 pt-6 pb-5 border-b border-white/10 flex items-start justify-between">
          <Link to="/admin" className="inline-block">
            <span className="font-heading font-extrabold text-2xl text-white leading-none border-b-4 border-ufrpe-yellow pb-1 inline-block">
              PRPG
            </span>
            <span className="block font-heading text-[13px] text-white/60 mt-2 tracking-wide">
              {gestorPrograma ? `Painel do Programa${siglaPrograma ? ` · ${siglaPrograma}` : ''}` : 'Painel Administrativo'}
            </span>
          </Link>
          <button type="button" onClick={() => setDrawerAberto(false)} aria-label="Fechar menu"
            className="lg:hidden p-1.5 -mr-2 rounded-md text-white/75 hover:bg-white/10">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Painel" className="flex-1 px-3 pb-4 pt-3 overflow-y-auto">
          <NavItem {...INICIO} />
          {grupos.map((g) => {
            const aberto = estaAberto(g.id);
            return (
              <div key={g.id} className="mt-3">
                <button
                  type="button"
                  onClick={() => alternar(g.id)}
                  aria-expanded={aberto}
                  aria-controls={`grupo-${g.id}`}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/60 hover:text-white rounded"
                >
                  {g.rotulo}
                  <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${aberto ? '' : '-rotate-90'}`} />
                </button>
                <ul id={`grupo-${g.id}`} hidden={!aberto} className="space-y-0.5 mt-1">
                  {g.itens.map((item) => (
                    <li key={item.to}><NavItem {...item} /></li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg text-sm text-white/75 hover:bg-ufrpe-red hover:text-white transition-colors"
          >
            <LogOut size={18} className="shrink-0" aria-hidden="true" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-3 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={() => setDrawerAberto(true)}
              aria-label="Abrir menu do painel" aria-expanded={drawerAtivo} aria-controls="menu-painel"
              className="lg:hidden p-2 -ml-2 rounded-md text-ufrpe-blue hover:bg-gray-100">
              <MenuIcon size={22} aria-hidden="true" />
            </button>
          <h1 className="font-heading text-base sm:text-lg font-semibold text-ufrpe-blue truncate">
            {gestorPrograma ? `Painel do Programa${siglaPrograma ? ` · ${siglaPrograma}` : ''}` : 'Painel de Controle'}
          </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <a
              href={gestorPrograma && programa?.slug ? `/${programa.slug}` : '/'}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 hover:text-ufrpe-blue transition-colors"
            >
              <ExternalLink size={15} aria-hidden="true" />
              {gestorPrograma && programa?.slug ? 'Ver microsite' : 'Ver site'}
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-ufrpe-blue text-white grid place-items-center font-heading font-semibold text-sm" aria-hidden="true">
                {initial}
              </div>
              <div className="leading-tight hidden sm:block">
                <p className="text-sm font-medium text-gray-800">{username}</p>
                <p className="text-xs text-gray-500">{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <main id="conteudo-painel" ref={mainRef} tabIndex={-1} className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
