import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { apiFetch } from '../../api';
import { FormSkeleton } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';

// Fase E.7 (PLANO.md): formulário de emissão — ver requisitos-expedientes.md
// §9.1/§9.3. Campo obrigatório: apenas assunto (série/ano/número vêm do botão
// de reserva na tela-mãe, ou são escolhidos aqui ao criar sem reserva prévia).
export default function AdminAtoForm() {
  const { id } = useParams();
  const editando = !!id;
  const navigate = useNavigate();
  const { toast, Toasts } = useToast();

  const [series, setSeries] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [ato, setAto] = useState(null);
  const [loading, setLoading] = useState(editando);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    serieId: '', ano: new Date().getFullYear(), data: new Date().toISOString().slice(0, 10),
    titulo: '', assunto: '', ementa: '', destinatarioUnidadeId: '', destinatarioTexto: '',
    observacoes: '', numeroProcesso: '',
  });

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  useEffect(() => {
    apiFetch('/api/atos/series').then((r) => r.ok && r.json()).then((d) => d && setSeries(d));
    apiFetch('/api/camara/unidades').then((r) => r.ok && r.json()).then((d) => d && setUnidades(d));
  }, []);

  const carregar = useCallback(async () => {
    if (!editando) return;
    setLoading(true);
    const res = await apiFetch(`/api/atos/${id}`);
    if (res.ok) {
      const a = await res.json();
      setAto(a);
      setForm({
        serieId: a.serieId, ano: a.ano, data: a.data || new Date().toISOString().slice(0, 10),
        titulo: a.titulo || '', assunto: a.assunto || '', ementa: a.ementa || '',
        destinatarioUnidadeId: a.destinatarioUnidadeId || '', destinatarioTexto: a.destinatarioTexto || '',
        observacoes: a.observacoes || '', numeroProcesso: a.processoNumero || '',
      });
    } else {
      toast.error('Erro ao carregar o ato.');
    }
    setLoading(false);
  }, [editando, id, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.assunto.trim()) return toast.error('Informe o assunto.');
    setSalvando(true);
    try {
      let atoId = id;
      if (editando) {
        const res = await apiFetch(`/api/atos/${id}`, {
          method: 'PUT',
          json: {
            data: form.data, titulo: form.titulo || null, assunto: form.assunto, ementa: form.ementa || null,
            destinatarioUnidadeId: form.destinatarioUnidadeId || null, destinatarioTexto: form.destinatarioTexto || null,
            observacoes: form.observacoes || null,
          },
        });
        if (!res.ok) throw new Error();
        if (ato?.situacao === 'RESERVADO') {
          await apiFetch(`/api/atos/${id}/situacao`, { method: 'PATCH', json: { situacao: 'EMITIDO' } });
        }
      } else {
        if (!form.serieId) { toast.error('Selecione a série.'); setSalvando(false); return; }
        const res = await apiFetch('/api/atos', {
          method: 'POST',
          json: {
            serieId: form.serieId, ano: Number(form.ano), data: form.data,
            titulo: form.titulo || null, assunto: form.assunto, ementa: form.ementa || null,
            destinatarioUnidadeId: form.destinatarioUnidadeId || null, destinatarioTexto: form.destinatarioTexto || null,
            observacoes: form.observacoes || null,
          },
        });
        if (!res.ok) throw new Error();
        atoId = (await res.json()).id;
      }
      if (form.numeroProcesso.trim()) {
        await apiFetch(`/api/atos/${atoId}/processo`, { method: 'POST', json: { numero: form.numeroProcesso.trim() } });
      }
      toast.success('Ato salvo com sucesso.');
      navigate(`/admin/atos/${atoId}`);
    } catch {
      toast.error('Erro ao salvar o ato.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <FormSkeleton fields={6} />;

  const serie = series.find((s) => s.id === form.serieId) || (ato && { exigeDestinatario: false });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-2xl">
      {Toasts}
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-5">
        {editando ? `Editar ${ato?.numeroExibicao || ''}` : 'Novo expediente'}
      </h1>
      <form onSubmit={salvar} className="space-y-4">
        {!editando && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Série *</label>
              <select value={form.serieId} onChange={set('serieId')} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {series.map((s) => <option key={s.id} value={s.id}>{s.nome} (próximo nº {s.proximoSequencial})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <input type="number" value={form.ano} onChange={set('ano')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input type="date" value={form.data} onChange={set('data')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
          <input value={form.titulo} onChange={set('titulo')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assunto *</label>
          <textarea value={form.assunto} onChange={set('assunto')} required rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ementa</label>
          <textarea value={form.ementa} onChange={set('ementa')} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destinatário (unidade) {serie?.exigeDestinatario ? '*' : ''}
            </label>
            <select value={form.destinatarioUnidadeId} onChange={set('destinatarioUnidadeId')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">— nenhuma —</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destinatário (texto livre)</label>
            <input value={form.destinatarioTexto} onChange={set('destinatarioTexto')} placeholder="quando não houver unidade cadastrada" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Processo (NUP)</label>
          <input value={form.numeroProcesso} onChange={set('numeroProcesso')} placeholder="23082.024509/2024-66" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea value={form.observacoes} onChange={set('observacoes')} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={salvando} className="flex items-center gap-1.5 bg-ufrpe-blue text-white px-4 py-2 rounded-lg text-sm">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
