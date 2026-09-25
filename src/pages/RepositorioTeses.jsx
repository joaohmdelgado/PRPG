import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch, urlMidia } from '../api';
import CabecalhoPagina from '../components/CabecalhoPagina';

// Repositório de teses e dissertações de todos os programas (Fase N.3):
// antes só existia a lista de cada microsite (2 programas). Filtros no
// endereço; paginação no servidor.
const POR_PAGINA = 20;
const FILTROS = ['q', 'programa', 'tipo', 'ano', 'orientador'];
const campo = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-ufrpe-blue outline-none';

export default function RepositorioTeses() {
  const [params, setParams] = useSearchParams();
  const pagina = Math.max(1, Number.parseInt(params.get('pagina'), 10) || 1);
  const [busca, setBusca] = useState(params.get('q') || '');
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);

  const alterar = (mudancas) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(mudancas)) { if (v) next.set(k, v); else next.delete(k); }
    if (!('pagina' in mudancas)) next.delete('pagina');
    return next;
  }, { replace: true });

  // Busca digitada: espera a pessoa parar de digitar.
  useEffect(() => {
    if (busca === (params.get('q') || '')) return undefined;
    const t = setTimeout(() => alterar({ q: busca.trim() }), 350);
    return () => clearTimeout(t);
  }, [busca]); // eslint-disable-line react-hooks/exhaustive-deps

  const chave = params.toString();
  useEffect(() => {
    let vivo = true;
    const q = new URLSearchParams({ page: String(pagina), limit: String(POR_PAGINA) });
    for (const k of FILTROS) if (params.get(k)) q.set(k, params.get(k));
    apiFetch(`/api/teses-dissertacoes?${q}`, { auth: false })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => { if (vivo) { setDados(d); setErro(false); } })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  const temFiltro = FILTROS.some((k) => params.get(k));

  return (
    <>
      <CabecalhoPagina
        icone="fa-solid fa-book"
        titulo="Teses e Dissertações"
        subtitulo="Trabalhos defendidos nos programas de pós-graduação da UFRPE."
      />
      <div className="py-12 bg-gray-50 min-h-[50vh]">
        <div className="container mx-auto px-4 max-w-6xl">
          <form role="search" onSubmit={(e) => e.preventDefault()} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm grid md:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
            <div className="lg:col-span-2">
              <label htmlFor="teses-q" className="block text-xs font-bold text-gray-500 uppercase mb-1">Título, autor ou orientador</label>
              <input id="teses-q" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} className={campo} />
            </div>
            <div>
              <label htmlFor="teses-programa" className="block text-xs font-bold text-gray-500 uppercase mb-1">Programa</label>
              <select id="teses-programa" value={params.get('programa') || ''} onChange={(e) => alterar({ programa: e.target.value })} className={campo}>
                <option value="">Todos</option>
                {dados?.programas?.map((p) => <option key={p.id} value={p.slug || p.id}>{p.sigla ? `${p.sigla} — ${p.nome}` : p.nome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="teses-tipo" className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
              <select id="teses-tipo" value={params.get('tipo') || ''} onChange={(e) => alterar({ tipo: e.target.value })} className={campo}>
                <option value="">Todos</option>
                {dados?.tipos?.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="teses-ano" className="block text-xs font-bold text-gray-500 uppercase mb-1">Ano</label>
              <select id="teses-ano" value={params.get('ano') || ''} onChange={(e) => alterar({ ano: e.target.value })} className={campo}>
                <option value="">Todos</option>
                {dados?.anos?.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {dados?.orientadores?.length > 0 && (
              <div className="lg:col-span-2">
                <label htmlFor="teses-orientador" className="block text-xs font-bold text-gray-500 uppercase mb-1">Orientador(a)</label>
                <select id="teses-orientador" value={params.get('orientador') || ''} onChange={(e) => alterar({ orientador: e.target.value })} className={campo}>
                  <option value="">Todos</option>
                  {dados.orientadores.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
            )}
            {temFiltro && (
              <div className="flex items-end">
                <button type="button" onClick={() => { setBusca(''); alterar(Object.fromEntries(FILTROS.map((k) => [k, '']))); }}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700">Limpar filtros</button>
              </div>
            )}
          </form>

          <div aria-live="polite">
            {erro && <p className="text-gray-600">Não foi possível carregar o repositório agora. Tente novamente em instantes.</p>}
            {!erro && !dados && <p className="text-gray-500" role="status">Carregando…</p>}
            {dados && (
              <p className="text-sm text-gray-600 mb-4"><strong>{dados.total}</strong> trabalho{dados.total === 1 ? '' : 's'}{temFiltro ? ' com os filtros escolhidos' : ''}.</p>
            )}
          </div>

          {dados?.items?.length > 0 && (
            <ul className="space-y-3">
              {dados.items.map((t) => (
                <li key={t.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-1">
                    {t.tipo && <span className="font-bold uppercase tracking-wider">{t.tipo}</span>}
                    {t.ano && <span>{String(t.ano).slice(0, 4)}</span>}
                    {t.programa && (
                      <Link to={t.programa.link || '/programas'} className="font-bold px-1.5 py-0.5 rounded bg-ufrpe-blue/10 text-ufrpe-blue hover:bg-ufrpe-blue/20" title={t.programa.nome}>
                        {t.programa.sigla || t.programa.nome}
                      </Link>
                    )}
                  </div>
                  <h2 className="font-semibold text-gray-900 leading-snug">
                    {t.arquivoUrl
                      ? <a href={urlMidia(t.arquivoUrl)} target="_blank" rel="noopener noreferrer" className="hover:text-ufrpe-blue hover:underline">{t.title} <i className="fa-regular fa-file-pdf text-red-500 text-sm" aria-hidden="true"></i><span className="sr-only"> (PDF, abre em nova aba)</span></a>
                      : t.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {t.autor?.nome && <span>{t.autor.nome}</span>}
                    {t.orientador?.nome && <span className="text-gray-500"> · orientação de {t.orientador.nome}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {dados?.pages > 1 && (
            <nav aria-label="Páginas" className="flex items-center justify-center gap-3 mt-8">
              <button type="button" disabled={pagina <= 1} onClick={() => alterar({ pagina: String(pagina - 1) })} className="px-4 py-2 rounded-lg border border-gray-200 bg-white disabled:opacity-40">Anterior</button>
              <span className="text-sm text-gray-600">Página {pagina} de {dados.pages}</span>
              <button type="button" disabled={pagina >= dados.pages} onClick={() => alterar({ pagina: String(pagina + 1) })} className="px-4 py-2 rounded-lg border border-gray-200 bg-white disabled:opacity-40">Próxima</button>
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
