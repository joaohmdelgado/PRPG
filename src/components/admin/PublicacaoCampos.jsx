import React from 'react';
import { Eye } from 'lucide-react';

// Bloco "Publicação" dos formulários de conteúdo (Fase F.6): status,
// agendamento e pré-visualização. O servidor só mostra ao público o que está
// PUBLICADO e com publicado_em no passado (ver server/utils/publicacao.js).

// ISO (UTC) <-> valor de <input type="datetime-local"> (hora local).
const paraLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const paraIso = (local) => (local ? new Date(local).toISOString() : '');

// `sujo`: há alterações não salvas (ver hooks/useAvisoAlteracoes).
export default function PublicacaoCampos({ status = 'PUBLICADO', publicadoEm = '', onChange, previewUrl, sujo = false }) {
  const agendado = status === 'PUBLICADO' && publicadoEm && new Date(publicadoEm) > new Date();
  const set = (campo, valor) => onChange({ status, publicadoEm, [campo]: valor });

  return (
    <fieldset className="md:col-span-2 border border-gray-200 rounded-lg p-4 bg-gray-50/60">
      <legend className="px-1 text-sm font-semibold text-gray-700">Publicação</legend>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="pub-status" className="block text-xs font-medium text-gray-600 mb-1">Situação</label>
          <select id="pub-status" value={status} onChange={(e) => set('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
            <option value="RASCUNHO">Rascunho (não aparece no site)</option>
            <option value="PUBLICADO">Publicado</option>
            <option value="ARQUIVADO">Arquivado (sai do site)</option>
          </select>
        </div>
        {status === 'PUBLICADO' && (
          <div>
            <label htmlFor="pub-data" className="block text-xs font-medium text-gray-600 mb-1">Publicar a partir de (opcional)</label>
            <input id="pub-data" type="datetime-local" value={paraLocal(publicadoEm)}
              onChange={(e) => set('publicadoEm', paraIso(e.target.value))}
              aria-describedby="pub-data-ajuda"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white" />
          </div>
        )}
        {sujo && <span className="text-xs font-medium text-amber-700 self-center">● Alterações não salvas</span>}
        {previewUrl && (
          <a href={previewUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-ufrpe-blue border border-ufrpe-blue/30 rounded-md hover:bg-ufrpe-blue/5">
            <Eye size={16} aria-hidden="true" /> Pré-visualizar
          </a>
        )}
      </div>
      <p id="pub-data-ajuda" className="text-xs text-gray-500 mt-2" role="status">
        {status === 'RASCUNHO' && 'Salvo como rascunho: só quem edita consegue ver (use Pré-visualizar).'}
        {status === 'ARQUIVADO' && 'Arquivado: continua no painel, mas não aparece mais no site.'}
        {status === 'PUBLICADO' && (agendado
          ? `Agendado: aparece no site em ${new Date(publicadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.`
          : 'Visível no site assim que for salvo. Deixe a data vazia para publicar imediatamente.')}
      </p>
    </fieldset>
  );
}
