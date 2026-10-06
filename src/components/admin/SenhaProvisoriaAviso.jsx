import React, { useState } from 'react';
import { KeyRound, Copy, Check } from 'lucide-react';

// AUTH-02: a senha provisória gerada pelo servidor (cadastro sem senha ou
// "Gerar senha provisória") aparece só aqui, uma vez — não é guardada em lugar
// nenhum que dê para reabrir. Quem cadastrou repassa à pessoa; no 1º acesso ela
// tem de trocar.
export default function SenhaProvisoriaAviso({ email, senha, onConcluir, rotuloConcluir = 'Já anotei' }) {
  const [copiada, setCopiada] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiada(true);
    } catch { /* sem permissão de área de transferência: a senha segue visível para copiar à mão */ }
  };

  return (
    <div role="status" className="border border-amber-300 bg-amber-50 rounded-lg p-4 my-4">
      <p className="flex items-center gap-2 font-medium text-amber-900">
        <KeyRound size={18} aria-hidden="true" /> Senha provisória{email ? ` de ${email}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <code data-senha-provisoria className="text-lg font-mono tracking-wider bg-white border border-amber-200 rounded px-3 py-1.5 select-all">
          {senha}
        </code>
        <button type="button" onClick={copiar}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border border-amber-300 bg-white hover:bg-amber-100">
          {copiada ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copiada ? 'Copiada' : 'Copiar'}
        </button>
      </div>
      <p className="text-sm text-amber-900 mt-3">
        Anote ou copie agora: ela <strong>não será mostrada de novo</strong>. Repasse à pessoa por um canal
        só dela; no primeiro acesso o sistema pede uma senha nova.
      </p>
      {onConcluir && (
        <button type="button" onClick={onConcluir}
          className="mt-3 text-sm px-4 py-2 bg-ufrpe-blue text-white rounded hover:bg-[#2a3a66]">
          {rotuloConcluir}
        </button>
      )}
    </div>
  );
}
