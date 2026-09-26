import React, { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import RouteFocusManager from './ui/RouteFocusManager';
import useAssociarRotulos from '../hooks/useAssociarRotulos';

// Layout do site público da PRPG: Navbar + conteúdo + Footer.
// Usado como rota-mãe (com <Outlet/>) para que o microsite do programa,
// que tem header/footer próprios, possa ser uma rota irmã sem a casca da PRPG.
export default function PublicLayout() {
  const mainRef = useRef(null);
  useAssociarRotulos(mainRef);
  return (
    <div className="flex flex-col min-h-screen w-full">
      <a href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[80] focus:bg-white focus:text-ufrpe-blue focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg">
        Ir para o conteúdo
      </a>
      <RouteFocusManager alvoId="conteudo" />
      <Navbar />
      <main id="conteudo" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
      </main>
      <Footer />
    </div>
  );
}
