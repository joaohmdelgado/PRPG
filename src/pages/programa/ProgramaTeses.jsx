import React, { useState, useEffect } from 'react';
import { API_URL } from '../../api';
import { usePrograma } from '../../components/programa/ProgramaContext';
import { PageHero, EmptyState, Spinner } from '../../components/programa/ProgramaUI';

const TIPOS = { M: 'Mestrado', D: 'Doutorado', P: 'Mestrado Profissional' };

export default function ProgramaTeses() {
  const { programa, slug } = usePrograma();
  const [teses, setTeses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/teses-dissertacoes?programa=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTeses(Array.isArray(d) ? d : []))
      .catch(() => setTeses([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const filtradas = teses.filter((t) => {
    const ok = !busca || t.title?.toLowerCase().includes(busca.toLowerCase()) || t.field_autor_resolved?.nome?.toLowerCase().includes(busca.toLowerCase());
    const okTipo = !tipo || t.field_tipo_td === tipo;
    return ok && okTipo;
  });

  const anos = [...new Set(teses.map((t) => t.field_ano).filter(Boolean))].sort((a, b) => b - a);
  const [ano, setAno] = useState('');
  const filtFinal = filtradas.filter((t) => !ano || String(t.field_ano) === ano);

  return (
    <div>
      <PageHero icon="fa-graduation-cap" eyebrow={programa.sigla} title="Teses e Dissertações" subtitle="Produções acadêmicas do programa" />

      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            placeholder="Buscar por título ou autor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--prog-primary)] focus:border-transparent"
          />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="">Todos os tipos</option>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {anos.length > 1 && (
            <select value={ano} onChange={(e) => setAno(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">Todos os anos</option>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>

        {loading ? <Spinner /> : filtFinal.length === 0 ? (
          <EmptyState icon="fa-graduation-cap" titulo="Nenhuma produção encontrada" descricao="Tente outros filtros ou acesse o repositório institucional." />
        ) : (
          <div className="space-y-3">
            {filtFinal.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-all">
                <div className="flex items-start gap-4">
                  <span className="shrink-0 w-10 h-10 rounded-lg bg-[var(--prog-primary)]/10 flex items-center justify-center text-[var(--prog-primary)]">
                    <i className="fa-solid fa-scroll text-sm"></i>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm leading-snug mb-1">{t.title}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {t.field_autor_resolved?.nome && <span><i className="fa-solid fa-user mr-1"></i>{t.field_autor_resolved.nome}</span>}
                      {t.field_ano && <span><i className="fa-solid fa-calendar mr-1"></i>{t.field_ano}</span>}
                      {t.field_tipo_td && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--prog-primary)]/10 text-[var(--prog-primary)] font-medium">
                          {TIPOS[t.field_tipo_td] || t.field_tipo_td}
                        </span>
                      )}
                    </div>
                  </div>
                  {t.field_arquivo && (
                    <a href={t.field_arquivo} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-[var(--prog-primary)] hover:underline">
                      <i className="fa-solid fa-download"></i> PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
