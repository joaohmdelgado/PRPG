import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_URL } from '../api';
import SafeHtml from '../components/SafeHtml';

export default function PageView() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_URL}/api/pages/slug/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setPage(data);
        } else {
          setError('Página não encontrada.');
        }
      } catch (err) {
        setError('Erro de conexão ao buscar dados da página.');
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ufrpe-blue"></div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <i className="fa-solid fa-circle-exclamation text-gray-300 text-6xl mb-4"></i>
        <h2 className="font-heading font-bold text-3xl text-ufrpe-blue mb-4">Página não encontrada</h2>
        <p className="text-gray-600 mb-8">{error || 'A página solicitada não existe ou foi removida.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ufrpe-blue hover:bg-ufrpe-yellow hover:text-ufrpe-blue text-white font-bold rounded-xl transition-all"
        >
          <i className="fa-solid fa-arrow-left"></i> Voltar para o Início
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Page Header / Breadcrumbs */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <i className="fa-solid fa-file-lines text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
        <div className="container mx-auto px-4">
          <nav className="flex text-white/60 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link to="/" className="hover:text-ufrpe-yellow transition-colors">Início</Link>
              </li>
              <li>
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-white">Institucional</span>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-ufrpe-yellow font-medium truncate max-w-[200px] md:max-w-xs">{page.title}</span>
                </div>
              </li>
            </ol>
          </nav>
          
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

      {/* Main Content */}
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
