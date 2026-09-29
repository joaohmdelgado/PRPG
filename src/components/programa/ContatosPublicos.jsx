import React from 'react';
import Icone from '../Icone';

// Fase G.9 (PLANO.md): contatos vindos de `contatos.publico=true` (D-G1: por
// padrão só e-mail da coordenação e telefone da secretaria; celular/e-mail
// pessoal só aparecem com marcação individual). Complementa — não substitui —
// os campos legados que `ProgramaContato` já lê de `programas` enquanto a
// migração de dado da Fase G não roda de verdade (ver CLAUDE.md, Fase O).
const ICONE_POR_TIPO = {
  EMAIL: 'envelope', TELEFONE: 'phone', CELULAR: 'mobile-screen', WHATSAPP: 'whatsapp', RAMAL: 'hashtag',
};

const ROTULOS = {
  coordenacao: 'Coordenação', secretaria: 'Secretaria', institucional: 'Institucional', pessoal: 'Pessoal',
};

function rotuloDoContato(c) {
  if (ROTULOS[c.rotulo]) return ROTULOS[c.rotulo];
  if (c.rotulo) return c.rotulo.charAt(0).toUpperCase() + c.rotulo.slice(1);
  return c.tipo;
}

export default function ContatosPublicos({ contatos }) {
  if (!contatos?.length) return null;
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {contatos.map((c) => (
        <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
          <span className="shrink-0 h-11 w-11 rounded-xl bg-[var(--prog-primary)]/5 text-[var(--prog-primary)] flex items-center justify-center">
            <Icone nome={ICONE_POR_TIPO[c.tipo] || 'envelope'} />
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">{rotuloDoContato(c)}</p>
            <div className="text-gray-700 break-words">
              {c.tipo === 'EMAIL'
                ? <a href={`mailto:${c.valor}`} className="hover:text-[var(--prog-primary)]">{c.valorExibicao || c.valor}</a>
                : (c.valorExibicao || c.valor)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
