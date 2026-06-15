import React, { useState, useEffect } from 'react';
import { API_URL } from '../../api';
import { usePrograma } from '../../components/programa/ProgramaContext';
import { PageHero, EmptyState, Spinner } from '../../components/programa/ProgramaUI';

function Accordion({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900 text-sm">{item.title}</span>
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} text-[var(--prog-primary)] text-xs shrink-0`}></i>
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white border-t border-gray-100">
          {item.field_resposta ? (
            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: item.field_resposta }} />
          ) : (
            <p className="text-sm text-gray-500 italic">Resposta não disponível.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProgramaFaq() {
  const { programa, slug } = usePrograma();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/faq?programa=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setFaqs(Array.isArray(d) ? d : []))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const filtradas = faqs.filter((f) =>
    !busca || f.title?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <PageHero icon="fa-circle-question" eyebrow={programa.sigla} title="Perguntas Frequentes" subtitle="Dúvidas comuns sobre o programa" />

      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <input
          type="text"
          placeholder="Buscar pergunta..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm mb-8 focus:ring-2 focus:ring-[var(--prog-primary)] focus:border-transparent"
        />

        {loading ? <Spinner /> : filtradas.length === 0 ? (
          <EmptyState icon="fa-circle-question" titulo="Nenhuma pergunta encontrada" descricao="Entre em contato com a secretaria do programa." />
        ) : (
          <div className="space-y-3">
            {filtradas.map((f) => <Accordion key={f.id} item={f} />)}
          </div>
        )}
      </div>
    </div>
  );
}
