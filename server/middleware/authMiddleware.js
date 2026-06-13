import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = decoded;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Não autorizado, token falhou' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Não autorizado, sem token' });
  }
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
