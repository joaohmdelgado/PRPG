import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';
import { apiFetch } from '../../api';
import { FONTES_PLANILHA } from '../../constants/planilhas';

// Fase O.2: num registro importado de planilha, mostra a linha de origem como
// veio e as pendências de revisão abertas. Não aparece em registro criado no
// sistema (sem origem). Só Admin/Gestor recebem a resposta da API.
export default function OrigemPlanilha({ entidade, id }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    apiFetch(`/api/importacoes/origem/${entidade}/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo) setDados(d); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [entidade, id]);

  if (!dados || (!dados.origens.length && !dados.pendencias.length)) return null;
  const abertas = dados.pendencias.filter((p) => p.situacao === 'ABERTA');

  return (
    <details className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 text-sm">
      <summary className="cursor-pointer flex flex-wrap items-center gap-2 text-amber-900">
        <FileSpreadsheet size={16} />
        Importado da planilha {dados.origens[0] ? (FONTES_PLANILHA[dados.origens[0].fonte]?.rotulo || dados.origens[0].fonte) : ''}
        {abertas.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">{abertas.length} pendência(s) de revisão</span>}
      </summary>
      {abertas.length > 0 && (
        <ul className="mt-3 space-y-1">
          {abertas.map((p) => (
            <li key={p.id} className="text-amber-900">
              {p.decisao && <span className="font-medium">{p.decisao}: </span>}
              {p.mensagem || p.tipo}
            </li>
          ))}
          <li><Link to="/admin/planilhas/revisao" className="text-ufrpe-blue hover:underline text-xs">Ir para a revisão da importação</Link></li>
        </ul>
      )}
      {dados.origens.map((o) => (
        <div key={o.chave} className="mt-3">
          <p className="text-xs text-gray-500">Chave <span className="font-mono">{o.chave}</span> · {o.dados?.aba ? `aba "${o.dados.aba}", ` : ''}{o.dados?.linha ? `linha ${o.dados.linha}` : ''}</p>
          <dl className="mt-1 grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-3 gap-y-0.5">
            {Object.entries(o.dados?.colunas || {}).map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className="text-xs text-gray-500">{k}</dt>
                <dd className="text-xs text-gray-800 whitespace-pre-wrap break-words">{v == null || v === '' ? '—' : String(v)}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      ))}
    </details>
  );
}
