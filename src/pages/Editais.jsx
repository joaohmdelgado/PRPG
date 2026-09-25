import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_URL } from '../api';
import SafeHtml from '../components/SafeHtml';
import CabecalhoPagina from '../components/CabecalhoPagina';

// Editais da PRPG e dos programas numa página só (Fase N.1): selo e link do
// programa, filtros por origem/programa/situação/ano guardados no endereço
// (dá para compartilhar "seleções abertas do PGH") e a visão "Seleções
// abertas" para candidatos.
const FILTROS = ['q', 'situacao', 'ano', 'programa', 'origem'];

const ESTILO_SITUACAO = {
  abertas: { borda: 'border-l-8 border-ufrpe-cyan', selo: 'bg-cyan-100 text-cyan-800' },
  andamento: { borda: 'border-l-8 border-ufrpe-yellow', selo: 'bg-yellow-100 text-yellow-800' },
};
const PADRAO = { borda: 'border-l-8 border-gray-300', selo: 'bg-gray-200 text-gray-700' };

const formatDate = (d) => {
  if (!d) return '';
  const parts = String(d).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
};

const getLinkUrl = (link) => {
  if (!link) return '#';
  if (/^(https?:\/\/|#)/.test(link)) return link;
  return `${API_URL}${link}`;
};

const campo = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ufrpe-blue focus:border-ufrpe-blue outline-none transition-all';
const rotuloCampo = 'absolute -top-1 left-2 bg-white px-1 text-xs font-bold text-gray-500 uppercase tracking-wider';

export default function Editais() {
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || '';
  const situation = params.get('situacao') || '';
  const year = params.get('ano') || '';
  const programa = params.get('programa') || '';
  const origem = params.get('origem') || '';
  const [editaisData, setEditaisData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [periodoAberto, setPeriodoAberto] = useState(null);

  const alterar = (mudancas) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    return next;
  }, { replace: true });
  const limparFiltros = () => alterar(Object.fromEntries(FILTROS.map((k) => [k, ''])));

  useEffect(() => {
    fetch(`${API_URL}/api/proficiencia/periodo-aberto`)
      .then((r) => r.json())
      .then((d) => setPeriodoAberto(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchEditais = async () => {
      try {
        const [response, vocab] = await Promise.all([
          fetch(`${API_URL}/api/editais?escopo=portal`),
          fetch(`${API_URL}/api/vocabularios?dominio=edital.categoria`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ]);
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.json();

        // Grupos na ordem das Classificações (Fase F.4). Edital com categoria
        // fora do vocabulário vai para um grupo com o próprio rótulo.
        const grouped = {};
        for (const v of vocab) grouped[v.valor] = { id: v.valor, title: v.rotulo, items: [] };
        for (const edital of data) {
          const chave = edital.categoryId || 'outros';
          if (!grouped[chave]) grouped[chave] = { id: chave, title: edital.categoryTitle || 'Outros editais', items: [] };
          grouped[chave].items.push(edital);
        }
        setEditaisData(Object.values(grouped).filter((cat) => cat.items.length > 0));
      } catch (error) {
        console.error('Erro ao buscar editais:', error);
        setErro(true);
      } finally {
        setLoading(false);
      }
    };
    fetchEditais();
  }, []);

  const filteredData = editaisData.map((section) => ({
    ...section,
    items: section.items.filter((edital) => {
      const termo = search.toLowerCase();
      const matchesSearch = !termo
        || edital.title.toLowerCase().includes(termo)
        || (edital.description && edital.description.toLowerCase().includes(termo))
        || (edital.numero && edital.numero.toLowerCase().includes(termo))
        || (edital.programa && `${edital.programa.sigla || ''} ${edital.programa.nome}`.toLowerCase().includes(termo));
      const matchesSituation = !situation || edital.situation === situation;
      const matchesYear = !year || String(edital.year ?? '') === year;
      const matchesPrograma = !programa || edital.programa?.slug === programa;
      const matchesOrigem = !origem || (origem === 'prpg' ? !edital.programaId : !!edital.programaId);
      return matchesSearch && matchesSituation && matchesYear && matchesPrograma && matchesOrigem;
    }),
  })).filter((section) => section.items.length > 0);

  const totalFilteredCount = filteredData.reduce((acc, curr) => acc + curr.items.length, 0);
  const hasActiveFilters = FILTROS.some((k) => params.get(k));
  // Opções dos filtros a partir dos próprios editais (antes os anos eram fixos no código).
  const todos = editaisData.flatMap((s) => s.items);
  const anos = [...new Set(todos.map((e) => e.year).filter(Boolean).map(String))].sort().reverse();
  const programas = [...new Map(todos.filter((e) => e.programa?.slug).map((e) => [e.programa.slug, e.programa])).values()]
    .sort((a, b) => (a.sigla || a.nome).localeCompare(b.sigla || b.nome));
  const abertos = todos.filter((e) => e.situation === 'abertas').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" role="status">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ufrpe-blue" aria-hidden="true"></div>
        <span className="sr-only">Carregando…</span>
      </div>
    );
  }

  return (
    <>
      <CabecalhoPagina
        icone="fa-solid fa-scroll"
        titulo="Painel de Editais"
        subtitulo="Editais, processos seletivos e chamadas públicas da Pró-Reitoria de Pós-Graduação e dos programas."
      />

      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Categorias */}
            <div className="lg:w-1/4 shrink-0">
              <nav aria-label="Categorias de edital" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:sticky lg:top-28">
                <h2 className="bg-gray-50 text-gray-800 m-0 p-5 border-b border-gray-100 font-heading font-bold text-lg">
                  <i className="fa-solid fa-list mr-2 text-ufrpe-blue opacity-70" aria-hidden="true"></i> Categorias
                </h2>
                <ul className="p-6 space-y-2">
                  {filteredData.map((section) => (
                    <li key={section.id}>
                      <a href={`#${section.id}`} className="flex gap-3 w-full text-left p-2.5 rounded-lg transition text-sm text-gray-700 hover:bg-gray-50 hover:text-ufrpe-blue group">
                        <i className="fa-solid fa-chevron-right text-ufrpe-yellow mt-1 group-hover:translate-x-1 transition-transform" aria-hidden="true"></i>
                        <span className="leading-snug">{section.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="lg:w-3/4">
              {/* Visão para candidatos: só o que está com inscrição aberta. */}
              <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Visão">
                <button type="button" onClick={() => alterar({ situacao: '' })} aria-pressed={situation !== 'abertas'}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition ${situation !== 'abertas' ? 'bg-ufrpe-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  Todos os editais
                </button>
                <button type="button" onClick={() => alterar({ situacao: 'abertas' })} aria-pressed={situation === 'abertas'}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition ${situation === 'abertas' ? 'bg-ufrpe-cyan text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  Seleções abertas ({abertos})
                </button>
              </div>

              {/* Filtros */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 relative">
                <form onSubmit={(e) => e.preventDefault()} className="grid md:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-end">
                  <div className="relative pt-2">
                    <label htmlFor="filtro-q" className={rotuloCampo}>Buscar edital</label>
                    <div className="relative">
                      <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true"></i>
                      <input id="filtro-q" type="search" value={search} onChange={(e) => alterar({ q: e.target.value })}
                        placeholder="Ex.: Proext, Seleção Mestrado, PGH..." className={`${campo} pl-10 pr-4`} />
                    </div>
                  </div>

                  <div className="relative pt-2 xl:w-48">
                    <label htmlFor="filtro-situacao" className={rotuloCampo}>Situação</label>
                    <select id="filtro-situacao" value={situation} onChange={(e) => alterar({ situacao: e.target.value })} className={`${campo} cursor-pointer`}>
                      <option value="">Todas</option>
                      <option value="abertas">Inscrições Abertas</option>
                      <option value="andamento">Em Andamento</option>
                      <option value="concluido">Concluído</option>
                    </select>
                  </div>

                  <div className="relative pt-2 xl:w-56">
                    <label htmlFor="filtro-origem" className={rotuloCampo}>Origem</label>
                    <select id="filtro-origem" value={programa ? `p:${programa}` : origem}
                      onChange={(e) => {
                        const v = e.target.value;
                        alterar(v.startsWith('p:') ? { programa: v.slice(2), origem: '' } : { programa: '', origem: v });
                      }}
                      className={`${campo} cursor-pointer`}>
                      <option value="">PRPG e programas</option>
                      <option value="prpg">Só da PRPG</option>
                      <option value="programas">Só dos programas</option>
                      {programas.length > 0 && (
                        <optgroup label="Programa">
                          {programas.map((p) => <option key={p.slug} value={`p:${p.slug}`}>{p.sigla ? `${p.sigla} — ${p.nome}` : p.nome}</option>)}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div className="relative pt-2 xl:w-32">
                    <label htmlFor="filtro-ano" className={rotuloCampo}>Ano</label>
                    <select id="filtro-ano" value={year} onChange={(e) => alterar({ ano: e.target.value })} className={`${campo} cursor-pointer`}>
                      <option value="">Todos</option>
                      {anos.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  {hasActiveFilters && (
                    <button type="button" onClick={limparFiltros}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer">
                      Limpar
                    </button>
                  )}
                </form>
              </div>

              <div className="space-y-10" aria-live="polite">
                {erro ? (
                  <p className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-600">
                    Não foi possível carregar os editais agora. Tente novamente em instantes.
                  </p>
                ) : totalFilteredCount === 0 ? (
                  <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
                    <i className="fa-solid fa-folder-open text-4xl mb-4 text-gray-300" aria-hidden="true"></i>
                    <p className="font-medium">
                      {situation === 'abertas' && !search && !programa && !origem && !year
                        ? 'Nenhuma seleção com inscrições abertas no momento.'
                        : 'Nenhum edital encontrado com os filtros selecionados.'}
                    </p>
                    <button onClick={limparFiltros}
                      className="mt-4 px-6 py-2.5 bg-ufrpe-blue hover:bg-ufrpe-yellow text-white font-bold rounded-lg transition-colors text-sm cursor-pointer">
                      Ver todos os editais
                    </button>
                  </div>
                ) : (
                  filteredData.map((section) => (
                    <section key={section.id} id={section.id} className="scroll-mt-28" aria-labelledby={`cat-${section.id}`}>
                      <h2 id={`cat-${section.id}`} className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue mb-6 pb-4 border-b-2 border-ufrpe-yellow flex items-center justify-between">
                        <span>{section.title}</span>
                        <span className="text-xs font-sans font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                          {section.items.length} {section.items.length === 1 ? 'edital' : 'editais'}
                        </span>
                      </h2>

                      <div className="space-y-4">
                        {section.items.map((edital) => {
                          const estilo = ESTILO_SITUACAO[edital.situation] || PADRAO;
                          const periodo = edital.field_periodo || {};
                          return (
                            <article key={edital.id} className={`bg-white p-6 rounded-2xl shadow-sm ${estilo.borda} hover:shadow-md transition`}>
                              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-3 mb-3">
                                    <span className={`${estilo.selo} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider`}>
                                      {edital.situationLabel}
                                    </span>
                                    {edital.numero && (
                                      <span className="text-xs font-bold bg-ufrpe-blue/10 text-ufrpe-blue px-2.5 py-1 rounded-md">
                                        Nº {edital.numero}/{edital.year}
                                      </span>
                                    )}
                                    {edital.programa && (
                                      <Link to={edital.programa.link || '/programas'} title={`Programa: ${edital.programa.nome}`}
                                        className="text-xs font-bold bg-ufrpe-yellow/20 text-ufrpe-blue px-2.5 py-1 rounded-md hover:bg-ufrpe-yellow/40">
                                        <i className="fa-solid fa-graduation-cap mr-1" aria-hidden="true"></i>{edital.programa.sigla || edital.programa.nome}
                                      </Link>
                                    )}
                                    {edital.publishedAt && (
                                      <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                                        <i className="fa-regular fa-calendar mr-1" aria-hidden="true"></i> Publicado em: {formatDate(edital.publishedAt)}
                                      </span>
                                    )}
                                    {periodo.data_inicio && periodo.data_fim ? (
                                      <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                                        <i className="fa-regular fa-clock mr-1" aria-hidden="true"></i> Inscrições: {formatDate(periodo.data_inicio)} a {formatDate(periodo.data_fim)}
                                      </span>
                                    ) : edital.deadline ? (
                                      <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                                        <i className="fa-regular fa-clock mr-1" aria-hidden="true"></i> Inscrições até: {formatDate(edital.deadline)}
                                      </span>
                                    ) : null}
                                  </div>
                                  <h3 className="font-heading font-bold text-xl md:text-2xl text-ufrpe-blue hover:text-ufrpe-yellow transition-colors leading-tight mb-2">
                                    <Link to={`/editais/${edital.id}`}>{edital.title}</Link>
                                  </h3>
                                  <SafeHtml className="text-gray-600 text-sm html-content mb-4" html={edital.description} />

                                  {(edital.resultadoParcial || edital.resultadoFinal || edital.erratas?.length > 0) && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        <i className="fa-solid fa-paperclip mr-1.5 text-ufrpe-blue opacity-70" aria-hidden="true"></i> Documentos do Processo
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                        {edital.resultadoParcial && (
                                          <a href={getLinkUrl(edital.resultadoParcial)} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                                            <i className="fa-regular fa-file-pdf text-red-500" aria-hidden="true"></i> Resultado Parcial
                                          </a>
                                        )}
                                        {edital.resultadoFinal && (
                                          <a href={getLinkUrl(edital.resultadoFinal)} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                                            <i className="fa-regular fa-file-pdf text-red-500" aria-hidden="true"></i> Resultado Final
                                          </a>
                                        )}
                                        {edital.erratas?.map((errata) => errata.downloadLink && (
                                          <a key={errata.id} href={getLinkUrl(errata.downloadLink)} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                                            <i className="fa-regular fa-file-pdf text-red-500" aria-hidden="true"></i> {errata.numero ? `Errata ${errata.numero}` : (errata.title || 'Errata')}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto">
                                  {edital.proficiencia && periodoAberto && periodoAberto.id === edital.id && (
                                    <Link to="/proficiencia/inscricao"
                                      className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 w-full lg:w-auto">
                                      <i className="fa-solid fa-pen-to-square" aria-hidden="true"></i> Fazer Inscrição
                                    </Link>
                                  )}
                                  {edital.downloadLink && (
                                    <a href={getLinkUrl(edital.downloadLink)} target="_blank" rel="noopener noreferrer"
                                      className="px-5 py-2.5 bg-ufrpe-cyan text-white text-sm font-bold rounded-lg hover:bg-ufrpe-blue transition-colors flex items-center justify-center gap-2 w-full lg:w-auto">
                                      <i className="fa-solid fa-download" aria-hidden="true"></i> Baixar Edital
                                    </a>
                                  )}
                                  <Link to={`/editais/${edital.id}`}
                                    className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 w-full lg:w-auto">
                                    Ver Detalhes
                                  </Link>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
