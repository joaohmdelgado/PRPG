import React from 'react';
import { ExternalLink, Lock } from 'lucide-react';
import ListaAdmin, { CelulaTitulo } from '../../components/admin/ListaAdmin';
import { ORIGEM_TODAS } from '../../hooks/useListaServidor';

// Páginas fixas de programa ainda vazias ficam de fora (?semFixasVazias=1):
// são escritas pela tela "Site do Programa". As fixas (com `chave`) não podem
// ser excluídas nem entram na seleção em massa.
const AdminPagesList = () => (
  <ListaAdmin
    titulo="Gerenciar Páginas" rotuloNovo="Nova Página" rotaNovo="/admin/paginas/nova"
    endpoint="/api/pages" rotaEditar={(p) => `/admin/paginas/editar/${p.id}`}
    singular="página" plural="páginas" artigo="a" origemPadrao={ORIGEM_TODAS}
    fixos={{ semFixasVazias: '1' }}
    rotuloBusca="Buscar por título, endereço ou texto…"
    selecionavel={(p) => !p.chave}
    podeExcluir={(p) => !p.chave}
    colunas={[
      {
        chave: 'title', rotulo: 'Título', ordenar: 'title',
        render: (p, c) => (
          <div>
            <CelulaTitulo item={p} {...c} />
            {p.chave && (
              <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900">
                <Lock size={10} aria-hidden="true" /> Fixa — não pode ser excluída
              </span>
            )}
          </div>
        ),
      },
      {
        chave: 'programa', rotulo: 'Programa',
        render: (p, { programas }) => {
          if (!p.programaId) return <span className="text-gray-500">— Geral —</span>;
          const prog = programas.find((x) => x.id === p.programaId);
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-ufrpe-blue/10 text-ufrpe-blue">
              {prog?.rotulo || 'Programa'}
            </span>
          );
        },
      },
      {
        chave: 'link', rotulo: 'Link Público', ordenar: 'slug',
        render: (p, { programas }) => {
          const prog = p.programaId ? programas.find((x) => x.id === p.programaId) : null;
          const caminho = prog?.slug ? `/${prog.slug}/${p.slug}` : `/${p.slug}`;
          return (
            <a href={caminho} target="_blank" rel="noopener noreferrer" className="text-ufrpe-blue hover:underline inline-flex items-center gap-1.5 font-medium">
              {caminho} <ExternalLink size={14} aria-hidden="true" /><span className="sr-only"> (abre em nova aba)</span>
            </a>
          );
        },
      },
    ]}
  />
);

export default AdminPagesList;
