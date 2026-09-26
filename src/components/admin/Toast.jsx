import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

const ICONS = { error: AlertCircle, success: CheckCircle, info: Info };
const COLORS = {
  error: 'bg-red-700',
  success: 'bg-green-700',
  info: 'bg-gray-800',
};

// Erros ficam até serem dispensados (quem lê por leitor de tela ou devagar não
// perde a mensagem); sucesso e informação somem sozinhos.
const DURACAO = { error: 0, success: 6000, info: 6000 };

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    const ms = DURACAO[type];
    if (ms) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);

  // Memoizado: `add` é estável, então `toast` mantém identidade entre
  // renders — evita que useCallback/useEffect que dependem de `toast`
  // (padrão usado em várias telas admin) reexecutem a cada render.
  const toast = useMemo(() => ({
    error: (msg) => add(msg, 'error'),
    success: (msg) => add(msg, 'success'),
    info: (msg) => add(msg, 'info'),
  }), [add]);

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  // As regiões vivas existem SEMPRE (vazias) e só o conteúdo muda: leitores de
  // tela só anunciam mudanças numa região que já estava na página. Sucesso e
  // informação vão numa região "polite"; erro, numa "assertive" (role=alert).
  const item = (t) => {
    const Icon = ICONS[t.type] || Info;
    return (
      <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm text-white ${COLORS[t.type]}`}>
        <Icon size={16} className="flex-shrink-0" aria-hidden="true" />
        <span className="flex-1">{t.message}</span>
        <button type="button" onClick={() => remove(t.id)} aria-label="Dispensar aviso" className="opacity-80 hover:opacity-100 flex-shrink-0 p-1">
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    );
  };

  const Toasts = createPortal(
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[70] flex flex-col gap-2 sm:max-w-sm sm:w-full pointer-events-none">
      <div role="status" aria-live="polite" aria-atomic="false" className="flex flex-col gap-2">
        {toasts.filter((t) => t.type !== 'error').map(item)}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="false" className="flex flex-col gap-2">
        {toasts.filter((t) => t.type === 'error').map(item)}
      </div>
    </div>,
    document.body
  );

  return { toast, Toasts };
}
