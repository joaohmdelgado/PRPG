import React from 'react';
import ListaAdmin, { CelulaTitulo } from '../../components/admin/ListaAdmin';
import { ORIGEM_TODAS } from '../../hooks/useListaServidor';

const AdminFaqList = () => (
  <ListaAdmin
    titulo="Gerenciar FAQ" rotuloNovo="Nova Pergunta" rotaNovo="/admin/faq/novo"
    endpoint="/api/faq" rotaEditar={(f) => `/admin/faq/editar/${f.id}`}
    singular="pergunta" plural="perguntas" artigo="a" origemPadrao={ORIGEM_TODAS}
    rotuloBusca="Buscar pergunta ou resposta…"
    colunas={[
      { chave: 'title', rotulo: 'Pergunta', ordenar: 'title', className: 'w-3/4', cabecalhoClasse: 'w-3/4', render: (f, c) => <CelulaTitulo item={f} {...c} /> },
    ]}
  />
);

export default AdminFaqList;
