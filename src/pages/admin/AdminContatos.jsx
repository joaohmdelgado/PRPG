import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Download, Mail, Phone, Search, Plus, Trash2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmModal';

// Fase G.5 (PLANO.md): agenda de contatos, indexada por cargo — ver
// requisitos-contatos.md §6.1. Os cargos ainda usam os papéis hoje gravados
// em vinculos.papel (COORDENADOR_ATUAL/SUBSTITUTO/TAE); a consolidação para
// o vocabulário-alvo é migração de dado (D-G2, Fase G.4).
const CARGOS = [
  { key: '', label: 'Todos' },
  { key: 'COORDENADOR_ATUAL', label: 'Coordenadores' },
  { key: 'SUBSTITUTO', label: 'Vice/Substitutos' },
  { key: 'TAE', label: 'Secretários' },
];

const fmtData = (iso) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
};

export default function AdminContatos() {
  const [cargo, setCargo] = useState('');
  const [q, setQ] = useState('');
  const [linhas, setLinhas] = useState([]);
  const [contadores, setContadores] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandido, setExpandido] = useState(null);
  const navigate = useNavigate();
  const { toast, Toasts } = useToast();
  const { confirm, ConfirmModal } = useConfirm();

  const fetchAgenda = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cargo) params.set('papel', cargo);
      if (q.trim()) params.set('q', q.trim());
      const res = await apiFetch(`/api/contatos/agenda?${params.toString()}`);
      if (res.ok) {
        setLinhas(await res.json());
      } else if (res.status === 401 || res.status === 403) {
        navigate('/admin/login');
      } else {
        setError('Erro ao carregar a agenda de contatos.');
      }
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }, [cargo, q, navigate]);

  const fetchContadores = useCallback(async () => {
    const res = await apiFetch('/api/contatos/agenda/contadores');
    if (res.ok) setContadores(await res.json());
  }, []);

  useEffect(() => { fetchAgenda(); }, [fetchAgenda]);
  useEffect(() => { fetchContadores(); }, [fetchContadores]);

  const copiarEmails = () => {
    const emails = linhas
      .flatMap((l) => l.contatos.filter((c) => c.tipo === 'EMAIL').map((c) => c.valorExibicao || c.valor))
      .filter(Boolean);
    if (!emails.length) return toast.error('Nenhum e-mail cadastrado nesta lista.');
    navigator.clipboard.writeText(emails.join('; '));
    toast.success(`${emails.length} e-mail(s) copiado(s) para a área de transferência.`);
  };

  const exportarXlsx = async () => {
    const res = await apiFetch('/api/contatos/agenda/exportar.xlsx');
    if (!res.ok) return toast.error('Erro ao exportar.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'agenda-contatos.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const removerContato = async (id) => {
    if (!await confirm('Remover este contato?')) return;
    const res = await apiFetch(`/api/contatos/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Contato removido.'); fetchAgenda(); }
    else toast.error('Erro ao remover contato.');
  };

  const adicionarContato = async (pessoaId, tipo, valor) => {
    if (!valor?.trim()) return;
    const res = await apiFetch(`/api/contatos/pessoa/${pessoaId}`, {
      method: 'POST', json: { tipo, valor, publico: false },
    });
    if (res.ok) { fetchAgenda(); return true; }
    toast.error('Erro ao adicionar contato.');
    return false;
  };

  const semContato = useMemo(() => linhas.filter((l) => l.contatos.length === 0).length, [linhas]);

  if (loading && !linhas.length) return <TableSkeleton rows={8} cols={5} />;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      {Toasts}
      {ConfirmModal}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h1 className="font-heading text-xl font-bold text-gray-900">Agenda de Contatos</h1>
        <div className="flex gap-2">
          <button onClick={copiarEmails} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
            <Copy size={15} /> Copiar e-mails deste cargo
          </button>
          <button onClick={exportarXlsx} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
            <Download size={15} /> Exportar XLSX
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {CARGOS.map((c) => (
          <button
            key={c.key}
            onClick={() => setCargo(c.key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              cargo === c.key ? 'bg-ufrpe-blue text-white border-ufrpe-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {c.label} {c.key ? (contadores[c.key] ?? 0) : (contadores.TODOS ?? 0)}
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, programa, e-mail ou telefone..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ufrpe-blue/30"
        />
      </div>

      {semContato > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          {semContato} {semContato === 1 ? 'pessoa' : 'pessoas'} sem contato cadastrado.
        </p>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4 font-medium">Pessoa</th>
              <th className="py-2 pr-4 font-medium">Programa</th>
              <th className="py-2 pr-4 font-medium">Contatos</th>
              <th className="py-2 pr-4 font-medium">Desde</th>
              <th className="py-2 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {linhas.length === 0 && !loading && (
              <EmptyRow colSpan={5} icon={Search} message="Nenhum registro encontrado." hint="Ajuste os filtros ou o cargo selecionado." />
            )}
            {linhas.map((l) => (
              <React.Fragment key={l.vinculoId}>
                <tr className="align-top">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-900">{l.nome}</div>
                    <div className="text-xs text-gray-400">
                      {l.cargoLabel}{l.carater && l.carater !== 'EFETIVO' ? ` · ${l.carater === 'PRO_TEMPORE' ? 'Pro tempore' : l.carater}` : ''}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span title={l.programaNome || ''}>{l.programaSigla || '—'}</span>
                    {l.campus ? <span className="text-xs text-gray-400"> · {l.campus}</span> : null}
                  </td>
                  <td className="py-3 pr-4">
                    {l.contatos.length === 0 && <span className="text-gray-400 italic">sem contato</span>}
                    <ul className="space-y-1">
                      {l.contatos.map((c) => (
                        <li key={c.id} className="flex items-center gap-2">
                          {c.tipo === 'EMAIL'
                            ? <a href={`mailto:${c.valor}`} className="flex items-center gap-1 text-ufrpe-blue hover:underline"><Mail size={13} />{c.valorExibicao || c.valor}</a>
                            : <a href={`tel:${c.valor}`} className="flex items-center gap-1 text-ufrpe-blue hover:underline"><Phone size={13} />{c.valorExibicao || c.valor}</a>}
                          {!c.publico && <span className="text-[10px] text-gray-400 border border-gray-200 rounded px-1">privado</span>}
                          <button onClick={() => removerContato(c.id)} className="text-gray-300 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 pr-4 text-gray-500">{fmtData(l.dataInicioMandato)}</td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => setExpandido(expandido === l.vinculoId ? null : l.vinculoId)}
                      className="text-xs text-ufrpe-blue hover:underline flex items-center gap-1"
                    >
                      <Plus size={13} /> contato
                    </button>
                  </td>
                </tr>
                {expandido === l.vinculoId && (
                  <tr>
                    <td colSpan={5} className="pb-4">
                      <NovoContatoForm pessoaId={l.pessoaId} onSalvar={adicionarContato} onFechar={() => setExpandido(null)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NovoContatoForm({ pessoaId, onSalvar, onFechar }) {
  const [tipo, setTipo] = useState('EMAIL');
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    const ok = await onSalvar(pessoaId, tipo, valor);
    setSalvando(false);
    if (ok) { setValor(''); onFechar(); }
  };

  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 max-w-md">
      <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="text-sm border border-gray-200 rounded px-2 py-1.5">
        <option value="EMAIL">E-mail</option>
        <option value="TELEFONE">Telefone</option>
        <option value="CELULAR">Celular</option>
        <option value="WHATSAPP">WhatsApp</option>
      </select>
      <input
        value={valor} onChange={(e) => setValor(e.target.value)}
        placeholder={tipo === 'EMAIL' ? 'nome@ufrpe.br' : '(81) 99999-9999'}
        className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5"
      />
      <button onClick={salvar} disabled={salvando} className="text-sm bg-ufrpe-blue text-white px-3 py-1.5 rounded flex items-center gap-1">
        {salvando && <Loader2 size={13} className="animate-spin" />} Salvar
      </button>
      <button onClick={onFechar} className="text-sm text-gray-500 px-2">Cancelar</button>
    </div>
  );
}
