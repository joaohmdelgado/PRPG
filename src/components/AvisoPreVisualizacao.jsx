import React from 'react';

// Faixa exibida quando quem edita abre um conteúdo que o público ainda não vê
// (rascunho, arquivado ou agendado). A API só entrega esses itens a quem pode
// editá-los — ver server/utils/publicacao.js.
export default function AvisoPreVisualizacao({ item }) {
  if (!item?.status) return null;
  const agendado = item.status === 'PUBLICADO' && item.publicadoEm && new Date(item.publicadoEm) > new Date();
  if (item.status === 'PUBLICADO' && !agendado) return null;

  const texto = agendado
    ? `agendado para ${new Date(item.publicadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
    : item.status === 'RASCUNHO' ? 'rascunho' : 'arquivado';

  return (
    <div role="status" className="bg-amber-100 text-amber-900 text-sm text-center px-4 py-2 border-b border-amber-200">
      <i className="fa-solid fa-eye mr-2" aria-hidden="true"></i>
      Pré-visualização ({texto}): este conteúdo ainda não está visível ao público.
    </div>
  );
}
