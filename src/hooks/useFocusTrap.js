import { useEffect } from 'react';

const FOCAVEIS = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

// Visível de verdade (checkVisibility cobre display:none em ancestral, o que
// `offsetParent` erra para elementos position:fixed); sem ele (jsdom), só o atributo hidden/inert.
const visivel = (n) => (typeof n.checkVisibility === 'function'
  ? n.checkVisibility({ visibilityProperty: true })
  : !n.closest('[hidden], [inert]'));

export const focaveisDe = (el) => [...el.querySelectorAll(FOCAVEIS)].filter(visivel);

// Mantém o foco do teclado dentro de `ref` enquanto `ativo` (diálogos e o
// drawer do painel): Tab/Shift+Tab dão a volta, Escape chama `onEscape`, o foco
// entra no primeiro campo (ou em `inicial`, seletor CSS) e, ao fechar, volta
// para quem tinha o foco antes — sem isso o teclado "se perde" atrás do modal.
export default function useFocusTrap(ref, ativo, { onEscape, inicial } = {}) {
  useEffect(() => {
    if (!ativo || !ref.current) return undefined;
    const container = ref.current;
    const anterior = document.activeElement;

    const alvo = (inicial && container.querySelector(inicial)) || focaveisDe(container)[0] || container;
    if (alvo === container && !container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
    alvo.focus({ preventScroll: true });

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onEscape) {
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const itens = focaveisDe(container);
      if (itens.length === 0) { e.preventDefault(); return; }
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (e.shiftKey && (document.activeElement === primeiro || !container.contains(document.activeElement))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (document.activeElement === ultimo || !container.contains(document.activeElement))) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (anterior && typeof anterior.focus === 'function' && document.contains(anterior)) {
        anterior.focus({ preventScroll: true });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);
}
