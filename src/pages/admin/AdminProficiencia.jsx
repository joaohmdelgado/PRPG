import React, { useEffect, useState } from 'react';
import { API_URL } from '../../api';
import { Languages, Plus, Trash2, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const token = () => localStorage.getItem('token');
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

const RESULTADO_LABEL = {
  PROFICIENCIA: { txt: 'Proficiência', cls: 'bg-green-100 text-green-700' },
  SUFICIENCIA: { txt: 'Suficiência', cls: 'bg-blue-100 text-blue-700' },
  INSUFICIENTE: { txt: 'Insuficiente', cls: 'bg-red-100 text-red-700' },
};

const AdminProficiencia = () => {
  const [periodos, setPeriodos] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [notas, setNotas] = useState({}); // id -> valor digitado
  const [salvandoId, setSalvandoId] = useState(null);
  const [novoPeriodo, setNovoPeriodo] = useState({ titulo: '', dataInicio: '', dataFim: '', ativo: true });

  const carregar = async () => {
    try {
      const [pRes, iRes] = await Promise.all([
        fetch(`${API_URL}/api/proficiencia/periodos`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/proficiencia/inscricoes`, { headers: authHeaders() }),
      ]);
      setPeriodos(pRes.ok ? await pRes.json() : []);
      setInscricoes(iRes.ok ? await iRes.json() : []);
    } catch {
      setErro('Erro ao carregar dados.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const criarPeriodo = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const res = await fetch(`${API_URL}/api/proficiencia/periodos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(novoPeriodo),
      });
      if (res.ok) {
        setNovoPeriodo({ titulo: '', dataInicio: '', dataFim: '', ativo: true });
        carregar();
      } else {
        const d = await res.json();
        setErro(d.message || 'Erro ao criar período.');
      }
    } catch { setErro('Erro de conexão.'); }
  };

  const removerPeriodo = async (id) => {
    if (!confirm('Remover este período?')) return;
    await fetch(`${API_URL}/api/proficiencia/periodos/${id}`, { method: 'DELETE', headers: authHeaders() });
    carregar();
  };

  const lancarNota = async (id) => {
    const nota = notas[id];
    if (nota === undefined || nota === '') { setErro('Informe a nota.'); return; }
    setSalvandoId(id);
    setErro('');
    try {
      const res = await fetch(`${API_URL}/api/proficiencia/inscricoes/${id}/nota`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ nota: Number(nota) }),
      });
      const d = await res.json();
      if (res.ok) {
        setInscricoes((prev) => prev.map((i) => (i.id === id ? d : i)));
      } else {
        setErro(d.message || 'Erro ao lançar nota.');
      }
    } catch { setErro('Erro de conexão.'); }
    finally { setSalvandoId(null); }
  };

  // A rota da declaração é protegida; baixamos o PDF com o token e abrimos o blob.
  const abrirDeclaracao = async (id) => {
    setErro('');
    try {
      const res = await fetch(`${API_URL}/api/proficiencia/inscricoes/${id}/declaracao`, { headers: authHeaders() });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErro(d.message || 'Erro ao gerar declaração.');
        return;
      }
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch { setErro('Erro de conexão ao gerar a declaração.'); }
  };

  if (carregando) {
    return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={18} /> Carregando…</div>;
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-2 mb-6">
        <Languages className="text-ufrpe-blue" size={26} />
        <h1 className="font-heading text-2xl font-bold text-ufrpe-blue">Proficiência em Línguas</h1>
      </div>

      {erro && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      {/* Períodos */}
      <section className="mb-8 bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-3">Períodos de inscrição</h2>
        <form onSubmit={criarPeriodo} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end mb-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">Título *</label>
            <input type="text" required value={novoPeriodo.titulo}
              onChange={(e) => setNovoPeriodo((p) => ({ ...p, titulo: e.target.value }))}
              className="w-full border p-2 rounded text-sm" placeholder="Ex.: Proficiência 2026.1" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Início</label>
            <input type="date" value={novoPeriodo.dataInicio}
              onChange={(e) => setNovoPeriodo((p) => ({ ...p, dataInicio: e.target.value }))}
              className="w-full border p-2 rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Fim</label>
            <input type="date" value={novoPeriodo.dataFim}
              onChange={(e) => setNovoPeriodo((p) => ({ ...p, dataFim: e.target.value }))}
              className="w-full border p-2 rounded text-sm" />
          </div>
          <button type="submit" className="bg-ufrpe-blue text-white px-4 py-2 rounded hover:bg-[#2a3a66] flex items-center justify-center gap-1.5 text-sm">
            <Plus size={16} /> Criar
          </button>
        </form>
        {periodos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum período cadastrado.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {periodos.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                <span>
                  <strong>{p.titulo}</strong>{' '}
                  <span className="text-gray-400">
                    {p.dataInicio || '—'} a {p.dataFim || '—'} {p.ativo ? '' : '(inativo)'}
                  </span>
                </span>
                <button onClick={() => removerPeriodo(p.id)} className="text-red-600 hover:text-red-800">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Inscrições */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-3">Inscrições</h2>
        {inscricoes.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma inscrição recebida.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3">Aluno</th>
                  <th className="py-2 pr-3">Nível</th>
                  <th className="py-2 pr-3">Línguas</th>
                  <th className="py-2 pr-3">Documentos</th>
                  <th className="py-2 pr-3">Nota</th>
                  <th className="py-2 pr-3">Resultado</th>
                  <th className="py-2">Declaração</th>
                </tr>
              </thead>
              <tbody>
                {inscricoes.map((i) => {
                  const r = i.resultado ? RESULTADO_LABEL[i.resultado] : null;
                  const podeDeclarar = i.status === 'AVALIADO' && i.resultado && i.resultado !== 'INSUFICIENTE';
                  return (
                    <tr key={i.id} className="border-b border-gray-50 align-top">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-gray-800">{i.nome}</div>
                        <div className="text-xs text-gray-400">{i.cpf}{i.estrangeiro ? ' · estrangeiro' : ''}</div>
                      </td>
                      <td className="py-2 pr-3">{i.nivel}</td>
                      <td className="py-2 pr-3">{(i.linguas || []).join(', ')}</td>
                      <td className="py-2 pr-3 space-y-0.5">
                        {i.comprovanteResidenciaUrl && (
                          <a href={`${API_URL}${i.comprovanteResidenciaUrl}`} target="_blank" rel="noopener noreferrer"
                            className="block text-ufrpe-blue underline text-xs">Residência</a>
                        )}
                        {i.comprovanteVinculoUrl && (
                          <a href={`${API_URL}${i.comprovanteVinculoUrl}`} target="_blank" rel="noopener noreferrer"
                            className="block text-ufrpe-blue underline text-xs">Vínculo</a>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" min="0" max="10" step="0.1"
                            defaultValue={i.nota ?? ''}
                            onChange={(e) => setNotas((n) => ({ ...n, [i.id]: e.target.value }))}
                            className="w-16 border p-1 rounded text-sm"
                          />
                          <button
                            onClick={() => lancarNota(i.id)} disabled={salvandoId === i.id}
                            className="text-xs bg-ufrpe-blue text-white px-2 py-1 rounded hover:bg-[#2a3a66] disabled:opacity-50 flex items-center gap-1"
                          >
                            {salvandoId === i.id ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle2 size={12} />}
                            Lançar
                          </button>
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        {r ? <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.cls}`}>{r.txt}</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="py-2">
                        {podeDeclarar ? (
                          <button onClick={() => abrirDeclaracao(i.id)}
                            className="text-xs border border-ufrpe-blue text-ufrpe-blue px-2 py-1 rounded hover:bg-ufrpe-blue hover:text-white flex items-center gap-1">
                            <FileText size={12} /> Gerar PDF
                          </button>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminProficiencia;
