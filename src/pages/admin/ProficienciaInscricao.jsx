import React, { useEffect, useState } from 'react';
import { API_URL } from '../../api';
import { getUserId } from '../../auth';
import { Languages, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const LINGUAS = ['Português', 'Inglês', 'Espanhol'];
const NIVEIS = ['Mestrado', 'Doutorado'];

const token = () => localStorage.getItem('token');

// Regra de quantas línguas o aluno pode escolher, conforme nível/estrangeiro.
const regraLinguas = ({ nivel, estrangeiro }) => {
  if (estrangeiro) return { max: 2, min: 2, fixaPortugues: true };
  if (nivel === 'Doutorado') return { max: 2, min: 1, fixaPortugues: false };
  return { max: 1, min: 1, fixaPortugues: false };
};

const ProficienciaInscricao = () => {
  const [periodo, setPeriodo] = useState(null);
  const [minhas, setMinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [uploadField, setUploadField] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [form, setForm] = useState({
    nome: '', cpf: '', nivel: 'Mestrado', estrangeiro: false,
    linguas: [], comprovanteResidenciaUrl: '', titularComprovante: true,
    comprovanteVinculoUrl: '',
  });

  useEffect(() => {
    const carregar = async () => {
      try {
        const headers = { Authorization: `Bearer ${token()}` };
        const [pRes, mRes] = await Promise.all([
          fetch(`${API_URL}/api/proficiencia/periodo-aberto`, { headers }),
          fetch(`${API_URL}/api/proficiencia/inscricoes/minhas`, { headers }),
        ]);
        setPeriodo(pRes.ok ? await pRes.json() : null);
        setMinhas(mRes.ok ? await mRes.json() : []);

        // Pré-preenche com o cadastro do aluno logado.
        const uid = getUserId();
        if (uid) {
          const uRes = await fetch(`${API_URL}/api/users/${uid}`, { headers });
          if (uRes.ok) {
            const u = await uRes.json();
            const nivelCad = u.perfil_aluno?.nivel === 'Doutorando' ? 'Doutorado'
              : u.perfil_aluno?.nivel === 'Mestrando' ? 'Mestrado' : null;
            setForm((prev) => ({
              ...prev,
              nome: u.perfil_geral?.nome || '',
              cpf: u.perfil_geral?.cpf || '',
              nivel: nivelCad || prev.nivel,
              estrangeiro: !!u.perfil_aluno?.estrangeiro,
            }));
          }
        }
      } catch {
        setErro('Erro ao carregar os dados. Tente novamente.');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  const regra = regraLinguas(form);

  const toggleLingua = (lingua) => {
    setForm((prev) => {
      const tem = prev.linguas.includes(lingua);
      let linguas;
      if (tem) {
        linguas = prev.linguas.filter((l) => l !== lingua);
      } else {
        // Respeita o limite; se for de uma só, substitui.
        if (regra.max === 1) linguas = [lingua];
        else if (prev.linguas.length >= regra.max) return prev;
        else linguas = [...prev.linguas, lingua];
      }
      return { ...prev, linguas };
    });
  };

  // Quando o aluno muda nível/estrangeiro, reseta a seleção que pode violar a regra.
  const setCampo = (campo, valor) => {
    setForm((prev) => {
      const next = { ...prev, [campo]: valor };
      if (campo === 'nivel' || campo === 'estrangeiro') {
        const r = regraLinguas(next);
        next.linguas = r.fixaPortugues ? ['Português'] : [];
      }
      return next;
    });
  };

  const upload = async (file, campo) => {
    if (!file) return;
    setUploadField(campo);
    setErro('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) setForm((prev) => ({ ...prev, [campo]: data.url }));
      else setErro(data.message || 'Erro ao enviar arquivo.');
    } catch {
      setErro('Erro de conexão ao enviar o arquivo.');
    } finally {
      setUploadField(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/api/proficiencia/inscricoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSucesso('Inscrição enviada com sucesso!');
        setMinhas((prev) => [data, ...prev]);
      } else {
        setErro(data.message || 'Não foi possível enviar a inscrição.');
      }
    } catch {
      setErro('Erro de conexão ao enviar a inscrição.');
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="animate-spin" size={18} /> Carregando…
      </div>
    );
  }

  const jaInscrito = periodo && minhas.some((i) => i.periodoId === periodo.id);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Languages className="text-ufrpe-blue" size={26} />
        <h1 className="font-heading text-2xl font-bold text-ufrpe-blue">
          Inscrição — Proficiência em Línguas
        </h1>
      </div>

      {/* Minhas inscrições */}
      {minhas.length > 0 && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-700 mb-2">Minhas inscrições</h2>
          <ul className="divide-y divide-gray-100">
            {minhas.map((i) => (
              <li key={i.id} className="py-2 flex items-center justify-between text-sm">
                <span>{(i.linguas || []).join(', ')} — {i.nivel}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  i.status === 'AVALIADO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {i.status === 'AVALIADO'
                    ? `Avaliado — nota ${Number(i.nota).toFixed(2)}`
                    : 'Inscrito'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!periodo && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p>Não há período de inscrição aberto no momento.</p>
        </div>
      )}

      {periodo && jaInscrito && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
          <p>Você já possui inscrição no período <strong>{periodo.titulo}</strong>.</p>
        </div>
      )}

      {periodo && !jaInscrito && (
        <form onSubmit={submit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <p className="text-sm text-gray-500">
            Período aberto: <strong>{periodo.titulo}</strong>
            {periodo.dataFim ? ` (até ${periodo.dataFim})` : ''}
          </p>

          {erro && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" /> {erro}
            </div>
          )}
          {sucesso && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded p-3 text-sm">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> {sucesso}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome completo *</label>
              <input
                type="text" value={form.nome} required
                onChange={(e) => setCampo('nome', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CPF *</label>
              <input
                type="text" value={form.cpf} required
                onChange={(e) => setCampo('cpf', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nível *</label>
              <select
                value={form.nivel}
                onChange={(e) => setCampo('nivel', e.target.value)}
                className="w-full border p-2 rounded bg-white"
              >
                {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 font-medium text-sm">
                <input
                  type="checkbox" checked={form.estrangeiro}
                  onChange={(e) => setCampo('estrangeiro', e.target.checked)}
                  className="w-5 h-5"
                />
                Sou aluno estrangeiro
              </label>
            </div>
          </div>

          {/* Línguas */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Língua(s) de inscrição *
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {form.estrangeiro
                ? 'Estrangeiro: Português + mais uma língua.'
                : form.nivel === 'Doutorado'
                  ? 'Doutorado: até duas línguas.'
                  : 'Mestrado: uma língua.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {LINGUAS.map((l) => {
                const sel = form.linguas.includes(l);
                const travada = form.estrangeiro && l === 'Português'; // sempre marcada
                return (
                  <button
                    type="button" key={l}
                    onClick={() => !travada && toggleLingua(l)}
                    className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                      sel
                        ? 'bg-ufrpe-blue text-white border-ufrpe-blue'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-ufrpe-blue'
                    } ${travada ? 'opacity-80 cursor-default' : ''}`}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comprovante de residência */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Comprovante de residência (PDF ou imagem) *
            </label>
            <FileInput
              value={form.comprovanteResidenciaUrl}
              uploading={uploadField === 'comprovanteResidenciaUrl'}
              onPick={(f) => upload(f, 'comprovanteResidenciaUrl')}
              onClear={() => setForm((p) => ({ ...p, comprovanteResidenciaUrl: '' }))}
            />
          </div>

          <label className="flex items-center gap-2 font-medium text-sm">
            <input
              type="checkbox" checked={form.titularComprovante}
              onChange={(e) => setCampo('titularComprovante', e.target.checked)}
              className="w-5 h-5"
            />
            Sou o titular do comprovante de residência
          </label>

          {/* Comprovante de vínculo — só quando não é titular */}
          {!form.titularComprovante && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Comprovante de vínculo com o titular (PDF) *
              </label>
              <FileInput
                value={form.comprovanteVinculoUrl}
                uploading={uploadField === 'comprovanteVinculoUrl'}
                accept="application/pdf"
                onPick={(f) => upload(f, 'comprovanteVinculoUrl')}
                onClear={() => setForm((p) => ({ ...p, comprovanteVinculoUrl: '' }))}
              />
            </div>
          )}

          <div className="pt-2 border-t border-gray-100 flex justify-end">
            <button
              type="submit" disabled={enviando}
              className="bg-ufrpe-blue text-white px-6 py-2 rounded hover:bg-[#2a3a66] flex items-center gap-2 disabled:opacity-50"
            >
              {enviando && <Loader2 className="animate-spin" size={16} />}
              Enviar inscrição
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const FileInput = ({ value, uploading, accept = 'application/pdf,image/*', onPick, onClear }) => (
  <div>
    {value ? (
      <div className="flex items-center gap-3 text-sm">
        <a href={`${API_URL}${value}`} target="_blank" rel="noopener noreferrer"
          className="text-ufrpe-blue underline">Arquivo enviado</a>
        <button type="button" onClick={onClear} className="text-red-600 hover:underline">Remover</button>
      </div>
    ) : (
      <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded cursor-pointer text-sm text-gray-600 hover:border-ufrpe-blue">
        {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
        {uploading ? 'Enviando…' : 'Selecionar arquivo'}
        <input type="file" accept={accept} className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])} />
      </label>
    )}
  </div>
);

export default ProficienciaInscricao;
