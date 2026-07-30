import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { apiFetch } from '../../api';
import { FormSkeleton } from '../../components/admin/AdminUI';
import { useToast } from '../../components/admin/Toast';
import { MODALIDADES } from '../../constants/posDoutorado';

// Fase C.6 (PLANO.md): formulário de cadastro/edição — ver requisitos-pnpd.md
// §10.4. Campos obrigatórios: apenas nome, projeto e supervisor; o resto
// entra depois (o acervo real tem registros sem CPF, sem período e sem processo).
export default function AdminPosDoutoradoForm() {
  const { id } = useParams();
  const editando = !!id;
  const navigate = useNavigate();
  const { toast, Toasts } = useToast();

  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    pessoaNome: '', cpf: '', email: '', telefone: '',
    programaId: '', dataInicio: '', dataFim: '', dataInicioAprox: false, dataFimAprox: false,
    supervisorNome: '', cossupervisorNome: '',
    projetoTitulo: '', projetoResumo: '', modalidade: 'VOLUNTARIO',
    agenciaFomento: '', vinculoOrigem: '', instituicaoOrigem: '', observacoes: '',
  });

  const set = (campo) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [campo]: v }));
  };

  useEffect(() => {
    apiFetch('/api/programas').then((r) => r.ok && r.json()).then((d) => d && setProgramas(d));
  }, []);

  const carregar = useCallback(async () => {
    if (!editando) return;
    setLoading(true);
    const res = await apiFetch(`/api/pos-doutorado/${id}`);
    if (res.ok) {
      const pd = await res.json();
      setForm({
        pessoaNome: pd.nome || '', cpf: pd.cpf || '', email: pd.email || '', telefone: pd.telefone || '',
        programaId: pd.programaId || '', dataInicio: pd.dataInicio || '', dataFim: pd.dataFim || '',
        dataInicioAprox: !!pd.dataInicioAprox, dataFimAprox: !!pd.dataFimAprox,
        supervisorNome: pd.supervisorNome || '', cossupervisorNome: pd.cossupervisorNome || '',
        projetoTitulo: pd.projetoTitulo || '', projetoResumo: pd.projetoResumo || '', modalidade: pd.modalidade || 'VOLUNTARIO',
        agenciaFomento: pd.agenciaFomento || '', vinculoOrigem: pd.vinculoOrigem || '',
        instituicaoOrigem: pd.instituicaoOrigem || '', observacoes: pd.observacoes || '',
      });
    } else {
      toast.error('Erro ao carregar o registro.');
    }
    setLoading(false);
  }, [editando, id, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.projetoTitulo.trim()) return toast.error('Informe o título do projeto.');
    if (!editando && !form.pessoaNome.trim()) return toast.error('Informe o nome do(a) pós-doutorando(a).');
    if (!form.supervisorNome.trim()) return toast.error('Informe o supervisor.');
    setSalvando(true);
    try {
      const payload = {
        programaId: form.programaId || null, dataInicio: form.dataInicio || null, dataFim: form.dataFim || null,
        dataInicioAprox: form.dataInicioAprox, dataFimAprox: form.dataFimAprox,
        supervisorNome: form.supervisorNome, cossupervisorNome: form.cossupervisorNome || null,
        projetoTitulo: form.projetoTitulo, projetoResumo: form.projetoResumo || null,
        modalidade: form.modalidade, agenciaFomento: form.agenciaFomento || null,
        vinculoOrigem: form.vinculoOrigem || null, instituicaoOrigem: form.instituicaoOrigem || null,
        observacoes: form.observacoes || null,
      };
      let res;
      if (editando) {
        res = await apiFetch(`/api/pos-doutorado/${id}`, { method: 'PUT', json: payload });
      } else {
        res = await apiFetch('/api/pos-doutorado', {
          method: 'POST',
          json: { ...payload, pessoaNome: form.pessoaNome, cpf: form.cpf || null, email: form.email || null, telefone: form.telefone || null },
        });
      }
      if (!res.ok) throw new Error((await res.json())?.message || 'Erro ao salvar.');
      const saved = await res.json();
      toast.success('Registro salvo com sucesso.');
      navigate(`/admin/pos-doutorado/${saved.id}`);
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar o registro.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <FormSkeleton fields={8} />;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-2xl">
      {Toasts}
      <h1 className="font-heading text-xl font-bold text-gray-900 mb-5">
        {editando ? 'Editar estágio pós-doutoral' : 'Novo estágio pós-doutoral'}
      </h1>
      <form onSubmit={salvar} className="space-y-4">
        {!editando && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input value={form.pessoaNome} onChange={set('pessoaNome')} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}
        {!editando && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={set('email')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input value={form.telefone} onChange={set('telefone')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Programa</label>
          <select value={form.programaId} onChange={set('programaId')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">— nenhum —</option>
            {programas.map((p) => <option key={p.id} value={p.id}>{p.sigla ? `${p.sigla} — ${p.nome}` : p.nome}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
            <input type="date" value={form.dataInicio} onChange={set('dataInicio')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <label className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
              <input type="checkbox" checked={form.dataInicioAprox} onChange={set('dataInicioAprox')} /> data aproximada
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
            <input type="date" value={form.dataFim} onChange={set('dataFim')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <label className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
              <input type="checkbox" checked={form.dataFimAprox} onChange={set('dataFimAprox')} /> data aproximada
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor *</label>
            <input value={form.supervisorNome} onChange={set('supervisorNome')} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cossupervisor</label>
            <input value={form.cossupervisorNome} onChange={set('cossupervisorNome')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título do projeto *</label>
          <textarea value={form.projetoTitulo} onChange={set('projetoTitulo')} required rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resumo do projeto</label>
          <textarea value={form.projetoResumo} onChange={set('projetoResumo')} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modalidade</label>
            <select value={form.modalidade} onChange={set('modalidade')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agência de fomento</label>
            <input value={form.agenciaFomento} onChange={set('agenciaFomento')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
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
