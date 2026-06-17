import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../../api';
import { Languages, FileText, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

const token = () => localStorage.getItem('token');
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

const RESULTADO_LABEL = {
  PROFICIENCIA: { txt: 'Proficiência', cls: 'bg-green-100 text-green-700' },
  SUFICIENCIA:  { txt: 'Suficiência',  cls: 'bg-blue-100 text-blue-700'  },
  INSUFICIENTE: { txt: 'Insuficiente', cls: 'bg-red-100 text-red-700'    },
};

const AdminProficiencia = () => {
  const [inscricoes, setInscricoes] = useState([]);
  const [periodoAberto, setPeriodoAberto] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [notas, setNotas] = useState({});
  const [salvandoId, setSalvandoId] = useState(null);

  const carregar = async () => {
    try {
      const [iRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/proficiencia/inscricoes`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/proficiencia/periodo-aberto`, { headers: authHeaders() }),
      ]);
      setInscricoes(iRes.ok ? await iRes.json() : []);
      setPeriodoAberto(pRes.ok ? await pRes.json() : null);
    } catch {
      setErro('Erro ao carregar dados.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

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
      if (res.ok) setInscricoes((prev) => prev.map((i) => (i.id === id ? d : i)));
      else setErro(d.message || 'Erro ao lançar nota.');
    } catch { setErro('Erro de conexão.'); }
    finally { setSalvandoId(null); }
  };

  const abrirDeclaracao = async (id) => {
    setErro('');
    try {
      const res = await fetch(`${API_URL}/api/proficiencia/inscricoes/${id}/declaracao`, { headers: authHeaders() });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErro(d.message || 'Erro ao gerar declaração.'); return; }
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

      {/* Período vigente */}
      <div className={`mb-6 flex items-start gap-3 rounded-lg border p-4 text-sm ${periodoAberto ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
        {periodoAberto ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
        <div>
          {periodoAberto
            ? <>Período aberto: <strong>{periodoAberto.titulo}</strong>{periodoAberto.dataFim ? ` (até ${periodoAberto.dataFim})` : ''}.</>
            : <>Não há período de inscrição aberto. Para abrir um, crie ou edite um <Link to="/admin/editais" className="underline font-medium">edital</Link> e marque <em>Edital de Proficiência em Línguas</em>.</>}
        </div>
      </div>

      {erro && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" /> {erro}
        </div>
      )}

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
                            className="flex items-center gap-1 text-ufrpe-blue underline text-xs">
                            <ExternalLink size={10} /> Residência
                          </a>
                        )}
                        {i.comprovanteVinculoUrl && (
                          <a href={`${API_URL}${i.comprovanteVinculoUrl}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-ufrpe-blue underline text-xs">
                            <ExternalLink size={10} /> Vínculo
                          </a>
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
                        {r
                          ? <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.cls}`}>{r.txt}</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="py-2">
                        {podeDeclarar
                          ? <button onClick={() => abrirDeclaracao(i.id)}
                              className="text-xs border border-ufrpe-blue text-ufrpe-blue px-2 py-1 rounded hover:bg-ufrpe-blue hover:text-white flex items-center gap-1">
                              <FileText size={12} /> Gerar PDF
                            </button>
                          : <span className="text-gray-300 text-xs">—</span>}
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
