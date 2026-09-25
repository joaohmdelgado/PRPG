import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api';

// Valores de um domínio de `vocabularios` (Fase F.4): categorias de notícia e
// de edital, seções de documentos, subcategorias de resolução, tipos de bolsa.
// `todos`: inclui inativos e a contagem de uso (tela de administração).
// Devolve { itens, carregando, recarregar }; em erro, lista vazia.
export default function useVocabulario(dominio, { todos = false } = {}) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      const r = await apiFetch(`/api/vocabularios?dominio=${encodeURIComponent(dominio)}${todos ? '&todos=1' : ''}`, { auth: todos });
      setItens(r.ok ? await r.json() : []);
    } catch {
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }, [dominio, todos]);

  useEffect(() => { recarregar(); }, [recarregar]);

  return { itens, carregando, recarregar };
}

// Cores de selo que o painel oferece. As classes precisam aparecer
// literalmente no código para o Tailwind gerá-las — por isso a cor salva no
// vocabulário é sempre uma destas (não texto livre).
export const PALETA_SELOS = [
  { nome: 'Azul-claro', cor: 'bg-ufrpe-cyan text-white' },
  { nome: 'Azul', cor: 'bg-blue-600 text-white' },
  { nome: 'Verde', cor: 'bg-green-600 text-white' },
  { nome: 'Roxo', cor: 'bg-purple-600 text-white' },
  { nome: 'Amarelo', cor: 'bg-ufrpe-yellow text-ufrpe-blue' },
  { nome: 'Âmbar', cor: 'bg-amber-600 text-white' },
  { nome: 'Vermelho', cor: 'bg-red-600 text-white' },
  { nome: 'Cinza', cor: 'bg-gray-600 text-white' },
];

// Rótulo e classes do selo de um valor, com fallback quando o valor não está
// (mais) no vocabulário.
export const rotuloDe = (itens, valor, fallback = '') => itens.find((v) => v.valor === valor)?.rotulo || fallback || valor || '';
export const corDe = (itens, valor, fallback = 'bg-gray-600 text-white') => itens.find((v) => v.valor === valor)?.cor || fallback;
