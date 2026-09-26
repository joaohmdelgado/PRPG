import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { clearSession } from '../auth';

// Decodifica o payload do JWT (sem verificar assinatura — isso é papel do
// servidor) apenas para checar a expiração no cliente e evitar deixar o
// usuário preso numa sessão já vencida.
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true; // token malformado = inválido
  }
};

// `skipPasswordCheck` é usado pela própria rota de troca de senha, para não
// entrar em laço de redirecionamento enquanto a flag provisória ainda existe.
// `semAcesso`: para onde mandar quem está logado mas não tem o papel (padrão
// /admin; a raiz do painel usa /minha-conta, que é o lugar de aluno e professor).
const RequireAuth = ({ allowedRoles, skipPasswordCheck, semAcesso = '/admin' }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token || isTokenExpired(token)) {
    clearSession();
    // Lembra para onde a pessoa queria ir; o login volta para lá.
    return <Navigate to="/admin/login" replace state={{ de: location.pathname + location.search }} />;
  }

  // Senha provisória pendente: tranca o painel na troca de senha.
  if (!skipPasswordCheck && localStorage.getItem('senhaTemporaria') === 'true') {
    return <Navigate to="/admin/trocar-senha" replace />;
  }

  if (allowedRoles) {
    try {
      const userRoles = JSON.parse(localStorage.getItem('roles') || '[]');
      const hasAccess = allowedRoles.some(role => userRoles.includes(role));
      if (!hasAccess) {
        return <Navigate to={semAcesso} replace />;
      }
    } catch (e) {
      return <Navigate to="/admin/login" replace />;
    }
  }

  return <Outlet />;
};

export default RequireAuth;
