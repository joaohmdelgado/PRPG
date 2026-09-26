import React from 'react';
import Icone from '../Icone';

// Formata datas 'YYYY-MM-DD' para "D de Mês, AAAA"; demais formatos passam direto.
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${parseInt(day, 10)} de ${months[parseInt(month, 10) - 1]}, ${year}`;
  }
  return dateStr;
};

// Faixa de topo das páginas internas do microsite (usa as cores do programa).
export function PageHero({ icon, eyebrow, title, subtitle }) {
  return (
    <div className="bg-[var(--prog-primary)] text-white py-12 md:py-14 relative overflow-hidden">
      {icon && (
        <Icone nome={icon} className="text-[15rem] text-white/5 -bottom-16 -right-8 absolute rotate-12 pointer-events-none" />
      )}
      <div className="container mx-auto px-4 relative">
        {eyebrow && (
          <p className="text-[var(--prog-accent)] font-semibold uppercase tracking-wider text-xs mb-2">{eyebrow}</p>
        )}
        <h1 className="text-3xl md:text-4xl font-heading font-extrabold leading-tight">{title}</h1>
        {subtitle && <p className="text-white/70 mt-3 text-base md:text-lg max-w-3xl">{subtitle}</p>}
      </div>
    </div>
  );
}

// Estado vazio padrão das listagens do microsite.
// Aceita `titulo`/`descricao` além de `title`/`hint`: várias páginas do
// microsite usam os nomes em português, e antes o texto sumia (só o ícone
// aparecia).
export function EmptyState({ icon = 'fa-inbox', title, hint, titulo, descricao }) {
  title = title ?? titulo;
  hint = hint ?? descricao;
  return (
    <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
      <Icone nome={icon} className="text-gray-300 text-5xl mb-4" />
      <h3 className="font-heading font-bold text-xl text-gray-700 mb-2">{title}</h3>
      {hint && <p className="text-gray-500">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center items-center py-24">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--prog-primary)]" role="status"><span className="sr-only">Carregando…</span></div>
    </div>
  );
}

// Falha de carregamento (rede, 401/403/500): diferente de "não há nada" — a
// pessoa precisa saber que a lista não chegou, e não achar que está vazia
// (Fase U.6). Sem `onRetry`, recarrega a página.
export function ErrorState({ erro, onRetry }) {
  const detalhe = erro instanceof Error ? erro.message : '';
  return (
    <div role="alert" className="bg-white rounded-2xl p-12 text-center border border-red-100 shadow-sm">
      <Icone nome="triangle-exclamation" className="text-red-400 text-5xl mb-4" />
      <h3 className="font-heading font-bold text-xl text-gray-700 mb-2">Não foi possível carregar</h3>
      <p className="text-gray-600">Isto é uma falha de comunicação, não uma lista vazia.{detalhe ? ` (${detalhe})` : ''}</p>
      <button type="button" onClick={onRetry || (() => window.location.reload())}
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--prog-primary)] text-white text-sm font-semibold hover:opacity-90">
        <Icone nome="circle-notch" /> Tentar de novo
      </button>
    </div>
  );
}
