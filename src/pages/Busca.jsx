import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api';
import CabecalhoPagina from '../components/CabecalhoPagina';
import LinkDestino from '../components/LinkDestino';
import SafeHtml from '../components/SafeHtml';

// Busca do portal (Fase H.5): notícias, editais, páginas, documentos,
// programas e teses publicados, agrupados por tipo (/api/portal/busca).
// Antes a busca do topo levava sempre a /noticias?search= e sumia no celular.

const ICONES = {
  noticias: 'fa-regular fa-newspaper', editais: 'fa-solid fa-bullhorn', paginas: 'fa-solid fa-file-lines',
  documentos: 'fa-solid fa-scroll', programas: 'fa-solid fa-graduation-cap', teses: 'fa-solid fa-book',
};
const dataCurta = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

export default function Busca() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const tipo = params.get('tipo') || '';
  const [texto, setTexto] = useState(q);
  const [resultado, setResultado] = useState(null);
  const [estado, setEstado] = useState('pronto'); // pronto | carregando | erro

  useEffect(() => { setTexto(q); }, [q]);
  useEffect(() => {
    if (q.trim().length < 2) { setResultado(null); return undefined; }
    let vivo = true;
    setEstado('carregando');
    const busca = new URLSearchParams({ q });
    if (tipo) busca.set('tipo', tipo);
    apiFetch(`/api/portal/busca?${busca}`, { auth: false })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => { if (vivo) { setResultado(d); setEstado('pronto'); } })
      .catch(() => { if (vivo) setEstado('erro'); });
    return () => { vivo = false; };
  }, [q, tipo]);

  const enviar = (e) => {
    e.preventDefault();
    const t = texto.trim();
    setParams(t ? { q: t } : {});
  };

  return (
    <>
      <CabecalhoPagina icone="fa-solid fa-magnifying-glass" titulo="Buscar no portal" atual="Busca">
        <form role="search" onSubmit={enviar} className="mt-8 max-w-2xl flex gap-2">
          <label htmlFor="busca-portal" className="sr-only">O que você procura?</label>
          <input id="busca-portal" type="search" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus
            placeholder="Ex.: proficiência, bolsa, calendário, nome do programa…"
            className="flex-1 min-w-0 px-4 py-3 rounded-xl text-gray-800 bg-white outline-none focus:ring-2 focus:ring-ufrpe-yellow" />
          <button type="submit" className="px-5 py-3 bg-ufrpe-yellow text-ufrpe-blue font-bold rounded-xl hover:bg-white transition">Buscar</button>
        </form>
      </CabecalhoPagina>

      <div className="py-12 bg-gray-50 min-h-[40vh]">
        <div className="container mx-auto px-4 max-w-5xl">
          <div aria-live="polite">
            {q.trim().length < 2 && <p className="text-gray-500">Digite pelo menos duas letras.</p>}
            {estado === 'carregando' && <p className="text-gray-500">Buscando…</p>}
            {estado === 'erro' && <p className="text-gray-600">Não foi possível buscar agora. Tente novamente em instantes.</p>}
            {estado === 'pronto' && resultado && (
              <p className="text-gray-600 mb-6">
                {resultado.total === 0
                  ? <>Nada encontrado para <strong>“{resultado.q}”</strong>. Tente outra palavra ou veja <Link to="/editais" className="text-ufrpe-blue underline">Editais</Link> e <Link to="/noticias" className="text-ufrpe-blue underline">Notícias</Link>.</>
                  : <><strong>{resultado.total}</strong> resultado{resultado.total > 1 ? 's' : ''} para <strong>“{resultado.q}”</strong>{tipo && <> em {resultado.grupos[0]?.rotulo} · <Link to={`/busca?q=${encodeURIComponent(q)}`} className="text-ufrpe-blue underline">ver todos os tipos</Link></>}.</>}
              </p>
            )}
          </div>

          {estado === 'pronto' && resultado?.grupos.map((g) => (
            <section key={g.tipo} className="mb-10" aria-labelledby={`busca-${g.tipo}`}>
              <h2 id={`busca-${g.tipo}`} className="font-heading font-bold text-xl text-ufrpe-blue mb-4 flex items-center gap-2">
                <i className={`${ICONES[g.tipo]} text-ufrpe-yellow`} aria-hidden="true"></i> {g.rotulo}
                <span className="text-sm font-normal text-gray-500">({g.total})</span>
              </h2>
              <ul className="space-y-3">
                {g.itens.map((i) => (
                  <li key={`${g.tipo}-${i.id}`} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-1">
                      {i.tipoDocumento && <span>{i.tipoDocumento}</span>}
                      {i.data && <span>{dataCurta(i.data)}</span>}
                      {i.programa && <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-ufrpe-blue/10 text-ufrpe-blue">{i.programa}</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {i.destino
                        ? <LinkDestino destino={i.destino} className="hover:text-ufrpe-blue hover:underline">{i.titulo}</LinkDestino>
                        : i.titulo}
                    </h3>
                    {i.trecho && <SafeHtml as="p" className="text-sm text-gray-600 mt-1 [&_mark]:bg-ufrpe-yellow/40 [&_mark]:rounded-sm" html={i.trecho} />}
                  </li>
                ))}
              </ul>
              {!tipo && g.total > g.itens.length && (
                <Link to={`/busca?q=${encodeURIComponent(q)}&tipo=${g.tipo}`} className="inline-block mt-3 text-sm font-semibold text-ufrpe-blue hover:underline">
                  Ver os {g.total} resultados em {g.rotulo.toLowerCase()}
                </Link>
              )}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
