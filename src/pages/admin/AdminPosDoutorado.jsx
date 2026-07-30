import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Download, Microscope } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';
import { situacaoInfo } from '../../constants/posDoutorado';

// Fase C.6 (PLANO.md): lista — tela-mãe do módulo PNPD. Ver requisitos-pnpd.md
// §10.1. Padrão de abertura: vigentes primeiro, ordenados por data_fim
// crescente (quem vence primeiro aparece primeiro); encerrados ocultos por padrão.
const fmtData = (iso, aprox) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return String(iso);
  return `${aprox ? '~' : ''}${m[3]}/${m[2]}/${m[1]}`;
};

const CHIPS = [
  { key: '', label: 'Todos' },
  { key: 'VIGENTE', label: 'Vigentes' },
  { key: 'ENCERRADO', label: 'Encerrados' },
  { key: 'APROVADO', label: 'A iniciar' },
];

export default function AdminPosDoutorado() {
  const [lista, setLista] = useState([]);
  const [situacao, setSituacao] = useState('VIGENTE');
  const [vencendo, setVencendo] = useState(false);
  const [semRelatorio, setSemRelatorio] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast, Toasts } = useToast();

  const fetchLista = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (situacao) params.set('situacao', situacao);
      if (vencendo) params.set('vencendo', 'true');
      if (semRelatorio) params.set('semRelatorio', 'true');
      if (q.trim()) params.set('q', q.trim());
      const res = await apiFetch(`/api/pos-doutorado?${params.toString()}`);
      if (res.ok) setLista(await res.json());
      else if (res.status === 401 || res.status === 403) navigate('/admin/login');
      else setError('Erro ao carregar os estágios pós-doutorais.');
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }, [situacao, vencendo, semRelatorio, q, navigate]);

  useEffect(() => { fetchLista(); }, [fetchLista]);

  const exportarXlsx = async () => {
    const res = await apiFetch('/api/pos-doutorado/exportar.xlsx');
    if (!res.ok) return toast.error('Erro ao exportar.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pos-doutorado.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const contagemVigentes = useMemo(() => lista.filter((p) => p.situacao === 'VIGENTE').length, [lista]);

  if (loading && !lista.length) return <TableSkeleton rows={8} cols={7} />;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      {Toasts}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900">Pós-Doutorado (PNPD)</h1>
          {situacao === 'VIGENTE' && <p className="text-xs text-gray-400 mt-0.5">{contagemVigentes} pós-doutorando(s) vigente(s)</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={exportarXlsx} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
            <Download size={15} /> Exportar XLSX
          </button>
          <Link to="/admin/pos-doutorado/novo" className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-ufrpe-blue text-white">
            <Plus size={15} /> Novo
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            onClick={() => setSituacao(c.key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              situacao === c.key ? 'bg-ufrpe-blue text-white border-ufrpe-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {c.label}
          </button>
        ))}
        <button
          onClick={() => setVencendo((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-sm border ${vencendo ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Vencendo em 90 dias
        </button>
        <button
          onClick={() => setSemRelatorio((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-sm border ${semRelatorio ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Relatório pendente
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por projeto, processo ou supervisor..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ufrpe-blue/30"
        />
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4 font-medium">Nome</th>
              <th className="py-2 pr-4 font-medium">Situação</th>
              <th className="py-2 pr-4 font-medium">Programa</th>
              <th className="py-2 pr-4 font-medium">Supervisor</th>
              <th className="py-2 pr-4 font-medium">Período</th>
              <th className="py-2 pr-4 font-medium">Processo</th>
              <th className="py-2 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lista.length === 0 && !loading && (
              <EmptyRow colSpan={7} icon={Microscope} message="Nenhum registro encontrado." hint="Ajuste os filtros ou cadastre um novo estágio." />
            )}
            {lista.map((p) => {
              const info = situacaoInfo(p.situacao);
              return (
                <tr key={p.id} className="align-top hover:bg-gray-50/50">
                  <td className="py-3 pr-4">
                    <Link to={`/admin/pos-doutorado/${p.id}`} className="font-medium text-ufrpe-blue hover:underline">{p.nome}</Link>
                    <div className="text-xs text-gray-400">{p.cpf || '—'}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                    {p.renovacaoDeId && <span className="block text-[10px] text-gray-400 mt-1">↻ renovação</span>}
                  </td>
                  <td className="py-3 pr-4" title={p.programaNome || ''}>{p.programaSigla || '—'}</td>
                  <td className="py-3 pr-4 text-gray-600">{p.supervisorNome || '—'}</td>
                  <td className="py-3 pr-4 text-gray-500">
                    {fmtData(p.dataInicio, p.dataInicioAprox)} – {fmtData(p.dataFim, p.dataFimAprox)}
                    {p.vencendo && <span className="block text-[11px] text-amber-600">faltam {p.diasRestantes} dias</span>}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-gray-500">{p.processoNumero || '—'}</td>
                  <td className="py-3 pr-4"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
