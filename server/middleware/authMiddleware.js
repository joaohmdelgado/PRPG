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

// ===================== Escopo de Gestor de Programa =====================
// Um "Gestor de Programa" administra exclusivamente o conteúdo do seu próprio
// programa. Diferente de Administrator/Gestor (que têm alcance global na PRPG),
// ele só pode criar/editar/excluir itens vinculados ao seu programa_id.

// True quando o usuário é APENAS gestor de um programa (sem poderes globais).
export const isProgramaScoped = (user) => {
  const roles = user?.roles || [];
  if (roles.includes('Administrator') || roles.includes('Gestor')) return false;
  return roles.includes('GestorPrograma');
};

// Em POST/PUT: força o programa do gestor no corpo da requisição, ignorando
// qualquer programaId que o cliente tente enviar (defesa em profundidade).
export const scopeProgramaWrite = (req, res, next) => {
  if (isProgramaScoped(req.user)) {
    if (!req.user.programaId) {
      return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
    }
    if (req.body && typeof req.body === 'object') {
      req.body.programaId = req.user.programaId;
    }
  }
  next();
};

// Em PUT/DELETE por :id: garante que o gestor só toque em itens do seu programa.
// `getItem(id)` deve devolver o objeto (com `programaId`) ou null.
export const requireProgramaOwnership = (getItem) => async (req, res, next) => {
  if (!isProgramaScoped(req.user)) return next();
  if (!req.user.programaId) {
    return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
  }
  try {
    const item = await getItem(req.params.id);
    if (!item) return res.status(404).json({ message: 'Recurso não encontrado.' });
    if ((item.programaId ?? null) !== req.user.programaId) {
      return res.status(403).json({ message: 'Você só pode gerenciar conteúdo do seu programa.' });
    }
    return next();
  } catch (e) {
    return res.status(500).json({ message: 'Erro ao verificar permissão.', error: e.message });
  }
};

// Para rotas em que o :id é o próprio programa (ex.: editar o programa, gerir
// docentes/discentes/comissões): o gestor só pode agir sobre o seu programa.
export const requireSelfPrograma = (req, res, next) => {
  if (!isProgramaScoped(req.user)) return next();
  if (req.params.id !== req.user.programaId) {
    return res.status(403).json({ message: 'Você só pode gerenciar o seu programa.' });
  }
  next();
};

// Bloqueia totalmente um gestor de programa de uma rota (ex.: criar/excluir
// programas, gerir usuários, taxonomias).
export const blockProgramaScoped = (req, res, next) => {
  if (isProgramaScoped(req.user)) {
    return res.status(403).json({ message: 'Ação não permitida para gestor de programa.' });
  }
  next();
};
