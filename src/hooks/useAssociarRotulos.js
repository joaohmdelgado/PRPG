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

const idDe = (el, prefixo) => {
  if (!el.id) el.id = `${prefixo}-${++contador}`;
  return el.id;
};

// Rótulos de widgets compostos, que um `for` não resolve: um campo de arquivo
// escondido dentro de um botão, o editor de texto rico (CKEditor) ou um grupo de
// opções. O rótulo nomeia o widget por aria-labelledby/role=group.
function ligarComposto(rotulo) {
  const alvo = rotulo.nextElementSibling;
  if (!alvo) return false;
  const rotuloId = idDe(rotulo, 'rotulo-auto');

  const arquivo = alvo.querySelectorAll('input[type="file"]');
  if (arquivo.length === 1) {
    const interno = arquivo[0].closest('label');
    if (!arquivo[0].hasAttribute('aria-labelledby')) {
      arquivo[0].setAttribute('aria-labelledby', interno ? `${rotuloId} ${idDe(interno, 'rotulo-auto')}` : rotuloId);
    }
    return true;
  }
  const editavel = alvo.querySelector('[contenteditable="true"]');
  if (editavel) {
    editavel.setAttribute('aria-labelledby', rotuloId);
    return true;
  }
  if (alvo.querySelectorAll(CONTROLES).length > 1) {
    if (!alvo.hasAttribute('role')) alvo.setAttribute('role', 'group');
    if (!alvo.hasAttribute('aria-labelledby')) alvo.setAttribute('aria-labelledby', rotuloId);
    return true;
  }
  return false; // ainda vazio (ex.: o editor carrega depois): tenta na próxima mutação
}

// Campo sem nome nenhum (filtros e buscas só com placeholder): o placeholder — ou,
// num <select>, a primeira opção, quase sempre "Todos os…" — vira o aria-label.
// É o último recurso; o certo é um <label> (Field).
const SEM_NOME = 'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), select, textarea';
function nomearSemRotulo(raiz) {
  let n = 0;
  raiz.querySelectorAll(SEM_NOME).forEach((el) => {
    if (el.labels?.length || el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || el.hasAttribute('title')) return;
    const nome = (el.getAttribute('placeholder') || (el.tagName === 'SELECT' ? el.options[0]?.textContent : '') || '').trim();
    if (!nome) return;
    el.setAttribute('aria-label', nome);
    n += 1;
  });
  return n;
}

export function associarRotulos(raiz) {
  if (!raiz) return 0;
  let n = 0;
  raiz.querySelectorAll('label:not([for])').forEach((rotulo) => {
    if (rotulo.querySelector(CONTROLES)) return; // já envolve o campo
    const controle = controleDoRotulo(rotulo);
    if (controle) {
      if (!controle.id) controle.id = `campo-auto-${++contador}`;
      rotulo.setAttribute('for', controle.id);
      n += 1;
    } else if (!rotulo.hasAttribute('data-rotulo-composto') && ligarComposto(rotulo)) {
      rotulo.setAttribute('data-rotulo-composto', '');
      n += 1;
    }
  });
  return n + nomearSemRotulo(raiz);
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
      // setTimeout (e não requestAnimationFrame): aba em segundo plano não desenha quadros,
      // e o leitor de tela precisa dos nomes mesmo assim.
      if (!agendado) agendado = setTimeout(rodar, 30);
    });
    obs.observe(raiz, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      if (agendado) clearTimeout(agendado);
    };
  }, [ref]);
}
