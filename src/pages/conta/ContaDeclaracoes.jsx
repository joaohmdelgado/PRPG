import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Download, FileCheck, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../api';
import { EstadoVazio } from '../../components/ui/Estados';
import { useToast } from '../../components/admin/Toast';

const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

export default function ContaDeclaracoes() {
  const { declaracoes } = useOutletContext();
  const { toast, Toasts } = useToast();
  const [baixando, setBaixando] = useState(null);

  // O PDF exige o token (Authorization), então não dá para ser um link simples:
  // baixa como arquivo e entrega ao navegador.
  const baixar = async (d) => {
    setBaixando(d.codigo);
    try {
      const res = await apiFetch(`/api/minha-conta/declaracoes/${d.inscricaoId}/pdf`);
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `declaracao-${d.codigo.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      toast.error('Não foi possível baixar a declaração. Tente de novo.');
    } finally {
      setBaixando(null);
    }
  };

  return (
    <section aria-labelledby="t-declaracoes">
      <h2 id="t-declaracoes" className="font-heading text-xl font-semibold text-ufrpe-blue mb-4">Declarações emitidas</h2>
      {declaracoes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <EstadoVazio icone={FileCheck} titulo="Nenhuma declaração emitida."
            descricao="Quando a secretaria emitir uma declaração em seu nome (por exemplo, a de proficiência aprovada), ela aparece aqui para baixar." />
        </div>
      ) : (
        <ul className="space-y-3">
          {declaracoes.map((d) => (
            <li key={d.codigo} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{d.rotulo}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {d.resumo?.linguas ? `${[].concat(d.resumo.linguas).join(', ')} · ` : ''}
                    {d.resumo?.resultado ? `${d.resumo.resultado} · ` : ''}
                    emitida em {fmt(d.emitidaEm)}{d.validaAte ? ` · válida até ${fmt(d.validaAte)}` : ''}
                  </p>
                  {d.revogada && <p className="text-sm text-red-800 mt-1">Esta declaração foi revogada e não é mais válida.</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.inscricaoId && !d.revogada && (
                    <button type="button" onClick={() => baixar(d)} disabled={baixando === d.codigo}
                      className="inline-flex items-center gap-1.5 bg-ufrpe-blue text-white px-3 py-2 rounded-lg text-sm hover:bg-[#2a3a66] disabled:opacity-50">
                      <Download size={15} aria-hidden="true" /> {baixando === d.codigo ? 'Baixando…' : 'Baixar PDF'}
                    </button>
                  )}
                  {!d.revogada && (
                    <Link to={`/verificar/${d.codigo}`} className="inline-flex items-center gap-1.5 border border-gray-300 px-3 py-2 rounded-lg text-sm text-gray-800 hover:bg-gray-50">
                      <ShieldCheck size={15} aria-hidden="true" /> Página de verificação
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {Toasts}
    </section>
  );
}
