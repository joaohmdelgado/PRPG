import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, Plus, X, Save, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../../components/admin/Toast';
import { statusLabel, statusClasses, fmtData, DELIBERACAO_OPTIONS, DELIBERACAO_LABELS, STATUS_OPTIONS } from '../../constants/camara';

const AdminCamaraReuniao = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, Toasts } = useToast();

  const [reuniao, setReuniao] = useState(null);
  const [itens, setItens] = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCandidatos, setShowCandidatos] = useState(false);
  const [resultados, setResultados] = useState({}); // itemId -> { deliberacao, registro, statusResultante }
  const [saving, setSaving] = useState(false);

  const fetchTudo = useCallback(async () => {
    const [rRes, iRes, pRes] = await Promise.all([
      apiFetch(`/api/camara/reunioes/${id}`),
      apiFetch(`/api/camara/reunioes/${id}/pauta`),
      apiFetch('/api/camara/processos'),
    ]);
    if (rRes.status === 401 || rRes.status === 403) return navigate('/admin/login');
    if (rRes.ok) setReuniao(await rRes.json()); else return setLoading(false);
    if (iRes.ok) setItens(await iRes.json());
    if (pRes.ok) setCandidatos(await pRes.json());
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchTudo(); }, [fetchTudo]);

  const pautadosIds = useMemo(() => new Set(itens.map((i) => i.processo_id)), [itens]);
  const naoResolvidos = useMemo(
    () => candidatos.filter((p) => !['RESOLVIDO', 'ARQUIVADO', 'PUBLICADO'].includes(p.status) && !pautadosIds.has(p.id)),
    [candidatos, pautadosIds]
  );

  const addProcesso = async (processoId) => {
    const res = await apiFetch(`/api/camara/reunioes/${id}/pauta`, { method: 'POST', json: { processoIds: [processoId] } });
    if (res.ok) fetchTudo(); else toast.error('Erro ao pautar processo.');
  };

  const removeItem = async (itemId) => {
    const res = await apiFetch(`/api/camara/reunioes/${id}/pauta/${itemId}`, { method: 'DELETE' });
    if (res.ok) fetchTudo(); else toast.error('Erro ao remover da pauta.');
  };

  const updateResultado = (itemId, patch) => {
    setResultados((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  };

  const salvarResultados = async () => {
    const payload = itens
      .filter((it) => resultados[it.id]?.deliberacao)
      .map((it) => ({ id: it.id, ...resultados[it.id] }));
    if (!payload.length) return toast.error('Registre ao menos uma deliberação antes de salvar.');
    setSaving(true);
    const res = await apiFetch(`/api/camara/reunioes/${id}/resultados`, { method: 'PUT', json: { itens: payload } });
    setSaving(false);
    if (res.ok) { toast.success('Reunião registrada como realizada.'); fetchTudo(); }
    else toast.error('Erro ao salvar resultados.');
  };

  const abrirPdf = async () => {
    const res = await apiFetch(`/api/camara/reunioes/${id}/pauta.pdf`);
    if (!res.ok) return toast.error('Erro ao gerar PDF.');
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank');
  };

  if (loading) return <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse h-96" />;
  if (!reuniao) return <div className="bg-red-50 text-red-600 p-4 rounded-md">Reunião não encontrada.</div>;

  const jaRealizada = reuniao.status === 'REALIZADA';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/camara/reunioes" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h2 className="font-heading text-xl font-semibold text-ufrpe-blue">
            Reunião de {fmtData(reuniao.data)}{reuniao.numero ? ` — ${reuniao.numero}` : ''}
          </h2>
          <p className="text-sm text-gray-500">{itens.length} processo(s) na pauta · status {reuniao.status}</p>
        </div>
        <button onClick={abrirPdf} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-ufrpe-blue border border-ufrpe-blue/30 rounded-md hover:bg-ufrpe-blue/5">
          <FileDown size={16} /> Pauta em PDF
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading text-sm font-semibold text-gray-500 uppercase tracking-wide">Pauta</h3>
          {!jaRealizada && (
            <button onClick={() => setShowCandidatos((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ufrpe-blue hover:underline">
              <Plus size={16} /> Adicionar processo
            </button>
          )}
        </div>

        {showCandidatos && (
          <div className="mb-4 border border-gray-200 rounded-md max-h-56 overflow-auto divide-y divide-gray-100">
            {naoResolvidos.map((p) => (
              <button key={p.id} onClick={() => addProcesso(p.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center gap-2">
                <span><span className="font-mono text-xs text-gray-500">{p.numero}</span> — {p.assunto}</span>
                <Plus size={14} className="text-ufrpe-blue shrink-0" />
              </button>
            ))}
            {naoResolvidos.length === 0 && <p className="px-3 py-3 text-sm text-gray-400">Nenhum processo pendente disponível para pautar.</p>}
          </div>
        )}

        <div className="space-y-3">
          {itens.map((it, i) => (
            <div key={it.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{i + 1}. <span className="font-mono text-xs text-gray-500">{it.numero}</span></p>
                  <p className="text-sm text-gray-600">{it.assunto}</p>
                  {it.deliberacao && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusClasses(it.deliberacao)}`}>
                      {DELIBERACAO_LABELS[it.deliberacao] || it.deliberacao}
                    </span>
                  )}
                </div>
                {!jaRealizada && (
                  <button onClick={() => removeItem(it.id)} className="text-gray-400 hover:text-red-600 shrink-0" title="Retirar da pauta">
                    <X size={16} />
                  </button>
                )}
              </div>

              {!jaRealizada && !it.deliberacao && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                  <select
                    value={resultados[it.id]?.deliberacao || ''}
                    onChange={(e) => updateResultado(it.id, { deliberacao: e.target.value })}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="">Deliberação...</option>
                    {DELIBERACAO_OPTIONS.map((d) => <option key={d} value={d}>{DELIBERACAO_LABELS[d]}</option>)}
                  </select>
                  <select
                    value={resultados[it.id]?.statusResultante || ''}
                    onChange={(e) => updateResultado(it.id, { statusResultante: e.target.value })}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="">Status resultante (opcional)...</option>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                  <input
                    value={resultados[it.id]?.registro || ''}
                    onChange={(e) => updateResultado(it.id, { registro: e.target.value })}
                    placeholder="Síntese para a ata (opcional)"
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}
            </div>
          ))}
          {itens.length === 0 && <p className="text-sm text-gray-400 italic py-6 text-center">Nenhum processo pautado ainda.</p>}
        </div>

        {!jaRealizada && itens.length > 0 && (
          <div className="flex justify-end pt-4 mt-4 border-t border-gray-200">
            <button onClick={salvarResultados} disabled={saving}
              className="inline-flex items-center gap-2 bg-ufrpe-blue text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar reunião'}
            </button>
          </div>
        )}
        {jaRealizada && (
          <p className="mt-4 pt-4 border-t border-gray-200 text-sm text-green-700 flex items-center gap-1.5">
            <CheckCircle2 size={16} /> Reunião já registrada como realizada.
          </p>
        )}
      </div>
      {Toasts}
    </div>
  );
};

export default AdminCamaraReuniao;
