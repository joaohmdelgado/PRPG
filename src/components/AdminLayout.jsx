import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Newspaper, FileText, LogOut, Scale, FileSpreadsheet,
  GraduationCap, Calendar, Users, Tags, FileCheck, BookOpen, HelpCircle,
  Book, Award, File, UserCog, ExternalLink
} from 'lucide-react';

const CONTEUDO = [
  { to: '/admin/noticias', label: 'Notícias', icon: Newspaper },
  { to: '/admin/editais', label: 'Editais', icon: FileText },
  { to: '/admin/resolucoes', label: 'Resoluções', icon: Scale },
  { to: '/admin/formularios', label: 'Formulários', icon: FileSpreadsheet },
  { to: '/admin/programas', label: 'Programas', icon: GraduationCap },
  { to: '/admin/calendarios', label: 'Calendários', icon: Calendar },
  { to: '/admin/teses-dissertacoes', label: 'Teses e Dissertações', icon: BookOpen },
  { to: '/admin/faq', label: 'FAQ', icon: HelpCircle },
  { to: '/admin/disciplinas', label: 'Disciplinas', icon: Book },
  { to: '/admin/bolsas', label: 'Bolsas', icon: Award },
  { to: '/admin/paginas', label: 'Páginas', icon: File },
];

const ADMINISTRACAO = [
  { to: '/admin/metricas', label: 'Dashboard / Métricas', icon: LayoutDashboard },
  { to: '/admin/portarias', label: 'Portarias', icon: FileCheck },
  { to: '/admin/grupos-pesquisa', label: 'Grupos de Pesquisa', icon: Users },
  { to: '/admin/taxonomias', label: 'Taxonomias', icon: Tags },
  { to: '/admin/users', label: 'Usuários', icon: UserCog },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('roles');
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const userRoles = JSON.parse(localStorage.getItem('roles') || '[]');
  const isSuperAdmin = userRoles.includes('Administrator') || userRoles.includes('Gestor');
  const username = localStorage.getItem('username') || 'Admin';
  const roleLabel = userRoles[0] || 'Usuário';
  const initial = username.trim().charAt(0).toUpperCase() || 'A';

  const NavItem = ({ to, label, icon: Icon }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          active
            ? 'bg-ufrpe-yellow text-ufrpe-blue font-semibold'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <Icon
          size={18}
          className={active ? 'text-ufrpe-blue shrink-0' : 'text-white/45 group-hover:text-ufrpe-yellow shrink-0 transition-colors'}
        />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  const SectionLabel = ({ children }) => (
    <p className="px-3 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">
      {children}
    </p>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-ufrpe-blue text-white flex flex-col shrink-0">
        <div className="px-6 pt-6 pb-5 border-b border-white/10">
          <Link to="/admin" className="inline-block">
            <span className="font-heading font-extrabold text-2xl text-white leading-none border-b-4 border-ufrpe-yellow pb-1 inline-block">
              PRPG
            </span>
            <span className="block font-heading text-[13px] text-white/55 mt-2 tracking-wide">
              Painel Administrativo
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 pb-4 overflow-y-auto">
          <SectionLabel>Conteúdo</SectionLabel>
          <div className="space-y-1">
            {CONTEUDO.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          {isSuperAdmin && (
            <>
              <SectionLabel>Administração</SectionLabel>
              <div className="space-y-1">
                {ADMINISTRACAO.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg text-sm text-white/70 hover:bg-ufrpe-red hover:text-white transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-3.5 flex justify-between items-center shrink-0">
          <h1 className="font-heading text-lg font-semibold text-ufrpe-blue">Painel de Controle</h1>
          <div className="flex items-center gap-5">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-ufrpe-blue transition-colors"
            >
              <ExternalLink size={15} />
              Ver site
            </a>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-ufrpe-blue text-white grid place-items-center font-heading font-semibold text-sm">
                {initial}
              </div>
              <div className="leading-tight hidden sm:block">
                <p className="text-sm font-medium text-gray-800">{username}</p>
                <p className="text-xs text-gray-400">{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
