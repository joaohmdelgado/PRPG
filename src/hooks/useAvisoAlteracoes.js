import { useEffect, useRef, useState } from 'react';

// Aviso de alterações não salvas (Fase F.6): se o formulário mudou desde que
// foi carregado, fechar/recarregar a aba pede confirmação do navegador.
// `pronto`: o formulário terminou de carregar. O retrato inicial é tirado um
// pouco depois — o CKEditor normaliza o HTML ao iniciar e isso não pode contar
// como alteração da pessoa.
// Limitação: navegação interna (links do painel) não é interceptada — o app
// usa BrowserRouter, e o bloqueio de rota do React Router exige data router.
export default function useAvisoAlteracoes(dados, pronto) {
  const atual = useRef(dados);
  atual.current = dados;
  const [inicial, setInicial] = useState(null);

  useEffect(() => {
    if (!pronto || inicial !== null) return undefined;
    const t = setTimeout(() => setInicial(JSON.stringify(atual.current)), 1500);
    return () => clearTimeout(t);
  }, [pronto, inicial]);

  const sujo = inicial !== null && JSON.stringify(dados) !== inicial;

  useEffect(() => {
    if (!sujo) return undefined;
    const aviso = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sujo]);

  return { sujo };
}
