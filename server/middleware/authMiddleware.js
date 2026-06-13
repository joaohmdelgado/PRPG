import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

export const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Não autorizado, token falhou' });
    }
  }

  return res.status(401).json({ message: 'Não autorizado, sem token' });
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'Acesso negado. Usuário sem papel definido.' });
    }

    const hasRole = roles.some(role => req.user.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ message: 'Acesso negado. Papel insuficiente.' });
    }

    next();
  };
};
