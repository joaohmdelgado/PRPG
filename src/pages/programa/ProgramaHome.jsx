import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../../api';
import { usePrograma, programaPath } from '../../components/programa/ProgramaContext';
import { formatDate } from '../../components/programa/ProgramaUI';

const LINHA_ICONS = ['fa-book', 'fa-landmark', 'fa-people-group', 'fa-scroll', 'fa-earth-americas', 'fa-feather'];

export default function ProgramaHome() {
  const { programa, slug } = usePrograma();
  const [noticias, setNoticias] = useState([]);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/news?programa=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (active) setNoticias(Array.isArray(d) ? d.slice(0, 3) : []); })
      .catch(() => {});
    return () => { active = false; };
  }, [slug]);

  const sigla = programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla : null;
  const linhas = Array.isArray(programa.linhas) ? programa.linhas : [];

  return (
    <>
      {/* Hero */}
      <section
        className="relative text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--prog-primary), color-mix(in srgb, var(--prog-primary) 70%, black))' }}
      >
        <i className="fa-solid fa-landmark text-[22rem] text-white/5 -bottom-24 -right-16 absolute rotate-12 pointer-events-none"></i>
        <div className="container mx-auto px-4 py-16 md:py-24 relative max-w-4xl">
          {programa.area_conhecimento && (
            <p className="text-[var(--prog-accent)] font-semibold uppercase tracking-wider text-sm mb-3">
              {programa.area_conhecimento}
            </p>
          )}
          <h1 className="font-heading font-black text-4xl md:text-5xl leading-tight mb-5">
            {sigla ? `${programa.nome}` : programa.nome}
          </h1>
          {programa.descricao_curta && (
            <p className="text-white/80 text-lg md:text-xl max-w-3xl leading-relaxed mb-8">
              {programa.descricao_curta}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link to={programaPath(slug, 'sobre')}
              className="px-6 py-3 bg-[var(--prog-accent)] text-[var(--prog-primary)] font-bold rounded-xl hover:brightness-95 transition-all">
              <i className="fa-solid fa-circle-info mr-2"></i> Conheça o Programa
            </Link>
            <Link to={programaPath(slug, 'editais')}
              className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all">
              <i className="fa-solid fa-file-lines mr-2"></i> Editais e Seleções
            </Link>
          </div>
        </div>
      </section>

      {/* Modalidades / selos */}
      {Array.isArray(programa.modalidades) && programa.modalidades.length > 0 && (
        <section className="bg-white border-b border-gray-100">
          <div className="container mx-auto px-4 py-6 flex flex-wrap gap-3 items-center justify-center">
            {programa.modalidades.map((m) => (
              <span key={m.id || m.tipo}
                className="text-xs font-bold px-4 py-2 rounded-full bg-[var(--prog-primary)]/5 text-[var(--prog-primary)] border border-[var(--prog-primary)]/10">
                {m.tipo === 'M' ? 'Mestrado Acadêmico' : m.tipo === 'D' ? 'Doutorado Acadêmico' : m.tipo === 'P' ? 'Mestrado Profissional' : m.tipo}
                {m.nota_capes ? ` · Nota CAPES ${m.nota_capes}` : ''}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 py-14 space-y-16">
        {/* Notícias do programa */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[var(--prog-accent)] font-semibold uppercase tracking-wider text-xs mb-1">Fique por dentro</p>
              <h2 className="font-heading font-black text-2xl md:text-3xl text-[var(--prog-primary)]">Últimas Notícias</h2>
            </div>
            <Link to={programaPath(slug, 'noticias')} className="text-sm font-semibold text-[var(--prog-primary)] hover:opacity-70 transition-opacity whitespace-nowrap">
              Ver todas <i className="fa-solid fa-arrow-right text-xs ml-1"></i>
            </Link>
          </div>
          {noticias.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 text-gray-500">
              <i className="fa-solid fa-newspaper text-gray-300 text-4xl mb-3"></i>
              <p>Ainda não há notícias publicadas para este programa.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {noticias.map((n) => (
                <Link key={n.id} to={programaPath(slug, `noticias/${n.id}`)}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 flex flex-col">
                  {n.image && (
                    <div className="aspect-[16/9] overflow-hidden bg-gray-100">
                      <img src={n.image.startsWith('http') ? n.image : `${API_URL}${n.image}`} alt={n.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-grow">
                    <span className="text-xs text-gray-400 mb-2"><i className="fa-regular fa-calendar mr-1.5"></i>{formatDate(n.date)}</span>
                    <h3 className="font-heading font-bold text-[var(--prog-primary)] leading-snug mb-2 group-hover:opacity-80">{n.title}</h3>
                    {n.excerpt && <p className="text-sm text-gray-600 line-clamp-3">{n.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Linhas de pesquisa */}
        {linhas.length > 0 && (
          <section>
            <p className="text-[var(--prog-accent)] font-semibold uppercase tracking-wider text-xs mb-1">Pesquisa</p>
            <h2 className="font-heading font-black text-2xl md:text-3xl text-[var(--prog-primary)] mb-6">Linhas de Pesquisa</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {linhas.map((linha, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
                  <span className="shrink-0 h-10 w-10 rounded-lg bg-[var(--prog-primary)]/5 text-[var(--prog-primary)] flex items-center justify-center">
                    <i className={`fa-solid ${LINHA_ICONS[i % LINHA_ICONS.length]}`}></i>
                  </span>
                  <span className="text-sm font-medium text-gray-700 leading-snug">{typeof linha === 'object' ? linha.label : linha}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Em Números */}
        {(() => {
          const mod = programa.modulos || {};
          const m = programa.metrica_recente;
          const stats = [
            { label: 'Docentes Permanentes', value: m?.docentes_permanentes ?? (mod.pessoas > 0 ? mod.pessoas : null), icon: 'fa-users' },
            { label: 'Discentes (Mestrado)', value: m?.discentes_mestrado, icon: 'fa-user-graduate' },
            { label: 'Discentes (Doutorado)', value: m?.discentes_doutorado, icon: 'fa-graduation-cap' },
            { label: 'Artigos Publicados', value: m?.producao_artigos, icon: 'fa-book-open' },
            { label: 'Teses Defendidas', value: m?.teses_defendidas ?? (mod.teses > 0 ? mod.teses : null), icon: 'fa-scroll' },
            { label: 'Bolsistas CAPES', value: m?.bolsistas_capes, icon: 'fa-award' },
            { label: 'Grupos de Pesquisa', value: mod.grupos > 0 ? mod.grupos : null, icon: 'fa-microscope' },
            { label: 'Disciplinas', value: mod.disciplinas > 0 ? mod.disciplinas : null, icon: 'fa-book' },
          ].filter((s) => s.value != null && s.value > 0);
          if (stats.length === 0) return null;
          const cols = stats.length <= 3 ? stats.length : stats.length <= 4 ? 4 : stats.length <= 6 ? 3 : 4;
          return (
            <section>
              <p className="text-[var(--prog-accent)] font-semibold uppercase tracking-wider text-xs mb-1">
                O programa em{m ? ` — Dados de ${m.ano}` : ''}
              </p>
              <h2 className="font-heading font-black text-2xl md:text-3xl text-[var(--prog-primary)] mb-6">Números</h2>
              <div className={`grid gap-4 grid-cols-2 md:grid-cols-${cols}`}>
                {stats.map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                    <i className={`fa-solid ${s.icon} text-2xl text-[var(--prog-accent)] mb-3 block`}></i>
                    <p className="font-heading font-black text-4xl text-[var(--prog-primary)]">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Contato resumido */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-heading font-black text-2xl text-[var(--prog-primary)] mb-3">Fale com a Secretaria</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                {programa.endereco && <li className="flex items-start gap-3"><i className="fa-solid fa-location-dot text-[var(--prog-accent)] mt-1"></i><span>{programa.endereco}</span></li>}
                {programa.email_programa && <li className="flex items-center gap-3"><i className="fa-solid fa-envelope text-[var(--prog-accent)]"></i><a href={`mailto:${programa.email_programa}`} className="hover:text-[var(--prog-primary)] break-all">{programa.email_programa}</a></li>}
                {programa.telefone_secretaria && <li className="flex items-center gap-3"><i className="fa-solid fa-phone text-[var(--prog-accent)]"></i>{programa.telefone_secretaria}</li>}
                {programa.whatsapp && <li className="flex items-center gap-3"><i className="fa-brands fa-whatsapp text-[var(--prog-accent)]"></i>{programa.whatsapp}</li>}
              </ul>
              <Link to={programaPath(slug, 'contato')} className="inline-flex items-center gap-2 mt-6 text-sm font-bold text-[var(--prog-primary)] hover:opacity-70">
                Página de contato <i className="fa-solid fa-arrow-right text-xs"></i>
              </Link>
            </div>
            {programa.coordenador_atual?.nome && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Coordenação</p>
                <p className="font-heading font-bold text-lg text-[var(--prog-primary)]">{programa.coordenador_atual.nome}</p>
                {programa.substituto?.nome && (
                  <p className="text-sm text-gray-500 mt-2">Vice/Substituto(a): {programa.substituto.nome}</p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
