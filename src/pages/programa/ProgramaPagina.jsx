import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../api';
import { usePrograma, programaPath } from '../../components/programa/ProgramaContext';
import { Spinner, EmptyState, ErrorState } from '../../components/programa/ProgramaUI';
import InstitutionalPageContent from '../../components/InstitutionalPageContent';
import Icone from '../../components/Icone';

// Texto de verdade no HTML do editor — mesmo critério de temTexto() em
// server/utils/micrositeMenu.js ("<p>&nbsp;</p>" é vazio).
const temTexto = (html) =>
  !!html && /\S/.test(String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' '));

// Página institucional com endereço próprio dentro do microsite do programa
// (/<programaSlug>/<pageSlug>): as criadas pelo programa e as fixas (Impacto
// Social, Infraestrutura... — Fase S.2). Fixa ainda vazia fica fora do menu;
// quem chega pelo endereço vê "em construção" em vez de uma página em branco.
export default function ProgramaPagina() {
  const { programa, slug } = usePrograma();
  const { pageSlug } = useParams();
  const [pagina, setPagina] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | vazia | notfound

  useEffect(() => {
    let active = true;
    setStatus('loading');
    // ?programa= escopa a busca (o slug só é único dentro do programa — ver
    // pagesController.js), senão duas páginas de programas diferentes com o
    // mesmo nome (ex.: "Regimento") poderiam colidir.
    apiFetch(`/api/pages/slug/${encodeURIComponent(pageSlug)}?programa=${encodeURIComponent(programa.id)}`)
      .then((r) => { if (r.status === 404) return null; if (!r.ok) throw new Error(`Falha ao carregar (${r.status}).`); return r.json(); })
      .then((data) => {
        if (!active) return;
        if (data) {
          setPagina(data);
          setStatus(data.chave && !temTexto(data.body?.value) ? 'vazia' : 'ok');
        } else {
          setStatus('notfound');
        }
      })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [pageSlug, programa.id]);

  if (status === 'loading') return <Spinner />;

  if (status === 'error') {
    return <div className="container mx-auto px-4 py-16"><ErrorState erro="Não foi possível carregar a página." /></div>;
  }

  if (status === 'vazia') {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon="fa-file-pen"
          title={pagina.title}
          hint="Conteúdo em construção — as informações serão publicadas em breve."
        />
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon="fa-file-circle-xmark"
          title="Página não encontrada"
          hint="Esta página não existe ou não pertence a este programa."
        />
        <div className="text-center mt-6">
          <Link to={programaPath(slug)} className="text-[var(--prog-primary)] font-semibold hover:opacity-70">
            <Icone nome="fa-solid fa-arrow-left" className="mr-2" /> Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  return <InstitutionalPageContent page={pagina} heroClassName="bg-[var(--prog-primary)]" />;
}
