// Helpers de sessão/escopo do painel administrativo.
// O "Gestor de Programa" (papel GestorPrograma) administra exclusivamente o
// conteúdo do seu próprio programa: o painel filtra listagens por esse programa
// e esconde o seletor de programa nos formulários (o vínculo é automático).

export const getToken = () => localStorage.getItem('token');

// Id do usuário logado, lido do payload do JWT (sem verificar assinatura — só
// para uso no cliente). Retorna null se não houver token válido.
export const getUserId = () => {
  const token = getToken();
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]))?.id ?? null;
  } catch {
    return null;
  }
};

export const getRoles = () => {
  try {
    return JSON.parse(localStorage.getItem('roles') || '[]');
  } catch {
    return [];
  }
};

export const hasRole = (...roles) => {
  const mine = getRoles();
  return roles.some((r) => mine.includes(r));
};

// Admin/Gestor da PRPG têm alcance global.
export const isPrpgAdmin = () => hasRole('Administrator', 'Gestor');

// Verdadeiro quando o usuário é APENAS gestor de um programa (sem poderes globais).
export const isProgramaGestor = () =>
  hasRole('GestorPrograma') && !isPrpgAdmin();

// { id, nome, sigla, slug } do programa administrado, ou null.
export const getGestorPrograma = () => {
  try {
    return JSON.parse(localStorage.getItem('gestorPrograma') || 'null');
  } catch {
    return null;
  }
};

// Id do programa ao qual o painel deve se restringir (null para Admin/Gestor).
export const getScopedProgramaId = () =>
  isProgramaGestor() ? getGestorPrograma()?.id || null : null;

// Acrescenta ?programa=<id> a uma URL de listagem quando o usuário é gestor.
export const withProgramaScope = (url) => {
  const pid = getScopedProgramaId();
  if (!pid) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}programa=${encodeURIComponent(pid)}`;
};

// Papéis que entram no painel (/admin). Aluno e Professor usam /minha-conta.
export const PAPEIS_PAINEL = ['Administrator', 'Gestor', 'GestorPrograma'];

// Quem tem qualquer papel do painel.
export const isStaff = () => hasRole(...PAPEIS_PAINEL);

// Para onde o login leva cada papel (Fase U.1): a equipe vai ao painel; aluno e
// professor, à própria conta. Quem é os dois (ex.: professor que também é
// GestorPrograma) cai no painel e acha "Minha conta" no cabeçalho.
export const destinoPadrao = (roles = getRoles()) =>
  (roles || []).some((r) => PAPEIS_PAINEL.includes(r)) ? '/admin' : '/minha-conta';

// Um destino pedido só vale se o perfil pode abri-lo (não manda o aluno para /admin).
export const destinoPermitido = (destino, roles = getRoles()) => {
  const padrao = destinoPadrao(roles);
  if (!destino || typeof destino !== 'string' || !destino.startsWith('/') || destino.startsWith('//')) return padrao;
  if (destino.startsWith('/admin') && padrao !== '/admin') return padrao;
  return destino;
};

const CHAVES_SESSAO = ['token', 'username', 'roles', 'gestorPrograma', 'senhaTemporaria', 'nome'];
export const clearSession = () => CHAVES_SESSAO.forEach((k) => localStorage.removeItem(k));
