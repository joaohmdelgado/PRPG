import React from 'react';
import ListaAdmin, { CelulaTitulo, Selo } from '../../components/admin/ListaAdmin';
import { dataLonga } from '../../utils/datas';

const AdminNoticias = () => (
  <ListaAdmin
    titulo="Gerenciar Notícias" rotuloNovo="Nova Notícia" rotaNovo="/admin/noticias/nova"
    endpoint="/api/news" rotaEditar={(n) => `/admin/noticias/editar/${n.id}`}
    singular="notícia" plural="notícias" artigo="a"
    colunas={[
      { chave: 'title', rotulo: 'Título', ordenar: 'title', render: (n, c) => <CelulaTitulo item={n} {...c} /> },
      { chave: 'category', rotulo: 'Categoria', ordenar: 'category', render: (n) => (n.category ? <Selo>{n.category}</Selo> : '—') },
      { chave: 'date', rotulo: 'Data', ordenar: 'date', render: (n) => dataLonga(n.date, '—') },
    ]}
  />
);

export default AdminNoticias;
