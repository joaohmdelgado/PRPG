import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { query } from '../db/pool.js';

// AUTH-01/AUTH-02: a conta é lida do banco a cada requisição, não do token de 30
// dias: senha provisória, papéis e programa valem na hora (reset de senha,
// rebaixamento de papel, troca de programa) e conta excluída perde o acesso.
const estadoDaConta = async (id) => {
  const { rows } = await query('SELECT senha_temporaria, roles, programa_id FROM users WHERE id = $1', [id]);
  if (!rows[0]) return { existe: false };
  return {
    existe: true,
    senhaTemporaria: rows[0].senha_temporaria === true,
    roles: rows[0].roles || [],
    programaId: rows[0].programa_id || null,
  };
};

// Gestor de Programa sem programa (ex.: o programa foi excluído — users.programa_id
// é ON DELETE SET NULL) não tem escopo: várias checagens de posse comparam
// programaId e falhariam abertas com null.
const semEscopo = (user) => isProgramaScoped(user) && !user.programaId;

const contaComBanco = (decoded, conta) => ({ ...decoded, roles: conta.roles, programaId: conta.programaId });

// Com senha provisória (ou gestor sem escopo), o token só serve para ver a
// própria conta e trocar a senha.
const rotaDaPropriaConta = (req) => {
  const caminho = req.originalUrl.split('?')[0];
  if (req.method === 'GET' && caminho === '/api/minha-conta') return true;
  if (req.method === 'PUT' && caminho === '/api/minha-conta/senha') return true;
  // Troca forçada do painel (AdminTrocarSenha): PUT no próprio id, só com a senha.
  if (req.method === 'PUT' && caminho === `/api/users/${encodeURIComponent(req.user.id)}`) {
    const chaves = Object.keys(req.body || {});
    return chaves.length === 1 && chaves[0] === 'password';
  }
  return false;
};

// Popula req.user se um Bearer token válido estiver presente, mas não rejeita
// requisições sem token (rotas públicas com comportamento diferenciado por papel).
// Token de conta excluída, com senha provisória ou de gestor sem programa vale
// como anônimo.
export const optionalProtect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    let decoded = null;
    try {
      decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    } catch { /* token inválido — trata como anônimo */ }
    if (decoded) {
      try {
        const conta = await estadoDaConta(decoded.id);
        const user = conta.existe ? contaComBanco(decoded, conta) : null;
        if (user && !conta.senhaTemporaria && !semEscopo(user)) req.user = user;
      } catch (error) {
        return next(error);
      }
    }
  }
  next();
};

export const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer')) {
    return res.status(401).json({ message: 'Não autorizado, sem token' });
  }
  let decoded;
  try {
    decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Não autorizado, token falhou' });
  }
  try {
    const conta = await estadoDaConta(decoded.id);
    if (!conta.existe) return res.status(401).json({ message: 'Não autorizado, conta não encontrada' });
    req.user = contaComBanco(decoded, conta);
    if (conta.senhaTemporaria && !rotaDaPropriaConta(req)) {
      return res.status(403).json({ codigo: 'SENHA_TEMPORARIA', message: 'Troque a senha provisória antes de continuar.' });
    }
    if (semEscopo(req.user) && !rotaDaPropriaConta(req)) {
      return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
    }
    return next();
  } catch (error) {
    return next(error);
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

// Escrita de conteúdo institucional exige um papel de gestão. Escopos de
// programa são aplicados pelos middlewares específicos das rotas seguintes.
export const requireInstitutionalWriter = requireRole([
  'Administrator',
  'Gestor',
  'GestorPrograma',
]);

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
