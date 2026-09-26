import React from 'react';
import ListaAdmin, { CelulaTitulo, Selo } from '../../components/admin/ListaAdmin';

// Calendários são da PRPG (sem programa): sem filtro de origem.
const AdminCalendarios = () => (
  <ListaAdmin
    titulo="Gerenciar Calendários" rotuloNovo="Novo Calendário" rotaNovo="/admin/calendarios/novo"
    endpoint="/api/calendarios" rotaEditar={(c) => `/admin/calendarios/editar/${c.id}`}
    singular="calendário" plural="calendários" artigo="o" filtroOrigem={false}
    colunas={[
      { chave: 'title', rotulo: 'Título', ordenar: 'title', render: (c, ctx) => <CelulaTitulo item={c} {...ctx} /> },
      { chave: 'ano', rotulo: 'Ano Letivo', ordenar: 'ano', render: (c) => c.ano || '—' },
      {
        chave: 'corrente', rotulo: 'Status',
        render: (c) => (c.isCurrent
          ? <Selo cor="bg-yellow-100 text-yellow-900 font-bold">Corrente</Selo>
          : <Selo cor="bg-gray-100 text-gray-700">Antigo</Selo>),
      },
    ]}
  />
);

export default AdminCalendarios;
