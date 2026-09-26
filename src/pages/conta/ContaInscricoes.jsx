import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { EstadoVazio } from '../../components/ui/Estados';

const RESULTADO = {
  PROFICIENCIA: { texto: 'Proficiência', cls: 'bg-green-100 text-green-900' },
  SUFICIENCIA: { texto: 'Suficiência', cls: 'bg-blue-100 text-blue-900' },
  INSUFICIENTE: { texto: 'Insuficiente', cls: 'bg-red-100 text-red-900' },
};
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

export default function ContaInscricoes() {
  const { inscricoes } = useOutletContext();
  return (
    <section aria-labelledby="t-inscricoes">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 id="t-inscricoes" className="font-heading text-xl font-semibold text-ufrpe-blue">Inscrições em proficiência</h2>
        <Link to="/proficiencia/inscricao" className="text-sm text-ufrpe-blue underline">Fazer uma nova inscrição</Link>
      </div>
      {inscricoes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <EstadoVazio icone={Languages} titulo="Você ainda não fez nenhuma inscrição."
            descricao="Quando houver um período aberto, a inscrição aparece aqui, com o resultado e a declaração."
            acao={<Link to="/proficiencia/inscricao" className="text-sm text-ufrpe-blue underline">Ver a inscrição de proficiência</Link>} />
        </div>
      ) : (
        <ul className="space-y-3">
          {inscricoes.map((i) => {
            const res = RESULTADO[i.resultado];
            return (
              <li key={i.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{i.periodo || 'Proficiência em línguas'}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{i.nivel} · {i.linguas.join(', ')}{i.criadaEm ? ` · inscrita em ${fmt(i.criadaEm)}` : ''}</p>
                  </div>
                  {i.status === 'AVALIADO' && res
                    ? <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${res.cls}`}>{res.texto}{i.nota != null ? ` · nota ${String(i.nota).replace('.', ',')}` : ''}</span>
                    : <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">Aguardando avaliação</span>}
                </div>
                {i.declaracaoEmitida && (
                  <p className="text-sm mt-3"><Link to="/minha-conta/declaracoes" className="text-ufrpe-blue underline">Declaração emitida — ver em Declarações</Link></p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
