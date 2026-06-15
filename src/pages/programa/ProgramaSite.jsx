import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, Link } from 'react-router-dom';
import { API_URL } from '../../api';
import { ProgramaContext } from '../../components/programa/ProgramaContext';
import ProgramaLayout from '../../components/programa/ProgramaLayout';
import ProgramaHome from './ProgramaHome';
import ProgramaSobre from './ProgramaSobre';
import ProgramaNoticias from './ProgramaNoticias';
import ProgramaNoticia from './ProgramaNoticia';
import ProgramaEditais from './ProgramaEditais';
import ProgramaContato from './ProgramaContato';

function FullScreen({ children }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      {children}
    </div>
  );
}

export default function ProgramaSite() {
  const { programaSlug } = useParams();
  const [programa, setPrograma] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | notfound | error

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetch(`${API_URL}/api/programas/slug/${encodeURIComponent(programaSlug)}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => { if (active) { setPrograma(data); setStatus('ok'); } })
      .catch((e) => { if (active) setStatus(e.message === '404' ? 'notfound' : 'error'); });
    return () => { active = false; };
  }, [programaSlug]);

  useEffect(() => {
    if (!programa) return;
    const prev = document.title;
    const sigla = programa.sigla && programa.sigla !== 'S/SIGLA' ? `${programa.sigla} — ` : '';
    document.title = `${sigla}${programa.nome} | PRPG UFRPE`;
    return () => { document.title = prev; };
  }, [programa]);

  if (status === 'loading') {
    return (
      <FullScreen>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ufrpe-blue"></div>
      </FullScreen>
    );
  }

  if (status === 'notfound' || status === 'error') {
    return (
      <FullScreen>
        <i className="fa-solid fa-compass text-gray-300 text-6xl mb-5"></i>
        <h1 className="font-heading font-bold text-3xl text-ufrpe-blue mb-3">Programa não encontrado</h1>
        <p className="text-gray-600 max-w-md mb-8">
          {status === 'error'
            ? 'Não foi possível carregar este programa. Tente novamente em instantes.'
            : 'Não existe um programa de pós-graduação publicado neste endereço.'}
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
      <ProgramaLayout>
        <Routes>
          <Route index element={<ProgramaHome />} />
          <Route path="sobre" element={<ProgramaSobre />} />
          <Route path="noticias" element={<ProgramaNoticias />} />
          <Route path="noticias/:id" element={<ProgramaNoticia />} />
          <Route path="editais" element={<ProgramaEditais />} />
          <Route path="contato" element={<ProgramaContato />} />
          <Route path="*" element={<ProgramaHome />} />
        </Routes>
      </ProgramaLayout>
    </ProgramaContext.Provider>
  );
}
