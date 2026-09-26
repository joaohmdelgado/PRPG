import React from 'react';
import { AlertTriangle, Inbox, LoaderCircle, RotateCw } from 'lucide-react';

// Três estados distintos (Fase U.6). Antes, uma falha de rede ou um 401 caía no
// mesmo `catch` que deixava a lista vazia, e a tela dizia "Nenhum registro" —
// o usuário achava que não havia dados quando, na verdade, a chamada falhou.
//   Carregando → o que está por vir ainda não chegou
//   EstadoVazio → chegou e não há nada (com o próximo passo)
//   EstadoErro → não chegou (com "Tentar de novo")

export function Carregando({ texto = 'Carregando…', className = '' }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 py-12 text-gray-500 text-sm ${className}`}>
      <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function EstadoVazio({ icone: Icone = Inbox, titulo = 'Nada por aqui ainda.', descricao, acao, className = '' }) {
  return (
    <div className={`text-center py-14 px-4 ${className}`}>
      <div className="mx-auto w-14 h-14 rounded-full bg-ufrpe-blue/5 grid place-items-center mb-4">
        <Icone className="text-ufrpe-blue/50" size={26} aria-hidden="true" />
      </div>
      <p className="font-heading text-base font-semibold text-gray-700">{titulo}</p>
      {descricao && <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

// `erro`: Error | string. `onTentar`: refaz a chamada. O texto técnico do erro
// fica num <details> (útil para suporte, sem assustar quem só quer tentar de novo).
export function EstadoErro({ titulo = 'Não foi possível carregar.', erro, onTentar, className = '' }) {
  const detalhe = erro instanceof Error ? erro.message : (typeof erro === 'string' ? erro : '');
  return (
    <div role="alert" className={`text-center py-12 px-4 ${className}`}>
      <div className="mx-auto w-14 h-14 rounded-full bg-red-50 grid place-items-center mb-4">
        <AlertTriangle className="text-red-600" size={26} aria-hidden="true" />
      </div>
      <p className="font-heading text-base font-semibold text-gray-800">{titulo}</p>
      <p className="text-sm text-gray-600 mt-1 max-w-md mx-auto">
        Isto é um problema de comunicação ou de permissão, não uma lista vazia. Tente de novo; se persistir, avise a equipe.
      </p>
      {detalhe && (
        <details className="text-xs text-gray-500 mt-2 max-w-md mx-auto">
          <summary className="cursor-pointer">Detalhes técnicos</summary>
          <p className="mt-1 break-words">{detalhe}</p>
        </details>
      )}
      {onTentar && (
        <button type="button" onClick={onTentar}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ufrpe-blue text-white text-sm font-medium hover:bg-[#2a3a66]">
          <RotateCw size={16} aria-hidden="true" /> Tentar de novo
        </button>
      )}
    </div>
  );
}

// Escolhe qual dos três mostrar. `dados` já carregados podem ser array
// (vazio = estado vazio) ou qualquer valor; `vazio` decide o que é "vazio".
export function Estado({ carregando, erro, onTentar, vazio, vaziaProps = {}, erroProps = {}, children }) {
  if (carregando) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} onTentar={onTentar} {...erroProps} />;
  if (vazio) return <EstadoVazio {...vaziaProps} />;
  return children;
}
