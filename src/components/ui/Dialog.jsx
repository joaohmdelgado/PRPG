import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import useFocusTrap from '../../hooks/useFocusTrap';

const LARGURAS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' };

// Diálogo modal acessível (Fase U.4): nome (`aria-labelledby`), `aria-modal`,
// foco preso e devolvido a quem o abriu, Escape fecha, o fundo não rola.
//   papel="alertdialog" para confirmações destrutivas (o foco vai em `inicial`).
export default function Dialog({
  aberto = true, onFechar, titulo, descricao, children, rodape, tamanho = 'md',
  papel = 'dialog', inicial, fecharAoClicarFora = true, ocultarFechar = false,
}) {
  const ref = useRef(null);
  const tituloId = useId();
  const descId = useId();
  useFocusTrap(ref, aberto, { onEscape: onFechar, inicial });

  useEffect(() => {
    if (!aberto) return undefined;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, [aberto]);

  if (!aberto) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={fecharAoClicarFora ? onFechar : undefined} />
      <div
        ref={ref}
        role={papel}
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricao ? descId : undefined}
        className={`relative bg-white rounded-xl shadow-2xl w-full ${LARGURAS[tamanho] || LARGURAS.md} max-h-[calc(100dvh-2rem)] flex flex-col outline-none`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div>
            <h2 id={tituloId} className="font-heading font-semibold text-gray-800 text-lg">{titulo}</h2>
            {descricao && <p id={descId} className="text-sm text-gray-600 mt-1">{descricao}</p>}
          </div>
          {!ocultarFechar && onFechar && (
            <button type="button" onClick={onFechar} aria-label="Fechar"
              className="p-1.5 -mr-2 -mt-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800">
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        {children && <div className="px-6 pb-4 overflow-y-auto">{children}</div>}
        {rodape && <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-wrap">{rodape}</div>}
      </div>
    </div>,
    document.body
  );
}
