import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, apiFetch } from '../api';

// "Próximos prazos" (Fase N.6): fim das inscrições dos editais abertos +
// marcos do calendário acadêmico vigente, com as datas de verdade dos marcos.
// Usado na home (recebe `prazos` já carregados) e no microsite (busca os do
// programa). Oferece a agenda em .ics para assinar no Google Agenda/Outlook.
export default function ProximosPrazos({ prazos: recebidos, programa = null, limite = 6, titulo = 'Próximos prazos', className = '' }) {
  const [buscados, setBuscados] = useState(null);
  useEffect(() => {
    if (recebidos) return undefined;
    let vivo = true;
    const q = new URLSearchParams({ limite: String(limite) });
    if (programa) q.set('programa', programa);
    apiFetch(`/api/portal/prazos?${q}`, { auth: false })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (vivo) setBuscados(d); })
      .catch(() => { if (vivo) setBuscados([]); });
    return () => { vivo = false; };
  }, [recebidos, programa, limite]);

  const prazos = recebidos || buscados;
  if (!prazos) return null;
  const ics = `${API_URL}/api/portal/calendario.ics${programa ? `?programa=${encodeURIComponent(programa)}` : ''}`;
  const idTitulo = `prazos-${programa || 'prpg'}`;

  return (
    <aside aria-labelledby={idTitulo} className={`bg-white rounded-2xl p-6 shadow-sm h-fit ${className}`}>
      <h3 id={idTitulo} className="font-heading font-bold text-lg text-ufrpe-blue mb-4 flex items-center gap-2">
        <i className="fa-regular fa-clock text-ufrpe-yellow" aria-hidden="true"></i>{titulo}
      </h3>
      {prazos.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum prazo nos próximos dias. <Link to="/calendario-academico" className="text-ufrpe-blue underline">Calendário acadêmico</Link>.</p>
      ) : (
        <ol className="space-y-4">
          {prazos.map((p) => (
            <li key={`${p.tipo}-${p.id || p.titulo}-${p.data}`} className="flex gap-3">
              <span className="shrink-0 w-14 text-center rounded-lg bg-ufrpe-blue/5 text-ufrpe-blue py-1">
                <span className="block text-lg font-bold leading-none">{p.data.slice(8, 10)}</span>
                <span className="block text-[10px] uppercase">{new Date(`${p.data}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
              </span>
              <Link to={p.destino} className="text-sm text-gray-700 hover:text-ufrpe-blue leading-snug">
                {p.titulo}
                {p.periodo && <span className="block text-xs text-gray-400">{p.periodo}</span>}
              </Link>
            </li>
          ))}
        </ol>
      )}
      <a href={ics} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-ufrpe-blue hover:underline">
        <i className="fa-regular fa-calendar-plus" aria-hidden="true"></i> Adicionar à minha agenda (.ics)
      </a>
    </aside>
  );
}
