import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Newspaper, FileText, LogOut, Scale, FileSpreadsheet, GraduationCap, Calendar, Users, Tags, FileCheck, BookOpen, HelpCircle, Book, Award } from 'lucide-react';

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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-blue-400">PRPG Admin</h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <Link 
            to="/admin/noticias" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/noticias') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <Newspaper size={20} />
            <span>Notícias</span>
          </Link>
          <Link 
            to="/admin/editais" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/editais') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <FileText size={20} />
            <span>Editais</span>
          </Link>
          <Link 
            to="/admin/resolucoes" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/resolucoes') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <Scale size={20} />
            <span>Resoluções</span>
          </Link>
          <Link 
            to="/admin/formularios" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/formularios') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <FileSpreadsheet size={20} />
            <span>Formulários</span>
          </Link>
          <Link 
            to="/admin/programas" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/programas') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <GraduationCap size={20} />
            <span>Programas</span>
          </Link>
          <Link 
            to="/admin/calendarios" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/calendarios') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <Calendar size={20} />
            <span>Calendários</span>
          </Link>
          <Link 
            to="/admin/teses-dissertacoes" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/teses-dissertacoes') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <BookOpen size={20} />
            <span>Teses e Dissertações</span>
          </Link>
          <Link 
            to="/admin/faq" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/faq') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <HelpCircle size={20} />
            <span>FAQ</span>
          </Link>
          <Link 
            to="/admin/disciplinas" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/disciplinas') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <Book size={20} />
            <span>Disciplinas</span>
          </Link>
          <Link 
            to="/admin/bolsas" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/bolsas') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <Award size={20} />
            <span>Bolsas</span>
          </Link>
          
          {isSuperAdmin && (
            <>
              <Link 
                to="/admin/portarias" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/portarias') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
              >
                <FileCheck size={20} />
                <span>Portarias</span>
              </Link>
              <Link 
                to="/admin/grupos-pesquisa" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/grupos-pesquisa') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
              >
                <Users size={20} />
                <span>Grupos de Pesquisa</span>
              </Link>
              <Link 
                to="/admin/taxonomias" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/taxonomias') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
              >
                <Tags size={20} />
                <span>Taxonomias</span>
              </Link>
              <Link 
                to="/admin/users" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/users') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
              >
                <Users size={20} />
                <span>Usuários</span>
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg hover:bg-red-600 transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">Painel de Controle</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Olá, {localStorage.getItem('username') || 'Admin'}</span>
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
