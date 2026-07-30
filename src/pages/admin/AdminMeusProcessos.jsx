import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { FileText } from 'lucide-react';

const fmtData = (iso) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
};

// Fase L.4 (PLANO.md): visão "meus processos" para conselheiros — requer
// apenas login (relator_id = usuário autenticado); não depende de papel
// Administrator/Gestor/GestorPrograma. Aposta no caminho "conselheiro com
// login" da D-J3, ainda em aberto — se a resposta for "link tokenizado sem
// login", esta tela não se aplica e a L.5 cobriria o caso por e-mail.
// Sem link para a ficha completa (exige papel da Câmara que um conselheiro
// raso pode não ter) — só os dados essenciais aparecem aqui.
export default function AdminMeusProcessos() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/camara/meus-processos')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setLista)
      .catch(() => setError('Erro ao carregar seus processos.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TableSkeleton rows={5} cols={4} />;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-1">Meus Processos</h1>
      <p className="text-sm text-gray-500 mb-5">Processos da Câmara em que você é o(a) relator(a) designado(a).</p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4 font-medium">Processo</th>
              <th className="py-2 pr-4 font-medium">Assunto</th>
              <th className="py-2 pr-4 font-medium">Prazo de devolução</th>
              <th className="py-2 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lista.length === 0 && !loading && (
              <EmptyRow colSpan={4} icon={FileText} message="Nenhum processo sob sua relatoria no momento." hint="" />
            )}
            {lista.map((p) => (
              <tr key={p.id}>
                <td className="py-3 pr-4 font-mono text-xs">{p.numero}</td>
                <td className="py-3 pr-4 max-w-sm truncate" title={p.assunto}>{p.assunto}</td>
                <td className="py-3 pr-4 text-gray-500">{fmtData(p.relatorPrazoDevolucao)}</td>
                <td className="py-3 pr-4 text-gray-500">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
