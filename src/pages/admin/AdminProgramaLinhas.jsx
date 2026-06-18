import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Loader2, Save } from 'lucide-react';
import { API_URL } from '../../api';

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

export default function AdminProgramaLinhas() {
  const { id } = useParams();
  const [programa, setPrograma] = useState(null);
  const [todasLinhas, setTodasLinhas] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [rp, rl, rt] = await Promise.all([
        fetch(`${API_URL}/api/programas/${id}`),
        fetch(`${API_URL}/api/programas/${id}/linhas`, { headers: auth() }),
        fetch(`${API_URL}/api/linhas-pesquisa`, { headers: auth() }),
      ]);
      if (rp.ok) setPrograma(await rp.json());
      if (rt.ok) setTodasLinhas(await rt.json());
      if (rl.ok) {
        const atual = await rl.json();
        setSelecionados(new Set(atual.map((l) => l.id)));
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const toggle = (linhaId) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(linhaId)) next.delete(linhaId);
      else next.add(linhaId);
      return next;
    });
  };

  const salvar = async () => {
    setSaving(true); setError('');
    try {
      const r = await fetch(`${API_URL}/api/programas/${id}/linhas`, {
        method: 'PUT', headers: auth(),
        body: JSON.stringify({ linha_ids: [...selecionados] }),
      });
      if (r.ok) {
        const data = await r.json();
        setSelecionados(new Set(data.map((l) => l.id)));
        setSuccess('Salvo.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await r.json();
        setError(d.message || 'Erro ao salvar.');
      }
    } catch { setError('Erro de conexão.'); }
    setSaving(false);
  };

  const sigla = programa?.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla : programa?.nome;
  const linhasFiltradas = search.trim()
    ? todasLinhas.filter((l) => l.nome.toLowerCase().includes(search.toLowerCase()))
    : todasLinhas;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Carregando…
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <Link to={`/admin/programas/${id}/docentes`}
          className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <FlaskConical className="text-ufrpe-blue" size={22} />
        <div>
          <h1 className="font-heading text-2xl font-bold text-ufrpe-blue leading-tight">Linhas de Pesquisa</h1>
          {sigla && <p className="text-sm text-gray-500">{sigla}</p>}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-[3.25rem]">
        Selecione as linhas cadastradas que este programa oferece.
        Para adicionar novas linhas, acesse{' '}
        <Link to="/admin/linhas-pesquisa" className="text-ufrpe-blue underline">Linhas de Pesquisa</Link>.
      </p>

      {error && <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg px-4 py-2.5 text-sm mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 border border-green-100 rounded-lg px-4 py-2.5 text-sm mb-4 flex items-center gap-2"><Save size={15} /> {success}</div>}

      {todasLinhas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
          Nenhuma linha de pesquisa cadastrada.{' '}
          <Link to="/admin/linhas-pesquisa" className="text-ufrpe-blue underline">Cadastrar agora</Link>.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">
                {selecionados.size} de {todasLinhas.length} selecionada(s)
              </p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar linhas..."
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-ufrpe-blue/30 outline-none w-52"
              />
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {linhasFiltradas.map((l) => {
                const sel = selecionados.has(l.id);
                return (
                  <label key={l.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${sel ? 'bg-ufrpe-blue/5 border border-ufrpe-blue/20' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggle(l.id)}
                      className="w-4 h-4 rounded text-ufrpe-blue accent-ufrpe-blue"
                    />
                    <span className="flex-1 text-sm text-gray-700">{l.nome}</span>
                    {l.target_id && (
                      <span className="text-xs font-mono text-gray-400" title="ID legado">{l.target_id}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <button
            onClick={salvar}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-ufrpe-blue text-white rounded-lg text-sm font-medium hover:bg-ufrpe-blue/90 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salvar seleção
          </button>
        </>
      )}
    </div>
  );
}
