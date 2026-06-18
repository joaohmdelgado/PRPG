import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, FlaskConical, Loader2 } from 'lucide-react';
import { API_URL } from '../../api';

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

export default function AdminProgramaLinhas() {
  const { id } = useParams();
  const [programa, setPrograma] = useState(null);
  const [linhas, setLinhas] = useState([]);
  const [nova, setNova] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [rp, rl] = await Promise.all([
        fetch(`${API_URL}/api/programas/${id}`),
        fetch(`${API_URL}/api/programas/${id}/linhas`, { headers: auth() }),
      ]);
      if (rp.ok) setPrograma(await rp.json());
      if (rl.ok) setLinhas(await rl.json());
      setLoading(false);
    };
    load();
  }, [id]);

  const salvar = async (lista) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/programas/${id}/linhas`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({ linhas: lista }),
      });
      if (res.ok) {
        setLinhas(await res.json());
        setSuccess('Linhas de pesquisa salvas.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await res.json();
        setError(d.message || 'Erro ao salvar.');
      }
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const adicionar = () => {
    const v = nova.trim();
    if (!v) return;
    if (linhas.includes(v)) { setError('Linha já cadastrada.'); return; }
    setNova('');
    setError('');
    salvar([...linhas, v]);
  };

  const remover = (idx) => salvar(linhas.filter((_, i) => i !== idx));

  const mover = (idx, delta) => {
    const arr = [...linhas];
    const swap = idx + delta;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    salvar(arr);
  };

  const sigla = programa?.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla : programa?.nome;

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
        <Link
          to={`/admin/programas/${id}/docentes`}
          className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <FlaskConical className="text-ufrpe-blue" size={22} />
        <div>
          <h1 className="font-heading text-2xl font-bold text-ufrpe-blue leading-tight">
            Linhas de Pesquisa
          </h1>
          {sigla && <p className="text-sm text-gray-500">{sigla}</p>}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-[3.25rem]">
        Gerencie as linhas de pesquisa deste programa. A ordem aqui é a exibida no microsite.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg px-4 py-2.5 text-sm mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 border border-green-100 rounded-lg px-4 py-2.5 text-sm mb-4 flex items-center gap-2">
          <Save size={15} /> {success}
        </div>
      )}

      {/* Adicionar nova linha */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Nova linha de pesquisa</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionar()}
            placeholder="Ex: Inteligência Artificial e Aprendizado de Máquina"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
          />
          <button
            onClick={adicionar}
            disabled={saving || !nova.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-ufrpe-blue text-white hover:bg-ufrpe-blue/90 disabled:opacity-50 shrink-0"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Adicionar
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {linhas.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            Nenhuma linha de pesquisa cadastrada.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {linhas.map((l, idx) => (
              <li key={idx} className="flex items-center gap-3 px-5 py-3 group hover:bg-gray-50/60 transition-colors">
                {/* Ordem */}
                <span className="text-xs text-gray-300 w-5 text-center shrink-0">{idx + 1}</span>

                {/* Nome */}
                <span className="flex-1 text-sm text-gray-700">{l}</span>

                {/* Ações */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => mover(idx, -1)}
                    disabled={idx === 0 || saving}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-20"
                    title="Mover para cima"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => mover(idx, 1)}
                    disabled={idx === linhas.length - 1 || saving}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-20"
                    title="Mover para baixo"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => remover(idx)}
                    disabled={saving}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-20"
                    title="Remover"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {linhas.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-right">{linhas.length} linha{linhas.length !== 1 ? 's' : ''} cadastrada{linhas.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
