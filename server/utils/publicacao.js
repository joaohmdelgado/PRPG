// Regras do envelope de publicação (Fase F.1/F.2 de
// docs/revisao-portal-conteudo-2026-09-24.md). Um só lugar decide o que o
// público vê e quem enxerga rascunho.

export const STATUS_PUBLICACAO = ['RASCUNHO', 'PUBLICADO', 'ARQUIVADO'];

// Visível ao público: PUBLICADO e, se agendado, já na data.
export const estaPublicado = (item, agora = new Date()) =>
  item?.status === 'PUBLICADO' && (!item.publicadoEm || new Date(item.publicadoEm) <= agora);

// Quem edita o conteúdo também o vê antes de publicar (pré-visualização):
// Admin/Gestor da PRPG sempre; Gestor de Programa, só o do próprio programa.
// D-R3: sem fluxo de aprovação — quem pode editar pode publicar.
export const podeVerNaoPublicado = (user, item) => {
  const roles = user?.roles || [];
  if (roles.includes('Administrator') || roles.includes('Gestor')) return true;
  return roles.includes('GestorPrograma') && !!item?.programaId && item.programaId === user.programaId;
};

export const visivelPara = (user, item) => estaPublicado(item) || podeVerNaoPublicado(user, item);

// Filtra uma listagem pelo que o usuário pode ver. `?status=` (RASCUNHO,
// PUBLICADO, ARQUIVADO) restringe ainda mais — útil no painel.
export function filtrarVisiveis(items, user, q = {}) {
  let out = items.filter((i) => visivelPara(user, i));
  if (q.status && STATUS_PUBLICACAO.includes(q.status)) out = out.filter((i) => i.status === q.status);
  return out;
}

// Condição SQL equivalente a estaPublicado(), para consultas diretas (busca
// do microsite, contadores). `alias` é o prefixo da tabela na consulta.
export const sqlPublicado = (alias = '') => {
  const p = alias ? `${alias}.` : '';
  return `(${p}status = 'PUBLICADO' AND (${p}publicado_em IS NULL OR ${p}publicado_em <= now()))`;
};
