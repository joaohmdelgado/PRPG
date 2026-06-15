import React from 'react';

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
        <i className={`fa-solid ${icon} text-[15rem] text-white/5 -bottom-16 -right-8 absolute rotate-12 pointer-events-none`}></i>
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
export function EmptyState({ icon = 'fa-inbox', title, hint }) {
  return (
    <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
      <i className={`fa-solid ${icon} text-gray-300 text-5xl mb-4`}></i>
      <h3 className="font-heading font-bold text-xl text-gray-700 mb-2">{title}</h3>
      {hint && <p className="text-gray-500">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center items-center py-24">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--prog-primary)]"></div>
    </div>
  );
}
