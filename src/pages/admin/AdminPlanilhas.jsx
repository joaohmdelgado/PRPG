import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, Play, Upload, RotateCw, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmModal';
import { FONTES_PLANILHA } from '../../constants/planilhas';

// Fase O.3: as quatro planilhas, na ordem de importação. Simular roda a
// importação inteira e desfaz — o relatório é o que a gravação faria. Gravar é
// seguro de repetir: chave já importada não é criada de novo.
const ROTULO_ACAO = {
  criado: 'a criar', existente: 'já no sistema', inalterado: 'inalterados', divergente: 'mudaram na planilha',
  conflito: 'em conflito', ignorado: 'guardados p/ revisão', erro: 'com erro',
};
const fmtDataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

function Resumo({ resumo, simulacao }) {
  if (!resumo) return null;
  const acoes = Object.keys(ROTULO_ACAO).filter((k) => resumo[k]);
  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      {acoes.map((k) => (
        <span key={k} className={`px-2 py-0.5 rounded-full ${['conflito', 'erro', 'divergente'].includes(k) ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-700'}`}>
          {resumo[k]} {k === 'criado' && !simulacao ? 'criados' : ROTULO_ACAO[k]}
        </span>
      ))}
      {!!resumo.pendencias && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{resumo.pendencias} pendência(s)</span>}
    </div>
  );
}

function Resultado({ r }) {
  const porTipo = Object.entries(r.resumo?.porTipo || {});
  return (
    <div className="mt-4 border-t border-gray-100 pt-4 space-y-3 text-sm">
      <p className="font-medium text-gray-800">{r.simulacao ? 'Simulação — nada foi gravado' : 'Importação gravada'}</p>
      <Resumo resumo={r.resumo} simulacao={r.simulacao} />
      {r.avisos?.length > 0 && (
        <ul className="text-xs text-gray-600 list-disc pl-5 space-y-0.5">{r.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
      )}
      {porTipo.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Pendências de revisão {r.simulacao ? 'que a gravação criaria' : 'criadas'}</p>
          <ul className="text-xs text-gray-700 grid sm:grid-cols-2 gap-x-4">
            {porTipo.map(([tipo, n]) => {
              const exemplo = r.pendencias?.find((p) => p.tipo === tipo);
              return <li key={tipo}>{n} × {tipo.replace(/_/g, ' ').toLowerCase()}{exemplo?.decisao ? ` (${exemplo.decisao})` : ''}</li>;
            })}
          </ul>
        </div>
      )}
      {r.itens?.length > 0 && (
        <details>
          <summary className="text-xs text-gray-500 cursor-pointer">{r.itens.length} linha(s) para olhar (conflito, divergência, erro, guardadas)</summary>
          <ul className="mt-1 text-xs text-gray-600 space-y-0.5 max-h-64 overflow-auto">
            {r.itens.map((it) => (
              <li key={`${it.acao}-${it.chave}`}>
                <span className="font-medium">[{ROTULO_ACAO[it.acao] || it.acao}]</span> {it.rotulo || it.chave}
                {it.motivo ? ` — ${it.motivo}` : ''}{it.mudou ? ` — mudou: ${it.mudou.map((m) => m.campo).join(', ')}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function CartaoPlanilha({ p, indice, onFeito }) {
  const [arquivo, setArquivo] = useState(null);
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const { toast, Toasts } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const info = FONTES_PLANILHA[p.fonte] || {};

  const rodar = async ({ simulacao, reexecutar = false }) => {
    if (!simulacao && !(await confirm(
      'Os registros entram nos módulos de verdade. Repetir depois é seguro (nada é duplicado), mas não há "desfazer".',
      { title: `Importar ${info.rotulo || p.fonte}?` },
    ))) return;
    setRodando(true);
    let res;
    if (reexecutar) {
      res = await apiFetch(`/api/importacoes/planilhas/${p.fonte}/reexecutar`, { method: 'POST', json: { simulacao } });
    } else {
      const fd = new FormData();
      fd.append('file', arquivo);
      fd.append('simulacao', String(simulacao));
      res = await apiFetch(`/api/importacoes/planilhas/${p.fonte}`, { method: 'POST', body: fd });
    }
    const corpo = await res.json().catch(() => ({}));
    setRodando(false);
    if (!res.ok) { toast.error(corpo.message || 'A importação falhou.'); return; }
    setResultado(corpo);
    toast.success(simulacao ? 'Simulação concluída.' : 'Importação gravada.');
    onFeito();
  };

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      {Toasts}{ConfirmModal}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-ufrpe-blue text-white text-xs grid place-items-center">{indice}</span>
            {info.rotulo || p.rotulo}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><FileSpreadsheet size={12} /> {p.arquivoPadrao}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span>{p.registrosImportados} registro(s) importado(s)</span>
          <Link to={`/admin/planilhas/revisao?fonte=${p.fonte}`} className={`inline-flex items-center gap-1 ${p.pendenciasAbertas ? 'text-amber-700' : 'text-gray-500'} hover:underline`}>
            <ClipboardCheck size={12} /> {p.pendenciasAbertas} pendência(s) aberta(s)
          </Link>
          {info.modulo && <Link to={info.modulo} className="text-ufrpe-blue hover:underline">abrir o módulo</Link>}
        </div>
      </div>

      <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
        {[['Última simulação', p.ultimaSimulacao, true], ['Última importação', p.ultimaImportacao, false]].map(([t, e, sim]) => (
          <div key={t} className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500">{t}: {e ? `${fmtDataHora(e.executadoEm)} · ${e.arquivoNome || ''}` : 'nunca'}</p>
            {e?.erro && <p className="text-rose-700 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> {e.erro}</p>}
            {e && <div className="mt-1.5"><Resumo resumo={e.resumo} simulacao={sim} /></div>}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50">
          <Upload size={15} /> {arquivo ? arquivo.name : 'Escolher .xlsx'}
          <input type="file" accept=".xlsx" className="sr-only" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
        </label>
        <button disabled={!arquivo || rodando} onClick={() => rodar({ simulacao: true })} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-ufrpe-blue text-white disabled:opacity-40">
          <Play size={14} /> Simular
        </button>
        <button disabled={!arquivo || rodando} onClick={() => rodar({ simulacao: false })} className="text-sm px-3 py-2 rounded-lg border border-ufrpe-blue text-ufrpe-blue disabled:opacity-40">
          Importar
        </button>
        {(p.ultimaSimulacao || p.ultimaImportacao) && (
          <button disabled={rodando} onClick={() => rodar({ simulacao: true, reexecutar: true })} className="inline-flex items-center gap-1 text-xs px-2.5 py-2 rounded-lg text-gray-600 hover:bg-gray-50" title="Simula de novo com o último arquivo enviado — por exemplo, depois de responder um de-para na revisão">
            <RotateCw size={13} /> Simular de novo o último arquivo
          </button>
        )}
        {rodando && <span className="text-xs text-gray-500" role="status">Processando…</span>}
      </div>
      {resultado && <Resultado r={resultado} />}
    </section>
  );
}

export default function AdminPlanilhas() {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    const res = await apiFetch('/api/importacoes/planilhas');
    if (res.ok) { setLista(await res.json()); setErro(null); } else setErro('Não foi possível carregar as planilhas.');
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-gray-900">Planilhas</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-3xl">
              Importação fiel das quatro planilhas que os módulos substituem, nesta ordem. <strong>Simular</strong> mostra o
              que entraria, sem gravar. O que depende de uma decisão ainda sem resposta entra marcado para revisão, com o
              número da decisão (D-xx) — nada é interpretado em silêncio.
            </p>
          </div>
          <Link to="/admin/planilhas/revisao" className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ClipboardCheck size={15} /> Revisão da importação
          </Link>
        </div>
      </div>
      {erro && <p className="text-sm text-red-600" role="alert">{erro}</p>}
      {!lista && !erro && <TableSkeleton rows={4} cols={3} />}
      {lista?.map((p, i) => <CartaoPlanilha key={p.fonte} p={p} indice={i + 1} onFeito={carregar} />)}
    </div>
  );
}
