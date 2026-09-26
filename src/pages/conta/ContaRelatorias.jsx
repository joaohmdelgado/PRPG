import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import { EstadoVazio } from '../../components/ui/Estados';
import useVocabulario from '../../hooks/useVocabulario';

const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');

// Processos da Câmara de Pós-Graduação em que a pessoa é relatora. Sem link para
// a ficha completa: ela é da secretaria da Câmara (exige papel do painel).
export default function ContaRelatorias() {
  const { relatorias } = useOutletContext();
  const { itens: situacoes } = useVocabulario('processo.situacao');
  const rotulo = (s) => situacoes.find((x) => x.valor === s)?.rotulo || s;
  return (
    <section aria-labelledby="t-relatorias">
      <h2 id="t-relatorias" className="font-heading text-xl font-semibold text-ufrpe-blue mb-4">Processos sob minha relatoria</h2>
      {relatorias.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <EstadoVazio icone={Gavel} titulo="Nenhum processo sob a sua relatoria."
            descricao="Quando a Câmara de Pós-Graduação designar um processo para você, ele aparece aqui, com o prazo de devolução." />
        </div>
      ) : (
        <ul className="space-y-3">
          {relatorias.map((r) => (
            <li key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-gray-700">{r.numero}</p>
                  <h3 className="font-semibold text-gray-900 mt-0.5">{r.assunto}</h3>
                  <p className="text-sm text-gray-600 mt-1">Situação: {rotulo(r.status)}{r.designadaEm ? ` · designado em ${fmt(r.designadaEm)}` : ''}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.atrasada ? 'bg-red-100 text-red-900' : 'bg-gray-100 text-gray-800'}`}>
                  {r.prazo ? `${r.atrasada ? 'Atrasado — prazo ' : 'Prazo '}${fmt(r.prazo)}` : 'Sem prazo definido'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
