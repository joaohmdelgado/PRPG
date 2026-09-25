import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../api';
import { usePrograma, programaPath } from '../../components/programa/ProgramaContext';
import { Spinner, EmptyState } from '../../components/programa/ProgramaUI';
import InstitutionalPageContent from '../../components/InstitutionalPageContent';

// Página institucional com endereço próprio dentro do microsite do programa
// (/<programaSlug>/<pageSlug>). A mesma página também aparece agregada na
// aba "Sobre" (ver ProgramaSobre.jsx) — este é o endereço direto e dedicado.
export default function ProgramaPagina() {
  const { programa, slug } = usePrograma();
  const { pageSlug } = useParams();
  const [pagina, setPagina] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | notfound

  useEffect(() => {
    let active = true;
    setStatus('loading');
    // ?programa= escopa a busca (o slug só é único dentro do programa — ver
    // pagesController.js), senão duas páginas de programas diferentes com o
    // mesmo nome (ex.: "Regimento") poderiam colidir.
    apiFetch(`/api/pages/slug/${encodeURIComponent(pageSlug)}?programa=${encodeURIComponent(programa.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (data) {
          setPagina(data);
          setStatus('ok');
        } else {
          setStatus('notfound');
        }
      })
      .catch(() => { if (active) setStatus('notfound'); });
    return () => { active = false; };
  }, [pageSlug, programa.id]);

  if (status === 'loading') return <Spinner />;

  if (status === 'notfound') {
    return (
      <main className="container mx-auto px-4 py-16">
        <EmptyState
          icon="fa-file-circle-xmark"
          title="Página não encontrada"
          hint="Esta página não existe ou não pertence a este programa."
        />
        <div className="text-center mt-6">
          <Link to={programaPath(slug)} className="text-[var(--prog-primary)] font-semibold hover:opacity-70">
            <i className="fa-solid fa-arrow-left mr-2"></i> Voltar para o início
          </Link>
        </div>
      </main>
    );
  }

  return <InstitutionalPageContent page={pagina} heroClassName="bg-[var(--prog-primary)]" />;
}
