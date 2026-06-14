import React from 'react';

// Resolve um id de usuário em nome legível usando a lista de usuários.
// Retorna null quando não há id ou o usuário não pôde ser resolvido (ex.: lista
// não carregada por falta de permissão), para a UI degradar sem mostrar o id cru.
export const authorName = (id, users = []) => {
  if (!id) return null;
  const u = users.find((x) => x.id === id);
  return u ? (u.perfil_geral?.nome || u.email) : null;
};

// Exibe "Criado por X · Última edição por Y" a partir dos campos de auditoria.
// Nada é renderizado se nenhum autor puder ser resolvido.
export default function AuditInfo({ criadoPor, atualizadoPor, users = [], className = '' }) {
  const criado = authorName(criadoPor, users);
  const atualizado = authorName(atualizadoPor, users);
  if (!criado && !atualizado) return null;

  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      {criado && (
        <span>Criado por <span className="font-medium text-gray-700">{criado}</span></span>
      )}
      {criado && atualizado && <span className="mx-1.5 text-gray-300">·</span>}
      {atualizado && (
        <span>Última edição por <span className="font-medium text-gray-700">{atualizado}</span></span>
      )}
    </div>
  );
}

// Linha compacta "Última edição: <nome>" para uso em listagens.
// Cai para o criador quando não há editor; some se nada resolver.
export function LastEdited({ criadoPor, atualizadoPor, users = [], className = '' }) {
  const name = authorName(atualizadoPor, users) || authorName(criadoPor, users);
  if (!name) return null;
  return <div className={`text-xs text-gray-400 font-normal ${className}`}>Última edição: {name}</div>;
}

const fmtData = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Cabeçalho de auditoria para formulários de edição. Mostra autoria e, quando a
// entidade tiver timestamp (criado_em/atualizado_em), a data correspondente.
export function AuditHeader({ criadoPor, atualizadoPor, criadoEm, atualizadoEm, users = [], className = '' }) {
  const criado = authorName(criadoPor, users);
  const atualizado = authorName(atualizadoPor, users);
  if (!criado && !atualizado) return null;
  const criadoData = fmtData(criadoEm);
  const editadoData = fmtData(atualizadoEm);

  return (
    <div className={`text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-md px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      {criado && (
        <span>Criado por <span className="font-medium text-gray-700">{criado}</span>{criadoData ? ` em ${criadoData}` : ''}</span>
      )}
      {atualizado && (
        <span>Última edição por <span className="font-medium text-gray-700">{atualizado}</span>{editadoData ? ` em ${editadoData}` : ''}</span>
      )}
    </div>
  );
}
