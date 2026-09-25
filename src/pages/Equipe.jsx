import React from 'react';
import CabecalhoPagina from '../components/CabecalhoPagina';
import useEstrutura from '../hooks/useEstrutura';
import { CartaoMembro, ListaContatos } from '../components/EstruturaUI';

// Equipe da PRPG (Fase H.4): gerada dos setores e vínculos cadastrados em
// "Equipe e estrutura" no painel — antes eram nomes, fotos e telefones fixos
// no código (e divergentes da página de Estrutura Organizacional).

const ancora = (id) => `setor-${id}`;

function Setor({ unidade, nivel = 2 }) {
  const Titulo = `h${nivel}`;
  return (
    <section id={ancora(unidade.id)} className="scroll-mt-32" aria-labelledby={`${ancora(unidade.id)}-titulo`}>
      <Titulo id={`${ancora(unidade.id)}-titulo`} className="text-2xl font-black text-ufrpe-blue mb-2 flex items-center gap-3">
        <span className="w-8 h-1 bg-ufrpe-yellow rounded-full shrink-0" aria-hidden="true"></span> {unidade.nome}
      </Titulo>
      {unidade.contatos.length > 0 && <ListaContatos contatos={unidade.contatos} className="mb-6 ml-11 flex flex-wrap gap-x-6 gap-y-1.5 space-y-0" />}
      {unidade.membros.length > 0 ? (
        <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {unidade.membros.map((m) => <CartaoMembro key={m.id} membro={m} />)}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 ml-11">Equipe não informada.</p>
      )}
    </section>
  );
}

export default function Equipe() {
  const { raiz, estado } = useEstrutura();
  // A raiz (Pró-Reitoria) e os setores com gente — um setor só com contato
  // (ex.: Clínica de Bovinos) fica na Estrutura Organizacional.
  const setores = raiz ? [raiz, ...raiz.filhos.filter((f) => f.membros.length)] : [];

  return (
    <>
      <CabecalhoPagina
        icone="fa-solid fa-users"
        titulo="Equipe PRPG"
        subtitulo="Conheça os profissionais dedicados ao desenvolvimento e excelência da Pós-Graduação na UFRPE."
      />
      <div className="py-12">
        <div className="container mx-auto px-4">
          {estado === 'carregando' && <p className="text-gray-500 py-12 text-center" role="status">Carregando…</p>}
          {estado === 'erro' && <p className="text-gray-600 py-12 text-center">Não foi possível carregar a equipe agora. Tente novamente em instantes.</p>}
          {raiz && (
            <div className="flex flex-col lg:flex-row gap-8">
              <nav aria-label="Setores" className="lg:w-1/4 shrink-0">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 lg:sticky lg:top-28 p-5">
                  <h2 className="font-heading font-bold text-lg text-gray-800 mb-3">Setores</h2>
                  <ul className="space-y-1">
                    {setores.map((s) => (
                      <li key={s.id}>
                        <a href={`#${ancora(s.id)}`} className="flex gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 hover:text-ufrpe-blue">
                          <i className="fa-solid fa-chevron-right text-ufrpe-yellow text-xs mt-1" aria-hidden="true"></i>
                          <span className="leading-snug">{s.id === raiz.id ? 'Pró-Reitoria' : s.nome}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
              <div className="flex-1 space-y-16">
                {setores.map((s) => <Setor key={s.id} unidade={s} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
