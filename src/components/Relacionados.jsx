import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import LinkDestino from './LinkDestino';

// Bloco "Relacionados" (Fase N.5): conteúdos ligados a este no painel
// (edital -> resolução, notícia -> edital...). Some quando não há nenhum.
const ICONES = {
  noticia: 'fa-regular fa-newspaper', edital: 'fa-solid fa-bullhorn', resolucao: 'fa-solid fa-scroll',
  formulario: 'fa-solid fa-file-signature', pagina: 'fa-solid fa-file-lines',
};

export default function Relacionados({ tipo, id, className = '' }) {
  const [itens, setItens] = useState([]);
  useEffect(() => {
    if (!id) return undefined;
    let vivo = true;
    apiFetch(`/api/referencias/${tipo}/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (vivo) setItens(Array.isArray(d) ? d : []); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [tipo, id]);

  if (!itens.length) return null;
  return (
    <section className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`} aria-labelledby={`relacionados-${tipo}-${id}`}>
      <h2 id={`relacionados-${tipo}-${id}`} className="font-heading font-bold text-lg text-ufrpe-blue mb-4 flex items-center gap-2">
        <i className="fa-solid fa-link text-ufrpe-yellow" aria-hidden="true"></i> Relacionados
      </h2>
      <ul className="space-y-3">
        {itens.map((i) => (
          <li key={`${i.tipo}-${i.id}`} className="flex gap-3">
            <i className={`${ICONES[i.tipo] || 'fa-solid fa-link'} text-ufrpe-blue/50 mt-1 w-4 text-center`} aria-hidden="true"></i>
            <div>
              <LinkDestino destino={i.destino} className="font-semibold text-gray-800 hover:text-ufrpe-blue hover:underline">{i.titulo}</LinkDestino>
              <p className="text-xs text-gray-500">{i.rotuloTipo}{i.status && i.status !== 'PUBLICADO' ? ` · ${i.status.toLowerCase()}` : ''}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
