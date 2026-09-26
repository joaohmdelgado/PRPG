import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL, apiFetch } from '../api';
import { Languages, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import CabecalhoPagina from '../components/CabecalhoPagina';
import Dialog from '../components/ui/Dialog';
import { Field, Input, Select, Checkbox, FileField } from '../components/ui/Field';

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
        const pRes = await apiFetch('/api/proficiencia/periodo-aberto', { auth: false });
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
      const res = await apiFetch('/api/proficiencia/verificar-aluno', {
        method: 'POST',
        auth: false,
        json: { nome },
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
      const res = await apiFetch('/api/proficiencia/upload', { method: 'POST', auth: false, body: fd });
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
      const res = await apiFetch('/api/proficiencia/inscricoes', { method: 'POST', json: form });
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
      <CabecalhoPagina
        titulo={<span className="flex items-center gap-3"><Languages size={36} aria-hidden="true" /> Inscrição — Proficiência em Línguas</span>}
        atual="Inscrição — Proficiência"
        trilha={[]}
      />

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
                    <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" /> {erro}
                    </div>
                  )}

                  <div>
                    <Field label="Nome completo" required hint={verificacao !== 'ok' ? 'Preencha o nome completo exatamente como matriculado para liberar os demais campos.' : undefined}>
                      <Input
                        type="text" value={form.nome} autoComplete="name"
                        onChange={(e) => setCampo('nome', e.target.value)}
                        onBlur={verificarNome}
                      />
                    </Field>
                    <div role="status" aria-live="polite">
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
                    </div>
                  </div>

                  <fieldset disabled={!alunoVerificado} className={`space-y-5 ${alunoVerificado ? '' : 'opacity-50 pointer-events-none'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="CPF" required>
                      <Input type="text" inputMode="numeric" autoComplete="off" value={form.cpf}
                        onChange={(e) => setCampo('cpf', e.target.value)} />
                    </Field>
                    <Field label="Nível" required>
                      <Select value={form.nivel} onChange={(e) => setCampo('nivel', e.target.value)} opcoes={NIVEIS} />
                    </Field>
                    <div className="flex items-center pt-6">
                      <Checkbox label="Sou aluno estrangeiro" checked={form.estrangeiro}
                        onChange={(e) => setCampo('estrangeiro', e.target.checked)} />
                    </div>
                  </div>

                  {/* Línguas */}
                  <div role="group" aria-labelledby="linguas-rotulo" aria-describedby="linguas-ajuda">
                    <span id="linguas-rotulo" className="block text-sm font-medium text-gray-700 mb-1">
                      Língua(s) de inscrição <span className="text-red-600" aria-hidden="true">*</span>
                    </span>
                    <p id="linguas-ajuda" className="text-xs text-gray-600 mb-2">
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
                            type="button" key={l} aria-pressed={sel}
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
                  <FileField
                    label="Comprovante de residência (PDF ou imagem)" required accept="application/pdf,image/*"
                    atual={form.comprovanteResidenciaUrl ? `${API_URL}${form.comprovanteResidenciaUrl}` : ''}
                    enviando={uploadField === 'comprovanteResidenciaUrl'}
                    onEscolher={(f) => upload(f, 'comprovanteResidenciaUrl')}
                    onRemover={() => setForm((p) => ({ ...p, comprovanteResidenciaUrl: '' }))}
                  />

                  <Checkbox label="Sou o titular do comprovante de residência" checked={form.titularComprovante}
                    onChange={(e) => setCampo('titularComprovante', e.target.checked)} />

                  {/* Comprovante de vínculo — só quando não é titular */}
                  {!form.titularComprovante && (
                    <FileField
                      label="Comprovante de vínculo com o titular (PDF)" required accept="application/pdf"
                      atual={form.comprovanteVinculoUrl ? `${API_URL}${form.comprovanteVinculoUrl}` : ''}
                      enviando={uploadField === 'comprovanteVinculoUrl'}
                      onEscolher={(f) => upload(f, 'comprovanteVinculoUrl')}
                      onRemover={() => setForm((p) => ({ ...p, comprovanteVinculoUrl: '' }))}
                    />
                  )}

                  <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    {/* Fase H.7: aviso no ponto de coleta (CPF e comprovantes). */}
                    <p className="text-xs text-gray-500 max-w-md">
                      Seus dados e comprovantes são usados só para a inscrição, o exame e a declaração, e ficam em área
                      restrita. Veja a <Link to="/privacidade" target="_blank" className="text-ufrpe-blue underline">Política de Privacidade</Link>.
                    </p>
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
      <Dialog
        aberto={mostrarModal} papel="alertdialog" tamanho="sm" onFechar={() => setMostrarModal(false)}
        titulo="Aluno não localizado"
        descricao="Não encontramos um aluno matriculado com o nome informado. A inscrição só pode ser realizada por aluno ativo do programa. Confira se o nome completo foi digitado exatamente como consta na matrícula."
        rodape={(
          <button type="button" onClick={() => setMostrarModal(false)}
            className="bg-ufrpe-blue text-white px-5 py-2 rounded hover:bg-[#2a3a66]">
            Entendi
          </button>
        )}
      />
    </>
  );
}

