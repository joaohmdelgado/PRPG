import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../api';
import { Languages, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const LINGUAS = ['Português', 'Inglês', 'Espanhol'];
const NIVEIS = ['Mestrado', 'Doutorado'];

// Regra de quantas línguas o aluno pode escolher, conforme nível/estrangeiro.
const regraLinguas = ({ nivel, estrangeiro }) => {
  if (estrangeiro) return { max: 2, min: 2, fixaPortugues: true };
  if (nivel === 'Doutorado') return { max: 2, min: 1, fixaPortugues: false };
  return { max: 1, min: 1, fixaPortugues: false };
};

export default function ProficienciaInscricao() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [uploadField, setUploadField] = useState(null);
  const [erro, setErro] = useState('');

  // Verificação do aluno matriculado a partir do nome completo.
  // estado: 'idle' | 'checking' | 'ok' | 'notfound'
  const [verificacao, setVerificacao] = useState('idle');
  const [nomeVerificado, setNomeVerificado] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);

  const [form, setForm] = useState({
    nome: '', cpf: '', nivel: 'Mestrado', estrangeiro: false,
    linguas: [], comprovanteResidenciaUrl: '', titularComprovante: true,
    comprovanteVinculoUrl: '',
  });

  useEffect(() => {
    const carregar = async () => {
      try {
        const pRes = await fetch(`${API_URL}/api/proficiencia/periodo-aberto`);
        setPeriodo(pRes.ok ? await pRes.json() : null);
      } catch {
        setErro('Erro ao carregar os dados. Tente novamente.');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  const regra = regraLinguas(form);
  const alunoVerificado = verificacao === 'ok';

  // Ao sair do campo Nome completo: confere se bate com um aluno matriculado ativo.
  const verificarNome = async () => {
    const nome = form.nome.trim();
    if (!nome) { setVerificacao('idle'); return; }
    // Já verificado para este mesmo nome — não refaz.
    if (verificacao === 'ok' && nome === nomeVerificado) return;
    setVerificacao('checking');
    setErro('');
    try {
      const res = await fetch(`${API_URL}/api/proficiencia/verificar-aluno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      const data = await res.json();
      if (res.ok && data.encontrado) {
        setVerificacao('ok');
        setNomeVerificado(nome);
      } else {
        setVerificacao('notfound');
        setMostrarModal(true);
      }
    } catch {
      setVerificacao('idle');
      setErro('Erro de conexão ao verificar o nome. Tente novamente.');
    }
  };

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
    // Qualquer alteração do nome invalida uma verificação anterior.
    if (campo === 'nome') setVerificacao('idle');
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
      const res = await fetch(`${API_URL}/api/proficiencia/upload`, {
        method: 'POST',
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
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/api/proficiencia/inscricoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        // Redireciona para a página de confirmação (com SEO próprio), passando
        // o estado que autoriza a exibição e o protocolo gerado.
        navigate('/proficiencia/inscricao/sucesso', {
          state: { fromInscricao: true, protocolo: data?.id },
        });
        return;
      } else {
        setErro(data.message || 'Não foi possível enviar a inscrição.');
      }
    } catch {
      setErro('Erro de conexão ao enviar a inscrição.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {/* Cabeçalho da página */}
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <nav className="flex text-white/60 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link to="/" className="hover:text-ufrpe-yellow transition-colors">Início</Link>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-ufrpe-yellow font-medium">Inscrição — Proficiência</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="font-heading text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Languages size={32} /> Inscrição — Proficiência em Línguas
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl">
          {carregando ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="animate-spin" size={18} /> Carregando…
            </div>
          ) : (
            <>
              {!periodo && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p>Não há período de inscrição aberto no momento.</p>
                </div>
              )}

              {periodo && (
                <form onSubmit={submit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                  <p className="text-sm text-gray-500">
                    Período aberto: <strong>{periodo.titulo}</strong>
                    {periodo.dataFim ? ` (até ${new Date(periodo.dataFim + 'T12:00:00').toLocaleDateString('pt-BR')})` : ''}
                  </p>

                  {erro && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" /> {erro}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Nome completo *</label>
                    <input
                      type="text" value={form.nome} required
                      onChange={(e) => setCampo('nome', e.target.value)}
                      onBlur={verificarNome}
                      className="w-full border p-2 rounded"
                    />
                    {verificacao === 'checking' && (
                      <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Loader2 className="animate-spin" size={12} /> Verificando matrícula…
                      </p>
                    )}
                    {verificacao === 'ok' && (
                      <p className="flex items-center gap-1 text-xs text-green-700 mt-1">
                        <CheckCircle2 size={12} /> Aluno matriculado localizado.
                      </p>
                    )}
                    {verificacao === 'notfound' && (
                      <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
                        <AlertCircle size={12} /> Aluno não localizado. Só o aluno ativo do programa pode se inscrever.
                      </p>
                    )}
                    {verificacao !== 'ok' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Preencha o nome completo exatamente como matriculado para liberar os demais campos.
                      </p>
                    )}
                  </div>

                  <fieldset disabled={!alunoVerificado} className={`space-y-5 ${alunoVerificado ? '' : 'opacity-50 pointer-events-none'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </fieldset>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal: aluno não localizado entre os matriculados. */}
      {mostrarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog" aria-modal="true"
          onClick={() => setMostrarModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={28} className="text-red-600 shrink-0" />
              <div>
                <h2 className="font-heading text-lg font-bold text-gray-900">Aluno não localizado</h2>
                <p className="text-sm text-gray-600 mt-2">
                  Não encontramos um aluno matriculado com o nome informado. A inscrição
                  só pode ser realizada por aluno ativo do programa. Confira se o nome
                  completo foi digitado exatamente como consta na matrícula.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setMostrarModal(false)}
                className="bg-ufrpe-blue text-white px-5 py-2 rounded hover:bg-[#2a3a66]"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
