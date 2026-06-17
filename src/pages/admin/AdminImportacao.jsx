import React, { useState, useEffect } from 'react';
import { Upload, FileUp, Eye, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { API_URL } from '../../api';

// Painel de importação de dados do site antigo. Fluxo:
//   1. escolher o tipo de conteúdo (professores, ...);
//   2. selecionar o programa de destino (quando o tipo exige);
//   3. enviar o arquivo exportado;
//   4. pré-visualizar (dryRun) e então confirmar a importação.

const ACAO_BADGE = {
  criado:     { label: 'Criar',      cls: 'bg-green-100 text-green-700' },
  atualizado: { label: 'Atualizar',  cls: 'bg-blue-100 text-blue-700' },
  inalterado: { label: 'Inalterado', cls: 'bg-gray-100 text-gray-500' },
  erro:       { label: 'Erro',       cls: 'bg-red-100 text-red-700' },
};

export default function AdminImportacao() {
  const [tipos, setTipos] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [tipo, setTipo] = useState('');
  const [programaId, setProgramaId] = useState('');
  const [file, setFile] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch(`${API_URL}/api/import/tipos`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTipos)
      .catch(() => setError('Erro ao carregar tipos de importação.'));
    fetch(`${API_URL}/api/programas`)
      .then((r) => r.json())
      .then(setProgramas)
      .catch(() => {});
  }, []);

  const tipoSel = tipos.find((t) => t.id === tipo);
  const precisaPrograma = tipoSel?.requiresPrograma;

  const enviar = async (dryRun) => {
    setError('');
    if (!tipo) return setError('Escolha o tipo de conteúdo.');
    if (precisaPrograma && !programaId) return setError('Selecione o programa de destino.');
    if (!file) return setError('Selecione o arquivo a importar.');

    const fd = new FormData();
    fd.append('file', file);
    fd.append('dryRun', dryRun ? 'true' : 'false');
    if (programaId) fd.append('programaId', programaId);

    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/import/${tipo}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Falha na importação.');
        setResultado(null);
      } else {
        setResultado(data);
      }
    } catch (e) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setBusy(false);
    }
  };

  const r = resultado?.resumo;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-1">
        <Upload className="text-ufrpe-blue" size={24} />
        <h1 className="font-heading text-2xl font-bold text-ufrpe-blue">Importação de Dados</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Importe dados do site antigo. Escolha o tipo de conteúdo, o programa de destino
        e envie o arquivo exportado. Use a <strong>pré-visualização</strong> antes de confirmar.
      </p>

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        {/* Tipo de conteúdo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de conteúdo</label>
          <select
            value={tipo}
            onChange={(e) => { setTipo(e.target.value); setResultado(null); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
          >
            <option value="">Selecione…</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id} disabled={!t.disponivel}>
                {t.label}{t.disponivel ? '' : ' (em breve)'}
              </option>
            ))}
          </select>
          {tipoSel?.descricao && <p className="text-xs text-gray-400 mt-1">{tipoSel.descricao}</p>}
        </div>

        {/* Programa de destino */}
        {precisaPrograma && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Programa de destino</label>
            <select
              value={programaId}
              onChange={(e) => { setProgramaId(e.target.value); setResultado(null); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ufrpe-blue/30 outline-none"
            >
              <option value="">Selecione…</option>
              {programas.map((p) => (
                <option key={p.id} value={p.id}>{p.sigla ? `${p.sigla} — ${p.nome}` : p.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* Arquivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Arquivo (JSON exportado)</label>
          <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-ufrpe-blue transition-colors">
            <FileUp size={18} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-600 truncate">
              {file ? file.name : 'Clique para selecionar o arquivo…'}
            </span>
            <input
              type="file"
              accept=".json,.txt,application/json"
              className="hidden"
              onChange={(e) => { setFile(e.target.files[0] || null); setResultado(null); }}
            />
          </label>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={() => enviar(true)}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-ufrpe-blue text-ufrpe-blue hover:bg-ufrpe-blue/5 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} Pré-visualizar
          </button>
          <button
            onClick={() => enviar(false)}
            disabled={busy || !resultado?.dryRun}
            title={!resultado?.dryRun ? 'Pré-visualize antes de importar' : ''}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-ufrpe-blue text-white hover:bg-ufrpe-blue/90 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Importar
          </button>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-ufrpe-blue">
              {resultado.dryRun ? 'Pré-visualização' : 'Importação concluída'}
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-gray-100 text-gray-600">Total: {r.total}</span>
              <span className="px-2 py-1 rounded bg-green-100 text-green-700">Criar: {r.criado}</span>
              <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">Atualizar: {r.atualizado}</span>
              <span className="px-2 py-1 rounded bg-gray-100 text-gray-500">Inalterado: {r.inalterado}</span>
              {r.erro > 0 && <span className="px-2 py-1 rounded bg-red-100 text-red-700">Erros: {r.erro}</span>}
            </div>
          </div>
          {!resultado.dryRun && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">
              Dados importados com sucesso.
            </p>
          )}
          <div className="overflow-auto max-h-96 border border-gray-100 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Ação</th>
                  <th className="text-left px-3 py-2 font-medium">Nome</th>
                  <th className="text-left px-3 py-2 font-medium">E-mail</th>
                  <th className="text-left px-3 py-2 font-medium">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {resultado.resultados.map((item, i) => {
                  const badge = ACAO_BADGE[item.acao] || ACAO_BADGE.inalterado;
                  return (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{item.nome || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{item.email || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{item.mensagem}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
