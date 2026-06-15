import React from 'react';
import { usePrograma } from '../../components/programa/ProgramaContext';
import { PageHero } from '../../components/programa/ProgramaUI';

const TIPO_LABEL = {
  COMISSAO_CPG: 'Câmara/Comissão de Pós-Graduação (CPG)',
  COMISSAO_BOLSAS: 'Comissão de Bolsas',
  COMISSAO_SELECAO: 'Comissão de Seleção',
  COMISSAO_PESQUISA: 'Comissão de Pesquisa',
  COMISSAO_ORIENTACAO: 'Comissão de Orientação',
};

function MemberChip({ pessoa }) {
  const nome = pessoa?.nome || pessoa?.perfil_nome || '—';
  const foto = pessoa?.foto_url || pessoa?.perfil_foto_url;
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
      {foto ? (
        <img src={foto} alt={nome} className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-[var(--prog-primary)]/10 flex items-center justify-center shrink-0">
          <i className="fa-solid fa-user text-[var(--prog-primary)]/40 text-sm"></i>
        </div>
      )}
      <span className="text-sm font-medium text-gray-800 truncate">{nome}</span>
    </div>
  );
}

export default function ProgramaComissoes() {
  const { programa } = usePrograma();
  const comissoes = programa.comissoes || {};
  const tipos = Object.keys(comissoes).filter((k) => comissoes[k]?.length > 0);

  return (
    <>
      <PageHero
        icon="fa-users-gear"
        eyebrow="Gestão"
        title="Comissões do Programa"
      />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {tipos.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <i className="fa-solid fa-users-gear text-5xl mb-4 block opacity-30"></i>
            <p>Nenhuma comissão cadastrada.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {tipos.map((tipo) => (
              <section key={tipo} className="bg-gray-50 rounded-2xl p-6">
                <h2 className="font-heading font-bold text-lg text-[var(--prog-primary)] mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-circle-chevron-right text-[var(--prog-accent)] text-sm"></i>
                  {TIPO_LABEL[tipo] || tipo.replace('COMISSAO_', '').replace('_', ' ')}
                  <span className="text-xs font-normal text-gray-400">({comissoes[tipo].length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {comissoes[tipo].map((p, i) => <MemberChip key={p?.pessoa_id || i} pessoa={p} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
