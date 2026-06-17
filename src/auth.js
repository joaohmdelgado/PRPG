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
