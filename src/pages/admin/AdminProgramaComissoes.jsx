import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { API_URL } from '../../api';

const TIPOS = {
  COMISSAO_CPG: 'Câmara/CPG',
  COMISSAO_BOLSAS: 'Bolsas',
  COMISSAO_SELECAO: 'Seleção',
  COMISSAO_PESQUISA: 'Pesquisa',
  COMISSAO_ORIENTACAO: 'Orientação',
};

const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

export default function AdminProgramaComissoes() {
  const { id } = useParams();
  const [membros, setMembros] = useState([]);
  const [users, setUsers] = useState([]);
  const [busca, setBusca] = useState('');
  const [papel, setPapel] = useState('COMISSAO_CPG');
  const [loading, setLoading] = useState(true);
  const [programa, setPrograma] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [r1, r2, r3] = await Promise.all([
      fetch(`${API_URL}/api/programas/${id}/comissoes`, { headers }),
      fetch(`${API_URL}/api/users`, { headers }),
      fetch(`${API_URL}/api/programas/${id}`),
    ]);
    if (r1.ok) setMembros(await r1.json());
    if (r2.ok) setUsers(await r2.json());
    if (r3.ok) setPrograma(await r3.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const vinculadosIds = new Set(membros.filter((m) => m.papel === papel).map((m) => m.pessoa_id));
  const filteredUsers = users.filter((u) =>
    !vinculadosIds.has(u.id) &&
    (!busca || (u.perfil_geral?.nome || u.email || '').toLowerCase().includes(busca.toLowerCase()))
  );

  const handleAdd = async (user) => {
    setError('');
    const r = await fetch(`${API_URL}/api/programas/${id}/comissoes`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pessoa_id: user.id, papel }),
    });
    if (r.ok) { setBusca(''); load(); }
    else { const d = await r.json(); setError(d.message || 'Erro'); }
  };

  const handleRemove = async (vinculoId) => {
    const r = await fetch(`${API_URL}/api/programas/${id}/comissoes/${vinculoId}`, { method: 'DELETE', headers });
    if (r.ok) load();
  };

  const grouped = {};
  membros.forEach((m) => {
    if (!grouped[m.papel]) grouped[m.papel] = [];
    grouped[m.papel].push(m);
  });

  const titulo = programa ? `${programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla + ' — ' : ''}${programa.nome}` : '…';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/admin/programas" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <div>
          <p className="text-xs text-gray-400">{titulo}</p>
          <h2 className="font-heading text-2xl font-semibold text-ufrpe-blue">Comissões do Programa</h2>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

      {/* Adicionar membro */}
      <div className="bg-gray-50 rounded-xl p-5 mb-6 mt-4">
        <h3 className="font-medium text-gray-700 mb-3 text-sm">Adicionar membro</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <select value={papel} onChange={(e) => { setPapel(e.target.value); setBusca(''); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-ufrpe-yellow focus:border-ufrpe-yellow col-span-1">
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar usuário..."
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow col-span-2" />
        </div>
        {busca && (
          <div className="border border-gray-200 rounded-md divide-y max-h-48 overflow-y-auto bg-white">
            {filteredUsers.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">Nenhum usuário disponível.</p>
            ) : filteredUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium">{u.perfil_geral?.nome || u.email}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <button onClick={() => handleAdd(u)}
                  className="text-xs px-3 py-1 bg-ufrpe-blue text-white rounded hover:bg-[#2a3a66]">
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Membros atuais */}
      {loading ? (
        <div className="py-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ufrpe-blue"></div></div>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Nenhum membro vinculado ainda.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([tipo, lista]) => (
            <div key={tipo}>
              <h3 className="font-semibold text-sm text-gray-700 mb-2 pb-1 border-b border-gray-100">
                {TIPOS[tipo] || tipo}
                <span className="ml-2 text-xs font-normal text-gray-400">({lista.length})</span>
              </h3>
              <div className="space-y-2">
                {lista.map((m) => (
                  <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {m.foto_url ? (
                        <img src={m.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-ufrpe-blue/10 flex items-center justify-center">
                          <i className="fa-solid fa-user text-ufrpe-blue/40 text-xs"></i>
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-800">{m.nome}</span>
                    </div>
                    <button onClick={() => handleRemove(m.id)}
                      className="text-red-500 hover:bg-red-50 rounded p-1.5 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
