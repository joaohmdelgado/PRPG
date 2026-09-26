import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, useParams, Link, Navigate } from 'react-router-dom';
import { apiFetch } from '../../api';
import { ProgramaContext } from '../../components/programa/ProgramaContext';
import ProgramaLayout from '../../components/programa/ProgramaLayout';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PaginaInstitucional from '../PaginaInstitucional';
import Icone from '../../components/Icone';
import { Carregando } from '../../components/ui/Estados';

// Cada subpágina é um chunk próprio: quem abre a home do microsite não baixa
// o código de Docentes, Teses, Disciplinas etc. (Fase P.1).
const ProgramaHome = lazy(() => import('./ProgramaHome'));
const ProgramaSobre = lazy(() => import('./ProgramaSobre'));
const ProgramaNoticias = lazy(() => import('./ProgramaNoticias'));
const ProgramaNoticia = lazy(() => import('./ProgramaNoticia'));
const ProgramaEditais = lazy(() => import('./ProgramaEditais'));
const ProgramaContato = lazy(() => import('./ProgramaContato'));
const ProgramaDisciplinas = lazy(() => import('./ProgramaDisciplinas'));
const ProgramaTeses = lazy(() => import('./ProgramaTeses'));
const ProgramaFaq = lazy(() => import('./ProgramaFaq'));
const ProgramaGrupos = lazy(() => import('./ProgramaGrupos'));
const ProgramaDocumentos = lazy(() => import('./ProgramaDocumentos'));
const ProgramaPessoas = lazy(() => import('./ProgramaPessoas'));
const ProgramaBusca = lazy(() => import('./ProgramaBusca'));
const ProgramaComissoes = lazy(() => import('./ProgramaComissoes'));
const ProgramaDiscentes = lazy(() => import('./ProgramaDiscentes'));
const ProgramaPagina = lazy(() => import('./ProgramaPagina'));
const ProgramaLinhas = lazy(() => import('./ProgramaLinhas'));

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
  const [status, setStatus] = useState('loading'); // loading | ok | pagina | automatica | notfound | error

  // Quando o primeiro segmento não é o slug de nenhum programa, ele pode ser
  // o slug de uma página institucional geral (/<slug>, sem programa — ver
  // AdminPageForm.jsx). Só faz sentido quando não há mais nada depois dele.
  useEffect(() => {
    let active = true;
    setStatus('loading');

    const buscarPaginaGeral = () =>
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
        if (e.message !== '404') { setStatus('error'); return; }
        // Programa existe mas o microsite não está publicado: leva à página
        // automática (/programas/<slug>, Fase N.2), qualquer que seja a
        // subpágina pedida. Assim /<slug> serve de destino fixo para o
        // redirecionamento dos domínios antigos (Fase S.6,
        // docs/redirecionamentos-dominios-programas.md), antes e depois de o
        // microsite ser publicado.
        apiFetch(`/api/programas/slug/${encodeURIComponent(programaSlug)}/publico`, { auth: false })
          .then((r) => {
            if (!active) return;
            if (r.ok) setStatus('automatica');
            else if (!restPath) buscarPaginaGeral();
            else setStatus('notfound');
          })
          .catch(() => { if (active) setStatus('notfound'); });
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

  if (status === 'automatica') {
    return <Navigate to={`/programas/${programaSlug}`} replace />;
  }

  // Segmento não é um programa, mas é o slug de uma página institucional
  // geral (sem programa) — ver /<slug> em App.jsx/RESERVED_SLUGS.
  if (status === 'pagina') {
    return (
      <div className="flex flex-col min-h-screen w-full">
        <Navbar />
        <main className="flex-1">
          <PaginaInstitucional slug={paginaGeral.slug} />
        </main>
        <Footer />
      </div>
    );
  }

  if (status === 'notfound' || status === 'error') {
    return (
      <FullScreen>
        <Icone nome="fa-solid fa-compass" className="text-gray-300 text-6xl mb-5" />
        <h1 className="font-heading font-bold text-3xl text-ufrpe-blue mb-3">Página não encontrada</h1>
        <p className="text-gray-600 max-w-md mb-8">
          {status === 'error'
            ? 'Não foi possível carregar este endereço. Tente novamente em instantes.'
            : 'Este endereço não existe no portal da PRPG.'}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/programas" className="px-6 py-3 bg-ufrpe-blue hover:bg-ufrpe-yellow hover:text-ufrpe-blue text-white font-bold rounded-xl transition-all">
            <Icone nome="fa-solid fa-graduation-cap" className="mr-2" /> Ver todos os programas
          </Link>
          <Link to="/" className="px-6 py-3 border border-gray-200 text-ufrpe-blue font-bold rounded-xl hover:bg-white transition-all">
            <Icone nome="fa-solid fa-arrow-left" className="mr-2" /> Portal da PRPG
          </Link>
        </div>
      </FullScreen>
    );
  }

  return (
    <ProgramaContext.Provider value={{ programa, slug: programaSlug }}>
      {!programa.microsite_ativo && (
        <div role="status" className="bg-amber-100 text-amber-900 text-sm text-center px-4 py-2 border-b border-amber-200">
          <Icone nome="fa-solid fa-eye" className="mr-2" aria-hidden="true" />
          Pré-visualização: este microsite ainda não está publicado e só é visível para quem o administra.
        </div>
      )}
      <ProgramaLayout>
        <Suspense fallback={<Carregando className="min-h-[40vh]" />}>
          <Routes>
            <Route index element={<ProgramaHome />} />
            <Route path="sobre" element={<ProgramaSobre />} />
            <Route path="noticias" element={<ProgramaNoticias />} />
            <Route path="noticias/:id" element={<ProgramaNoticia />} />
            <Route path="editais" element={<ProgramaEditais />} />
            <Route path="busca" element={<ProgramaBusca />} />
            <Route path="comissoes" element={<ProgramaComissoes />} />
            <Route path="discentes" element={<ProgramaDiscentes />} />
            <Route path="egressos" element={<ProgramaDiscentes egressos />} />
            <Route path="linhas-de-pesquisa" element={<ProgramaLinhas />} />
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
        </Suspense>
      </ProgramaLayout>
    </ProgramaContext.Provider>
  );
}
