import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, RefreshCw, Link2Off, Gauge } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';

// Fase O.7: o que está errado ou suspeito nos cadastros. Corrige-se na fonte
// (o link "abrir" leva ao registro); nada é bloqueado nem apagado por aqui.
const fmtDataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

function Item({ it }) {
  return (
    <li className="py-1.5 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        {it.link ? <Link to={it.link} className="text-gray-800 hover:text-ufrpe-blue hover:underline break-all">{it.rotulo}</Link>
          : (it.rotulo.startsWith('http') ? <a href={it.rotulo} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:underline break-all">{it.rotulo}</a> : <span className="text-gray-800">{it.rotulo}</span>)}
        <span className="text-xs text-gray-500">{it.detalhe}</span>
      </div>
      {it.usos?.length > 0 && (
        <ul className="text-xs text-gray-500 ml-3">
          {it.usos.slice(0, 4).map((u) => (
            <li key={`${u.tabela}-${u.id}-${u.campo}`}>em <Link to={u.rota} className="text-ufrpe-blue hover:underline">{u.titulo}</Link> ({u.campo})</li>
          ))}
          {it.usos.length > 4 && <li>… e mais {it.usos.length - 4} lugar(es)</li>}
        </ul>
      )}
      {it.pessoas && (
        <ul className="text-xs text-gray-600 ml-3 mt-0.5">
          {it.pessoas.map((p) => (
            <li key={p.id}>{p.nome} · CPF {p.cpf || '—'} · {p.email || 'sem e-mail'} · {p.vinculos} vínculo(s){p.temLogin ? ' · tem login' : ''}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Categoria({ c, acoes }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading font-semibold text-gray-900 text-sm flex items-center gap-2">
          {c.titulo}
          <span className={`text-xs px-2 py-0.5 rounded-full ${c.total ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{c.total}</span>
        </h2>
        {acoes}
      </div>
      {c.ajuda && <p className="text-xs text-gray-500 mt-1">{c.ajuda}</p>}
      {c.id === 'links_quebrados' && (
        <p className="text-xs text-gray-500 mt-1">
          {c.verificados ? `${c.verificados} link(s) verificado(s); última verificação em ${fmtDataHora(c.ultimaVerificacao)}.` : 'Nenhuma verificação feita ainda.'}
          {c.emAndamento && ` Verificando agora: ${c.emAndamento.feitos}/${c.emAndamento.total}.`}
        </p>
      )}
      {c.resumoPorPapel?.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">Sem data no total ({c.totalGeral}): {c.resumoPorPapel.map((r) => `${r.n} ${r.papel.replace(/_/g, ' ').toLowerCase()}`).join(' · ')}.</p>
      )}
      {c.total === 0 ? (
        <p className="mt-2 text-sm text-gray-500 flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" aria-hidden="true" /> Nada encontrado.</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-50">{c.itens.map((it) => <Item key={`${it.rotulo}-${it.detalhe}`} it={it} />)}</ul>
      )}
      {c.total > c.itens.length && <p className="text-xs text-gray-400 mt-1">… e mais {c.total - c.itens.length}.</p>}
    </section>
  );
}

// Desempenho real (Fase P.6): o que quem visita o site realmente viveu
// (biblioteca web-vitals, src/webVitals.js), agregado em p75 por família de
// rota — diferente do Lighthouse (que mede em laboratório, uma vez).
const METRICAS = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'];
const COR_AVALIACAO = { good: 'text-emerald-700 bg-emerald-50', 'needs-improvement': 'text-amber-700 bg-amber-50', poor: 'text-red-700 bg-red-50' };
const fmtMetrica = (metrica, valor) => (metrica === 'CLS' ? valor.toFixed(3) : `${Math.round(valor)} ms`);
const OPCOES_DIAS = [7, 30, 90];

function CelulaMetrica({ dado }) {
  if (!dado) return <span className="text-gray-300">—</span>;
  return (
    <span className={`inline-flex flex-col items-center px-2 py-1 rounded-lg ${COR_AVALIACAO[dado.avaliacao]}`} title={`${dado.n} amostra(s)${dado.confiavel ? '' : ' — poucas amostras, número pode não ser estável'}`}>
      <span className="text-sm font-semibold tabular-nums">
        {dado.confiavel ? '' : '~'}{fmtMetrica(dado.metrica, dado.p75)}
      </span>
      <span className="text-[10px] opacity-70">{dado.n} amostra{dado.n === 1 ? '' : 's'}</span>
    </span>
  );
}

function DesempenhoReal() {
  const [dias, setDias] = useState(30);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    setResumo(null);
    setErro(null);
    apiFetch(`/api/web-vitals/resumo?dias=${dias}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => { if (ativo) setResumo(d); })
      .catch(() => { if (ativo) setErro('Não foi possível carregar o desempenho real.'); });
    return () => { ativo = false; };
  }, [dias]);

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading font-semibold text-gray-900 text-sm flex items-center gap-2">
          <Gauge size={15} className="text-gray-400" aria-hidden="true" /> Desempenho real
        </h2>
        <div className="flex items-center gap-1 text-xs" role="group" aria-label="Período">
          {OPCOES_DIAS.map((d) => (
            <button key={d} type="button" onClick={() => setDias(d)} aria-pressed={dias === d}
              className={`px-2.5 py-1 rounded-lg border ${dias === d ? 'bg-ufrpe-blue text-white border-ufrpe-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {d} dias
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        LCP, INP, CLS, FCP e TTFB reportados pelo navegador de quem visitou o site (p75) — diferente do Lighthouse, que mede uma vez, em laboratório.
      </p>

      {erro && <p className="mt-2 text-sm text-red-600" role="alert">{erro}</p>}
      {!erro && !resumo && <div className="mt-3"><TableSkeleton rows={3} cols={5} /></div>}
      {resumo && resumo.rotas.length === 0 && (
        <p className="mt-2 text-sm text-gray-500 flex items-center gap-1.5">Ainda sem medições nos últimos {dias} dias.</p>
      )}
      {resumo && resumo.rotas.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
                <th scope="col" className="pb-2 pr-3 font-medium">Página</th>
                {METRICAS.map((m) => <th key={m} scope="col" className="pb-2 px-1 font-medium text-center">{m}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resumo.rotas.map((r) => (
                <tr key={r.rota}>
                  <th scope="row" className="py-2 pr-3 text-left font-mono text-xs text-gray-700 whitespace-nowrap">{r.rota}</th>
                  {METRICAS.map((m) => (
                    <td key={m} className="py-2 px-1 text-center">
                      <CelulaMetrica dado={r.metricas[m] ? { ...r.metricas[m], metrica: m } : null} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdminQualidade() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const { toast, Toasts } = useToast();

  const carregar = useCallback(async () => {
    const res = await apiFetch('/api/painel/qualidade');
    if (res.ok) { setDados(await res.json()); setErro(null); } else setErro('Não foi possível carregar o painel de qualidade.');
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // Enquanto o verificador roda, atualiza o progresso a cada poucos segundos.
  const verificando = dados?.categorias.find((c) => c.id === 'links_quebrados')?.emAndamento;
  useEffect(() => {
    if (!verificando) return undefined;
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
  }, [verificando, carregar]);

  const verificar = async () => {
    const res = await apiFetch('/api/painel/qualidade/links/verificar', { method: 'POST' });
    if (res.status === 202) { toast.success('Verificação iniciada — pode levar alguns minutos.'); setTimeout(carregar, 1500); }
    else toast.error((await res.json().catch(() => ({}))).message || 'Não foi possível iniciar.');
  };

  if (erro) return <p className="text-sm text-red-600" role="alert">{erro}</p>;
  if (!dados) return <TableSkeleton rows={6} cols={2} />;

  return (
    <div className="space-y-4 max-w-5xl">
      {Toasts}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900">Qualidade dos dados</h1>
          <p className="text-sm text-gray-500">Problemas e suspeitas nos cadastros. Corrija na fonte; nada é apagado por aqui.</p>
        </div>
        <button onClick={carregar} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>
      <DesempenhoReal />
      {dados.categorias.map((c) => (
        <Categoria
          key={c.id} c={c}
          acoes={c.id === 'links_quebrados' && (
            <button onClick={verificar} disabled={!!c.emAndamento} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
              <Link2Off size={13} /> Verificar links agora
            </button>
          )}
        />
      ))}
    </div>
  );
}
