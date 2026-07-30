import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Download, Settings, FileText, Paperclip, GraduationCap } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';
import { situacaoInfo } from '../../constants/atos';

// Fase E.6 (PLANO.md): livro de expedientes — tela-mãe do módulo. Ver
// requisitos-expedientes.md §9.1. A barra de séries com "reservar número em
// um clique" é o fluxo principal: reproduz em um clique o que a planilha
// fazia pegando a próxima linha em branco.
const fmtData = (iso) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
};

export default function AdminAtos() {
  const [series, setSeries] = useState([]);
  const [atos, setAtos] = useState([]);
  const [serieFiltro, setSerieFiltro] = useState('');
  const [ano, setAno] = useState(new Date().getFullYear());
  const [situacao, setSituacao] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast, Toasts } = useToast();

  const fetchSeries = useCallback(async () => {
    const res = await apiFetch(`/api/atos/series?ano=${ano}`);
    if (res.ok) setSeries(await res.json());
  }, [ano]);

  const fetchAtos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (serieFiltro) params.set('serie', serieFiltro);
      if (ano) params.set('ano', ano);
      if (situacao) params.set('situacao', situacao);
      if (q.trim()) params.set('q', q.trim());
      const res = await apiFetch(`/api/atos?${params.toString()}`);
      if (res.ok) setAtos(await res.json());
      else if (res.status === 401 || res.status === 403) navigate('/admin/login');
      else setError('Erro ao carregar o livro de expedientes.');
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }, [serieFiltro, ano, situacao, q, navigate]);

  useEffect(() => { fetchSeries(); }, [fetchSeries]);
  useEffect(() => { fetchAtos(); }, [fetchAtos]);

  const reservarNumero = async (serie) => {
    const assunto = window.prompt(`Assunto do novo ${serie.nome.toLowerCase()}:`);
    if (!assunto?.trim()) return;
    const res = await apiFetch('/api/atos/reservar', {
      method: 'POST', json: { serieId: serie.id, ano, assunto: assunto.trim() },
    });
    if (res.ok) {
      const ato = await res.json();
      toast.success(`Número ${ato.numeroExibicao} reservado.`);
      navigate(`/admin/atos/${ato.id}/editar`);
    } else {
      toast.error('Erro ao reservar número.');
    }
  };

  const exportarXlsx = async () => {
    const res = await apiFetch('/api/atos/exportar.xlsx');
    if (!res.ok) return toast.error('Erro ao exportar.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'expedientes.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !atos.length) return <TableSkeleton rows={8} cols={6} />;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      {Toasts}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h1 className="font-heading text-xl font-bold text-gray-900">Livro de Expedientes</h1>
        <div className="flex gap-2">
          <Link to="/admin/atos/diplomas" className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
            <GraduationCap size={15} /> Diplomas em lote
          </Link>
          <Link to="/admin/atos/series" className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
            <Settings size={15} /> Séries
          </Link>
          <button onClick={exportarXlsx} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
            <Download size={15} /> Exportar XLSX
          </button>
        </div>
      </div>

      {/* Barra de séries — um clique reserva o próximo número (§9.1). */}
      <div className="flex flex-wrap gap-2 mb-5">
        {series.map((s) => (
          <button
            key={s.id}
            onClick={() => reservarNumero(s)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-ufrpe-blue/5 border border-ufrpe-blue/20 text-ufrpe-blue hover:bg-ufrpe-blue/10"
          >
            <Plus size={14} /> {s.sigla || s.nome} <span className="font-mono font-semibold">nº {s.proximoSequencial}</span>
          </button>
        ))}
        {series.length === 0 && !loading && (
          <span className="text-sm text-gray-400">Nenhuma série cadastrada — <Link to="/admin/atos/series" className="text-ufrpe-blue underline">cadastre uma</Link>.</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select value={serieFiltro} onChange={(e) => setSerieFiltro(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-2">
          <option value="">Todas as séries</option>
          {series.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-2 py-2">
          {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={situacao} onChange={(e) => setSituacao(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-2">
          <option value="">Toda situação</option>
          <option value="RESERVADO">Reservados</option>
          <option value="EMITIDO">Emitidos</option>
          <option value="PUBLICADO">Publicados</option>
          <option value="CANCELADO">Cancelados</option>
          <option value="SEM_EFEITO">Sem efeito</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por assunto, título ou destinatário..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ufrpe-blue/30"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4 font-medium">Número</th>
              <th className="py-2 pr-4 font-medium">Situação</th>
              <th className="py-2 pr-4 font-medium">Data</th>
              <th className="py-2 pr-4 font-medium">Assunto</th>
              <th className="py-2 pr-4 font-medium">Destinatário</th>
              <th className="py-2 pr-4 font-medium">Processo</th>
              <th className="py-2 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {atos.length === 0 && !loading && (
              <EmptyRow colSpan={7} icon={FileText} message="Nenhum ato encontrado." hint="Ajuste os filtros ou reserve um número numa das séries acima." />
            )}
            {atos.map((a) => {
              const info = situacaoInfo(a.situacao);
              return (
                <tr key={a.id} className="align-top hover:bg-gray-50/50">
                  <td className="py-3 pr-4 font-mono text-xs">
                    <Link to={a.situacao === 'RESERVADO' ? `/admin/atos/${a.id}/editar` : `/admin/atos/${a.id}`} className="text-ufrpe-blue hover:underline">
                      {a.numeroExibicao}
                    </Link>
                  </td>
                  <td className="py-3 pr-4"><span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span></td>
                  <td className="py-3 pr-4 text-gray-500">{fmtData(a.data)}</td>
                  <td className="py-3 pr-4 max-w-sm truncate" title={a.assunto}>{a.assunto}</td>
                  <td className="py-3 pr-4 text-gray-500">{a.destinatarioUnidadeNome || a.destinatarioTexto || '—'}</td>
                  <td className="py-3 pr-4 text-gray-500">{a.processoNumero || '—'}</td>
                  <td className="py-3 pr-4">{a.arquivoId && <Paperclip size={14} className="text-gray-400" />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
