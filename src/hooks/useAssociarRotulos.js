import { useEffect } from 'react';

// REDE DE SEGURANÇA (Fase U.4). Os formulários do painel escritos antes do
// componente `Field` usam <label> sem `htmlFor` (eram 246 de 247). Migrá-los um
// a um leva tempo; enquanto isso, este hook liga cada rótulo solto ao campo que
// vem logo depois dele — o mesmo que o autor pretendia visualmente — para que o
// leitor de tela anuncie o nome do campo e o clique no rótulo dê foco.
//
// Só mexe onde não há ligação: rótulo que já tem `for`, que envolve o campo ou
// cujo próximo campo é ambíguo (vários controles) fica como está. Telas novas
// não devem depender disto: usar `Field`/`FileField` (components/ui/Field.jsx).

const CONTROLES = 'input:not([type="hidden"]):not([type="file"]), select, textarea';
let contador = 0;

const controleDoRotulo = (rotulo) => {
  // 1. o irmão seguinte é o controle
  const prox = rotulo.nextElementSibling;
  if (prox) {
    if (prox.matches(CONTROLES)) return prox;
    // 2. o irmão seguinte é um invólucro (ex.: div "relative" com ícone) com UM controle
    const dentro = prox.querySelectorAll(CONTROLES);
    if (dentro.length === 1) return dentro[0];
  }
  // 3. o pai tem um único controle
  const irmaos = rotulo.parentElement?.querySelectorAll(CONTROLES);
  if (irmaos && irmaos.length === 1) return irmaos[0];
  return null;
};

export function associarRotulos(raiz) {
  if (!raiz) return 0;
  let n = 0;
  raiz.querySelectorAll('label:not([for])').forEach((rotulo) => {
    if (rotulo.querySelector(CONTROLES)) return; // já envolve o campo
    const controle = controleDoRotulo(rotulo);
    if (!controle) return;
    if (!controle.id) controle.id = `campo-auto-${++contador}`;
    rotulo.setAttribute('for', controle.id);
    n += 1;
  });
  return n;
}

export default function useAssociarRotulos(ref) {
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return undefined;
    let agendado = 0;
    const rodar = () => {
      agendado = 0;
      associarRotulos(raiz);
    };
    rodar();
    const obs = new MutationObserver(() => {
      if (!agendado) agendado = requestAnimationFrame(rodar);
    });
    obs.observe(raiz, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      if (agendado) cancelAnimationFrame(agendado);
    };
  }, [ref]);
}
