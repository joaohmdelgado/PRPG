import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../../components/admin/Toast';

// Fase M (requisitos-expedientes.md §9.4, caminho 2): em vez de um ofício por
// concluinte (caminho 1, formulário normal de "Novo expediente"), esta tela
// cria UM ofício cobrindo uma lista de concluintes — a secretaria escolhe qual
// caminho usar a cada expedição; nenhum dos dois substitui o outro.
export default function AdminAtoDiplomasLote() {
  const navigate = useNavigate();
  const { toast, Toasts } = useToast();

  const [series, setSeries] = useState([]);
  const [serieId, setSerieId] = useState('');
  const [assunto, setAssunto] = useState('');
  const [concluintes, setConcluintes] = useState([{ nomeConcluinte: '', livro: '' }]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    apiFetch('/api/atos/series').then((r) => r.ok && r.json()).then((d) => d && setSeries(d));
  }, []);

  const addLinha = () => setConcluintes((prev) => [...prev, { nomeConcluinte: '', livro: '' }]);
  const removeLinha = (idx) => setConcluintes((prev) => prev.filter((_, i) => i !== idx));
  const setLinha = (idx, campo, valor) => setConcluintes((prev) => {
    const next = [...prev];
    next[idx] = { ...next[idx], [campo]: valor };
    return next;
  });

  const salvar = async (e) => {
    e.preventDefault();
    if (!serieId) return toast.error('Selecione a série do ofício.');
    const validos = concluintes.filter((c) => c.nomeConcluinte.trim());
    if (validos.length === 0) return toast.error('Informe ao menos um concluinte.');

    setSalvando(true);
    try {
      const res = await apiFetch('/api/atos/diplomas-lote', {
        method: 'POST',
        json: { serieId, assunto: assunto.trim() || undefined, concluintes: validos },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao criar o ofício.');
      }
      const ato = await res.json();
      toast.success(`Ofício ${ato.numeroExibicao} criado com ${validos.length} concluinte(s).`);
      navigate(`/admin/atos/${ato.id}`);
    } catch (err) {
      toast.error(err.message || 'Erro ao criar o ofício.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-3xl">
      {Toasts}
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-1">Expedição de diplomas em lote</h1>
      <p className="text-sm text-gray-500 mb-5">
        Cria um único ofício cobrindo vários concluintes, em vez de um ofício por concluinte.
        Para um único concluinte, use o formulário normal de{' '}
        <a href="/admin/atos/novo" className="text-ufrpe-blue underline">novo expediente</a>.
      </p>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Série *</label>
            <select value={serieId} onChange={(e) => setSerieId(e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {series.map((s) => <option key={s.id} value={s.id}>{s.nome} (próximo nº {s.proximoSequencial})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
            <input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Padrão: 'Expedição de diplomas — N concluinte(s)'"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Concluintes</label>
          <div className="space-y-2">
            {concluintes.map((c, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  value={c.nomeConcluinte}
                  onChange={(e) => setLinha(idx, 'nomeConcluinte', e.target.value)}
                  placeholder="Nome do concluinte"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  value={c.livro}
                  onChange={(e) => setLinha(idx, 'livro', e.target.value)}
                  placeholder="Livro (ex: 3.20)"
                  className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeLinha(idx)}
                  disabled={concluintes.length === 1}
                  className="text-red-500 hover:bg-red-50 p-2 rounded-lg disabled:opacity-30"
                  title="Remover linha"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLinha}
            className="mt-2 flex items-center gap-1.5 text-sm text-ufrpe-blue hover:underline"
          >
            <Plus size={15} /> Adicionar concluinte
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={salvando} className="flex items-center gap-1.5 bg-ufrpe-blue text-white px-4 py-2 rounded-lg text-sm">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Criar ofício
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
