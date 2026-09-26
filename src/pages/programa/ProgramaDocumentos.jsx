import React, { useState, useEffect } from 'react';
import { API_URL, lerJson } from '../../api';
import { usePrograma } from '../../components/programa/ProgramaContext';
import { PageHero, EmptyState, ErrorState, Spinner } from '../../components/programa/ProgramaUI';
import Icone from '../../components/Icone';

function SecaoDocumentos({ titulo, icone, itens }) {
  if (!itens.length) return null;
  return (
    <section className="mb-10">
      <h2 className="font-heading font-bold text-lg text-gray-800 flex items-center gap-2 mb-4">
        <Icone nome={icone} className="text-[var(--prog-primary)]" /> {titulo}
      </h2>
      <div className="space-y-2">
        {itens.map((item) => (
          <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-all">
            <Icone nome="fa-solid fa-file-pdf" className="text-red-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
              {item.sectionTitle && <p className="text-xs text-gray-400">{item.sectionTitle}</p>}
            </div>
            {item.link && (
              <a href={item.link.startsWith('http') ? item.link : `${API_URL}${item.link}`}
                target="_blank" rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-[var(--prog-primary)] hover:underline">
                <Icone nome="fa-solid fa-download" /> Baixar
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProgramaDocumentos() {
  const { programa, slug } = usePrograma();
  const [resolucoes, setResolucoes] = useState([]);
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const enc = encodeURIComponent(slug);
    Promise.all([
      lerJson(`/api/resolucoes?programa=${enc}`, { auth: false }),
      lerJson(`/api/formularios?programa=${enc}`, { auth: false }),
    ])
      .then(([res, form]) => {
        setResolucoes(Array.isArray(res) ? res : []);
        setFormularios(Array.isArray(form) ? form : []);
      })
      .catch((e) => setErro(e))
      .finally(() => setLoading(false));
  }, [slug]);

  const total = resolucoes.length + formularios.length;

  return (
    <div>
      <PageHero icon="fa-folder-open" eyebrow={programa.sigla} title="Documentos" subtitle="Resoluções e formulários do programa" />

      <div className="container mx-auto px-4 py-10 max-w-4xl">
        {loading ? <Spinner /> : erro ? <ErrorState erro={erro} /> : total === 0 ? (
          <EmptyState icon="fa-folder-open" titulo="Nenhum documento disponível" descricao="Os documentos deste programa serão listados aqui em breve." />
        ) : (
          <>
            <SecaoDocumentos titulo="Resoluções" icone="fa-gavel" itens={resolucoes} />
            <SecaoDocumentos titulo="Formulários" icone="fa-file-lines" itens={formularios} />
          </>
        )}
      </div>
    </div>
  );
}
