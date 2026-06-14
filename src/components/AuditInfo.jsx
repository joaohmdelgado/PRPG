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
