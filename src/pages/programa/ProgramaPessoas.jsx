import React, { useState, useEffect } from 'react';
import { API_URL } from '../../api';
import { usePrograma } from '../../components/programa/ProgramaContext';

const PAPEL_LABEL = {
  DOCENTE_PERMANENTE: 'Docente Permanente',
  DOCENTE_COLABORADOR: 'Docente Colaborador',
};

function DocenteCard({ docente }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex gap-4 hover:shadow-md transition-shadow">
      <div className="shrink-0">
        {docente.foto_url ? (
          <img
            src={docente.foto_url}
            alt={docente.nome}
            className="w-16 h-16 rounded-full object-cover border-2 border-[var(--prog-primary)]/20"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[var(--prog-primary)]/10 flex items-center justify-center">
            <i className="fa-solid fa-user text-2xl text-[var(--prog-primary)]/40"></i>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-snug truncate">{docente.nome}</p>
        <span className="inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full bg-[var(--prog-primary)]/10 text-[var(--prog-primary)] font-medium">
          {PAPEL_LABEL[docente.papel] || docente.papel}
        </span>
        {docente.email_funcao && (
          <p className="mt-1.5 text-xs text-gray-500 truncate">
            <i className="fa-solid fa-envelope mr-1"></i>{docente.email_funcao}
          </p>
        )}
        <div className="flex gap-3 mt-2 flex-wrap">
          {docente.lattes && (
            <a href={docente.lattes} target="_blank" rel="noopener noreferrer"
               className="text-xs text-[var(--prog-primary)] hover:underline flex items-center gap-1">
              <i className="fa-solid fa-graduation-cap text-[10px]"></i> Lattes
            </a>
          )}
          {docente.orcid && (
            <a href={`https://orcid.org/${docente.orcid}`} target="_blank" rel="noopener noreferrer"
               className="text-xs text-[var(--prog-primary)] hover:underline flex items-center gap-1">
              <i className="fa-brands fa-orcid text-[10px]"></i> ORCID
            </a>
          )}
          {docente.google_scholar && (
            <a href={docente.google_scholar} target="_blank" rel="noopener noreferrer"
               className="text-xs text-[var(--prog-primary)] hover:underline flex items-center gap-1">
              <i className="fa-brands fa-google text-[10px]"></i> Scholar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProgramaPessoas() {
  const { programa, slug } = usePrograma();
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/programas/slug/${encodeURIComponent(slug)}/pessoas`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { setDocentes(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  const filtered = docentes.filter((d) =>
    !busca || d.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const permanentes = filtered.filter((d) => d.papel === 'DOCENTE_PERMANENTE');
  const colaboradores = filtered.filter((d) => d.papel === 'DOCENTE_COLABORADOR');

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--prog-primary)]"></div>
      </div>
    );
  }

  return (
    <section className="py-10 px-4 max-w-5xl mx-auto">
      <h1 className="font-heading font-bold text-3xl text-[var(--prog-primary)] mb-2">Corpo Docente</h1>
      <p className="text-gray-500 text-sm mb-6">
        {programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla + ' · ' : ''}{programa.nome}
      </p>

      {docentes.length > 4 && (
        <div className="relative mb-6">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            type="text"
            placeholder="Buscar docente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--prog-primary)]/30"
          />
        </div>
      )}

      {docentes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <i className="fa-solid fa-users text-5xl mb-4 block"></i>
          <p>Nenhum docente cadastrado neste programa.</p>
        </div>
      ) : (
        <>
          {permanentes.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold text-lg text-gray-700 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-star text-[var(--prog-accent)] text-sm"></i>
                Docentes Permanentes
                <span className="text-xs font-normal text-gray-400">({permanentes.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {permanentes.map((d) => <DocenteCard key={d.id} docente={d} />)}
              </div>
            </div>
          )}

          {colaboradores.length > 0 && (
            <div>
              <h2 className="font-semibold text-lg text-gray-700 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-handshake text-[var(--prog-primary)]/60 text-sm"></i>
                Docentes Colaboradores
                <span className="text-xs font-normal text-gray-400">({colaboradores.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {colaboradores.map((d) => <DocenteCard key={d.id} docente={d} />)}
              </div>
            </div>
          )}

          {filtered.length === 0 && busca && (
            <p className="text-center text-gray-400 py-10">Nenhum docente encontrado para "{busca}".</p>
          )}
        </>
      )}
    </section>
  );
}
