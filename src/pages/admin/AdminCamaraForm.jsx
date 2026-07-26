import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { apiFetch } from '../../api';
import { FormSkeleton } from '../../components/admin/AdminUI';
import { AuditHeader } from '../../components/AuditInfo';
import useUsers from '../../hooks/useUsers';
import { STATUS_OPTIONS, statusLabel } from '../../constants/camara';

// Campos obrigatórios: só número e assunto (§9.5) — todo o resto entra depois.
const BLANK = {
  numero: '', assunto: '', tipoMateria: '', interessado: '', linkSipac: '',
  unidadeResponsavelId: '', programaId: '', status: 'RECEBIDO', dataEntrada: '',
  sigiloso: false, observacoes: '',
};

const AdminCamaraForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const users = useUsers();

  const [formData, setFormData] = useState(BLANK);
  const [unidades, setUnidades] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [uRes, pRes] = await Promise.all([
        apiFetch('/api/camara/unidades'),
        apiFetch('/api/programas'),
      ]);
      if (uRes.ok) setUnidades(await uRes.json());
      if (pRes.ok) setProgramas(await pRes.json());
    })();
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      try {
        const res = await apiFetch(`/api/camara/processos/${id}`);
        if (res.ok) {
          const data = await res.json();
          setAudit(data);
          setFormData({
            numero: data.numero || '', assunto: data.assunto || '', tipoMateria: data.tipoMateria || '',
            interessado: data.interessado || '', linkSipac: data.linkSipac || '',
            unidadeResponsavelId: data.unidadeResponsavelId || '', programaId: data.programaId || '',
            status: data.status || 'RECEBIDO', dataEntrada: data.dataEntrada || '',
            sigiloso: !!data.sigiloso, observacoes: data.observacoes || '',
          });
        } else {
          setError('Processo não encontrado.');
        }
      } catch {
        setError('Erro de conexão ao buscar o processo.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const path = isEditing ? `/api/camara/processos/${id}` : '/api/camara/processos';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await apiFetch(path, { method, json: formData });
      if (res.ok) {
        const saved = await res.json();
        navigate(`/admin/camara/${saved.id}`);
      } else if (res.status === 401 || res.status === 403) {
        navigate('/admin/login');
      } else {
        const data = await res.json();
        setError(data.message || 'Erro ao salvar processo.');
      }
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FormSkeleton fields={7} />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/camara" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue">
          {isEditing ? 'Editar Processo' : 'Novo Processo'}
        </h2>
      </div>

      {isEditing && (
        <AuditHeader criadoPor={audit?.criado_por} atualizadoPor={audit?.atualizado_por} criadoEm={audit?.criado_em} atualizadoEm={audit?.atualizado_em} users={users} className="mb-6" />
      )}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número do processo (NUP) *</label>
            <input
              type="text" name="numero" value={formData.numero} onChange={handleChange} required
              placeholder="23082.000000/0000-00"
              className="w-full px-4 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Formato fora do padrão? Sem problema — o cadastro não é bloqueado.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link direto no SIPAC</label>
            <input
              type="url" name="linkSipac" value={formData.linkSipac} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assunto *</label>
          <textarea
            name="assunto" value={formData.assunto} onChange={handleChange} required rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interessado</label>
            <input
              type="text" name="interessado" value={formData.interessado} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de matéria</label>
            <input
              type="text" name="tipoMateria" value={formData.tipoMateria} onChange={handleChange}
              placeholder="Ex.: Credenciamento docente, Bolsas, Recurso discente..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Setor responsável</label>
            <select name="unidadeResponsavelId" value={formData.unidadeResponsavelId} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-ufrpe-yellow focus:border-ufrpe-yellow focus:outline-none">
              <option value="">—</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.sigla}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Programa vinculado</label>
            <select name="programaId" value={formData.programaId} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-ufrpe-yellow focus:border-ufrpe-yellow focus:outline-none">
              <option value="">—</option>
              {programas.map((p) => <option key={p.id} value={p.id}>{p.sigla || p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-ufrpe-yellow focus:border-ufrpe-yellow focus:outline-none">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de entrada</label>
            <input
              type="date" name="dataEntrada" value={formData.dataEntrada} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-ufrpe-yellow focus:border-ufrpe-yellow focus:outline-none"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="sigiloso" checked={formData.sigiloso} onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-ufrpe-blue focus:ring-ufrpe-yellow" />
              Processo sigiloso (restringe a visualização ao Gestor de Programa)
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações (campo livre)</label>
          <textarea
            name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3}
            placeholder="Tudo que não couber nos campos estruturados continua registrado aqui."
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Link
            to="/admin/camara"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-4"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-ufrpe-blue border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-[#2a3a66] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ufrpe-yellow disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar Processo'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminCamaraForm;
