import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, FlaskConical, Loader2 } from 'lucide-react';
import { API_URL } from '../../api';

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

export default function AdminProgramaLinhas() {
  const { id } = useParams();
  const [programa, setPrograma] = useState(null);
  const [linhas, setLinhas] = useState([]);       // [{label, target_id}]
  const [oficiais, setOficiais] = useState([]);   // [{label, target_id}] da taxonomia
  const [novaLabel, setNovaLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [rp, rl, rt] = await Promise.all([
        fetch(`${API_URL}/api/programas/${id}`),
        fetch(`${API_URL}/api/programas/${id}/linhas`, { headers: auth() }),
        fetch(`${API_URL}/api/taxonomias`),
      ]);
      if (rp.ok) setPrograma(await rp.json());
      if (rl.ok) {
        const data = await rl.json();
        setLinhas(data.map((l) => (typeof l === 'object' ? l : { label: l, target_id: null })));
      }
      if (rt.ok) {
        const data = await rt.json();
        const lp = data.linhas_pesquisa || [];
        setOficiais(lp.map((l) => (typeof l === 'object' ? l : { label: l, target_id: null })));
      }
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
        const data = await res.json();
        setLinhas(data.map((l) => (typeof l === 'object' ? l : { label: l, target_id: null })));
        setSuccess('Salvo.');
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

  const toggleOficial = (o) => {
    const existe = linhas.some((l) => l.label === o.label);
    if (existe) {
      salvar(linhas.filter((l) => l.label !== o.label));
    } else {
      salvar([...linhas, { label: o.label, target_id: o.target_id || null }]);
    }
  };

  const adicionarCustom = () => {
    const label = novaLabel.trim();
    if (!label) return;
    if (linhas.some((l) => l.label === label)) { setError('Linha já cadastrada.'); return; }
    setNovaLabel('');
    setError('');
    salvar([...linhas, { label, target_id: null }]);
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

  // Linhas oficiais ainda não adicionadas ao programa
  const oficiaisdisponiveis = oficiais.filter((o) => !linhas.some((l) => l.label === o.label));
  // Linhas do programa não presentes na taxonomia (custom)
  const linhasCustom = linhas.filter((l) => !oficiais.some((o) => o.label === l.label));

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
        Selecione as linhas oficiais da taxonomia ou adicione linhas específicas deste programa.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg px-4 py-2.5 text-sm mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 border border-green-100 rounded-lg px-4 py-2.5 text-sm mb-4 flex items-center gap-2">
          <Save size={15} /> {success}
        </div>
      )}

      {/* Linhas oficiais da taxonomia */}
      {oficiais.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Linhas oficiais da PRPG</p>
          <div className="flex flex-wrap gap-2">
            {oficiais.map((o) => {
              const selecionada = linhas.some((l) => l.label === o.label);
              return (
                <button
                  key={o.label}
                  onClick={() => toggleOficial(o)}
                  disabled={saving}
                  title={o.target_id ? `ID legado: ${o.target_id}` : undefined}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
                    selecionada
                      ? 'bg-ufrpe-blue text-white border-ufrpe-blue'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-ufrpe-blue hover:text-ufrpe-blue'
                  }`}
                >
                  {selecionada ? '✓ ' : '+ '}{o.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Clique para selecionar/remover. As linhas marcadas aparecem no microsite do programa.
          </p>
        </div>
      )}

      {/* Adicionar linha personalizada */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
        <p className="text-sm font-medium text-gray-700 mb-3">Linha específica deste programa</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={novaLabel}
            onChange={(e) => setNovaLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionarCustom()}
            placeholder="Ex: Biotecnologia Aplicada à Saúde Animal"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
          />
          <button
            onClick={adicionarCustom}
            disabled={saving || !novaLabel.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-ufrpe-blue text-white hover:bg-ufrpe-blue/90 disabled:opacity-50 shrink-0"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Adicionar
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Use para linhas que não constam na lista oficial. Para mapear o ID legado (Drupal), cadastre a linha nas <a href="/admin/taxonomias" className="underline hover:text-ufrpe-blue">Taxonomias</a>.
        </p>
      </div>

      {/* Lista das linhas do programa */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {linhas.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">Nenhuma linha de pesquisa cadastrada.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {linhas.map((l, idx) => {
              const isOficial = oficiais.some((o) => o.label === l.label);
              return (
                <li key={idx} className="flex items-center gap-3 px-5 py-3 group hover:bg-gray-50/60 transition-colors">
                  <span className="text-xs text-gray-300 w-5 text-center shrink-0">{idx + 1}</span>
                  <span className="flex-1 text-sm text-gray-700">{l.label}</span>
                  {l.target_id && (
                    <span className="text-xs font-mono text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 shrink-0" title="ID legado (Drupal)">
                      {l.target_id}
                    </span>
                  )}
                  {!isOficial && (
                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 shrink-0">personalizada</span>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => mover(idx, -1)} disabled={idx === 0 || saving}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-20" title="Mover para cima">▲</button>
                    <button onClick={() => mover(idx, 1)} disabled={idx === linhas.length - 1 || saving}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-20" title="Mover para baixo">▼</button>
                    <button onClick={() => remover(idx)} disabled={saving}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-20" title="Remover">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {linhas.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-right">
          {linhas.length} linha{linhas.length !== 1 ? 's' : ''} · {linhas.length - linhasCustom.length} oficial{linhas.length - linhasCustom.length !== 1 ? 'is' : ''}{linhasCustom.length > 0 ? ` · ${linhasCustom.length} personalizada${linhasCustom.length !== 1 ? 's' : ''}` : ''}
        </p>
      )}
    </div>
  );
}
