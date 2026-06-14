import React from 'react';

// Resolve um id de usuário em nome legível usando a lista de usuários.
export const authorName = (id, users = []) => {
  if (!id) return null;
  const u = users.find((x) => x.id === id);
  return u ? (u.perfil_geral?.nome || u.email) : id;
};

// Exibe "Criado por X · Última edição por Y" a partir dos campos de auditoria
// (criado_por / atualizado_por). Nada é renderizado se não houver autoria.
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
