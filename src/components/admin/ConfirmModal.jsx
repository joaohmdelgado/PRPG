import React, { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import Dialog from '../ui/Dialog';

// `confirm(mensagem, { title, confirmar, perigo })` devolve uma Promise<boolean>.
// Usa o Dialog acessível: foco preso, Escape cancela, foco volta ao botão que
// abriu, e o foco inicial fica em "Cancelar" (a opção segura).
export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((message, { title = 'Confirmar exclusão', confirmar = 'Confirmar', perigo = true } = {}) =>
    new Promise((resolve) => setState({ message, title, confirmar, perigo, resolve })), []);

  const resolve = (val) => { state?.resolve(val); setState(null); };

  const modal = state ? (
    <Dialog
      papel="alertdialog"
      tamanho="sm"
      titulo={state.title}
      descricao={state.message}
      onFechar={() => resolve(false)}
      inicial="[data-cancelar]"
      ocultarFechar
      rodape={(
        <>
          <button
            type="button" data-cancelar onClick={() => resolve(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button" onClick={() => resolve(true)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${state.perigo ? 'bg-red-700 hover:bg-red-800' : 'bg-ufrpe-blue hover:bg-[#2a3a66]'}`}
          >
            {state.confirmar}
          </button>
        </>
      )}
    >
      {state.perigo && (
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600 shrink-0" aria-hidden="true" />
          Esta ação pode não ter volta.
        </p>
      )}
    </Dialog>
  ) : null;

  return { confirm, ConfirmModal: modal };
}
