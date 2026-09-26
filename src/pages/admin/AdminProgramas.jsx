import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, Globe, Layers } from 'lucide-react';
import ListaAdmin, { CelulaTitulo, Selo } from '../../components/admin/ListaAdmin';

const MODALIDADE = { M: 'Mestrado', D: 'Doutorado', P: 'Profissional' };
const iconeAcao = 'p-1.5 rounded text-gray-500 hover:text-ufrpe-blue hover:bg-ufrpe-blue/10';

// Programas são da PRPG: sem filtro de origem nem de situação de publicação.
const AdminProgramas = () => (
  <ListaAdmin
    titulo="Gerenciar Programas Stricto Sensu" rotuloNovo="Novo Programa" rotaNovo="/admin/programas/novo"
    endpoint="/api/programas" rotaEditar={(p) => `/admin/programas/editar/${p.id}`}
    singular="programa" plural="programas" artigo="o" filtroOrigem={false} filtroStatus={false}
    nomeItem={(p) => p.nome} rotuloBusca="Buscar por nome, sigla ou campus…"
    colunas={[
      {
        chave: 'nome', rotulo: 'Programa', ordenar: 'nome',
        render: (p, c) => (
          <div>
            <CelulaTitulo item={{ ...p, status: null }} titulo={`${p.nome}${p.sigla && p.sigla !== 'S/SIGLA' ? ` (${p.sigla})` : ''}`} {...c} />
            {p.slug && (
              <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.microsite_ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                {p.microsite_ativo ? 'Microsite publicado' : 'Microsite rascunho'}
              </span>
            )}
          </div>
        ),
      },
      { chave: 'campus', rotulo: 'Campus', ordenar: 'campus', render: (p) => (p.campus ? <Selo>{p.campus}</Selo> : '—') },
      {
        chave: 'nivel', rotulo: 'Nível',
        render: (p) => (
          <div className="flex flex-wrap gap-1">
            {(p.modalidades || []).map((m, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{MODALIDADE[m.tipo] || m.tipo}</span>
            ))}
          </div>
        ),
      },
    ]}
    acoesExtras={(p) => (
      <>
        {p.slug && (
          <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" className={iconeAcao} title="Ver microsite" aria-label={`Ver o microsite de ${p.nome} (abre em nova aba)`}>
            <Globe size={16} aria-hidden="true" />
          </a>
        )}
        <Link to={`/admin/programas/${p.id}/site`} className={iconeAcao} title="Site do programa (páginas, conteúdos)" aria-label={`Site do programa ${p.nome}`}>
          <Layers size={16} aria-hidden="true" />
        </Link>
        <Link to={`/admin/programas/${p.id}/metricas`} className={iconeAcao} title="Métricas anuais" aria-label={`Métricas anuais de ${p.nome}`}>
          <BarChart2 size={16} aria-hidden="true" />
        </Link>
      </>
    )}
  />
);

export default AdminProgramas;
