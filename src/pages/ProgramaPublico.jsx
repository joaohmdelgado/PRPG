import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch, urlMidia } from '../api';
import CabecalhoPagina from '../components/CabecalhoPagina';
import { linkTelefone } from '../hooks/usePortal';

// Página pública automática de um programa (Fase N.2): todo programa tem
// endereço no portal (/programas/<slug>), com ou sem microsite — antes, 40
// dos 42 não tinham página nenhuma. Montada só com dado público do cadastro.

const MODALIDADE = { M: 'Mestrado Acadêmico', D: 'Doutorado Acadêmico', P: 'Mestrado Profissional' };
const STATUS = { SUSPENSO: 'Suspenso', EM_AVALIACAO: 'Em avaliação', DESATIVADO: 'Desativado' };
const dataCurta = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

function Bloco({ titulo, icone, children }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" aria-label={titulo}>
      <h2 className="font-heading font-bold text-lg text-ufrpe-blue mb-4 flex items-center gap-2">
        <i className={`${icone} text-ufrpe-yellow`} aria-hidden="true"></i> {titulo}
      </h2>
      {children}
    </section>
  );
}

// Números por ano (Fase N.9): calculados dos vínculos e das teses do
// cadastro; colunas sem nenhum valor não aparecem.
const COLUNAS = [
  ['docentes', 'Docentes'],
  ['discentes', 'Discentes'],
  ['egressos', 'Egressos'],
  ['dissertacoes_defendidas', 'Dissertações'],
  ['teses_defendidas', 'Teses'],
];
function Numeros({ indicadores = [] }) {
  const linhas = indicadores.map((i) => ({
    ...i, discentes: (i.discentes_mestrado || 0) + (i.discentes_doutorado || 0) + (i.discentes_profissional || 0),
  }));
  const colunas = COLUNAS.filter(([c]) => linhas.some((l) => l[c] > 0));
  const visiveis = linhas.filter((l) => colunas.some(([c]) => l[c] > 0));
  if (!colunas.length || !visiveis.length) return null;
  return (
    <Bloco titulo="Números do programa" icone="fa-solid fa-chart-column">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Indicadores por ano</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <th scope="col" className="py-2 pr-4">Ano</th>
              {colunas.map(([c, r]) => <th key={c} scope="col" className="py-2 pr-4 text-right">{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l) => (
              <tr key={l.ano} className="border-b border-gray-50">
                <th scope="row" className="py-2 pr-4 font-semibold text-gray-800">{l.ano}</th>
                {colunas.map(([c]) => <td key={c} className="py-2 pr-4 text-right text-gray-700">{l[c] || '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">Calculado a partir do cadastro de docentes, discentes e trabalhos defendidos.</p>
    </Bloco>
  );
}

export default function ProgramaPublico() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [estado, setEstado] = useState('carregando');

  useEffect(() => {
    let vivo = true;
    setEstado('carregando');
    apiFetch(`/api/programas/slug/${encodeURIComponent(slug)}/publico`, { auth: false })
      .then(async (r) => {
        if (!vivo) return;
        if (r.status === 404) { setEstado('ausente'); return; }
        if (!r.ok) throw new Error(String(r.status));
        setP(await r.json());
        setEstado('ok');
      })
      .catch(() => { if (vivo) setEstado('erro'); });
    return () => { vivo = false; };
  }, [slug]);

  if (estado === 'carregando') return <p className="py-24 text-center text-gray-500" role="status">Carregando…</p>;
  if (estado !== 'ok') {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-heading font-bold text-3xl text-ufrpe-blue mb-4">{estado === 'erro' ? 'Não foi possível carregar o programa' : 'Programa não encontrado'}</h1>
        <Link to="/programas" className="text-ufrpe-blue underline">Ver todos os programas</Link>
      </div>
    );
  }

  const contatos = [
    p.email_programa && { icone: 'fa-solid fa-envelope', texto: p.email_programa, href: `mailto:${p.email_programa}` },
    p.telefone_secretaria && { icone: 'fa-solid fa-phone', texto: p.telefone_secretaria, href: linkTelefone(p.telefone_secretaria) },
    p.whatsapp && { icone: 'fa-brands fa-whatsapp', texto: p.whatsapp, href: `https://wa.me/55${String(p.whatsapp).replace(/\D/g, '').replace(/^55/, '')}` },
    (p.endereco || p.bloco || p.sala) && { icone: 'fa-solid fa-location-dot', texto: [p.endereco, p.bloco && `Bloco ${p.bloco}`, p.sala && `Sala ${p.sala}`, p.cep && `CEP ${p.cep}`].filter(Boolean).join(' · ') },
    p.horario_atendimento && { icone: 'fa-regular fa-clock', texto: p.horario_atendimento },
  ].filter(Boolean);
  const links = [
    p.siteUrl && { rotulo: 'Site do programa', href: p.siteUrl, interno: true },
    p.sucupira_url && { rotulo: 'Plataforma Sucupira', href: p.sucupira_url },
    p.regimento_url && { rotulo: 'Regimento', href: urlMidia(p.regimento_url) },
    p.regulamento_url && { rotulo: 'Regulamento', href: urlMidia(p.regulamento_url) },
    p.instagram_url && { rotulo: 'Instagram', href: p.instagram_url },
  ].filter(Boolean);

  return (
    <>
      <CabecalhoPagina
        icone="fa-solid fa-graduation-cap"
        titulo={p.nome}
        atual={p.sigla || p.nome}
        trilha={[{ rotulo: 'Programas', destino: '/programas' }]}
        subtitulo={p.descricao_curta || [p.grande_area, p.area_conhecimento].filter(Boolean).join(' · ') || null}
        acima={(
          <div className="flex flex-wrap gap-2 mb-4">
            {p.sigla && <span className="text-xs font-bold bg-ufrpe-yellow text-ufrpe-blue px-3 py-1 rounded-full">{p.sigla}</span>}
            {p.campus && <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full">Campus {p.campus}</span>}
            {p.em_rede && <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full">Em rede{p.nome_rede ? `: ${p.nome_rede}` : ''}</span>}
            {STATUS[p.status] && <span className="text-xs font-bold bg-red-500/80 px-3 py-1 rounded-full">{STATUS[p.status]}</span>}
          </div>
        )}
      >
        {p.siteUrl && (
          <Link to={p.siteUrl} className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-ufrpe-yellow text-ufrpe-blue font-bold rounded-xl hover:bg-white transition">
            Acessar o site do programa <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </Link>
        )}
      </CabecalhoPagina>

      <div className="py-12 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            {p.modalidades.length > 0 && (
              <Bloco titulo="Cursos" icone="fa-solid fa-certificate">
                <ul className="grid sm:grid-cols-2 gap-3">
                  {p.modalidades.map((m) => (
                    <li key={m.tipo} className="rounded-xl bg-gray-50 p-4">
                      <p className="font-bold text-gray-800">{MODALIDADE[m.tipo] || m.tipo}</p>
                      <p className="text-sm text-gray-600">
                        {m.nota_capes && <>Nota CAPES <strong>{m.nota_capes}</strong></>}
                        {m.ano_inicio && <>{m.nota_capes ? ' · ' : ''}desde {m.ano_inicio}</>}
                      </p>
                    </li>
                  ))}
                </ul>
              </Bloco>
            )}

            <Bloco titulo="Editais" icone="fa-solid fa-bullhorn">
              {p.editais.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhum edital aberto ou em andamento. <Link to={`/editais?programa=${p.slug}`} className="text-ufrpe-blue underline">Ver editais anteriores</Link>.</p>
              ) : (
                <ul className="space-y-3">
                  {p.editais.map((e) => (
                    <li key={e.id}>
                      <Link to={`/editais/${e.id}`} className="font-semibold text-gray-800 hover:text-ufrpe-blue hover:underline">{e.title}</Link>
                      <p className="text-xs text-gray-500">{e.situationLabel}{e.dataFim && e.situation === 'abertas' ? ` · inscrições até ${dataCurta(e.dataFim)}` : ''}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Bloco>

            {p.linhas.length > 0 && (
              <Bloco titulo="Linhas de pesquisa" icone="fa-solid fa-flask">
                <ul className="list-disc pl-5 space-y-1 text-gray-700">{p.linhas.map((l) => <li key={l}>{l}</li>)}</ul>
              </Bloco>
            )}

            {p.docentes.length > 0 && (
              <Bloco titulo="Docentes" icone="fa-solid fa-chalkboard-user">
                <ul className="grid sm:grid-cols-2 gap-2">
                  {p.docentes.map((d) => (
                    <li key={`${d.nome}-${d.categoria}`} className="text-sm text-gray-700">
                      {d.lattes ? <a href={d.lattes} target="_blank" rel="noopener noreferrer" className="hover:text-ufrpe-blue hover:underline">{d.nome}</a> : d.nome}
                      <span className="text-gray-400"> · {d.categoria}</span>
                    </li>
                  ))}
                </ul>
              </Bloco>
            )}

            <Numeros indicadores={p.indicadores} />

            {p.teses.total > 0 && (
              <Bloco titulo="Teses e dissertações" icone="fa-solid fa-book">
                <ul className="space-y-2 mb-4">
                  {p.teses.recentes.map((t) => (
                    <li key={t.id} className="text-sm">
                      {t.arquivoUrl ? <a href={urlMidia(t.arquivoUrl)} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-ufrpe-blue hover:underline">{t.title}</a> : t.title}
                      <span className="text-gray-400"> · {t.tipo}{t.ano ? ` · ${String(t.ano).slice(0, 4)}` : ''}</span>
                    </li>
                  ))}
                </ul>
                <Link to={`/teses?programa=${p.slug}`} className="text-sm font-semibold text-ufrpe-blue hover:underline">Ver os {p.teses.total} trabalhos do programa</Link>
              </Bloco>
            )}
          </div>

          <aside className="space-y-6">
            {p.coordenacao.length > 0 && (
              <Bloco titulo="Coordenação" icone="fa-solid fa-user-tie">
                <ul className="space-y-2">
                  {p.coordenacao.map((c) => <li key={c.nome}><p className="font-semibold text-gray-800">{c.nome}</p><p className="text-xs text-gray-500">{c.papel}</p></li>)}
                </ul>
              </Bloco>
            )}
            {contatos.length > 0 && (
              <Bloco titulo="Contato" icone="fa-solid fa-address-card">
                <ul className="space-y-2 text-sm">
                  {contatos.map((c) => (
                    <li key={c.texto} className="flex gap-2 text-gray-700">
                      <i className={`${c.icone} w-4 mt-1 text-ufrpe-yellow`} aria-hidden="true"></i>
                      {c.href ? <a href={c.href} className="hover:text-ufrpe-blue break-all">{c.texto}</a> : <span>{c.texto}</span>}
                    </li>
                  ))}
                </ul>
              </Bloco>
            )}
            {links.length > 0 && (
              <Bloco titulo="Links" icone="fa-solid fa-link">
                <ul className="space-y-2 text-sm">
                  {links.map((l) => (
                    <li key={l.rotulo}>
                      {l.interno
                        ? <Link to={l.href} className="text-ufrpe-blue hover:underline">{l.rotulo}</Link>
                        : <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-ufrpe-blue hover:underline">{l.rotulo}</a>}
                    </li>
                  ))}
                </ul>
              </Bloco>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
