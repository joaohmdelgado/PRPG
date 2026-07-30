import React, { useState, useEffect, useCallback } from 'react';
import { Send, RotateCw, Mail } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';

// Fase I.6 (PLANO.md): tela de acompanhamento de envios. Ver services/email.js.
const SITUACAO_INFO = {
  ENVIADO: { label: 'Enviado', color: 'bg-emerald-100 text-emerald-800' },
  PENDENTE: { label: 'Pendente', color: 'bg-gray-100 text-gray-700' },
  ERRO: { label: 'Erro', color: 'bg-red-100 text-red-700' },
  SEM_SMTP: { label: 'SMTP não configurado', color: 'bg-amber-100 text-amber-800' },
};

const fmtDataHora = (iso) => iso ? new Date(iso).toLocaleString('pt-BR') : '—';

export default function AdminNotificacoes() {
  const [lista, setLista] = useState([]);
  const [situacao, setSituacao] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const { toast, Toasts } = useToast();

  const fetchLista = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (situacao) params.set('situacao', situacao);
    const res = await apiFetch(`/api/notificacoes?${params.toString()}`);
    if (res.ok) setLista(await res.json());
    else toast.error('Erro ao carregar notificações.');
    setLoading(false);
  }, [situacao, toast]);

  useEffect(() => { fetchLista(); }, [fetchLista]);

  const enviarTeste = async () => {
    setEnviandoTeste(true);
    const res = await apiFetch('/api/notificacoes/teste', { method: 'POST', json: {} });
    setEnviandoTeste(false);
    if (res.ok) {
      const r = await res.json();
      if (r.situacao === 'SEM_SMTP') toast.info('SMTP não configurado — a intenção foi registrada, mas nenhum e-mail saiu.');
      else if (r.situacao === 'ENVIADO') toast.success('E-mail de teste enviado.');
      else toast.error('Erro ao enviar e-mail de teste.');
      fetchLista();
    } else {
      toast.error('Erro ao enviar e-mail de teste.');
    }
  };

  const reenviar = async (id) => {
    const res = await apiFetch(`/api/notificacoes/${id}/reenviar`, { method: 'POST' });
    if (res.ok) { toast.success('Reenvio processado.'); fetchLista(); }
    else toast.error('Erro ao reenviar.');
  };

  if (loading && !lista.length) return <TableSkeleton rows={8} cols={5} />;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      {Toasts}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h1 className="font-heading text-xl font-bold text-gray-900">Notificações</h1>
        <button onClick={enviarTeste} disabled={enviandoTeste} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-ufrpe-blue text-white">
          <Send size={15} /> Enviar e-mail de teste
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {['', 'ENVIADO', 'PENDENTE', 'ERRO', 'SEM_SMTP'].map((s) => (
          <button
            key={s}
            onClick={() => setSituacao(s)}
            className={`px-3 py-1.5 rounded-full text-sm border ${situacao === s ? 'bg-ufrpe-blue text-white border-ufrpe-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {s ? SITUACAO_INFO[s].label : 'Todos'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4 font-medium">Quando</th>
              <th className="py-2 pr-4 font-medium">Destinatário</th>
              <th className="py-2 pr-4 font-medium">Assunto</th>
              <th className="py-2 pr-4 font-medium">Situação</th>
              <th className="py-2 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lista.length === 0 && !loading && (
              <EmptyRow colSpan={5} icon={Mail} message="Nenhuma notificação registrada." hint="Use o botão acima para testar o envio." />
            )}
            {lista.map((n) => {
              const info = SITUACAO_INFO[n.situacao] || SITUACAO_INFO.PENDENTE;
              return (
                <tr key={n.id} className="align-top">
                  <td className="py-3 pr-4 text-gray-500">{fmtDataHora(n.criadoEm)}</td>
                  <td className="py-3 pr-4">{n.destinatarioEmail}</td>
                  <td className="py-3 pr-4 max-w-sm truncate" title={n.assunto}>{n.assunto}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                    {n.erro && <div className="text-xs text-gray-400 mt-1 max-w-xs truncate" title={n.erro}>{n.erro}</div>}
                  </td>
                  <td className="py-3 pr-4">
                    {n.situacao !== 'ENVIADO' && (
                      <button onClick={() => reenviar(n.id)} className="flex items-center gap-1 text-xs text-ufrpe-blue hover:underline">
                        <RotateCw size={12} /> reenviar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
