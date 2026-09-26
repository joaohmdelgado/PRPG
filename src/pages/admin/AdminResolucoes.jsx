import React from 'react';
import ListaAdmin, { CelulaTitulo, Selo } from '../../components/admin/ListaAdmin';
import { ORIGEM_TODAS } from '../../hooks/useListaServidor';

const AdminResolucoes = () => (
  <ListaAdmin
    titulo="Gerenciar Resoluções" rotuloNovo="Nova Resolução" rotaNovo="/admin/resolucoes/nova"
    endpoint="/api/resolucoes" rotaEditar={(r) => `/admin/resolucoes/editar/${r.id}`}
    singular="resolução" plural="resoluções" artigo="a" origemPadrao={ORIGEM_TODAS}
    colunas={[
      { chave: 'title', rotulo: 'Título', ordenar: 'title', render: (r, c) => <CelulaTitulo item={r} {...c} /> },
      { chave: 'secao', rotulo: 'Seção', ordenar: 'secao', render: (r) => (r.sectionTitle ? <Selo>{r.sectionTitle}</Selo> : '—') },
      { chave: 'categoria', rotulo: 'Subcategoria', ordenar: 'categoria', render: (r) => r.categoryTitle || '—' },
    ]}
  />
);

export default AdminResolucoes;
