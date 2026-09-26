import React from 'react';
import ListaAdmin, { CelulaTitulo, Selo } from '../../components/admin/ListaAdmin';
import { ORIGEM_TODAS } from '../../hooks/useListaServidor';

const AdminFormularios = () => (
  <ListaAdmin
    titulo="Gerenciar Formulários" rotuloNovo="Novo Formulário" rotaNovo="/admin/formularios/novo"
    endpoint="/api/formularios" rotaEditar={(f) => `/admin/formularios/editar/${f.id}`}
    singular="formulário" plural="formulários" artigo="o" origemPadrao={ORIGEM_TODAS}
    colunas={[
      { chave: 'title', rotulo: 'Título', ordenar: 'title', render: (f, c) => <CelulaTitulo item={f} {...c} /> },
      { chave: 'secao', rotulo: 'Seção', ordenar: 'secao', render: (f) => (f.sectionTitle ? <Selo>{f.sectionTitle}</Selo> : '—') },
      { chave: 'categoria', rotulo: 'Subcategoria', ordenar: 'categoria', render: (f) => f.categoryTitle || '—' },
    ]}
  />
);

export default AdminFormularios;
