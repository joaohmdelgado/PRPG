import React, { useState, useEffect } from 'react';
import { apiFetch, lerJson } from '../../api';
import { usePrograma } from '../../components/programa/ProgramaContext';
import Icone from '../../components/Icone';
import { ErrorState } from '../../components/programa/ProgramaUI';

const PAPEL_LABEL = {
  DISCENTE_MESTRADO:     'Mestrando(a)',
  DISCENTE_DOUTORADO:    'Doutorando(a)',
  DISCENTE_PROFISSIONAL: 'Mestrando(a) Profissional',
  EGRESSO:               'Egresso(a)',
};

const PAPEL_ICON = {
  DISCENTE_MESTRADO:     'fa-graduation-cap',
  DISCENTE_DOUTORADO:    'fa-user-graduate',
  DISCENTE_PROFISSIONAL: 'fa-briefcase',
  EGRESSO:               'fa-star',
};

function DiscenteCard({ discente }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex gap-4 hover:shadow-md transition-shadow">
      <div className="shrink-0">
        {discente.foto_url ? (
          <img
            src={discente.foto_url}
            alt={discente.nome}
            className="w-14 h-14 rounded-full object-cover border-2 border-[var(--prog-primary)]/20"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[var(--prog-primary)]/10 flex items-center justify-center">
            <Icone nome="fa-solid fa-user-graduate" className="text-xl text-[var(--prog-primary)]/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-snug truncate">{discente.nome}</p>
        <span className="inline-flex items-center gap-1 mt-0.5 text-xs px-2 py-0.5 rounded-full bg-[var(--prog-accent)]/15 text-[var(--prog-primary)] font-medium">
          <Icone nome={PAPEL_ICON[discente.papel] || 'fa-user'} className="text-[10px]" />
          {PAPEL_LABEL[discente.papel] || discente.papel}
        </span>
        <div className="flex gap-3 mt-2 flex-wrap">
          {discente.lattes && (
            <a href={discente.lattes} target="_blank" rel="noopener noreferrer"
               className="text-xs text-[var(--prog-primary)] hover:underline flex items-center gap-1">
              <Icone nome="fa-solid fa-graduation-cap" className="text-[10px]" /> Lattes
            </a>
          )}
          {discente.orcid && (
            <a href={`https://orcid.org/${discente.orcid}`} target="_blank" rel="noopener noreferrer"
               className="text-xs text-[var(--prog-primary)] hover:underline flex items-center gap-1">
              <Icone nome="fa-brands fa-orcid" className="text-[10px]" /> ORCID
            </a>
          )}
          {discente.google_scholar && (
            <a href={discente.google_scholar} target="_blank" rel="noopener noreferrer"
               className="text-xs text-[var(--prog-primary)] hover:underline flex items-center gap-1">
              <Icone nome="fa-brands fa-google" className="text-[10px]" /> Scholar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const GRUPOS = [
  { papel: 'DISCENTE_MESTRADO',     icon: 'fa-graduation-cap', cor: 'text-blue-600'  },
  { papel: 'DISCENTE_DOUTORADO',    icon: 'fa-user-graduate',  cor: 'text-purple-600' },
  { papel: 'DISCENTE_PROFISSIONAL', icon: 'fa-briefcase',      cor: 'text-teal-600'  },
  { papel: 'EGRESSO',               icon: 'fa-star',           cor: 'text-amber-500' },
];

// Mesma página para "Discentes" (em curso) e "Egressos" — itens separados do
// grupo "Pessoas" do menu (Fase S.1).
export default function ProgramaDiscentes({ egressos = false }) {
  const { programa, slug } = usePrograma();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    setLoading(true);
    lerJson(`/api/programas/slug/${encodeURIComponent(slug)}/discentes`, { auth: false })
      .then((d) => { setTodos(Array.isArray(d) ? d : []); setLoading(false); })
      .catch((e) => { setErro(e); setLoading(false); });
  }, [slug]);

  const discentes = todos.filter((d) => (d.papel === 'EGRESSO') === egressos);
  const grupos = GRUPOS.filter((g) => (g.papel === 'EGRESSO') === egressos);
  const filtered = discentes.filter(
    (d) => !busca || d.nome.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--prog-primary)]"></div>
      </div>
    );
  }

  if (erro) {
    return (
      <section className="py-10 px-4 max-w-5xl mx-auto"><ErrorState erro={erro} /></section>
    );
  }

  return (
    <section className="py-10 px-4 max-w-5xl mx-auto">
      <h1 className="font-heading font-bold text-3xl text-[var(--prog-primary)] mb-2">{egressos ? 'Egressos' : 'Corpo Discente'}</h1>
      <p className="text-gray-500 text-sm mb-6">
        {programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla + ' · ' : ''}{programa.nome}
      </p>

      {discentes.length > 6 && (
        <div className="relative mb-6">
          <Icone nome="fa-solid fa-magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder={egressos ? 'Buscar egresso...' : 'Buscar discente...'}
            aria-label={egressos ? 'Buscar egresso' : 'Buscar discente'}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--prog-primary)]/30"
          />
        </div>
      )}

      {discentes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Icone nome="fa-solid fa-user-graduate" className="text-5xl mb-4 block" />
          <p>{egressos ? 'Nenhum egresso cadastrado neste programa.' : 'Nenhum discente cadastrado neste programa.'}</p>
        </div>
      ) : (
        <div className="space-y-10">
          {grupos.map(({ papel, icon, cor }) => {
            const grupo = filtered.filter((d) => d.papel === papel);
            if (grupo.length === 0) return null;
            return (
              <div key={papel}>
                <h2 className="font-semibold text-lg text-gray-700 mb-4 flex items-center gap-2">
                  <Icone nome={icon} className={`${cor} text-sm`} />
                  {PAPEL_LABEL[papel]}
                  <span className="text-xs font-normal text-gray-400">({grupo.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grupo.map((d) => <DiscenteCard key={d.id} discente={d} />)}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && busca && (
            <p className="text-center text-gray-400 py-10">Ninguém encontrado para "{busca}".</p>
          )}
        </div>
      )}
    </section>
  );
}
