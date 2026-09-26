import React from 'react';
import { Calendar } from 'lucide-react';
import ListaAdmin, { CelulaTitulo, Selo, Pessoa } from '../../components/admin/ListaAdmin';
import { periodo } from '../../utils/datas';

// Bolsas são da PRPG (sem programa): sem filtro de origem.
const AdminBolsasList = () => (
  <ListaAdmin
    titulo="Gerenciar Bolsas" rotuloNovo="Nova Bolsa" rotaNovo="/admin/bolsas/nova"
    endpoint="/api/bolsas" rotaEditar={(b) => `/admin/bolsas/editar/${b.id}`}
    singular="registro de bolsa" plural="registros de bolsa" artigo="o" filtroOrigem={false}
    rotuloBusca="Buscar por título, tipo ou beneficiário…"
    vazio={{ titulo: 'Nenhum registro de bolsa ainda.', descricao: 'Use “Nova Bolsa” para cadastrar o primeiro.' }}
    colunas={[
      { chave: 'title', rotulo: 'Título', ordenar: 'title', render: (b, c) => <CelulaTitulo item={b} {...c} truncar /> },
      { chave: 'tipo', rotulo: 'Tipo de Bolsa', ordenar: 'tipo', render: (b) => <Selo cor="bg-purple-100 text-purple-800">{b.tipoBolsa || 'Não especificado'}</Selo> },
      { chave: 'aluno', rotulo: 'Beneficiário (Aluno)', ordenar: 'aluno', render: (b) => <Pessoa p={b.aluno} /> },
      {
        chave: 'vigencia', rotulo: 'Período de Vigência', ordenar: 'dataInicio',
        render: (b) => (
          <span className="inline-flex items-center gap-1.5 text-gray-700 font-medium">
            <Calendar size={14} className="text-gray-400" aria-hidden="true" />
            {periodo(b.dataInicio, b.dataFim, '-')}
          </span>
        ),
      },
    ]}
  />
);

export default AdminBolsasList;
