import React from 'react';
import { hrefContato, iconeContato, rotuloContato, iniciais, fotoPessoa } from '../hooks/useEstrutura';

// Peças comuns de Equipe e Estrutura Organizacional (Fase H.4).

export function ListaContatos({ contatos, className = '', claro = false }) {
  if (!contatos?.length) return null;
  const cor = claro ? 'text-white/80 hover:text-ufrpe-yellow' : 'text-gray-600 hover:text-ufrpe-blue';
  return (
    <ul className={`space-y-1.5 text-sm ${className}`}>
      {contatos.map((c) => {
        const href = hrefContato(c);
        const externo = href && /^https?:/i.test(href);
        const conteudo = (
          <>
            <i className={`${iconeContato(c.tipo)} w-4 text-center text-ufrpe-yellow`} aria-hidden="true"></i>
            <span className="sr-only">{rotuloContato(c.tipo)}: </span>
            <span className="break-all">{c.exibicao}</span>
          </>
        );
        return (
          <li key={c.id || `${c.tipo}-${c.valor}`}>
            {href
              ? <a href={href} {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={`inline-flex items-center gap-2 transition ${cor}`}>{conteudo}</a>
              : <span className={`inline-flex items-center gap-2 ${claro ? 'text-white/80' : 'text-gray-600'}`}>{conteudo}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function Avatar({ membro, tamanho = 'w-16 h-16', texto = 'text-lg' }) {
  const foto = fotoPessoa(membro);
  if (foto) return <img src={foto} alt="" loading="lazy" className={`${tamanho} rounded-xl object-cover shrink-0 bg-gray-100`} />;
  return (
    <span className={`${tamanho} ${texto} rounded-xl bg-ufrpe-blue/10 text-ufrpe-blue font-bold flex items-center justify-center shrink-0`} aria-hidden="true">
      {iniciais(membro.nome)}
    </span>
  );
}

export function CartaoMembro({ membro }) {
  return (
    <li className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex gap-4">
      <Avatar membro={membro} />
      <div className="min-w-0">
        <p className="font-bold text-gray-900 leading-snug">{membro.nome}</p>
        {membro.funcao && <p className="text-ufrpe-blue text-xs font-bold uppercase tracking-wider mt-0.5 mb-2">{membro.funcao}</p>}
        <ListaContatos contatos={membro.contatos} />
      </div>
    </li>
  );
}
