import React from 'react';
import ListaAdmin, { CelulaTitulo, Selo } from '../../components/admin/ListaAdmin';

const AdminEditais = () => (
  <ListaAdmin
    titulo="Gerenciar Editais" rotuloNovo="Novo Edital" rotaNovo="/admin/editais/novo"
    endpoint="/api/editais" rotaEditar={(e) => `/admin/editais/editar/${e.id}`}
    singular="edital" plural="editais" artigo="o"
    colunas={[
      { chave: 'title', rotulo: 'Título', ordenar: 'title', render: (e, c) => <CelulaTitulo item={e} {...c} /> },
      { chave: 'category', rotulo: 'Categoria', ordenar: 'category', render: (e) => (e.categoryTitle ? <Selo>{e.categoryTitle}</Selo> : '—') },
      { chave: 'situacao', rotulo: 'Situação', ordenar: 'situacao', render: (e) => (e.situationLabel ? <Selo cor="bg-green-100 text-green-800">{e.situationLabel}</Selo> : '—') },
      { chave: 'year', rotulo: 'Ano', ordenar: 'year', render: (e) => e.year || '—' },
    ]}
  />
);

export default AdminEditais;
