import React from 'react';
import ListaAdmin, { CelulaTitulo, Selo, Pessoa, LinkArquivo } from '../../components/admin/ListaAdmin';
import { ORIGEM_TODAS } from '../../hooks/useListaServidor';

const AdminDisciplinasList = () => (
  <ListaAdmin
    titulo="Gerenciar Disciplinas" rotuloNovo="Nova Disciplina" rotaNovo="/admin/disciplinas/nova"
    endpoint="/api/disciplinas" rotaEditar={(d) => `/admin/disciplinas/editar/${d.id}`}
    singular="disciplina" plural="disciplinas" artigo="a" origemPadrao={ORIGEM_TODAS}
    rotuloBusca="Buscar por título, tipo ou docente…"
    colunas={[
      { chave: 'title', rotulo: 'Título', ordenar: 'title', render: (d, c) => <CelulaTitulo item={d} {...c} truncar /> },
      {
        chave: 'tipo', rotulo: 'Tipo', ordenar: 'tipo',
        render: (d) => (d.tipoDisciplina ? <Selo cor={d.tipoDisciplina === 'Obrigatória' ? 'bg-ufrpe-blue/10 text-ufrpe-blue' : 'bg-yellow-100 text-yellow-900'}>{d.tipoDisciplina}</Selo> : '—'),
      },
      { chave: 'docente', rotulo: 'Docente', ordenar: 'docente', render: (d) => <Pessoa p={d.docente} /> },
      { chave: 'carga', rotulo: 'Carga Horária', ordenar: 'cargaHoraria', render: (d) => (d.cargaHoraria ? `${d.cargaHoraria}h` : '—') },
      { chave: 'ementa', rotulo: 'Ementa', render: (d) => <LinkArquivo url={d.ementaUrl} rotulo="Ementa PDF" /> },
    ]}
  />
);

export default AdminDisciplinasList;
