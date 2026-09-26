import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../api';
import { usePrograma, programaPath } from '../../components/programa/ProgramaContext';
import { Spinner, EmptyState, ErrorState, formatDate } from '../../components/programa/ProgramaUI';
import SafeHtml from '../../components/SafeHtml';
import AvisoPreVisualizacao from '../../components/AvisoPreVisualizacao';
import Icone from '../../components/Icone';
import Imagem from '../../components/Imagem';

export default function ProgramaNoticia() {
  const { slug } = usePrograma();
  const { id } = useParams();
  const [noticia, setNoticia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErro(null);
    apiFetch(`/api/news/${encodeURIComponent(id)}`)
      .then((r) => { if (r.status === 404) return null; if (!r.ok) throw new Error(`Falha ao carregar (${r.status}).`); return r.json(); })
      .then((d) => { if (active) setNoticia(d); })
      .catch((e) => { if (active) setErro(e); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <Spinner />;

  if (erro) return <div className="container mx-auto px-4 py-16"><ErrorState erro={erro} /></div>;

  if (!noticia) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState icon="fa-circle-exclamation" title="Notícia não encontrada"
          hint="A notícia solicitada não existe ou foi removida." />
        <div className="text-center mt-6">
          <Link to={programaPath(slug, 'noticias')} className="text-[var(--prog-primary)] font-semibold hover:opacity-70">
            <Icone nome="fa-solid fa-arrow-left" className="mr-2" /> Voltar para Notícias
          </Link>
        </div>
      </div>
    );
  }

  const content = Array.isArray(noticia.content) ? noticia.content : noticia.content ? [noticia.content] : [];

  return (
    <article>
      <AvisoPreVisualizacao item={noticia} />
      {/* Cabeçalho */}
      <div className="bg-[var(--prog-primary)] text-white py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link to={programaPath(slug, 'noticias')} className="inline-flex items-center gap-2 text-white/70 hover:text-[var(--prog-accent)] text-sm mb-5 transition-colors">
            <Icone nome="fa-solid fa-arrow-left" className="text-xs" /> Notícias
          </Link>
          {noticia.category && (
            <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-[var(--prog-accent)] text-[var(--prog-primary)] mb-4">
              {noticia.category}
            </span>
          )}
          <h1 className="font-heading font-extrabold text-3xl md:text-4xl leading-tight">{noticia.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm mt-4">
            {noticia.date && <span><Icone nome="fa-regular fa-calendar" className="mr-2" />{formatDate(noticia.date)}</span>}
            {noticia.author && <span><Icone nome="fa-regular fa-user" className="mr-2" />{noticia.author}</span>}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {noticia.image && (
          <figure className="mb-8">
            <Imagem src={noticia.image} prioridade sizes="(min-width: 896px) 896px, 100vw" alt={noticia.title}
              className="w-full rounded-2xl shadow-sm border border-gray-100" />
            {noticia.imageCaption && <figcaption className="text-xs text-gray-400 mt-2 text-center italic">{noticia.imageCaption}</figcaption>}
          </figure>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 md:p-10">
          {noticia.excerpt && <p className="text-lg text-gray-700 font-medium leading-relaxed mb-6">{noticia.excerpt}</p>}
          <div className="space-y-5 text-gray-700 leading-relaxed">
            {content.map((par, i) => (
              <SafeHtml key={i} as="p" html={par} />
            ))}
          </div>

          {noticia.quote?.text && (
            <blockquote className="mt-8 border-l-4 border-[var(--prog-accent)] pl-5 py-2 italic text-gray-600">
              “{noticia.quote.text}”
              {noticia.quote.author && <footer className="not-italic font-semibold text-[var(--prog-primary)] mt-2 text-sm">— {noticia.quote.author}</footer>}
            </blockquote>
          )}

          {Array.isArray(noticia.tags) && noticia.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-100">
              {noticia.tags.map((t, i) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-500">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
