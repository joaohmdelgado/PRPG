import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Edit2, ExternalLink, Clock, UserPlus, MessageSquarePlus,
  FileCheck2, Building2, ClipboardList,
} from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../../components/admin/Toast';
import { statusLabel, statusClasses, fmtData, TIPO_EVENTO_LABELS } from '../../constants/camara';

const Field = ({ label, children }) => (
  <div>
    <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
    <dd className="text-sm text-gray-800 mt-0.5">{children ?? '—'}</dd>
  </div>
);

const AdminCamaraProcesso = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, Toasts } = useToast();

  const [processo, setProcesso] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [localForm, setLocalForm] = useState({ unidadeId: '', descricao: '' });
  const [relatorForm, setRelatorForm] = useState({ relatorNome: '', prazoDevolucao: '' });
  const [notaForm, setNotaForm] = useState({ tipo: 'NOTA', descricao: '' });
  const [showLocalForm, setShowLocalForm] = useState(false);
  const [showRelatorForm, setShowRelatorForm] = useState(false);
  const [showNotaForm, setShowNotaForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchProcesso = useCallback(async () => {
    const res = await apiFetch(`/api/camara/processos/${id}`);
    if (res.status === 401 || res.status === 403) return navigate('/admin/login');
    if (res.ok) setProcesso(await res.json());
    else setError('Processo não encontrado.');
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    fetchProcesso();
    apiFetch('/api/camara/unidades').then((r) => r.ok && r.json()).then((d) => d && setUnidades(d));
  }, [fetchProcesso]);

  const relatoriaAtiva = processo?.relatorias?.find((r) => r.ativa);

  const submitLocalizacao = async (e) => {
    e.preventDefault();
    if (!localForm.unidadeId) return;
    setBusy(true);
    const res = await apiFetch(`/api/camara/processos/${id}/localizacao`, { method: 'PATCH', json: localForm });
    setBusy(false);
    if (res.ok) { toast.success('Localização atualizada.'); setShowLocalForm(false); setLocalForm({ unidadeId: '', descricao: '' }); fetchProcesso(); }
    else toast.error('Erro ao atualizar localização.');
  };

  const submitRelator = async (e) => {
    e.preventDefault();
    if (!relatorForm.relatorNome.trim()) return;
    setBusy(true);
    const res = await apiFetch(`/api/camara/processos/${id}/relatorias`, { method: 'POST', json: relatorForm });
    setBusy(false);
    if (res.ok) { toast.success('Relator designado.'); setShowRelatorForm(false); setRelatorForm({ relatorNome: '', prazoDevolucao: '' }); fetchProcesso(); }
    else toast.error('Erro ao designar relator.');
  };

  const submitDevolucao = async (e) => {
    e.preventDefault();
    const form = e.target;
    const resultadoParecer = form.resultadoParecer.value;
    setBusy(true);
    const res = await apiFetch(`/api/camara/relatorias/${relatoriaAtiva.id}`, { method: 'PUT', json: { resultadoParecer } });
    setBusy(false);
    if (res.ok) { toast.success('Devolução registrada.'); fetchProcesso(); }
    else toast.error('Erro ao registrar devolução.');
  };

  const submitNota = async (e) => {
    e.preventDefault();
    if (!notaForm.descricao.trim()) return;
    setBusy(true);
    const res = await apiFetch(`/api/camara/processos/${id}/eventos`, { method: 'POST', json: notaForm });
    setBusy(false);
    if (res.ok) { toast.success('Anotação registrada.'); setShowNotaForm(false); setNotaForm({ tipo: 'NOTA', descricao: '' }); fetchProcesso(); }
    else toast.error('Erro ao registrar anotação.');
  };

  if (loading) return <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse h-96" />;
  if (error || !processo) return <div className="bg-red-50 text-red-600 p-4 rounded-md">{error || 'Processo não encontrado.'}</div>;

  const eventosOrdenados = [...(processo.eventos || [])].sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.criado_em || '').localeCompare(a.criado_em || ''));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/camara" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h2 className="font-heading text-xl font-semibold text-ufrpe-blue font-mono">{processo.numero}</h2>
          <p className="text-sm text-gray-500 line-clamp-1">{processo.assunto}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClasses(processo.status)}`}>
          {statusLabel(processo.status)}
        </span>
        {processo.linkSipac && (
          <a href={processo.linkSipac} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-ufrpe-blue hover:underline">
            <ExternalLink size={14} /> SIPAC
          </a>
        )}
        <Link to={`/admin/camara/editar/${processo.id}`} className="text-ufrpe-blue hover:text-ufrpe-yellow">
          <Edit2 size={20} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna larga: assunto + linha do tempo */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-heading text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Dados</h3>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Responsável">{processo.unidadeResponsavelId ? unidades.find((u) => u.id === processo.unidadeResponsavelId)?.sigla : '—'}</Field>
              <Field label="Localização atual">{unidades.find((u) => u.id === processo.localizacaoId)?.sigla}{processo.localizacaoEm && <span className="text-gray-400"> · {fmtData(processo.localizacaoEm)}</span>}</Field>
              <Field label="Relator atual">{relatoriaAtiva?.relator_nome}{relatoriaAtiva?.prazo_devolucao && <span className="text-gray-400"> · prazo {fmtData(relatoriaAtiva.prazo_devolucao)}</span>}</Field>
              <Field label="Tipo de matéria">{processo.tipoMateria}</Field>
              <Field label="Interessado">{processo.interessado}</Field>
              <Field label="Data de entrada">{fmtData(processo.dataEntrada)}</Field>
            </dl>
            {processo.observacoes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Observações</dt>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{processo.observacoes}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-heading text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Linha do tempo</h3>
            <ul className="space-y-4">
              {eventosOrdenados.map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-ufrpe-blue mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{ev.descricao || TIPO_EVENTO_LABELS[ev.tipo] || ev.tipo}</p>
                    <p className="text-xs text-gray-400">{fmtData(ev.data)} · {TIPO_EVENTO_LABELS[ev.tipo] || ev.tipo}</p>
                  </div>
                </li>
              ))}
              {eventosOrdenados.length === 0 && <li className="text-sm text-gray-400 italic">Nenhum evento registrado ainda.</li>}
            </ul>
          </div>
        </div>

        {/* Lateral: ações rápidas */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
            <button onClick={() => setShowLocalForm((v) => !v)}
              className="w-full inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md">
              <Building2 size={16} /> Mudar localização
            </button>
            {showLocalForm && (
              <form onSubmit={submitLocalizacao} className="space-y-2 pt-1">
                <select value={localForm.unidadeId} onChange={(e) => setLocalForm((p) => ({ ...p, unidadeId: e.target.value }))} required
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white">
                  <option value="">Selecione o setor...</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.sigla}</option>)}
                </select>
                <input value={localForm.descricao} onChange={(e) => setLocalForm((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Observação (opcional)" className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
                <button type="submit" disabled={busy} className="w-full bg-ufrpe-blue text-white text-sm py-1.5 rounded-md disabled:opacity-50">Salvar</button>
              </form>
            )}

            <button onClick={() => setShowRelatorForm((v) => !v)}
              className="w-full inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md">
              <UserPlus size={16} /> Designar relator
            </button>
            {showRelatorForm && (
              <form onSubmit={submitRelator} className="space-y-2 pt-1">
                <input value={relatorForm.relatorNome} onChange={(e) => setRelatorForm((p) => ({ ...p, relatorNome: e.target.value }))}
                  placeholder="Nome do relator" required className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
                <input type="date" value={relatorForm.prazoDevolucao} onChange={(e) => setRelatorForm((p) => ({ ...p, prazoDevolucao: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white" />
                <button type="submit" disabled={busy} className="w-full bg-ufrpe-blue text-white text-sm py-1.5 rounded-md disabled:opacity-50">Salvar</button>
              </form>
            )}

            {relatoriaAtiva && !relatoriaAtiva.data_devolucao && (
              <form onSubmit={submitDevolucao} className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-xs text-gray-500 flex items-center gap-1"><FileCheck2 size={14} /> Registrar devolução do parecer</p>
                <select name="resultadoParecer" required className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white">
                  <option value="">Resultado do parecer...</option>
                  <option value="FAVORAVEL">Favorável</option>
                  <option value="FAVORAVEL_RESSALVAS">Favorável com ressalvas</option>
                  <option value="DESFAVORAVEL">Desfavorável</option>
                  <option value="DILIGENCIA">Pela diligência</option>
                  <option value="ENCAMINHAMENTO">Pelo encaminhamento a instância superior</option>
                </select>
                <button type="submit" disabled={busy} className="w-full bg-ufrpe-blue text-white text-sm py-1.5 rounded-md disabled:opacity-50">Registrar</button>
              </form>
            )}

            <button onClick={() => setShowNotaForm((v) => !v)}
              className="w-full inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md">
              <MessageSquarePlus size={16} /> Anotar
            </button>
            {showNotaForm && (
              <form onSubmit={submitNota} className="space-y-2 pt-1">
                <select value={notaForm.tipo} onChange={(e) => setNotaForm((p) => ({ ...p, tipo: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white">
                  <option value="NOTA">Nota</option>
                  <option value="COBRANCA">Cobrança</option>
                </select>
                <textarea value={notaForm.descricao} onChange={(e) => setNotaForm((p) => ({ ...p, descricao: e.target.value }))}
                  rows={2} required className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
                <button type="submit" disabled={busy} className="w-full bg-ufrpe-blue text-white text-sm py-1.5 rounded-md disabled:opacity-50">Salvar</button>
              </form>
            )}
          </div>

          {processo.pautas?.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <ClipboardList size={14} /> Histórico de pautas
              </h4>
              <ul className="space-y-1.5">
                {processo.pautas.map((p) => (
                  <li key={p.id} className="text-sm">
                    <Link to={`/admin/camara/reunioes/${p.reuniao_id}`} className="text-ufrpe-blue hover:underline">
                      {fmtData(p.reuniao_data)}
                    </Link>
                    {p.deliberacao && <span className="text-gray-400"> — {p.deliberacao}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {processo.relatorias?.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Clock size={14} /> Histórico de relatorias
              </h4>
              <ul className="space-y-1.5">
                {processo.relatorias.map((r) => (
                  <li key={r.id} className="text-sm text-gray-700">
                    {r.relator_nome} {!r.ativa && <span className="text-gray-400">(substituído)</span>}
                    {r.data_devolucao && <span className="text-gray-400"> · devolvido {fmtData(r.data_devolucao)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      {Toasts}
    </div>
  );
};

export default AdminCamaraProcesso;
