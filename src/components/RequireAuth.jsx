import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const RequireAuth = ({ allowedRoles }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/admin/login" replace />;
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
