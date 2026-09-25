import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMenu } from '../hooks/usePortal';

// Cabeçalho único das páginas do portal (Fase H.6): faixa azul com ícone,
// breadcrumb, título e subtítulo. Antes, cada página copiava esse bloco com
// um breadcrumb escrito à mão; agora o caminho vem do menu principal (quem
// reorganiza o menu no painel reorganiza os breadcrumbs junto).
//
// titulo    texto (ou nó) do <h1>
// atual     rótulo da página no breadcrumb (padrão: o rótulo dela no menu;
//           fora do menu, o titulo, se for texto)
// trilha    [{ rotulo, destino }] entre "Início" e a página — só quando a
//           página não está no menu (ex.: uma notícia: Notícias > título)
// icone     classe Font Awesome do ícone decorativo grande
// acima     conteúdo entre o breadcrumb e o título (selos de situação)
// children  conteúdo extra abaixo do subtítulo (botões, filtros)

const normalizar = (d) => (d || '').split('#')[0].replace(/\/+$/, '') || '/';

// Caminho no menu até `path`: primeiro o destino exato; senão, o destino
// mais longo que seja prefixo do endereço (/editais/123 -> ... > Editais).
export function trilhaDoMenu(menu, path) {
  const alvo = normalizar(path);
  let melhor = null;
  const considerar = (itens, destino) => {
    const d = normalizar(destino);
    if (!destino || /^https?:/i.test(destino) || d === '/') return;
    if (d === alvo) { melhor = { itens, tamanho: Infinity }; return; }
    if (alvo.startsWith(`${d}/`) && (!melhor || d.length > melhor.tamanho)) melhor = { itens, tamanho: d.length, prefixo: true };
  };
  for (const topo of menu) {
    for (const filho of topo.filhos || []) {
      if (melhor?.tamanho === Infinity) break;
      considerar([topo, filho], filho.destino);
    }
    if (melhor?.tamanho === Infinity) break;
    considerar([topo], topo.destino);
  }
  if (!melhor) return null;
  return { itens: melhor.itens.map((i) => ({ rotulo: i.rotulo, destino: i.destino })), prefixo: !!melhor.prefixo };
}

export default function CabecalhoPagina({ titulo, atual, subtitulo, trilha, icone, acima, children }) {
  const { pathname } = useLocation();
  const menu = useMenu('principal');
  const achado = trilha ? null : trilhaDoMenu(menu, pathname);
  // Página exata do menu: o último item é a própria página.
  const noMenu = achado && !achado.prefixo ? achado.itens[achado.itens.length - 1] : null;
  const passos = trilha || (achado ? (achado.prefixo ? achado.itens : achado.itens.slice(0, -1)) : []);
  const rotuloAtual = atual || noMenu?.rotulo || (typeof titulo === 'string' ? titulo : '');
  const tituloAba = typeof titulo === 'string' ? titulo : rotuloAtual;

  // Título da aba do navegador (antes, genérico em quase todas as rotas).
  useEffect(() => {
    if (tituloAba) document.title = `${tituloAba} | PRPG UFRPE`;
  }, [tituloAba]);

  return (
    <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
      {icone && <i className={`${icone} text-[20rem] text-white/5 -bottom-20 -right-20 absolute rotate-12 pointer-events-none`} aria-hidden="true"></i>}
      <div className="container mx-auto px-4 relative">
        <nav className="flex text-white/60 text-sm mb-4" aria-label="Breadcrumb">
          <ol className="inline-flex flex-wrap items-center gap-y-1 space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link to="/" className="hover:text-ufrpe-yellow transition-colors">Início</Link>
            </li>
            {passos.map((p) => (
              <li key={`${p.rotulo}-${p.destino}`} className="flex items-center">
                <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50" aria-hidden="true"></i>
                {p.destino && !/^https?:/i.test(p.destino) && normalizar(p.destino) !== normalizar(pathname)
                  ? <Link to={p.destino} className="hover:text-ufrpe-yellow transition-colors">{p.rotulo}</Link>
                  : <span className="text-white">{p.rotulo}</span>}
              </li>
            ))}
            {rotuloAtual && (
              <li aria-current="page" className="flex items-center">
                <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50" aria-hidden="true"></i>
                <span className="text-ufrpe-yellow font-medium truncate max-w-[220px] md:max-w-md">{rotuloAtual}</span>
              </li>
            )}
          </ol>
        </nav>
        {acima}
        <h1 className="text-4xl md:text-5xl font-heading font-extrabold leading-tight">{titulo}</h1>
        {subtitulo && <p className="text-white/70 mt-4 text-lg max-w-4xl leading-relaxed">{subtitulo}</p>}
        {children}
      </div>
    </div>
  );
}
