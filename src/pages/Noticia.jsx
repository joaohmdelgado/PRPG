import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_URL } from '../api';
import SafeHtml from '../components/SafeHtml';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (regex.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = months[parseInt(month, 10) - 1];
    return `${parseInt(day, 10)} de ${monthName}, ${year}`;
  }
  return dateStr;
};

export default function Noticia() {
  const { id } = useParams();
  const [noticiasData, setNoticiasData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(`${API_URL}/api/news`);
        const data = await response.json();
        setNoticiasData(data);
      } catch (error) {
        console.error('Erro ao buscar notícias:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <div className="text-xl text-gray-500">Carregando notícia...</div>
      </div>
    );
  }

  // Find current news item
  const newsItem = noticiasData.find(item => item.id === id);

  if (!newsItem) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <i className="fa-solid fa-circle-exclamation text-gray-300 text-6xl mb-4"></i>
        <h2 className="font-heading font-bold text-3xl text-ufrpe-blue mb-4">Notícia não encontrada</h2>
        <p className="text-gray-600 mb-8">O artigo solicitado não existe ou foi removido.</p>
        <Link
          to="/noticias"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ufrpe-blue hover:bg-ufrpe-yellow hover:text-ufrpe-blue text-white font-bold rounded-xl transition-all"
        >
          <i class="fa-solid fa-arrow-left"></i> Voltar para Notícias
        </Link>
      </div>
    );
  }

  // Get related news (max 3 items, excluding current item)
  const relatedNews = noticiasData
    .filter(item => item.id !== newsItem.id)
    .slice(0, 3);

  const getCategoryBadgeClass = (categorySlug) => {
    switch (categorySlug) {
      case 'pesquisa':
        return 'bg-ufrpe-cyan text-white';
      case 'editais':
        return 'bg-ufrpe-yellow text-ufrpe-blue';
      case 'institucional':
        return 'bg-blue-600 text-white';
      case 'internacional':
        return 'bg-purple-600 text-white';
      case 'eventos':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <>
      {/* Main Content */}
      <main className="flex-grow pb-16">
        
        {/* Post Header */}
        <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden mb-10">
          <i className="fa-solid fa-newspaper text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none"></i>
          <div className="container mx-auto px-4">
            
            {/* Breadcrumbs */}
            <nav className="flex text-white/60 text-sm mb-4" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link to="/" className="hover:text-ufrpe-yellow transition-colors">Início</Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                    <Link to="/noticias" className="hover:text-ufrpe-yellow transition-colors">Notícias</Link>
                  </div>
                </li>
                <li aria-current="page">
                  <div className="flex items-center">
                    <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                    <span className="text-ufrpe-yellow font-medium truncate max-w-[200px] md:max-w-xs">{newsItem.title}</span>
                  </div>
                </li>
              </ol>
            </nav>

            <div className="flex items-center gap-3 mb-6">
              <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider bg-ufrpe-yellow text-ufrpe-blue`}>
                {newsItem.category}
              </span>
              <span className="text-white/60 text-sm flex items-center gap-2">
                <i className="fa-regular fa-calendar"></i> {formatDate(newsItem.date)}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-heading font-extrabold leading-tight mb-6">
              {newsItem.title}
            </h1>
            
            <p className="text-white/70 mt-4 text-lg leading-relaxed">
              {newsItem.excerpt}
            </p>
            
            {/* Author & Share */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 pt-8 border-t border-white/10">
              {newsItem.author ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60">
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{newsItem.author}</div>
                    <div className="text-xs text-white/60">{newsItem.authorRole}</div>
                  </div>
                </div>
              ) : (
                <div />
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60 mr-2">Compartilhar:</span>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(newsItem.title + ' - ' + window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-ufrpe-yellow hover:text-ufrpe-blue transition-colors text-white/60 flex items-center justify-center cursor-pointer"
                >
                  <i className="fa-brands fa-whatsapp"></i>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-ufrpe-yellow hover:text-ufrpe-blue transition-colors text-white/60 flex items-center justify-center cursor-pointer"
                >
                  <i className="fa-brands fa-linkedin-in"></i>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(newsItem.title)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-ufrpe-yellow hover:text-ufrpe-blue transition-colors text-white/60 flex items-center justify-center cursor-pointer"
                >
                  <i className="fa-brands fa-twitter"></i>
                </a>
              </div>
            </div>

          </div>
        </div>

        <div className="container mx-auto px-4">
          
          {/* Featured Image */}
          <figure className="mb-12 rounded-2xl overflow-hidden shadow-lg border border-gray-100">
            <img
              src={newsItem.image?.startsWith('http') ? newsItem.image : `${API_URL}${newsItem.image}`}
              alt={newsItem.title}
              className="w-full h-auto object-cover max-h-[500px]"
            />
            {newsItem.imageCaption && (
              <figcaption className="p-3 text-xs text-center text-gray-500 bg-gray-50">
                {newsItem.imageCaption}
              </figcaption>
            )}
          </figure>

          {/* Text Content */}
          <div className="prose prose-lg prose-blue max-w-none text-gray-700 space-y-6">
            {Array.isArray(newsItem.content) ? (
              newsItem.content.map((para, index) => (
                <SafeHtml as="p" key={index} html={para} />
              ))
            ) : (
              <SafeHtml html={newsItem.content} />
            )}

            {newsItem.quote && (
              <blockquote className="border-l-4 border-ufrpe-yellow pl-6 py-2 my-8 italic text-xl text-gray-600 bg-gray-50 rounded-r-lg">
                "{newsItem.quote.text}"
                <span className="block text-sm font-bold text-gray-500 mt-2 not-italic">— {newsItem.quote.author}</span>
              </blockquote>
            )}
          </div>
          
          {/* Tags */}
          {newsItem.tags && newsItem.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {newsItem.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold hover:bg-gray-200 transition cursor-pointer"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Post Navigation / Related News */}
      <section className="bg-gray-50 py-16 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <h3 className="font-heading font-bold text-2xl text-ufrpe-blue mb-8 text-center flex items-center justify-center gap-2">
            <i className="fa-solid fa-newspaper text-ufrpe-cyan"></i> Pode interessar também
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {relatedNews.map((related) => (
              <Link
                key={related.id}
                to={`/noticia/${related.id}`}
                className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100"
              >
                <div className="aspect-video overflow-hidden bg-gray-200 relative">
                  <img
                    src={related.image?.startsWith('http') ? related.image : `${API_URL}${related.image}`}
                    alt={related.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className={`absolute top-2 left-2 text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${getCategoryBadgeClass(related.categorySlug)}`}>
                    {related.category}
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-sm text-ufrpe-blue group-hover:text-ufrpe-cyan transition line-clamp-2 mb-2">
                    {related.title}
                  </h4>
                  <span className="text-xs text-gray-400">{formatDate(related.date)}</span>
                </div>
              </Link>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link
              to="/noticias"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-colors"
            >
              <i className="fa-solid fa-arrow-left"></i> Voltar para Notícias
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
