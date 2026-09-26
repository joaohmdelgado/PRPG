import { useEffect, useState } from 'react';

// Segue uma media query (ex.: '(min-width: 1024px)'). Sem window (testes/SSR), `padrao`.
export default function useMediaQuery(consulta, padrao = false) {
  const [casa, setCasa] = useState(() =>
    (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(consulta).matches : padrao));
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(consulta);
    const onChange = () => setCasa(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [consulta]);
  return casa;
}
