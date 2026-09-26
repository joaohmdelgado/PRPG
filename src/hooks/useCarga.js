import { useCallback, useEffect, useRef, useState } from 'react';

// Carrega dados com os três estados separados (Fase U.6): `carregando`, `erro`
// e `dados` (null até chegar). `buscar` devolve os dados ou lança; um status
// != 2xx deve lançar (use `lerJson`). `recarregar()` refaz sem piscar o vazio.
//   const { dados, carregando, erro, recarregar } = useCarga(() => lerJson('/api/x'), [dep]);
export default function useCarga(buscar, deps = [], { ativo = true } = {}) {
  const [estado, setEstado] = useState({ dados: null, carregando: ativo, erro: null });
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;
  const contador = useRef(0);

  const executar = useCallback(async () => {
    const minha = ++contador.current;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    try {
      const dados = await buscarRef.current();
      if (minha === contador.current) setEstado({ dados, carregando: false, erro: null });
    } catch (erro) {
      if (minha === contador.current) setEstado((e) => ({ ...e, carregando: false, erro }));
    }
  }, []);

  useEffect(() => {
    if (ativo) executar();
    return () => { contador.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, ...deps]);

  return { ...estado, recarregar: executar };
}
