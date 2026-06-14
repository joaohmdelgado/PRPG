import React from 'react';

// Base shimmer block. animate-pulse only touches opacity, never layout.
const bar = 'animate-pulse rounded bg-gray-200/70';

/**
 * Loading placeholder for list/table pages. Mirrors the card shape
 * (header + action button + rows) so the layout doesn't jump on load.
 */
export function TableSkeleton({ rows = 6, cols = 4 }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <div className={`h-7 w-52 ${bar}`} />
        <div className={`h-10 w-36 ${bar}`} />
      </div>
      <div className="flex gap-4 pb-3 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`h-3.5 ${bar} ${i === 0 ? 'flex-[2]' : 'flex-1'}`} />
        ))}
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 py-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className={`h-4 ${bar} ${c === 0 ? 'flex-[2]' : 'flex-1'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Loading placeholder for edit/create forms.
 */
export function FormSkeleton({ fields = 5 }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className={`h-7 w-7 ${bar}`} />
        <div className={`h-7 w-56 ${bar}`} />
      </div>
      <div className="space-y-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <div className={`h-3.5 w-32 ${bar} mb-2`} />
            <div className={`h-10 w-full ${bar}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Teaching empty state rendered as a full-width table row.
 * Pass the table's column count so it spans correctly.
 */
export function EmptyRow({ colSpan, icon: Icon, message, hint = 'Clique no botão "Novo" para criar o primeiro registro.' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16 text-center">
        {Icon && (
          <div className="mx-auto w-14 h-14 rounded-full bg-ufrpe-blue/5 grid place-items-center mb-4">
            <Icon className="text-ufrpe-blue/40" size={26} />
          </div>
        )}
        <p className="font-heading text-base font-semibold text-gray-700">{message}</p>
        {hint && <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">{hint}</p>}
      </td>
    </tr>
  );
}
