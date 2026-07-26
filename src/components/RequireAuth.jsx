import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

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

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('roles');
  localStorage.removeItem('senhaTemporaria');
};

// `skipPasswordCheck` é usado pela própria rota de troca de senha, para não
// entrar em laço de redirecionamento enquanto a flag provisória ainda existe.
const RequireAuth = ({ allowedRoles, skipPasswordCheck }) => {
  const token = localStorage.getItem('token');

  if (!token || isTokenExpired(token)) {
    clearSession();
    return <Navigate to="/admin/login" replace />;
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
        return <Navigate to="/admin" replace />;
      }
    } catch (e) {
      return <Navigate to="/admin/login" replace />;
    }
  }

  return <Outlet />;
};

export default RequireAuth;
