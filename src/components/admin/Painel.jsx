import React from 'react';

// Fase K.1 (PLANO.md): componentes reutilizáveis de painel — cartões,
// semáforo de aging e listas de carga/ranking. Usados pelos painéis da
// Câmara, PNPD e Expedientes (K.2/K.3/K.4), integrados em AdminMetricas.jsx.

export function IndicadorCard({ label, valor, hint, cor = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-heading font-bold ${cor}`}>{valor}</div>
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}

// Semáforo de aging: verde (ok) / âmbar (atenção) / vermelho (crítico),
// conforme limiares em dias fornecidos pelo chamador.
export function Semaforo({ dias, limiarAmbar = 15, limiarVermelho = 30 }) {
  if (dias == null) return <span className="text-gray-400 text-xs">—</span>;
  const cor = dias >= limiarVermelho ? 'bg-red-500' : dias >= limiarAmbar ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${cor}`} />
      <span className="text-xs text-gray-600">{dias}d</span>
    </span>
  );
}

// Lista de carga/ranking: "quem tem mais" — usado para carga por
// relator/servidor, concentração por supervisor, destinatários mais comuns.
export function ListaRanking({ titulo, itens, labelKey = 'label', valorKey = 'valor', vazio = 'Sem dados.' }) {
  const max = Math.max(1, ...itens.map((i) => i[valorKey]));
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{titulo}</h3>
      {itens.length === 0 && <p className="text-xs text-gray-400">{vazio}</p>}
      <ul className="space-y-2">
        {itens.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-32 truncate shrink-0" title={item[labelKey]}>{item[labelKey]}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="bg-ufrpe-blue h-full rounded-full" style={{ width: `${(item[valorKey] / max) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500 w-6 text-right shrink-0">{item[valorKey]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PainelGrid({ children }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{children}</div>;
}
