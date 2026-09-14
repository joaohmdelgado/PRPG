import React from 'react';
import SafeHtml from './SafeHtml';

// Hero + corpo de uma página institucional customizada. Compartilhado entre
// /<slug> (página geral), /p/:slug (endereço legado) e /<programaSlug>/<slug>
// (página vinculada a um programa) — ver PageView.jsx e ProgramaPagina.jsx.
export default function InstitutionalPageContent({ page, heroClassName = 'bg-ufrpe-blue', breadcrumb }) {
  return (
    <>
      <div className={`${heroClassName} text-white py-16 relative overflow-hidden`}>
        <i className="fa-solid fa-file-lines text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
        <div className="container mx-auto px-4">
          {breadcrumb}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold leading-tight">
            {page.title}
          </h1>
          {page.body?.summary && (
            <p className="text-white/70 mt-4 text-lg max-w-4xl leading-relaxed">
              {page.body.summary}
            </p>
          )}
        </div>
      </div>

      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
            <SafeHtml
              className="text-gray-700 leading-relaxed html-content prose prose-blue max-w-none"
              html={page.body?.value}
            />
          </div>
        </div>
      </main>
    </>
  );
}
