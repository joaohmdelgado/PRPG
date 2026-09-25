import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, urlMidia } from '../api';
import { useMenu, useConfig } from '../hooks/usePortal';
import LinkDestino from '../components/LinkDestino';
import ProximosPrazos from '../components/ProximosPrazos';

// Página inicial dirigida por dados (Fase H.2): banner, atalhos, cartões e
// parceiros vêm de "Menus e portal"; notícias, editais, prazos e números vêm
// de /api/portal/home. Antes era tudo fixo no código (inclusive notícias e
// editais fictícios).

// Cores dos cartões da Jornada do Aluno, em rodízio (classes literais para o Tailwind).
const CORES_JORNADA = [
  { c: 'text-ufrpe-cyan', bg: 'bg-ufrpe-cyan/10' },
  { c: 'text-ufrpe-yellow-hover', bg: 'bg-ufrpe-yellow/20' },
  { c: 'text-green-600', bg: 'bg-green-100' },
  { c: 'text-purple-600', bg: 'bg-purple-100' },
  { c: 'text-orange-600', bg: 'bg-orange-100' },
  { c: 'text-slate-600', bg: 'bg-slate-100' },
];

const SITUACAO = {
  abertas: { borda: 'border-ufrpe-cyan', selo: 'bg-cyan-100 text-cyan-800' },
  andamento: { borda: 'border-ufrpe-yellow', selo: 'bg-yellow-100 text-yellow-800' },
};

const dataLonga = (iso) => {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};
const dataCurta = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

// Selo do programa. Dentro de um card que já é link (notícia), fica texto.
function SeloPrograma({ programa, className = '', link = false }) {
  if (!programa) return null;
  const classe = `inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-ufrpe-blue/10 text-ufrpe-blue ${className}`;
  if (link && programa.link) return <Link to={programa.link} className={`${classe} hover:bg-ufrpe-blue/20`} title={programa.nome}>{programa.sigla || programa.nome}</Link>;
  return <span className={classe} title={programa.nome}>{programa.sigla || programa.nome}</span>;
}

function Capa({ noticia, className }) {
  if (!noticia.image) {
    return (
      <div className={`${className} bg-ufrpe-blue/5 flex items-center justify-center text-ufrpe-blue/30`} aria-hidden="true">
        <i className="fa-regular fa-newspaper text-4xl"></i>
      </div>
    );
  }
  return <img src={urlMidia(noticia.image)} alt={noticia.imagemAlt || ''} loading="lazy" className={`${className} object-cover`} />;
}

export default function Home() {
  const hero = useConfig('home');
  const atalhos = useMenu('acesso-rapido');
  const jornada = useMenu('jornada');
  const cursos = useMenu('cursos');
  const parceiros = useMenu('parceiros');
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    apiFetch('/api/portal/home', { auth: false })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => { if (vivo) setDados(d); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, []);

  const numeros = dados?.numeros;
  const destaque = dados?.destaque;

  return (
    <>
      {/* BANNER */}
      <header className="relative bg-ufrpe-blue text-white overflow-hidden flex items-center min-h-[560px]">
        {hero.imagem && (
          <div className="absolute inset-0 z-0">
            <img src={urlMidia(hero.imagem)} className="w-full h-full object-cover object-center" alt="" />
          </div>
        )}
        <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to right,#1e2b4f,rgba(30,43,79,.90),rgba(30,43,79,.40))' }}></div>
        <div className="container mx-auto px-4 relative z-20 py-24">
          <div className="max-w-3xl">
            {hero.selo && <span className="inline-block px-3 py-1 bg-ufrpe-yellow text-ufrpe-blue text-xs font-bold rounded-full mb-6 tracking-wide uppercase">{hero.selo}</span>}
            <h1 className="font-heading font-extrabold text-4xl md:text-6xl mb-6 leading-tight">
              {hero.titulo}{hero.destaque && <><br /><span className="text-ufrpe-yellow">{hero.destaque}</span></>}
            </h1>
            {hero.texto && <p className="text-lg text-gray-300 mb-8 max-w-2xl font-light">{hero.texto}</p>}
            <div className="flex flex-wrap gap-4">
              <Link to="/programas" className="px-8 py-3 bg-ufrpe-yellow text-ufrpe-blue font-bold rounded-lg hover:bg-white transition-colors shadow-[0_8px_20px_rgba(254,189,17,.25)]">Conheça os Cursos</Link>
              <Link to="/editais?situacao=abertas" className="px-8 py-3 text-white font-bold rounded-lg border border-white/20 hover:bg-white/20 transition-colors backdrop-blur-sm bg-white/10">Editais abertos</Link>
            </div>
          </div>
        </div>
      </header>

      {/* ACESSO RÁPIDO */}
      {atalhos.length > 0 && (
        <nav aria-label="Acesso rápido" className="py-12 bg-white relative z-30 -mt-10 mx-4 md:mx-auto container rounded-2xl border border-gray-100 shadow-[0_20px_40px_rgba(0,0,0,.08)]">
          <ul className="px-6 md:px-10 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
            {atalhos.map((q) => (
              <li key={q.id}>
                <LinkDestino destino={q.destino} className="group flex flex-col items-center gap-3">
                  <span className="w-14 h-14 rounded-2xl bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center text-xl group-hover:bg-ufrpe-yellow group-hover:text-white transition-all transform group-hover:-translate-y-1">
                    <i className={q.icone || 'fa-solid fa-link'} aria-hidden="true"></i>
                  </span>
                  <span className="text-xs font-semibold text-gray-700 group-hover:text-ufrpe-blue leading-tight">{q.rotulo}</span>
                </LinkDestino>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* ÚLTIMAS NOTÍCIAS */}
      {(destaque || erro) && (
        <section className="py-20 bg-white" aria-labelledby="home-noticias">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12 border-b-2 border-ufrpe-yellow pb-4">
              <h2 id="home-noticias" className="font-heading font-bold text-3xl md:text-4xl text-ufrpe-blue flex items-center gap-3"><i className="fa-regular fa-newspaper text-ufrpe-yellow" aria-hidden="true"></i>Últimas Notícias</h2>
              <Link to="/noticias" className="text-sm font-bold text-ufrpe-blue hover:text-ufrpe-yellow transition uppercase tracking-wider">Ver todas</Link>
            </div>
            {erro && <p className="text-gray-500 text-center">Não foi possível carregar as notícias agora. <Link to="/noticias" className="text-ufrpe-blue underline">Abrir a página de notícias</Link>.</p>}
            {destaque && (
              <div className="max-w-4xl mx-auto space-y-10">
                <article className="group">
                  <Link to={`/noticia/${destaque.id}`} className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="aspect-video bg-gray-200 rounded-2xl overflow-hidden relative shadow-lg">
                      <Capa noticia={destaque} className="w-full h-full group-hover:scale-105 transition-transform duration-700" />
                      {destaque.destaque && <span className="absolute top-4 left-4 bg-ufrpe-red text-white py-1.5 px-3 rounded text-[10px] font-bold uppercase tracking-wider shadow-lg">Destaque</span>}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs font-bold text-ufrpe-yellow uppercase tracking-widest">
                        <span><i className="fa-regular fa-clock mr-1" aria-hidden="true"></i>{dataLonga(destaque.date)}</span>
                        <SeloPrograma programa={destaque.programa} />
                      </div>
                      <h3 className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue group-hover:text-ufrpe-red transition-colors mb-4 leading-tight">{destaque.title}</h3>
                      {destaque.excerpt && <p className="text-gray-600 mb-6 leading-relaxed line-clamp-4">{destaque.excerpt}</p>}
                      <span className="inline-flex items-center gap-2 text-ufrpe-blue font-bold text-sm">Ler matéria completa <i className="fa-solid fa-chevron-right text-[10px]" aria-hidden="true"></i></span>
                    </div>
                  </Link>
                </article>
                {dados.noticias.length > 0 && (
                  <ul className="grid gap-6 pt-10 border-t border-gray-100">
                    {dados.noticias.map((n) => (
                      <li key={n.id}>
                        <Link to={`/noticia/${n.id}`} className="flex flex-col md:flex-row gap-6 group p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                          <div className="w-full md:w-48 h-32 bg-gray-200 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                            <Capa noticia={n} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
                          </div>
                          <div className="flex flex-col justify-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex flex-wrap items-center gap-2">
                              {dataLonga(n.date)}{n.category && <> · {n.category}</>}<SeloPrograma programa={n.programa} />
                            </span>
                            <h3 className="font-heading font-bold text-xl text-ufrpe-blue group-hover:text-ufrpe-yellow-hover transition-colors leading-tight mb-2">{n.title}</h3>
                            {n.excerpt && <p className="text-sm text-gray-500 line-clamp-2">{n.excerpt}</p>}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* JORNADA DO ALUNO */}
      {jornada.length > 0 && (
        <section className="py-20 bg-gray-50" aria-labelledby="home-jornada">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12 border-b-2 border-ufrpe-yellow pb-4">
              <h2 id="home-jornada" className="font-heading font-bold text-3xl text-ufrpe-blue flex items-center gap-3"><i className="fa-solid fa-compass text-ufrpe-yellow" aria-hidden="true"></i>Jornada do Aluno</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jornada.map((s, i) => {
                const cor = CORES_JORNADA[i % CORES_JORNADA.length];
                return (
                  <LinkDestino key={s.id} destino={s.destino} className="block bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all hover:-translate-y-1 group">
                    <span className={`w-12 h-12 ${cor.bg} ${cor.c} rounded-xl flex items-center justify-center text-xl mb-6 group-hover:scale-110 transition-transform`}><i className={s.icone || 'fa-solid fa-link'} aria-hidden="true"></i></span>
                    <h3 className="font-heading font-bold text-xl text-ufrpe-blue mb-3">{s.rotulo}</h3>
                    {s.descricao && <p className="text-sm text-gray-600 mb-6">{s.descricao}</p>}
                    <span className={`${cor.c} font-semibold text-sm flex items-center gap-2`}>Explorar <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i></span>
                  </LinkDestino>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* EDITAIS E PRÓXIMOS PRAZOS */}
      {dados && (
        <section className="py-20 bg-gray-100" aria-labelledby="home-editais">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-10 border-b-2 border-ufrpe-cyan pb-4">
              <h2 id="home-editais" className="font-heading font-bold text-3xl text-ufrpe-blue flex items-center gap-3"><i className="fa-solid fa-bullhorn text-ufrpe-cyan" aria-hidden="true"></i>Editais</h2>
              <Link to="/editais" className="text-sm font-bold text-ufrpe-cyan hover:underline uppercase tracking-wider">Todos os editais</Link>
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {dados.editais.length === 0 && (
                  <p className="bg-white p-6 rounded-2xl text-gray-600">Nenhum edital com inscrições abertas no momento. <Link to="/editais" className="text-ufrpe-blue underline">Veja os editais anteriores</Link>.</p>
                )}
                {dados.editais.map((e) => {
                  const cor = SITUACAO[e.situation] || SITUACAO.andamento;
                  return (
                    <article key={e.id} className={`bg-white p-6 rounded-2xl shadow-sm ${cor.borda} hover:shadow-md transition group`} style={{ borderLeftWidth: 8 }}>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className={`${cor.selo} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider`}>{e.situationLabel}</span>
                        {e.dataFim && e.situation === 'abertas' && <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md"><i className="fa-regular fa-calendar mr-1" aria-hidden="true"></i>até {dataCurta(e.dataFim)}</span>}
                        <SeloPrograma programa={e.programa} link />
                      </div>
                      <h3 className="font-heading font-bold text-xl text-ufrpe-blue leading-snug">
                        <Link to={`/editais/${e.id}`} className="group-hover:text-ufrpe-cyan transition-colors">{e.title}</Link>
                      </h3>
                    </article>
                  );
                })}
              </div>
              <ProximosPrazos prazos={dados.prazos} />
            </div>
          </div>
        </section>
      )}

      {/* PROGRAMAS, CURSOS E NÚMEROS */}
      {(cursos.length > 0 || numeros) && (
        <section className="py-24 bg-ufrpe-blue relative overflow-hidden" aria-labelledby="home-cursos">
          <div className="absolute top-0 right-0 w-96 h-96 bg-ufrpe-cyan opacity-10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-ufrpe-yellow opacity-10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16"><h2 id="home-cursos" className="font-heading font-bold text-3xl md:text-4xl text-white">Nossos Programas e Cursos</h2></div>
            <div className="grid md:grid-cols-3 gap-8">
              {cursos.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl overflow-hidden flex flex-col group transition-transform hover:-translate-y-2" style={{ boxShadow: '0 8px 30px rgba(0,0,0,.40)' }}>
                  <div className="h-56 bg-gray-200 relative overflow-hidden">
                    {p.imagem && <img src={urlMidia(p.imagem)} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,.80),rgba(0,0,0,.20),transparent)' }}></div>
                    <h3 className="absolute bottom-5 left-6 text-2xl font-heading font-bold text-white">{p.rotulo}</h3>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    {p.descricao && <p className="text-gray-600 mb-8 leading-relaxed">{p.descricao}</p>}
                    <LinkDestino destino={p.destino} className="mt-auto block w-full text-center py-3.5 bg-gray-50 text-ufrpe-blue font-bold rounded-xl border border-gray-200 hover:bg-ufrpe-yellow hover:text-white hover:border-ufrpe-yellow transition-all">Conhecer {p.rotulo}</LinkDestino>
                  </div>
                </div>
              ))}
            </div>
            {/* Números calculados do cadastro. Docentes/discentes ficam de fora
                até a importação das planilhas (Fase O) — hoje só uma parte dos
                programas tem vínculos cadastrados. */}
            {numeros && (
              <dl className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/10 pt-16">
                {[
                  [numeros.programas, 'Programas de pós-graduação'],
                  [numeros.mestrados, 'Mestrados acadêmicos'],
                  [numeros.doutorados, 'Doutorados'],
                  [numeros.profissionais, 'Mestrados profissionais'],
                ].filter(([n]) => n > 0).map(([n, l]) => (
                  <div key={l} className="text-center flex flex-col-reverse">
                    <dt className="text-sm text-gray-300 font-medium">{l}</dt>
                    <dd className="block text-4xl font-heading font-bold text-ufrpe-yellow mb-2">{n}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      )}

      {/* PARCEIROS E FOMENTO */}
      {parceiros.length > 0 && (
        <section className="py-12 bg-white border-t border-gray-100" aria-label="Parceiros e fomento">
          <ul className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
            {parceiros.map((p) => (
              <li key={p.id}>
                <LinkDestino destino={p.destino}>
                  {p.imagem
                    ? <img src={urlMidia(p.imagem)} alt={p.rotulo} loading="lazy" className="max-h-12 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
                    : <span className="font-bold text-gray-500">{p.rotulo}</span>}
                </LinkDestino>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
