import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import CabecalhoPagina from '../components/CabecalhoPagina';
import AvisoPreVisualizacao from '../components/AvisoPreVisualizacao';
import SafeHtml from '../components/SafeHtml';

// Página de conteúdo da PRPG vinda do painel ("Páginas"). Atende às páginas
// institucionais de endereço fixo (Fase H.3 — /sobre, /historico...: antes um
// componente JSX cada) e às páginas criadas no painel (/p/:slug).
// `slug`: endereço fixo; sem ele, usa o :slug da rota.

// Ícone decorativo do cabeçalho de cada página institucional.
const ICONES = {
  sobre: 'fa-solid fa-circle-info',
  'missao-visao-valores': 'fa-solid fa-bullseye',
  historico: 'fa-solid fa-clock-rotate-left',
  financeiro: 'fa-solid fa-coins',
  'proext-pg': 'fa-solid fa-hands-holding-child',
  especializacao: 'fa-solid fa-certificate',
  'residencia-profissional': 'fa-solid fa-briefcase',
  'sobre-internacionalizacao': 'fa-solid fa-earth-americas',
  'alunos-estrangeiros': 'fa-solid fa-passport',
  'capes-print': 'fa-solid fa-globe',
  'mobilidade-estudantil': 'fa-solid fa-plane-departure',
  reconhecimento: 'fa-solid fa-stamp',
  'relatorios-autoavaliacao': 'fa-solid fa-chart-pie',
  privacidade: 'fa-solid fa-user-shield',
};

export default function PaginaInstitucional({ slug: slugFixo }) {
  const params = useParams();
  const slug = slugFixo || params.slug;
  const [page, setPage] = useState(null);
  const [estado, setEstado] = useState('carregando'); // carregando | ok | ausente | erro

  useEffect(() => {
    let vivo = true;
    setEstado('carregando');
    apiFetch(`/api/pages/slug/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!vivo) return;
        if (r.status === 404) { setEstado('ausente'); return; }
        if (!r.ok) throw new Error(String(r.status));
        setPage(await r.json());
        setEstado('ok');
      })
      .catch(() => { if (vivo) setEstado('erro'); });
    return () => { vivo = false; };
  }, [slug]);

  if (estado === 'carregando') {
    return (
      <div className="flex justify-center items-center py-24 min-h-[400px]" role="status">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ufrpe-blue" aria-hidden="true"></div>
        <span className="sr-only">Carregando…</span>
      </div>
    );
  }

  if (estado !== 'ok') {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <i className="fa-solid fa-circle-exclamation text-gray-300 text-6xl mb-4" aria-hidden="true"></i>
        <h1 className="font-heading font-bold text-3xl text-ufrpe-blue mb-4">
          {estado === 'erro' ? 'Não foi possível carregar a página' : 'Página não encontrada'}
        </h1>
        <p className="text-gray-600 mb-8">
          {estado === 'erro' ? 'Tente novamente em alguns instantes.' : 'A página solicitada não existe ou foi removida.'}
        </p>
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-ufrpe-blue hover:bg-ufrpe-yellow hover:text-ufrpe-blue text-white font-bold rounded-xl transition-all">
          <i className="fa-solid fa-arrow-left" aria-hidden="true"></i> Voltar para o Início
        </Link>
      </div>
    );
  }

  return (
    <>
      <AvisoPreVisualizacao item={page} />
      <CabecalhoPagina
        titulo={page.title}
        subtitulo={page.body?.summary}
        icone={ICONES[page.chave] || ICONES[slug] || 'fa-solid fa-file-lines'}
      />
      <div className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <article className="bg-white p-6 sm:p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
            <SafeHtml className="html-content" html={page.body?.value} />
          </article>
        </div>
      </div>
    </>
  );
}
