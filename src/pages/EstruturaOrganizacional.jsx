import React from 'react';
import { Link } from 'react-router-dom';
import CabecalhoPagina from '../components/CabecalhoPagina';
import useEstrutura from '../hooks/useEstrutura';
import { Avatar, ListaContatos } from '../components/EstruturaUI';

// Estrutura Organizacional (Fase H.4): organograma gerado dos setores
// cadastrados em "Equipe e estrutura" no painel. Os detalhes de cada setor
// abrem no próprio cartão (<details>), em vez do modal de antes — funciona
// pelo teclado e com leitor de tela sem código extra.

function Pessoas({ membros }) {
  if (!membros.length) return null;
  return (
    <ul className="space-y-3">
      {membros.map((m) => (
        <li key={m.id} className="flex items-center gap-3">
          <Avatar membro={m} tamanho="w-10 h-10" texto="text-sm" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 leading-tight">{m.nome}</p>
            {m.funcao && <p className="text-xs text-gray-500">{m.funcao}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function EstruturaOrganizacional() {
  const { raiz, estado } = useEstrutura();

  return (
    <>
      <CabecalhoPagina
        icone="fa-solid fa-sitemap"
        titulo="Estrutura Organizacional"
        subtitulo="Conheça a organização administrativa e acadêmica da Pró-Reitoria de Pós-Graduação da UFRPE."
      />
      <div className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          {estado === 'carregando' && <p className="text-gray-500 py-12 text-center" role="status">Carregando…</p>}
          {estado === 'erro' && <p className="text-gray-600 py-12 text-center">Não foi possível carregar a estrutura agora. Tente novamente em instantes.</p>}
          {raiz && (
            <>
              {/* Raiz */}
              <section className="max-w-2xl mx-auto bg-ufrpe-blue text-white rounded-3xl p-8 md:p-10 text-center shadow-xl" aria-labelledby="org-raiz">
                <h2 id="org-raiz" className="text-2xl md:text-3xl font-heading font-black mb-3">{raiz.nome}</h2>
                {raiz.descricao && <p className="text-white/70 mb-6">{raiz.descricao}</p>}
                {raiz.membros.length > 0 && (
                  <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-4">
                    {raiz.membros.map((m) => (
                      <li key={m.id}><span className="font-bold">{m.nome}</span>{m.funcao && <span className="text-ufrpe-yellow"> · {m.funcao}</span>}</li>
                    ))}
                  </ul>
                )}
                <ListaContatos contatos={raiz.contatos} claro className="inline-block text-left" />
              </section>

              <div className="flex justify-center" aria-hidden="true">
                <div className="w-1 h-12 bg-ufrpe-blue/20"></div>
              </div>

              {/* Setores */}
              <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {raiz.filhos.map((s) => (
                  <li key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <h3 className="text-lg font-heading font-bold text-ufrpe-blue mb-2 leading-snug">{s.nome}</h3>
                    {s.descricao && <p className="text-sm text-gray-600 mb-4">{s.descricao}</p>}
                    {(s.membros.length > 0 || s.contatos.length > 0) && (
                      <details className="mt-auto group">
                        <summary className="cursor-pointer text-sm font-bold text-ufrpe-cyan hover:text-ufrpe-blue list-none flex items-center gap-2">
                          <i className="fa-solid fa-chevron-right text-xs transition-transform group-open:rotate-90" aria-hidden="true"></i>
                          Equipe e contatos
                        </summary>
                        <div className="pt-4 space-y-4">
                          <Pessoas membros={s.membros} />
                          <ListaContatos contatos={s.contatos} />
                        </div>
                      </details>
                    )}
                  </li>
                ))}
              </ul>

              <p className="text-center text-sm text-gray-500 mt-10">
                Telefones e e-mails de cada pessoa estão na página <Link to="/equipe" className="text-ufrpe-blue underline">Equipe</Link>.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
