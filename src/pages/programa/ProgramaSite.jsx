import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../api';
import { ProgramaContext } from '../../components/programa/ProgramaContext';
import ProgramaLayout from '../../components/programa/ProgramaLayout';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import InstitutionalPageContent from '../../components/InstitutionalPageContent';
import ProgramaHome from './ProgramaHome';
import ProgramaSobre from './ProgramaSobre';
import ProgramaNoticias from './ProgramaNoticias';
import ProgramaNoticia from './ProgramaNoticia';
import ProgramaEditais from './ProgramaEditais';
import ProgramaContato from './ProgramaContato';
import ProgramaDisciplinas from './ProgramaDisciplinas';
import ProgramaTeses from './ProgramaTeses';
import ProgramaFaq from './ProgramaFaq';
import ProgramaGrupos from './ProgramaGrupos';
import ProgramaDocumentos from './ProgramaDocumentos';
import ProgramaPessoas from './ProgramaPessoas';
import ProgramaBusca from './ProgramaBusca';
import ProgramaComissoes from './ProgramaComissoes';
import ProgramaDiscentes from './ProgramaDiscentes';
import ProgramaPagina from './ProgramaPagina';

function FullScreen({ children }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      {children}
    </div>
  );
}

export default function ProgramaSite() {
  const { programaSlug, '*': restPath } = useParams();
  const [programa, setPrograma] = useState(null);
  const [paginaGeral, setPaginaGeral] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | pagina | notfound | error

  // Quando o primeiro segmento não é o slug de nenhum programa, ele pode ser
  // o slug de uma página institucional geral (/<slug>, sem programa — ver
  // AdminPageForm.jsx). Só faz sentido quando não há mais nada depois dele.
  useEffect(() => {
    let active = true;
    setStatus('loading');
    // Com token (quando há sessão): quem edita o programa vê o microsite em
    // rascunho; para o público o rascunho responde 404.
    apiFetch(`/api/programas/slug/${encodeURIComponent(programaSlug)}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => { if (active) { setPrograma(data); setStatus('ok'); } })
      .catch((e) => {
        if (!active) return;
        if (e.message === '404' && !restPath) {
          apiFetch(`/api/pages/slug/${encodeURIComponent(programaSlug)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((page) => {
              if (!active) return;
              if (page && !page.programaId) {
                setPaginaGeral(page);
                setStatus('pagina');
              } else {
                setStatus('notfound');
              }
            })
            .catch(() => { if (active) setStatus('notfound'); });
        } else {
          setStatus(e.message === '404' ? 'notfound' : 'error');
        }
      });
    return () => { active = false; };
  }, [programaSlug, restPath]);

  useEffect(() => {
    if (!programa) return;
    const prev = document.title;
    const sigla = programa.sigla && programa.sigla !== 'S/SIGLA' ? `${programa.sigla} — ` : '';
    document.title = `${sigla}${programa.nome} | PRPG UFRPE`;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) { metaDesc = document.createElement('meta'); metaDesc.name = 'description'; document.head.appendChild(metaDesc); }
    const prevDesc = metaDesc.content;
    metaDesc.content = programa.descricao_curta || `Programa de Pós-Graduação ${programa.nome} da UFRPE`;

    // Open Graph
    const setOg = (prop, val) => {
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
      el.content = val;
    };
    setOg('og:title', `${sigla}${programa.nome} | PRPG UFRPE`);
    setOg('og:description', programa.descricao_curta || '');
    if (programa.logo_url) setOg('og:image', programa.logo_url);

    return () => {
      document.title = prev;
      metaDesc.content = prevDesc;
    };
  }, [programa]);

  if (status === 'loading') {
    return (
      <FullScreen>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ufrpe-blue"></div>
      </FullScreen>
    );
  }

  // Segmento não é um programa, mas é o slug de uma página institucional
  // geral (sem programa) — ver /<slug> em App.jsx/RESERVED_SLUGS.
  if (status === 'pagina') {
    return (
      <div className="flex flex-col min-h-screen w-full">
        <Navbar />
        <main className="flex-1">
          <InstitutionalPageContent page={paginaGeral} />
        </main>
        <Footer />
      </div>
    );
  }

  if (status === 'notfound' || status === 'error') {
    return (
      <FullScreen>
        <i className="fa-solid fa-compass text-gray-300 text-6xl mb-5"></i>
        <h1 className="font-heading font-bold text-3xl text-ufrpe-blue mb-3">Página não encontrada</h1>
        <p className="text-gray-600 max-w-md mb-8">
          {status === 'error'
            ? 'Não foi possível carregar este endereço. Tente novamente em instantes.'
            : 'Este endereço não existe no portal da PRPG.'}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/programas" className="px-6 py-3 bg-ufrpe-blue hover:bg-ufrpe-yellow hover:text-ufrpe-blue text-white font-bold rounded-xl transition-all">
            <i className="fa-solid fa-graduation-cap mr-2"></i> Ver todos os programas
          </Link>
          <Link to="/" className="px-6 py-3 border border-gray-200 text-ufrpe-blue font-bold rounded-xl hover:bg-white transition-all">
            <i className="fa-solid fa-arrow-left mr-2"></i> Portal da PRPG
          </Link>
        </div>
      </FullScreen>
    );
  }

  return (
    <ProgramaContext.Provider value={{ programa, slug: programaSlug }}>
      {!programa.microsite_ativo && (
        <div role="status" className="bg-amber-100 text-amber-900 text-sm text-center px-4 py-2 border-b border-amber-200">
          <i className="fa-solid fa-eye mr-2" aria-hidden="true"></i>
          Pré-visualização: este microsite ainda não está publicado e só é visível para quem o administra.
        </div>
      )}
      <ProgramaLayout>
        <Routes>
          <Route index element={<ProgramaHome />} />
          <Route path="sobre" element={<ProgramaSobre />} />
          <Route path="noticias" element={<ProgramaNoticias />} />
          <Route path="noticias/:id" element={<ProgramaNoticia />} />
          <Route path="editais" element={<ProgramaEditais />} />
          <Route path="busca" element={<ProgramaBusca />} />
          <Route path="comissoes" element={<ProgramaComissoes />} />
          <Route path="discentes" element={<ProgramaDiscentes />} />
          <Route path="pessoas" element={<ProgramaPessoas />} />
          <Route path="disciplinas" element={<ProgramaDisciplinas />} />
          <Route path="teses" element={<ProgramaTeses />} />
          <Route path="faq" element={<ProgramaFaq />} />
          <Route path="grupos-pesquisa" element={<ProgramaGrupos />} />
          <Route path="documentos" element={<ProgramaDocumentos />} />
          <Route path="contato" element={<ProgramaContato />} />
          {/* Endereço próprio de uma página institucional vinculada a este
              programa (/<programaSlug>/<pageSlug>) — precisa vir depois das
              rotas fixas acima para não "roubar" seus nomes. */}
          <Route path=":pageSlug" element={<ProgramaPagina />} />
          <Route path="*" element={<ProgramaHome />} />
        </Routes>
      </ProgramaLayout>
    </ProgramaContext.Provider>
  );
}
