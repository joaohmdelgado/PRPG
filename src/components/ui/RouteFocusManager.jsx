import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Numa SPA a troca de rota não recarrega a página: o foco do teclado fica onde
// estava (num link do menu que já nem existe na tela), o leitor de tela não
// percebe que o conteúdo mudou e a rolagem fica onde estava. A cada navegação,
// o foco vai para o conteúdo principal e a rolagem volta ao topo (exceto quando
// o endereço tem âncora #, que decide a rolagem). Não roda no primeiro
// carregamento (o foco natural da página já está certo) nem quando só a
// consulta (?filtro=) muda.
export default function RouteFocusManager({ alvoId }) {
  const { pathname, hash } = useLocation();
  const anterior = useRef(pathname);
  useEffect(() => {
    if (anterior.current === pathname) return;
    anterior.current = pathname;
    const alvo = document.getElementById(alvoId);
    if (!alvo) return;
    if (!hash) {
      alvo.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    alvo.focus({ preventScroll: true });
  }, [pathname, hash, alvoId]);
  return null;
}
