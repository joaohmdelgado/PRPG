import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit2, FileText, Plus, Trash2 } from 'lucide-react';
import { API_URL, apiFetch } from '../../api';
import { isProgramaGestor } from '../../auth';
import { LastEdited } from '../AuditInfo';
import useUsers from '../../hooks/useUsers';
import useListaServidor from '../../hooks/useListaServidor';
import { useConfirm } from './ConfirmModal';
import { useToast } from './Toast';
import { useBulkSelection, BulkActionBar, bulkDelete } from './BulkActions';
import { useProgramasResumo, SeloPrograma } from './OrigemFiltro';
import DataTable from './DataTable';

// Lista de conteúdo do painel (Fase U.3): a configuração de uma tela cabe em
// ~30 linhas — endpoint, colunas e textos — e ganha, sem código próprio,
// busca, ordenação, situação, filtro de origem/programa, paginação no servidor
// (tudo na URL), seleção em massa, exclusão com confirmação, estados de
// carregando/vazio/erro e ações com nome acessível.

const SELO_STATUS = {
  RASCUNHO: 'bg-gray-200 text-gray-800',
  ARQUIVADO: 'bg-amber-100 text-amber-900',
};
const ROTULO_STATUS = { RASCUNHO: 'Rascunho', ARQUIVADO: 'Arquivado' };

// Primeira coluna padrão: título + selo do programa + situação (quando não
// publicado) + "última edição por".
export function CelulaTitulo({ item, titulo = item.title, programas, users, gestor, truncar = false }) {
  return (
    <div className={truncar ? 'max-w-xs md:max-w-md' : ''}>
      <span className={`font-medium text-gray-900 ${truncar ? 'block truncate' : ''}`} title={truncar ? titulo : undefined}>{titulo}</span>
      {!gestor && programas && <SeloPrograma programaId={item.programaId} programas={programas} />}
      {SELO_STATUS[item.status] && (
        <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold align-middle ${SELO_STATUS[item.status]}`}>
          {ROTULO_STATUS[item.status]}
        </span>
      )}
      <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
    </div>
  );
}

export const Selo = ({ children, cor = 'bg-ufrpe-blue/10 text-ufrpe-blue' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cor}`}>{children}</span>
);

export const Pessoa = ({ p }) => (p?.nome ? (
  <div>
    <p className="font-medium text-gray-900">{p.nome}</p>
    {p.email && <p className="text-xs text-gray-500">{p.email}</p>}
  </div>
) : '—');

export const LinkArquivo = ({ url, rotulo }) => (url ? (
  <a href={url.startsWith('http') ? url : `${API_URL}${url}`} target="_blank" rel="noopener noreferrer"
    className="text-red-700 hover:underline inline-flex items-center gap-1.5 font-medium">
    <FileText size={16} aria-hidden="true" /> {rotulo}<span className="sr-only"> (abre em nova aba)</span>
  </a>
) : <span className="text-gray-500 italic">Sem arquivo</span>);

const botaoAcao = 'p-1.5 rounded transition-colors';

// `colunas`: como em DataTable, mas o `render` recebe (item, { programas, users, gestor }).
export default function ListaAdmin({
  titulo, rotuloNovo, rotaNovo, endpoint, rotaEditar, singular, plural, artigo = 'o',
  colunas, origemPadrao, filtros = [], filtrosUi, filtroStatus = true, filtroOrigem = true,
  rotuloBusca, vazio, selecionavel, podeExcluir, fixos, ordenarPadrao, acoesExtras, nomeItem,
}) {
  const navigate = useNavigate();
  const gestor = isProgramaGestor();
  const users = useUsers();
  const programas = useProgramasResumo(filtroOrigem);
  const { confirm, ConfirmModal } = useConfirm();
  const { toast, Toasts } = useToast();
  const [excluindo, setExcluindo] = useState(false);

  const lista = useListaServidor(endpoint, { origemPadrao, filtros, gestor: gestor || !filtroOrigem, ordenarPadrao, fixos });
  const linhas = selecionavel ? lista.items.filter(selecionavel) : lista.items;
  const bulk = useBulkSelection(linhas);
  const ctx = { programas, users, gestor };

  const doArtigo = artigo === 'a' ? 'esta' : 'este';
  const excluir = async (item) => {
    if (!await confirm(`Tem certeza que deseja excluir ${doArtigo} ${singular}?`)) return;
    try {
      const res = await apiFetch(`${endpoint}/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      if (res.ok) { toast.success(`${singular[0].toUpperCase()}${singular.slice(1)} excluíd${artigo}.`); bulk.clear(); lista.recarregar(); }
      else if (res.status === 401) navigate('/admin/login');
      else toast.error((await res.json().catch(() => ({}))).message || `Não foi possível excluir ${artigo} ${singular}.`);
    } catch {
      toast.error('Sem conexão com o servidor. Tente de novo.');
    }
  };

  const excluirLote = async () => {
    if (!bulk.selectedCount) return;
    const n = bulk.selectedCount;
    if (!await confirm(`Excluir ${n === 1 ? `${artigo} ${singular} selecionad${artigo}` : `${artigo}s ${n} ${plural} selecionad${artigo}s`}? Esta ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    const { succeeded, failed } = await bulkDelete(endpoint, bulk.selectedIds, { onUnauthorized: () => navigate('/admin/login') });
    setExcluindo(false);
    bulk.clear();
    if (failed) toast.error(`${failed} de ${n} não puderam ser excluídos.`);
    else toast.success(`${succeeded} ${succeeded === 1 ? singular : plural} excluíd${artigo}${succeeded === 1 ? '' : 's'}.`);
    lista.recarregar();
  };

  const nome = nomeItem || ((i) => i.title || i.id);
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="font-heading text-xl font-semibold text-ufrpe-blue">{titulo}</h2>
        <Link to={rotaNovo}
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
          <Plus size={18} aria-hidden="true" />
          {rotuloNovo}
        </Link>
      </div>

      <BulkActionBar count={bulk.selectedCount} onDelete={excluirLote} onClear={bulk.clear} deleting={excluindo} />

      <DataTable
        lista={lista}
        legenda={titulo}
        gestor={gestor || !filtroOrigem}
        programas={filtroOrigem ? programas : null}
        filtroStatus={filtroStatus}
        filtros={filtrosUi ? filtrosUi(lista) : null}
        rotuloBusca={rotuloBusca || `Buscar ${plural}…`}
        vazio={{ titulo: `Nenhum${artigo === 'a' ? 'a' : ''} ${singular} ainda.`, descricao: `Use “${rotuloNovo}” para criar ${artigo === 'a' ? 'a primeira' : 'o primeiro'}.`, ...vazio }}
        rotuloItem={nome}
        selecao={{ ...bulk, selecionavel }}
        colunas={colunas.map((c) => ({ ...c, render: (item) => c.render(item, ctx) }))}
        acoes={(item) => (
          <>
            {acoesExtras?.(item)}
            <Link to={rotaEditar(item)} aria-label={`Editar ${nome(item)}`} title="Editar"
              className={`${botaoAcao} text-ufrpe-blue hover:bg-ufrpe-blue/10`}>
              <Edit2 size={16} aria-hidden="true" />
            </Link>
            {podeExcluir && !podeExcluir(item) ? (
              <span className={`${botaoAcao} text-gray-300 cursor-not-allowed`} title="Este item não pode ser excluído" role="img" aria-label={`Excluir ${nome(item)} (indisponível)`}>
                <Trash2 size={16} aria-hidden="true" />
              </span>
            ) : (
              <button type="button" onClick={() => excluir(item)} aria-label={`Excluir ${nome(item)}`} title="Excluir"
                className={`${botaoAcao} text-red-700 hover:bg-red-50`}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
          </>
        )}
      />
      {ConfirmModal}
      {Toasts}
    </div>
  );
}
