import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Pencil, FileText, CalendarPlus, CheckCircle2, Trash2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { FormSkeleton } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmModal';
import { situacaoInfo, SITUACOES_MANUAIS } from '../../constants/posDoutorado';

const fmtData = (iso, aprox) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return String(iso);
  return `${aprox ? '~' : ''}${m[3]}/${m[2]}/${m[1]}`;
};
const fmtDataHora = (iso) => iso ? new Date(iso).toLocaleString('pt-BR') : '—';

// Fase C.6 (PLANO.md): ficha com linha do tempo unificada (eventos do
// estágio + eventos do processo vinculado) — ver requisitos-pnpd.md §10.3.
export default function AdminPosDoutoradoFicha() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, Toasts } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [pd, setPd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nup, setNup] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch(`/api/pos-doutorado/${id}`);
    if (res.ok) setPd(await res.json());
    else toast.error('Erro ao carregar o registro.');
    setLoading(false);
  }, [id, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const mudarSituacaoManual = async (situacaoManual) => {
    const motivo = situacaoManual ? window.prompt(`Motivo (opcional):`) : null;
    const res = await apiFetch(`/api/pos-doutorado/${id}/situacao`, { method: 'PATCH', json: { situacaoManual, motivo } });
    if (res.ok) { toast.success('Situação atualizada.'); carregar(); }
    else toast.error('Erro ao atualizar situação.');
  };

  const registrarRelatorio = async () => {
    if (!await confirm('Registrar entrega do relatório final hoje?')) return;
    const res = await apiFetch(`/api/pos-doutorado/${id}/relatorio`, { method: 'POST', json: {} });
    if (res.ok) { toast.success('Relatório registrado.'); carregar(); }
    else toast.error('Erro ao registrar relatório.');
  };

  const prorrogar = async () => {
    const fimAtual = pd.dataFim || new Date().toISOString().slice(0, 10);
    const inicio = new Date(fimAtual);
    inicio.setDate(inicio.getDate() + 1);
    const fim = new Date(inicio);
    fim.setFullYear(fim.getFullYear() + 1);
    const dataInicio = window.prompt('Início do novo período (AAAA-MM-DD):', inicio.toISOString().slice(0, 10));
    if (!dataInicio) return;
    const dataFim = window.prompt('Fim do novo período (AAAA-MM-DD):', fim.toISOString().slice(0, 10));
    if (!dataFim) return;
    const res = await apiFetch(`/api/pos-doutorado/${id}/prorrogar`, { method: 'POST', json: { dataInicio, dataFim } });
    if (res.ok) {
      const novo = await res.json();
      toast.success('Estágio prorrogado.');
      navigate(`/admin/pos-doutorado/${novo.id}`);
    } else toast.error('Erro ao prorrogar.');
  };

  const emitirDeclaracao = () => {
    window.open(`/api/pos-doutorado/${id}/declaracao`, '_blank');
  };

  const vincularProcesso = async () => {
    if (!nup.trim()) return;
    const res = await apiFetch(`/api/pos-doutorado/${id}/processo`, { method: 'POST', json: { numero: nup.trim() } });
    if (res.ok) { toast.success('Processo vinculado.'); setNup(''); carregar(); }
    else toast.error('Erro ao vincular processo.');
  };

  const excluir = async () => {
    if (!await confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return;
    const res = await apiFetch(`/api/pos-doutorado/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Registro excluído.'); navigate('/admin/pos-doutorado'); }
    else toast.error('Erro ao excluir.');
  };

  if (loading) return <FormSkeleton fields={6} />;
  if (!pd) return null;
  const info = situacaoInfo(pd.situacao);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-3xl">
      {Toasts}{ConfirmModal}
      <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900">{pd.nome}</h1>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
          <span className="text-sm text-gray-500 ml-2">{fmtData(pd.dataInicio, pd.dataInicioAprox)} – {fmtData(pd.dataFim, pd.dataFimAprox)}</span>
          {pd.vencendo && <span className="text-xs text-amber-600 ml-2">faltam {pd.diasRestantes} dias</span>}
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/pos-doutorado/${id}/editar`} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
            <Pencil size={14} /> Editar
          </Link>
          <button onClick={emitirDeclaracao} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
            <FileText size={14} /> Declaração
          </button>
          <button onClick={prorrogar} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
            <CalendarPlus size={14} /> Prorrogar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
        <div>
          <h2 className="font-semibold text-gray-700 mb-2">Pessoa</h2>
          <dl className="space-y-1 text-gray-600">
            <div><dt className="inline text-gray-400">CPF: </dt><dd className="inline">{pd.cpf || '—'}</dd></div>
            <div><dt className="inline text-gray-400">E-mail: </dt><dd className="inline">{pd.email || '—'}</dd></div>
            <div><dt className="inline text-gray-400">Telefone: </dt><dd className="inline">{pd.telefone || '—'}</dd></div>
            <div><dt className="inline text-gray-400">Lattes/ORCID: </dt><dd className="inline">{pd.lattesUrl || pd.orcid || '—'}</dd></div>
          </dl>
        </div>
        <div>
          <h2 className="font-semibold text-gray-700 mb-2">Estágio</h2>
          <dl className="space-y-1 text-gray-600">
            <div><dt className="inline text-gray-400">Supervisor: </dt><dd className="inline">{pd.supervisorNome || '—'}</dd></div>
            <div><dt className="inline text-gray-400">Cossupervisor: </dt><dd className="inline">{pd.cossupervisorNome || '—'}</dd></div>
            <div><dt className="inline text-gray-400">Programa: </dt><dd className="inline">{pd.programaNome || '—'}</dd></div>
            <div><dt className="inline text-gray-400">Modalidade: </dt><dd className="inline">{pd.modalidade}</dd></div>
            {pd.renovacaoDeId && (
              <div><dt className="inline text-gray-400">Renovação de: </dt>
                <dd className="inline"><Link to={`/admin/pos-doutorado/${pd.renovacaoDeId}`} className="text-ufrpe-blue hover:underline">estágio anterior</Link></dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold text-gray-700 mb-1">Projeto</h2>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{pd.projetoTitulo}</p>
        {pd.projetoResumo && <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{pd.projetoResumo}</p>}
      </div>

      <div className="mb-6">
        <h2 className="font-semibold text-gray-700 mb-2">Processo</h2>
        {pd.processoId ? (
          <p className="text-sm">
            <Link to={`/admin/camara/${pd.processoId}`} className="text-ufrpe-blue hover:underline font-mono">{pd.processoNumero}</Link>
          </p>
        ) : (
          <div className="flex gap-2 max-w-sm">
            <input value={nup} onChange={(e) => setNup(e.target.value)} placeholder="23082.024509/2024-66" className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 font-mono" />
            <button onClick={vincularProcesso} className="text-sm bg-ufrpe-blue text-white px-3 py-1.5 rounded">Vincular</button>
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400 self-center mr-1">Situação manual:</span>
        {SITUACOES_MANUAIS.map((s) => (
          <button key={s} onClick={() => mudarSituacaoManual(s)} className="text-xs px-2 py-1 rounded-full border border-gray-200 hover:bg-gray-50">
            {situacaoInfo(s).label}
          </button>
        ))}
        {pd.situacaoManual && (
          <button onClick={() => mudarSituacaoManual(null)} className="text-xs px-2 py-1 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-500">
            voltar à derivação automática
          </button>
        )}
        {pd.relatorioPendente && (
          <button onClick={registrarRelatorio} className="text-xs px-2 py-1 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1">
            <CheckCircle2 size={12} /> Relatório entregue
          </button>
        )}
        <button onClick={excluir} className="text-xs px-2 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1 ml-auto">
          <Trash2 size={12} /> Excluir
        </button>
      </div>

      <div>
        <h2 className="font-semibold text-gray-700 mb-2">Linha do tempo</h2>
        <ul className="space-y-2 text-sm text-gray-600 border-l-2 border-gray-100 pl-4">
          {(pd.eventos || []).length === 0 && <li className="text-gray-400 italic">sem eventos</li>}
          {(pd.eventos || []).map((ev) => (
            <li key={ev.id}>
              <span className="text-gray-400 text-xs">{fmtDataHora(ev.criadoEm)}</span>{' '}
              <span className="text-[10px] uppercase text-gray-400 border border-gray-200 rounded px-1">{ev.origem === 'processo' ? 'processo' : 'estágio'}</span>
              {' — '}{ev.descricao || ev.tipo}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
