import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, ExternalLink, XCircle } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';
import { FONTES_PLANILHA, linkEntidade } from '../../constants/planilhas';

// Fase O.2: a interpretação do que a planilha não diz acontece aqui. Cada
// grupo (mesmo tipo + mesma grafia) é o que uma resposta da oficina resolve de
// uma vez — "aplicar" grava o valor em todos os registros do grupo e guarda o
// de-para para as próximas importações.
const SITUACOES = [
  { valor: 'ABERTA', rotulo: 'Abertas' },
  { valor: 'RESOLVIDA', rotulo: 'Resolvidas' },
  { valor: 'DESCARTADA', rotulo: 'Descartadas' },
];

function SeletorDestino({ destino, opcoes, valor, onChange }) {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!destino || ['confirmar', 'papel_vinculo'].includes(destino)) return undefined;
    const t = setTimeout(async () => {
      const res = await apiFetch(`/api/importacoes/opcoes?destino=${destino}&q=${encodeURIComponent(busca)}`);
      if (res.ok) setLista(await res.json());
    }, destino === 'pessoa' ? 250 : 0);
    return () => clearTimeout(t);
  }, [destino, busca]);

  if (destino === 'confirmar') {
    return (
      <select value={valor} onChange={(e) => onChange(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" aria-label="Confirmar">
        <option value="">Escolha…</option>
        <option value="sim">Sim, aplicar</option>
        <option value="nao">Não</option>
      </select>
    );
  }
  const itens = destino === 'papel_vinculo'
    ? (opcoes || []).map((o) => ({ valor: o, rotulo: o.replace(/_/g, ' ').toLowerCase() }))
    : lista;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {destino === 'pessoa' && (
        <input
          value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pessoa…"
          aria-label="Buscar pessoa" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-44"
        />
      )}
      <select value={valor} onChange={(e) => onChange(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm max-w-xs" aria-label="Valor a aplicar">
        <option value="">Escolha…</option>
        {itens.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>
    </span>
  );
}

function Grupo({ grupo, tipo, onResolver, aberto }) {
  const [destino, setDestino] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const podeAplicar = !!tipo?.destino;

  const agir = async (acao) => {
    setEnviando(true);
    await onResolver({ fonte: grupo.fonte, tipo: grupo.tipo, valorOriginal: grupo.valorOriginal, acao, destino, nota });
    setEnviando(false);
  };

  return (
    <div className="border border-gray-100 rounded-lg p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 break-words">
            {grupo.valorOriginal ? <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded">{grupo.valorOriginal}</span> : <span className="text-gray-400">(sem valor)</span>}
            <span className="ml-2 text-xs text-gray-500">{grupo.itens.length} registro(s) · {FONTES_PLANILHA[grupo.fonte]?.rotulo || grupo.fonte}</span>
          </p>
        </div>
        {aberto && (
          <div className="flex flex-wrap items-center gap-2">
            {podeAplicar && (
              <>
                <SeletorDestino destino={tipo.destino} opcoes={tipo.opcoes} valor={destino} onChange={setDestino} />
                <button
                  disabled={!destino || enviando} onClick={() => agir('aplicar')}
                  className="text-sm px-3 py-1.5 rounded-lg bg-ufrpe-blue text-white disabled:opacity-40"
                >
                  Aplicar a {grupo.itens.length > 1 ? `todos (${grupo.itens.length})` : 'este'}
                </button>
              </>
            )}
            <input
              value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional)"
              aria-label="Nota da revisão" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-40"
            />
            <button disabled={enviando} onClick={() => agir('conferido')} className="flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              <CheckCircle2 size={14} /> Conferido
            </button>
            <button disabled={enviando} onClick={() => agir('descartar')} className="flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              <XCircle size={14} /> Descartar
            </button>
          </div>
        )}
      </div>
      <ul className="mt-2 space-y-1">
        {grupo.itens.slice(0, 12).map((p) => {
          const link = linkEntidade(p.entidade, p.entidadeId, p.sugestao);
          return (
            <li key={p.id} className="text-xs text-gray-600 flex flex-wrap gap-x-2">
              <span className="font-mono text-gray-400">{p.chave}</span>
              {p.mensagem && <span>{p.mensagem}</span>}
              {link && <Link to={link} className="inline-flex items-center gap-0.5 text-ufrpe-blue hover:underline"><ExternalLink size={11} /> abrir</Link>}
              {p.resolucao && <span className="text-gray-400">→ {p.resolucao.acao}{p.resolucao.destino ? `: ${p.resolucao.destino}` : ''}{p.resolucao.nota ? ` (${p.resolucao.nota})` : ''}</span>}
            </li>
          );
        })}
        {grupo.itens.length > 12 && <li className="text-xs text-gray-400">… e mais {grupo.itens.length - 12}.</li>}
      </ul>
    </div>
  );
}

export default function AdminRevisaoImportacao() {
  const [dados, setDados] = useState({ itens: [], contagem: [], tipos: {} });
  const [fonte, setFonte] = useState('');
  const [situacao, setSituacao] = useState('ABERTA');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const { toast, Toasts } = useToast();

  const carregar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ situacao });
    if (fonte) params.set('fonte', fonte);
    const res = await apiFetch(`/api/importacoes/pendencias?${params}`);
    if (res.ok) { setDados(await res.json()); setErro(null); } else setErro('Não foi possível carregar as pendências.');
    setLoading(false);
  }, [fonte, situacao]);

  useEffect(() => { carregar(); }, [carregar]);

  const resolver = async (corpo) => {
    const res = await apiFetch('/api/importacoes/pendencias/lote', { method: 'POST', json: corpo });
    const r = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success(corpo.acao === 'aplicar'
        ? `Aplicado: ${r.alterados} registro(s) alterado(s), ${r.resolvidas} pendência(s) resolvida(s).`
        : `${r.resolvidas} pendência(s) marcada(s).`);
      carregar();
    } else toast.error(r.message || 'Não foi possível resolver.');
  };

  // tipo -> [grupo por grafia]
  const porTipo = useMemo(() => {
    const mapa = new Map();
    for (const p of dados.itens) {
      if (!mapa.has(p.tipo)) mapa.set(p.tipo, new Map());
      const k = `${p.fonte}|${p.valorOriginal ?? ''}`;
      const grupos = mapa.get(p.tipo);
      if (!grupos.has(k)) grupos.set(k, { fonte: p.fonte, tipo: p.tipo, valorOriginal: p.valorOriginal, itens: [] });
      grupos.get(k).itens.push(p);
    }
    return [...mapa.entries()].map(([tipo, grupos]) => ({ tipo, grupos: [...grupos.values()] }));
  }, [dados.itens]);

  const total = (f, s) => dados.contagem.filter((c) => (!f || c.fonte === f) && c.situacao === s).reduce((a, c) => a + c.n, 0);

  return (
    <div className="space-y-5">
      {Toasts}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-gray-900">Revisão da importação</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              O que as planilhas não dizem sozinhas. Cada grupo mostra a decisão que o responde (D-xx, ver
              a oficina de decisões); aplicar grava a resposta em todos os registros do grupo.
            </p>
          </div>
          <Link to="/admin/planilhas" className="text-sm text-ufrpe-blue hover:underline">Voltar às planilhas</Link>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {[['', 'Todas'], ...Object.entries(FONTES_PLANILHA).map(([k, v]) => [k, v.rotulo])].map(([k, rotulo]) => (
            <button
              key={k || 'todas'} onClick={() => setFonte(k)}
              className={`px-3 py-1.5 rounded-full text-sm border ${fonte === k ? 'bg-ufrpe-blue text-white border-ufrpe-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {rotulo} <span className="opacity-70">({total(k, 'ABERTA')})</span>
            </button>
          ))}
          <span className="mx-2 border-l border-gray-200" />
          {SITUACOES.map((s) => (
            <button
              key={s.valor} onClick={() => setSituacao(s.valor)}
              className={`px-3 py-1.5 rounded-full text-sm border ${situacao === s.valor ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {s.rotulo}
            </button>
          ))}
        </div>
      </div>

      {loading && !dados.itens.length && <TableSkeleton rows={6} cols={3} />}
      {erro && <p className="text-sm text-red-600" role="alert">{erro}</p>}
      {!loading && !erro && porTipo.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-500">
          <ClipboardCheck className="mx-auto mb-2 text-gray-300" size={32} />
          {situacao === 'ABERTA' ? 'Nenhuma pendência aberta.' : 'Nada por aqui.'}
        </div>
      )}

      {porTipo.map(({ tipo, grupos }) => {
        const def = dados.tipos[tipo] || { rotulo: tipo };
        return (
          <section key={tipo} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-heading font-semibold text-gray-900">{def.rotulo}</h2>
              {def.decisao && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{def.decisao}</span>}
              <span className="text-xs text-gray-400">{grupos.reduce((a, g) => a + g.itens.length, 0)} pendência(s)</span>
            </div>
            {def.ajuda && <p className="text-xs text-gray-500 mb-3">{def.ajuda}</p>}
            <div className="space-y-2">
              {grupos.map((g) => (
                <Grupo key={`${g.fonte}|${g.valorOriginal}`} grupo={g} tipo={def} onResolver={resolver} aberto={situacao === 'ABERTA'} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
