import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Links com âncora (/resolucoes#apoio-financeiro) numa página que monta as
// seções só depois de carregar da API: o navegador não acha o alvo no
// carregamento inicial. Rola até a seção quando `pronto` vira true.
export default function useScrollToHash(pronto) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!pronto || !hash) return;
    const alvo = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (alvo) alvo.scrollIntoView({ block: 'start' });
  }, [pronto, hash]);
}
