import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((message, { title = 'Confirmar exclusão' } = {}) =>
    new Promise((resolve) => setState({ message, title, resolve })), []);

  const resolve = (val) => { state?.resolve(val); setState(null); };

  const modal = state ? createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => resolve(false)} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-gray-800 text-base">{state.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{state.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => resolve(false)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => resolve(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return { confirm, ConfirmModal: modal };
}
