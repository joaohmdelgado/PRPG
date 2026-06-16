import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, UserPlus, Search } from 'lucide-react';
import { API_URL } from '../../api';
import { isProgramaGestor } from '../../auth';

const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

// Gerenciador de pessoas vinculadas a um programa (discentes ou docentes).
// Além de vincular usuários já cadastrados, permite CADASTRAR um novo aluno/
// professor direto no painel — a conta nasce vinculada ao programa (o servidor
// força o programa-dono e cria o vínculo no papel escolhido).
export default function AdminProgramaPessoas({ recurso, titulo, papeis, createRole, createNoun }) {
  const { id } = useParams();
  const papelKeys = Object.keys(papeis);

  const [membros, setMembros] = useState([]);
  const [users, setUsers] = useState([]);
  const [busca, setBusca] = useState('');
  const [papel, setPapel] = useState(papelKeys[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [programaNome, setProgramaNome] = useState('');

  // Cadastro de novo usuário
  const [showCreate, setShowCreate] = useState(false);
  const [novo, setNovo] = useState({ nome: '', email: '', cpf: '', siape: '' });
  const [creating, setCreating] = useState(false);
  // Cadastro já existente detectado (e-mail/CPF) — oferece vínculo em vez de duplicar.
  const [conflito, setConflito] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, uRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/programas/${id}/${recurso}`, { headers }),
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

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const vinculadosIds = new Set(membros.map((m) => m.pessoa_id));
  const candidatos = users.filter(
    (u) => !vinculadosIds.has(u.id) &&
      (!busca || (u.perfil_geral?.nome || u.email || '').toLowerCase().includes(busca.toLowerCase()))
  );

  const handleAdd = async (user) => {
    setError('');
    try {
      const r = await fetch(`${API_URL}/api/programas/${id}/${recurso}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pessoa_id: user.id, papel }),
      });
      if (r.ok) { setBusca(''); load(); }
      else { const d = await r.json(); setError(d.message || 'Erro ao adicionar'); }
    } catch { setError('Erro de conexão'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setConflito(null);
    if (!novo.nome.trim() || !novo.email.trim()) {
      setError('Informe nome e e-mail.');
      return;
    }
    setCreating(true);
    try {
      const r = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: novo.email.trim(),
          roles: [createRole],
          programaId: id,
          papelVinculo: papel,
          perfil_geral: {
            nome: novo.nome.trim(), cpf: novo.cpf.trim(), siape: novo.siape.trim(),
            foto_url: '', telefones: [],
          },
        }),
      });
      if (r.ok) {
        setNovo({ nome: '', email: '', cpf: '', siape: '' });
        setShowCreate(false);
        load();
      } else if (r.status === 409) {
        // Pessoa já cadastrada (outro programa ou aqui): oferece vínculo.
        const d = await r.json();
        setConflito({ ...(d.existing || {}), conflict: d.conflict });
      } else {
        const d = await r.json();
        setError(d.message || 'Erro ao cadastrar');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setCreating(false);
    }
  };

  // Confirma o vínculo de um cadastro já existente (detectado no 409) ao programa.
  const handleVincularConflito = async () => {
    if (!conflito?.id) return;
    setError('');
    try {
      const r = await fetch(`${API_URL}/api/programas/${id}/${recurso}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pessoa_id: conflito.id, papel }),
      });
      if (r.ok) {
        setConflito(null);
        setNovo({ nome: '', email: '', cpf: '', siape: '' });
        setShowCreate(false);
        load();
      } else {
        const d = await r.json();
        setError(d.message || 'Erro ao vincular');
      }
    } catch { setError('Erro de conexão'); }
  };

  const handleRemove = async (vinculoId) => {
    setError('');
    try {
      const r = await fetch(`${API_URL}/api/programas/${id}/${recurso}/${vinculoId}`, {
        method: 'DELETE', headers,
      });
      if (r.ok) load();
      else setError('Erro ao remover');
    } catch { setError('Erro de conexão'); }
  };

  const grouped = Object.fromEntries(papelKeys.map((p) => [p, []]));
  membros.forEach((m) => { if (grouped[m.papel]) grouped[m.papel].push(m); });

  // Gestor de programa não tem a lista de Programas no menu: volta ao seu programa.
  const backTo = isProgramaGestor() ? `/admin/programas/editar/${id}` : '/admin/programas';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to={backTo} className="text-gray-400 hover:text-ufrpe-blue">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="font-heading text-xl font-semibold text-ufrpe-blue">{titulo}</h2>
          {programaNome && <p className="text-sm text-gray-400">{programaNome}</p>}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

      {/* Adicionar / Cadastrar */}
      <div className="bg-gray-50 rounded-xl p-5 mb-8 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-700 text-sm">Adicionar {createNoun}</h3>
          <button
            type="button"
            onClick={() => { setShowCreate((v) => !v); setError(''); }}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-ufrpe-blue/30 text-ufrpe-blue hover:bg-ufrpe-blue/5 transition-colors"
          >
            <UserPlus size={14} />
            {showCreate ? 'Vincular existente' : `Cadastrar novo ${createNoun}`}
          </button>
        </div>

        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Tipo de vínculo</label>
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
            className="w-full sm:w-1/2 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
          >
            {Object.entries(papeis).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {showCreate ? (
          /* Cadastro de novo aluno/professor — nasce vinculado a este programa */
          <>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome completo *</label>
              <input
                type="text" value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail *</label>
              <input
                type="email" value={novo.email}
                onChange={(e) => setNovo({ ...novo, email: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">CPF</label>
              <input
                type="text" value={novo.cpf}
                onChange={(e) => setNovo({ ...novo, cpf: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
              />
            </div>
            {createRole === 'Professor' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">SIAPE</label>
                <input
                  type="text" value={novo.siape}
                  onChange={(e) => setNovo({ ...novo, siape: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
                />
              </div>
            )}
            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                type="submit" disabled={creating}
                className="inline-flex items-center gap-1.5 text-sm px-4 py-2 bg-ufrpe-blue text-white rounded hover:bg-[#2a3a66] disabled:opacity-60"
              >
                <UserPlus size={15} />
                {creating ? 'Cadastrando…' : `Cadastrar e vincular`}
              </button>
              <p className="text-xs text-gray-400">
                Senha inicial padrão: <strong>Mudar123</strong>
              </p>
            </div>
          </form>

          {conflito && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
              {conflito.jaVinculado ? (
                <>
                  <p className="text-amber-800">
                    Já existe um cadastro desta pessoa
                    {conflito.nome ? <> (<strong>{conflito.nome}</strong>)</> : ''} vinculado a este
                    programa. Use <strong>“Vincular existente”</strong> para adicioná-la como{' '}
                    <strong>{papeis[papel]}</strong>.
                  </p>
                  <button
                    type="button" onClick={() => setConflito(null)}
                    className="mt-3 text-xs px-3 py-1.5 rounded border border-amber-300 text-amber-800 hover:bg-amber-100"
                  >
                    Entendi
                  </button>
                </>
              ) : (
                <>
                  <p className="text-amber-800">
                    Já existe um cadastro com este {conflito.conflict === 'cpf' ? 'CPF' : 'e-mail'}
                    {conflito.nome ? <>: <strong>{conflito.nome}</strong></> : ''}. Deseja vinculá-la a
                    este programa como <strong>{papeis[papel]}</strong>? A conta original é preservada
                    (não é duplicada).
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button" onClick={handleVincularConflito}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-ufrpe-blue text-white rounded hover:bg-[#2a3a66]"
                    >
                      <UserPlus size={13} /> Vincular ao programa
                    </button>
                    <button
                      type="button" onClick={() => setConflito(null)}
                      className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          </>
        ) : (
          /* Vincular usuário já cadastrado */
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Buscar usuário</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text" value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome ou e-mail..."
                  className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
                />
              </div>
            </div>
            {busca && (
              <div className="mt-3 border border-gray-200 rounded-md divide-y max-h-52 overflow-y-auto bg-white">
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
          </>
        )}
      </div>

      {/* Lista agrupada */}
      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ufrpe-blue"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(papeis).map(([pKey, pLabel]) => {
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
