import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

const ICONS = { error: AlertCircle, success: CheckCircle, info: Info };
const COLORS = {
  error: 'bg-red-600',
  success: 'bg-green-600',
  info: 'bg-gray-800',
};

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const toast = {
    error: (msg) => add(msg, 'error'),
    success: (msg) => add(msg, 'success'),
    info: (msg) => add(msg, 'info'),
  };

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const Toasts = toasts.length > 0 ? createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm text-white ${COLORS[t.type]}`}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100 flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  ) : null;

  return { toast, Toasts };
}
