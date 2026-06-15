import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

// Layout do site público da PRPG: Navbar + conteúdo + Footer.
// Usado como rota-mãe (com <Outlet/>) para que o microsite do programa,
// que tem header/footer próprios, possa ser uma rota irmã sem a casca da PRPG.
export default function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
