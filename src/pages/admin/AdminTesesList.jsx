import React from 'react';
import ListaAdmin, { CelulaTitulo, Selo, Pessoa, LinkArquivo } from '../../components/admin/ListaAdmin';
import { ORIGEM_TODAS } from '../../hooks/useListaServidor';
import { dataCurta } from '../../utils/datas';

const AdminTesesList = () => (
  <ListaAdmin
    titulo="Gerenciar Teses e Dissertações" rotuloNovo="Nova Tese/Dissertação" rotaNovo="/admin/teses-dissertacoes/nova"
    endpoint="/api/teses-dissertacoes" rotaEditar={(t) => `/admin/teses-dissertacoes/editar/${t.id}`}
    singular="registro" plural="registros" artigo="o" origemPadrao={ORIGEM_TODAS}
    rotuloBusca="Buscar por título, autor ou orientador…"
    vazio={{ titulo: 'Nenhuma tese ou dissertação ainda.', descricao: 'Use “Nova Tese/Dissertação” para cadastrar a primeira.' }}
    colunas={[
      { chave: 'title', rotulo: 'Título', ordenar: 'title', render: (t, c) => <CelulaTitulo item={t} {...c} truncar /> },
      {
        chave: 'tipo', rotulo: 'Tipo', ordenar: 'tipo',
        render: (t) => (t.tipo ? <Selo cor={t.tipo === 'Tese' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'}>{t.tipo}</Selo> : '—'),
      },
      { chave: 'autor', rotulo: 'Autor (Aluno)', ordenar: 'autor', render: (t) => <Pessoa p={t.autor} /> },
      { chave: 'ano', rotulo: 'Ano / Data', ordenar: 'ano', render: (t) => dataCurta(t.ano, '-') },
      { chave: 'arquivo', rotulo: 'Arquivo', render: (t) => <LinkArquivo url={t.arquivoUrl} rotulo="PDF" /> },
    ]}
  />
);

export default AdminTesesList;
