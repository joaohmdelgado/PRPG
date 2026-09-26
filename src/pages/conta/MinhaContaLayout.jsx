import React, { useRef } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ExternalLink, LogOut, UserRound, Languages, FileCheck, Gavel, LayoutDashboard } from 'lucide-react';
import { lerJson } from '../../api';
import { clearSession, isStaff } from '../../auth';
import useCarga from '../../hooks/useCarga';
import useAssociarRotulos from '../../hooks/useAssociarRotulos';
import RouteFocusManager from '../../components/ui/RouteFocusManager';
import AreaErrorBoundary from '../../components/ui/AreaErrorBoundary';
import { Carregando, EstadoErro } from '../../components/ui/Estados';

// Área da própria pessoa (Fase U.1): aluno e professor não entram no painel
// administrativo — aqui veem os dados, as inscrições, as declarações e as
// relatorias que são delas. Os dados chegam de uma chamada só (GET
// /api/minha-conta) e as telas filhas os recebem por `useOutletContext()`.
export default function MinhaContaLayout() {
  const navigate = useNavigate();
  const mainRef = useRef(null);
  useAssociarRotulos(mainRef);
  const { dados, carregando, erro, recarregar } = useCarga(() => lerJson('/api/minha-conta'), []);

  const sair = () => { clearSession(); navigate('/admin/login'); };

  // Relatorias só aparecem para quem é docente ou já tem alguma designada.
  const ehDocente = !!dados?.conta?.roles?.includes('Professor');
  const abas = [
    { to: '/minha-conta', rotulo: 'Meus dados', icon: UserRound, fim: true },
    { to: '/minha-conta/inscricoes', rotulo: 'Inscrições', icon: Languages, n: dados?.inscricoes?.length },
    { to: '/minha-conta/declaracoes', rotulo: 'Declarações', icon: FileCheck, n: dados?.declaracoes?.length },
    ...(ehDocente || dados?.relatorias?.length
      ? [{ to: '/minha-conta/relatorias', rotulo: 'Relatorias', icon: Gavel, n: dados?.relatorias?.length }]
      : []),
  ];

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <a href="#conteudo-conta"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[80] focus:bg-white focus:text-ufrpe-blue focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg">
        Ir para o conteúdo
      </a>
      <RouteFocusManager alvoId="conteudo-conta" />

      <header className="bg-ufrpe-blue text-white">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-block">
            <span className="font-heading font-extrabold text-2xl leading-none border-b-4 border-ufrpe-yellow pb-1 inline-block">PRPG</span>
            <span className="block font-heading text-[13px] text-white/70 mt-1.5 tracking-wide">Minha conta</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline text-white/80">{dados?.conta?.nome || localStorage.getItem('nome') || ''}</span>
            {isStaff() && (
              <Link to="/admin" className="inline-flex items-center gap-1.5 text-white/85 hover:text-white">
                <LayoutDashboard size={15} aria-hidden="true" /> Painel
              </Link>
            )}
            <Link to="/" className="inline-flex items-center gap-1.5 text-white/85 hover:text-white">
              <ExternalLink size={15} aria-hidden="true" /> Portal
            </Link>
            <button type="button" onClick={sair} className="inline-flex items-center gap-1.5 text-white/85 hover:text-white">
              <LogOut size={15} aria-hidden="true" /> Sair
            </button>
          </div>
        </div>
        <nav aria-label="Minha conta" className="container mx-auto px-4">
          <ul className="flex gap-1 overflow-x-auto">
            {abas.map(({ to, rotulo, icon: Icon, fim, n }) => (
              <li key={to}>
                <NavLink to={to} end={fim}
                  className={({ isActive }) => `flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-4 ${isActive ? 'border-ufrpe-yellow text-white font-semibold' : 'border-transparent text-white/75 hover:text-white'}`}>
                  <Icon size={16} aria-hidden="true" />
                  {rotulo}
                  {n > 0 && <span className="text-[11px] bg-white/15 rounded-full px-1.5">{n}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="conteudo-conta" ref={mainRef} tabIndex={-1} className="flex-1 container mx-auto px-4 py-8 max-w-4xl outline-none">
        <AreaErrorBoundary area="a sua conta" compacto>
          {carregando && !dados ? <Carregando /> : erro && !dados ? (
            <EstadoErro erro={erro} onTentar={recarregar} titulo="Não foi possível carregar a sua conta." />
          ) : (
            <Outlet context={{ ...dados, recarregar }} />
          )}
        </AreaErrorBoundary>
      </main>
    </div>
  );
}
