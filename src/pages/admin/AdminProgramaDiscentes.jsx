import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { API_URL } from '../../api';

const PAPEIS = {
  DISCENTE_MESTRADO:     'Mestrando(a)',
  DISCENTE_DOUTORADO:    'Doutorando(a)',
  DISCENTE_PROFISSIONAL: 'Mestrando(a) Profissional',
  EGRESSO:               'Egresso(a)',
};

const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

export default function AdminProgramaDiscentes() {
  const { id } = useParams();
  const [membros, setMembros] = useState([]);
  const [users, setUsers] = useState([]);
  const [busca, setBusca] = useState('');
  const [papel, setPapel] = useState('DISCENTE_MESTRADO');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [programaNome, setProgramaNome] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, uRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/programas/${id}/discentes`, { headers }),
        fetch(`${API_URL}/api/users`, { headers }),
        fetch(`${API_URL}/api/programas/${id}`),
      ]);
      if (mRes.ok) setMembros(await mRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (pRes.ok) { const p = await pRes.json(); setProgramaNome(p.sigla || p.nome || ''); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const vinculadosIds = new Set(membros.map((m) => m.pessoa_id));
  const candidatos = users.filter(
    (u) => !vinculadosIds.has(u.id) &&
      (!busca || (u.perfil_geral?.nome || u.email || '').toLowerCase().includes(busca.toLowerCase()))
  );

  const handleAdd = async (user) => {
    setError('');
    try {
      const r = await fetch(`${API_URL}/api/programas/${id}/discentes`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pessoa_id: user.id, papel }),
      });
      if (r.ok) { setBusca(''); load(); }
      else { const d = await r.json(); setError(d.message || 'Erro ao adicionar'); }
    } catch { setError('Erro de conexão'); }
  };

  const handleRemove = async (vinculoId) => {
    setError('');
    try {
      const r = await fetch(`${API_URL}/api/programas/${id}/discentes/${vinculoId}`, {
        method: 'DELETE', headers,
      });
      if (r.ok) load();
      else setError('Erro ao remover');
    } catch { setError('Erro de conexão'); }
  };

  const grouped = Object.fromEntries(Object.keys(PAPEIS).map((p) => [p, []]));
  membros.forEach((m) => { if (grouped[m.papel]) grouped[m.papel].push(m); });

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/programas" className="text-gray-400 hover:text-ufrpe-blue">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="font-heading text-xl font-semibold text-ufrpe-blue">Corpo Discente</h2>
          {programaNome && <p className="text-sm text-gray-400">{programaNome}</p>}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

      {/* Adicionar */}
      <div className="bg-gray-50 rounded-xl p-5 mb-8 border border-gray-100">
        <h3 className="font-medium text-gray-700 mb-3 text-sm">Adicionar Discente</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Buscar usuário</label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome ou e-mail..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de vínculo</label>
            <select
              value={papel}
              onChange={(e) => setPapel(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
            >
              {Object.entries(PAPEIS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {busca && (
          <div className="border border-gray-200 rounded-md divide-y max-h-52 overflow-y-auto bg-white">
            {candidatos.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">Nenhum usuário disponível.</p>
            ) : candidatos.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.perfil_geral?.nome || u.email}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <button type="button" onClick={() => handleAdd(u)}
                  className="text-xs px-3 py-1 bg-ufrpe-blue text-white rounded hover:bg-[#2a3a66]">
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista agrupada */}
      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ufrpe-blue"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(PAPEIS).map(([pKey, pLabel]) => {
            const grupo = grouped[pKey] || [];
            return (
              <div key={pKey}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  {pLabel}
                  <span className="font-normal normal-case text-gray-300">({grupo.length})</span>
                </h3>
                {grupo.length === 0 ? (
                  <p className="text-sm text-gray-300 italic">Nenhum vinculado.</p>
                ) : (
                  <div className="space-y-2">
                    {grupo.map((m) => (
                      <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-100">
                        <div className="flex items-center gap-3">
                          {m.foto_url ? (
                            <img src={m.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-ufrpe-blue/10 flex items-center justify-center">
                              <i className="fa-solid fa-user text-ufrpe-blue/40 text-xs"></i>
                            </div>
                          )}
                          <p className="text-sm font-medium text-gray-800">{m.nome}</p>
                        </div>
                        <button onClick={() => handleRemove(m.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-1.5 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
