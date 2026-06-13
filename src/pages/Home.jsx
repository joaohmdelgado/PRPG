import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const QUICK = [
  { i: 'fa-regular fa-calendar-days', l: 'Calendário\nAcadêmico', p: '/calendario-academico' },
  { i: 'fa-solid fa-book-open', l: 'Catálogo de\nCursos', p: null },
  { i: 'fa-solid fa-gavel', l: 'Resoluções', p: null },
  { i: 'fa-solid fa-file-signature', l: 'Formulários', p: null },
  { i: 'fa-solid fa-globe', l: 'Internacionalização', p: null },
  { i: 'fa-solid fa-people-arrows', l: 'Proext-PG', p: null },
  { i: 'fa-solid fa-bullhorn', l: 'Editais', p: '/editais' },
  { i: 'fa-solid fa-cow', l: 'Clínica de\nBovinos', p: null },
];

const SERVICES = [
  { i: 'fa-solid fa-door-open', c: 'text-ufrpe-cyan', bg: 'bg-ufrpe-cyan/10', t: 'Ingresso e Seleção', d: 'Editais, inscrição, matrícula inicial e linhas de pesquisa.', lc: 'text-ufrpe-cyan' },
  { i: 'fa-solid fa-book-open-reader', c: 'text-ufrpe-yellow-hover', bg: 'bg-ufrpe-yellow/20', t: 'Vida Acadêmica', d: 'Disciplinas, créditos, frequência e orientação.', lc: 'text-ufrpe-yellow-hover' },
  { i: 'fa-solid fa-graduation-cap', c: 'text-green-600', bg: 'bg-green-100', t: 'Qualificação e Defesa', d: 'Prazos, banca examinadora e entrega final de trabalhos.', lc: 'text-green-600' },
  { i: 'fa-solid fa-hand-holding-dollar', c: 'text-purple-600', bg: 'bg-purple-100', t: 'Bolsas e Apoio', d: 'Critérios, implementação, relatórios e cancelamento.', lc: 'text-purple-600' },
  { i: 'fa-solid fa-folder-open', c: 'text-orange-600', bg: 'bg-orange-100', t: 'Documentação', d: 'Histórico, declarações, diploma e comprovantes.', lc: 'text-orange-600' },
  { i: 'fa-solid fa-laptop-code', c: 'text-slate-600', bg: 'bg-slate-100', t: 'Sistemas e Acesso', d: 'SIGAA, e-mail institucional e Wi-Fi Eduroam.', lc: 'text-slate-600' },
];

const PROGRAMS = [
  { t: 'Stricto Sensu', img: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80', d: 'Mestrados e Doutorados Acadêmicos e Profissionais voltados para a formação de pesquisadores e docentes de excelência.', badge: '42 Programas', count: '59 Cursos' },
  { t: 'Lato Sensu', img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80', d: 'Cursos de Especialização para aprofundamento técnico, atualização profissional e prática.', badge: 'Especializações', count: '8 Cursos' },
  { t: 'Residência', img: 'https://images.unsplash.com/photo-1629813359670-652f4477ca3f?w=800&q=80', d: 'Residência em Medicina Veterinária e Residência Profissional, unindo teoria e prática intensiva.', badge: 'Treinamento em Serviço', count: '' },
];

const EDITAIS = [
  { status: 'open', bc: 'border-ufrpe-cyan', badge: 'bg-cyan-100 text-cyan-800', bl: 'Inscrições Abertas', dt: '05/05/2026', ddl: 'até 20/05/2026', t: 'Edital 05/2026 – Seleção para Pós-doutorado em Extensão (Proext-PG)', d: 'A PRPG torna público o edital para seleção de bolsistas de pós-doutorado vinculados a projetos de extensão.' },
  { status: 'active', bc: 'border-ufrpe-yellow', badge: 'bg-yellow-100 text-yellow-800', bl: 'Em Andamento', dt: '15/04/2026', ddl: null, t: 'Edital 04/2026 – Residência em Aquicultura "AquiResidência"', d: 'Processo seletivo para ingresso na primeira turma da Residência Profissional em Aquicultura da UFRPE.' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      {/* SECTION 1: HERO / BANNER PRINCIPAL */}
      <header className="relative bg-ufrpe-blue text-white overflow-hidden flex items-center min-h-[560px]">
        <div className="absolute inset-0 z-0">
          <img src="https://prpg.ufrpe.br/sites/default/files/configuracoes/pos-graduacao-ufrpe.jpg" className="w-full h-full object-cover object-center" alt="" />
        </div>
        <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to right,#1e2b4f,rgba(30,43,79,.90),rgba(30,43,79,.40))' }}></div>
        <div className="container mx-auto px-4 relative z-20 py-24">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 bg-ufrpe-yellow text-ufrpe-blue text-xs font-bold rounded-full mb-6 tracking-wide uppercase">Pós-Graduação UFRPE</span>
            <h2 className="font-heading font-extrabold text-4xl md:text-6xl mb-6 leading-tight">Aprendendo hoje,<br /><span className="text-ufrpe-yellow">liderando amanhã.</span></h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl font-light">Formando professionals para o exercício, em alto nível, da docência, da pesquisa e da atividade autônoma, fomentando a produção de novos conhecimentos.</p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate('/editais')} className="px-8 py-3 bg-ufrpe-yellow text-ufrpe-blue font-bold rounded-lg hover:bg-white transition-colors shadow-[0_8px_20px_rgba(254,189,17,.25)]">Conheça os Cursos</button>
              <button className="px-8 py-3 text-white font-bold rounded-lg border border-white/20 hover:bg-white/20 transition-colors backdrop-blur-sm bg-white/10">Sou Aluno</button>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION 2: ACESSOS RÁPIDOS */}
      <section className="py-12 bg-white relative z-30 -mt-10 mx-4 md:mx-auto container rounded-2xl border border-gray-100 shadow-[0_20px_40px_rgba(0,0,0,.08)]">
        <div className="px-6 md:px-10">
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-4 text-center">
            {QUICK.map((q, i) => (
              <button key={i} onClick={() => q.p && navigate(q.p)} className="group flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-ufrpe-blue/5 text-ufrpe-blue flex items-center justify-center text-xl group-hover:bg-ufrpe-yellow group-hover:text-white transition-all transform group-hover:-translate-y-1"><i className={q.i}></i></div>
                <span className="text-xs font-semibold text-gray-700 group-hover:text-ufrpe-blue leading-tight whitespace-pre-line">{q.l}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: ÚLTIMAS NOTÍCIAS */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12 border-b-2 border-ufrpe-yellow pb-4">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-ufrpe-blue flex items-center gap-3"><i className="fa-regular fa-newspaper text-ufrpe-yellow"></i>Últimas Notícias</h2>
            <button onClick={() => navigate('/noticias')} className="text-sm font-bold text-ufrpe-blue hover:text-ufrpe-yellow transition uppercase tracking-wider">Ver todos os informativos</button>
          </div>
          <div className="max-w-4xl mx-auto space-y-10">
            <article className="group cursor-pointer" onClick={() => navigate('/noticias')}>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="aspect-video bg-gray-200 rounded-2xl overflow-hidden relative shadow-lg">
                  <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" crossOrigin="anonymous" />
                  <div className="absolute top-4 left-4 bg-ufrpe-red text-white py-1.5 px-3 rounded text-[10px] font-bold uppercase tracking-wider shadow-lg">Destaque</div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3 text-xs font-bold text-ufrpe-yellow uppercase tracking-widest"><i className="fa-regular fa-clock mr-1"></i>20 de Março, 2026</div>
                  <h3 className="font-heading font-bold text-2xl md:text-3xl text-ufrpe-blue group-hover:text-ufrpe-red transition-colors mb-4 leading-tight">Acolhimento e Inclusão na Pós-Graduação: Participe da nossa pesquisa</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">Se você é discente da Pós-Graduação com deficiência ou necessidades educacionais específicas, sua participação é fundamental para a construção de um ambiente acadêmico verdadeiramente acessível e inclusivo.</p>
                  <span className="inline-flex items-center gap-2 text-ufrpe-blue font-bold text-sm">Ler matéria completa <i className="fa-solid fa-chevron-right text-[10px]"></i></span>
                </div>
              </div>
            </article>
            <div className="grid gap-6 pt-10 border-t border-gray-100">
              {[
                { img: 'https://images.unsplash.com/photo-1546410531-bea4ea651817?w=400&q=80', meta: '08 de Maio, 2026 // Secretaria', t: 'Teste de Proficiência Extra — Homologação das Inscrições Disponível', d: 'Confira a lista completa de candidatos homologados para o exame de proficiência.' },
                { img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80', meta: '07 de Maio, 2026 // Editais', t: 'UFRPE lança novo edital para distribuição estratégica de cotas de bolsas CAPES', d: 'Novos critérios visam fortalecer a pesquisa institucional e o apoio aos discentes de alto desempenho.' }
              ].map((n, i) => (
                <button key={i} onClick={() => navigate('/noticias')} className="flex flex-col md:flex-row gap-6 group p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left w-full">
                  <div className="w-full md:w-48 h-32 bg-gray-200 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                    <img src={n.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" crossOrigin="anonymous" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{n.meta}</span>
                    <h4 className="font-heading font-bold text-xl text-ufrpe-blue group-hover:text-ufrpe-yellow-hover transition-colors leading-tight mb-2">{n.t}</h4>
                    <p className="text-sm text-gray-500 line-clamp-2">{n.d}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="text-center pt-8">
              <button onClick={() => navigate('/noticias')} className="px-10 py-3 border-2 border-ufrpe-blue text-ufrpe-blue font-bold rounded-xl hover:bg-ufrpe-blue hover:text-white transition-all">Ver Histórico de Notícias</button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: JORNADA DO ALUNO (SERVIÇOS) */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12 border-b-2 border-ufrpe-yellow pb-4">
            <h2 className="font-heading font-bold text-3xl text-ufrpe-blue flex items-center gap-3"><i className="fa-solid fa-compass text-ufrpe-yellow"></i>Jornada do Aluno</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all hover:-translate-y-1 group">
                <div className={`w-12 h-12 ${s.bg} ${s.c} rounded-xl flex items-center justify-center text-xl mb-6 group-hover:scale-110 transition-transform`}><i className={s.i}></i></div>
                <h3 className="font-heading font-bold text-xl text-ufrpe-blue mb-3">{s.t}</h3>
                <p className="text-sm text-gray-600 mb-6">{s.d}</p>
                <span className={`${s.lc} font-semibold text-sm flex items-center gap-2`}>Explorar <i className="fa-solid fa-arrow-right text-xs"></i></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: ÚLTIMOS EDITAIS */}
      <section className="py-20 bg-gray-100">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex justify-between items-end mb-10 border-b-2 border-ufrpe-cyan pb-4">
            <h2 className="font-heading font-bold text-3xl text-ufrpe-blue flex items-center gap-3"><i className="fa-solid fa-bullhorn text-ufrpe-cyan"></i>Últimos Editais</h2>
            <button onClick={() => navigate('/editais')} className="text-sm font-bold text-ufrpe-cyan hover:underline uppercase tracking-wider">Painel de Editais</button>
          </div>
          <div className="space-y-4">
            {EDITAIS.slice(0, 2).map((e, i) => (
              <div key={i} className={`bg-white p-6 rounded-2xl shadow-sm ${e.bc} hover:shadow-md transition group`} style={{ borderLeftWidth: 8 }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`${e.badge} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider`}>{e.bl}</span>
                      <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-md"><i className="fa-regular fa-calendar mr-1"></i>{e.dt}</span>
                    </div>
                    <h4 className="font-heading font-bold text-xl text-ufrpe-blue group-hover:text-ufrpe-cyan transition-colors leading-snug">{e.t}</h4>
                  </div>
                  <button onClick={() => navigate('/editais')} className="px-6 py-2 bg-ufrpe-cyan text-white text-sm font-bold rounded-lg hover:bg-ufrpe-blue transition-colors flex items-center gap-2 shrink-0"><i className="fa-solid fa-download"></i>Edital</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: NOSSOS PROGRAMAS E ESTATÍSTICAS */}
      <section className="py-24 bg-ufrpe-blue relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-ufrpe-cyan opacity-10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-ufrpe-yellow opacity-10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16"><h2 className="font-heading font-bold text-3xl md:text-4xl text-white">Nossos Programas e Cursos</h2></div>
          <div className="grid md:grid-cols-3 gap-8">
            {PROGRAMS.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden flex flex-col group transition-transform hover:-translate-y-2" style={{ boxShadow: '0 8px 30px rgba(0,0,0,.40)' }}>
                <div className="h-56 bg-gray-200 relative overflow-hidden">
                  <img src={p.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={p.t} crossOrigin="anonymous" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,.80),rgba(0,0,0,.20),transparent)' }}></div>
                  <h3 className="absolute bottom-5 left-6 text-2xl font-heading font-bold text-white">{p.t}</h3>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <p className="text-gray-600 mb-8 leading-relaxed">{p.d}</p>
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-5">
                      <span className="bg-blue-50 text-ufrpe-blue text-xs font-bold px-3 py-1.5 rounded-full border border-blue-100">{p.badge}</span>
                      {p.count && <span className="text-gray-400 text-sm font-medium">{p.count}</span>}
                    </div>
                    <button onClick={() => navigate('/editais')} className="block w-full text-center py-3.5 bg-gray-50 text-ufrpe-blue font-bold rounded-xl border border-gray-200 hover:bg-ufrpe-yellow hover:text-white hover:border-ufrpe-yellow transition-all">Conhecer Programas</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/10 pt-16">
            {[
              ['2154', 'Alunos Stricto Sensu'],
              ['635', 'Alunos Lato Sensu'],
              ['42', 'Programas Stricto Sensu'],
              ['8', 'Cursos Lato Sensu']
            ].map(([n, l]) => (
              <div key={l} className="text-center">
                <span className="block text-4xl font-heading font-bold text-ufrpe-yellow mb-2">{n}</span>
                <p className="text-sm text-gray-300 font-medium">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: LOGOMARCAS PARCEIRAS / FOMENTO */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
            {[
              ['CAPES', 'https://prpg.ufrpe.br/themes/prpg_ufrpe/assets/img/capes.png'],
              ['BNB', 'https://prpg.ufrpe.br/themes/prpg_ufrpe/assets/img/bnb.png'],
              ['CNPq', 'https://prpg.ufrpe.br/themes/prpg_ufrpe/assets/img/cnpq.png'],
              ['FACEPE', 'https://prpg.ufrpe.br/themes/prpg_ufrpe/assets/img/facepe.png']
            ].map(([name, src]) => (
              <img key={name} src={src} alt={name} className="max-h-12 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300" onError={e => e.target.style.display = 'none'} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
