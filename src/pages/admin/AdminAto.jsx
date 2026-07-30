import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Pencil, Link2, Trash2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { FormSkeleton } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmModal';
import { situacaoInfo, SITUACOES, TIPOS_REFERENCIA } from '../../constants/atos';

const fmtData = (iso) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
};
const fmtDataHora = (iso) => iso ? new Date(iso).toLocaleString('pt-BR') : '—';

// Fase E.8 (PLANO.md): ficha do ato — referências nos dois sentidos (a
// "referenciado por" é derivada, ninguém digita) e linha do tempo. Ver
// requisitos-expedientes.md §9.2.
export default function AdminAto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, Toasts } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [ato, setAto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [novaRef, setNovaRef] = useState({ tipo: 'REVOGA', alvo: '' });

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch(`/api/atos/${id}`);
    if (res.ok) setAto(await res.json());
    else toast.error('Erro ao carregar o ato.');
    setLoading(false);
  }, [id, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const mudarSituacao = async (situacao) => {
    const motivo = ['CANCELADO', 'SEM_EFEITO'].includes(situacao)
      ? window.prompt(`Motivo para marcar como ${situacaoInfo(situacao).label}:`)
      : null;
    if (['CANCELADO', 'SEM_EFEITO'].includes(situacao) && !motivo?.trim()) return;
    const res = await apiFetch(`/api/atos/${id}/situacao`, { method: 'PATCH', json: { situacao, motivo } });
    if (res.ok) { toast.success('Situação atualizada.'); carregar(); }
    else toast.error('Erro ao atualizar situação.');
  };

  const adicionarReferencia = async () => {
    if (!novaRef.alvo.trim()) return toast.error('Informe o ato referenciado (texto livre por enquanto).');
    const res = await apiFetch(`/api/atos/${id}/referencias`, {
      method: 'POST', json: { tipo: novaRef.tipo, atoRefTexto: novaRef.alvo.trim() },
    });
    if (res.ok) { toast.success('Referência adicionada.'); setNovaRef({ tipo: 'REVOGA', alvo: '' }); carregar(); }
    else toast.error('Erro ao adicionar referência.');
  };

  const removerReferencia = async (refId) => {
    if (!await confirm('Remover esta referência?')) return;
    const res = await apiFetch(`/api/atos/referencias/${refId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Referência removida.'); carregar(); }
    else toast.error('Erro ao remover referência.');
  };

  const excluir = async () => {
    if (!await confirm('Excluir esta reserva? Só é possível para atos ainda não emitidos.')) return;
    const res = await apiFetch(`/api/atos/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Reserva excluída.'); navigate('/admin/atos'); }
    else toast.error((await res.json())?.message || 'Erro ao excluir.');
  };

  const exportarDiplomasXlsx = async () => {
    const res = await apiFetch(`/api/atos/${id}/diplomas.xlsx`);
    if (!res.ok) return toast.error('Erro ao exportar.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `diplomas-${ato.numeroExibicao.replace(/[^\w-]+/g, '_')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <FormSkeleton fields={6} />;
  if (!ato) return null;
  const info = situacaoInfo(ato.situacao);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-3xl">
      {Toasts}{ConfirmModal}
      <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900 font-mono">{ato.numeroExibicao}</h1>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
          <span className="text-sm text-gray-500 ml-2">{fmtData(ato.data)}</span>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/atos/${id}/editar`} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
            <Pencil size={14} /> Editar
          </Link>
          {ato.arquivoId && (
            <a href={`/uploads/${ato.arquivoId}`} target="_blank" rel="noreferrer" className="text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
              Baixar PDF
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
        <div>
          <h2 className="font-semibold text-gray-700 mb-2">Partes</h2>
          <dl className="space-y-1 text-gray-600">
            <div><dt className="inline text-gray-400">Solicitante: </dt><dd className="inline">{ato.solicitanteNome || '—'}</dd></div>
            <div><dt className="inline text-gray-400">Origem: </dt><dd className="inline">{ato.unidadeOrigemNome || '—'}</dd></div>
            <div><dt className="inline text-gray-400">Destinatário: </dt><dd className="inline">{ato.destinatarioUnidadeNome || ato.destinatarioTexto || '—'}</dd></div>
            <div><dt className="inline text-gray-400">Interessado: </dt><dd className="inline">{ato.interessadoNome || '—'}</dd></div>
          </dl>
        </div>
        <div>
          <h2 className="font-semibold text-gray-700 mb-2">Vínculos</h2>
          <dl className="space-y-1 text-gray-600">
            <div><dt className="inline text-gray-400">Processo: </dt><dd className="inline">{ato.processoId ? <Link to={`/admin/camara/${ato.processoId}`} className="text-ufrpe-blue hover:underline">{ato.processoNumero}</Link> : '—'}</dd></div>
            <div><dt className="inline text-gray-400">Programa: </dt><dd className="inline">{ato.programaSigla || '—'}</dd></div>
          </dl>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold text-gray-700 mb-1">Assunto</h2>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{ato.assunto}</p>
        {ato.ementa && <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap"><em>{ato.ementa}</em></p>}
      </div>

      {(ato.diplomas || []).length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-700">Concluintes (expedição em lote)</h2>
            <button onClick={exportarDiplomasXlsx} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
              Exportar XLSX
            </button>
          </div>
          <ul className="text-sm text-gray-600 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {ato.diplomas.map((d) => (
              <li key={d.id} className="flex justify-between px-3 py-1.5">
                <span>{d.nomeConcluinte}</span>
                <span className="text-gray-400">{d.livro || '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <span className="text-xs text-gray-400 self-center mr-1">Mudar situação:</span>
        {SITUACOES.filter((s) => s.value !== ato.situacao).map((s) => (
          <button key={s.value} onClick={() => mudarSituacao(s.value)} className={`text-xs px-2 py-1 rounded-full border border-gray-200 hover:bg-gray-50 ${s.color}`}>
            {s.label}
          </button>
        ))}
        {ato.situacao === 'RESERVADO' && (
          <button onClick={excluir} className="text-xs px-2 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1">
            <Trash2 size={12} /> Excluir reserva
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Link2 size={14} /> Este documento referencia</h2>
          <ul className="space-y-1 text-sm">
            {(ato.referencias || []).length === 0 && <li className="text-gray-400 italic">nenhuma</li>}
            {(ato.referencias || []).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span>{TIPOS_REFERENCIA.find((t) => t.value === r.tipo)?.label || r.tipo}: {r.ato_ref_id ? `${r.ato_ref_serie_sigla || ''} nº ${r.ato_ref_sequencial}/${r.ato_ref_ano}` : r.ato_ref_texto}</span>
                <button onClick={() => removerReferencia(r.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
          <div className="flex gap-1.5 mt-2">
            <select value={novaRef.tipo} onChange={(e) => setNovaRef((n) => ({ ...n, tipo: e.target.value }))} className="text-xs border border-gray-200 rounded px-1.5 py-1">
              {TIPOS_REFERENCIA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={novaRef.alvo} onChange={(e) => setNovaRef((n) => ({ ...n, alvo: e.target.value }))} placeholder="ex: Portaria 44/2026" className="flex-1 text-xs border border-gray-200 rounded px-2 py-1" />
            <button onClick={adicionarReferencia} className="text-xs bg-ufrpe-blue text-white px-2 py-1 rounded">+</button>
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-gray-700 mb-2">É referenciado por</h2>
          <ul className="space-y-1 text-sm">
            {(ato.referenciadoPor || []).length === 0 && <li className="text-gray-400 italic">nenhuma</li>}
            {(ato.referenciadoPor || []).map((r) => (
              <li key={r.id}>{TIPOS_REFERENCIA.find((t) => t.value === r.tipo)?.label || r.tipo} por {r.ato_serie_sigla} nº {r.ato_sequencial}/{r.ato_ano}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-700 mb-2">Linha do tempo</h2>
        <ul className="space-y-2 text-sm text-gray-600 border-l-2 border-gray-100 pl-4">
          {(ato.eventos || []).length === 0 && <li className="text-gray-400 italic">sem eventos</li>}
          {(ato.eventos || []).map((ev) => (
            <li key={ev.id}>
              <span className="text-gray-400 text-xs">{fmtDataHora(ev.criadoEm)}</span> — {ev.descricao || ev.tipo}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
