import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmModal';

// Fase E.9 (PLANO.md): administração de séries. A PRPG cria séries novas com
// frequência (o Edital PRINT surgiu em 2024, ver requisitos-expedientes.md
// §4.1/G10) — por isso esta tela existe em vez de depender de seed fixo.
const ESPECIES = ['OFICIO', 'PORTARIA', 'EDITAL', 'RESOLUCAO', 'DESPACHO', 'MEMORANDO', 'CIRCULAR'];

export default function AdminAtoSeries() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState(null);
  const { toast, Toasts } = useToast();
  const { confirm, ConfirmModal } = useConfirm();

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/api/atos/series');
    if (res.ok) setSeries(await res.json());
    else toast.error('Erro ao carregar séries.');
    setLoading(false);
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvarNova = async () => {
    if (!novo?.nome?.trim() || !novo?.especie) return toast.error('Informe nome e espécie.');
    const res = await apiFetch('/api/atos/series', {
      method: 'POST',
      json: {
        nome: novo.nome.trim(), especie: novo.especie, sigla: novo.sigla?.trim() || novo.nome.trim(),
        exigeDestinatario: !!novo.exigeDestinatario, publicaNoSite: !!novo.publicaNoSite,
      },
    });
    if (res.ok) { toast.success('Série criada.'); setNovo(null); carregar(); }
    else toast.error((await res.json())?.message || 'Erro ao criar série.');
  };

  const alternarAtivo = async (s) => {
    const res = await apiFetch(`/api/atos/series/${s.id}`, { method: 'PUT', json: { ativo: !s.ativo } });
    if (res.ok) carregar(); else toast.error('Erro ao atualizar série.');
  };

  const remover = async (s) => {
    if (!await confirm(`Remover a série "${s.nome}"? Só é possível se não houver atos nela.`)) return;
    const res = await apiFetch(`/api/atos/series/${s.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Série removida.'); carregar(); }
    else toast.error((await res.json())?.message || 'Erro ao remover série.');
  };

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      {Toasts}{ConfirmModal}
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-heading text-xl font-bold text-gray-900">Séries de Numeração</h1>
        <button onClick={() => setNovo({ nome: '', especie: 'OFICIO' })} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-ufrpe-blue text-white">
          <Plus size={15} /> Nova série
        </button>
      </div>

      {novo && (
        <div className="flex flex-wrap items-end gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome</label>
            <input value={novo.nome} onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))} className="text-sm border border-gray-200 rounded px-2 py-1.5" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sigla</label>
            <input value={novo.sigla || ''} onChange={(e) => setNovo((n) => ({ ...n, sigla: e.target.value }))} className="text-sm border border-gray-200 rounded px-2 py-1.5" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Espécie</label>
            <select value={novo.especie} onChange={(e) => setNovo((n) => ({ ...n, especie: e.target.value }))} className="text-sm border border-gray-200 rounded px-2 py-1.5">
              {ESPECIES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <label className="text-xs text-gray-600 flex items-center gap-1.5">
            <input type="checkbox" checked={!!novo.exigeDestinatario} onChange={(e) => setNovo((n) => ({ ...n, exigeDestinatario: e.target.checked }))} />
            exige destinatário
          </label>
          <label className="text-xs text-gray-600 flex items-center gap-1.5">
            <input type="checkbox" checked={!!novo.publicaNoSite} onChange={(e) => setNovo((n) => ({ ...n, publicaNoSite: e.target.checked }))} />
            publica no site
          </label>
          <button onClick={salvarNova} className="text-sm bg-ufrpe-blue text-white px-3 py-1.5 rounded">Salvar</button>
          <button onClick={() => setNovo(null)} className="text-sm text-gray-500 px-2">Cancelar</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4 font-medium">Nome</th>
              <th className="py-2 pr-4 font-medium">Sigla</th>
              <th className="py-2 pr-4 font-medium">Espécie</th>
              <th className="py-2 pr-4 font-medium">Ativa</th>
              <th className="py-2 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {series.length === 0 && <EmptyRow colSpan={5} message="Nenhuma série cadastrada." />}
            {series.map((s) => (
              <tr key={s.id}>
                <td className="py-2 pr-4">{s.nome}</td>
                <td className="py-2 pr-4 font-mono text-xs">{s.sigla}</td>
                <td className="py-2 pr-4 text-gray-500">{s.especie}</td>
                <td className="py-2 pr-4">
                  <button onClick={() => alternarAtivo(s)} className={`text-xs px-2 py-0.5 rounded-full border ${s.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {s.ativo ? 'ativa' : 'inativa'}
                  </button>
                </td>
                <td className="py-2 pr-4">
                  <button onClick={() => remover(s)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
