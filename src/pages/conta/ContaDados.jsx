import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { Field, Input, Checkbox } from '../../components/ui/Field';
import { useToast } from '../../components/admin/Toast';

const PAPEL = {
  Administrator: 'Administrador', Gestor: 'Gestor da PRPG',
  GestorPrograma: 'Gestor de programa', Aluno: 'Aluno', Professor: 'Professor',
};
const PAPEL_VINCULO = {
  DISCENTE_MESTRADO: 'Mestrando(a)', DISCENTE_DOUTORADO: 'Doutorando(a)', DISCENTE_ESPECIAL: 'Aluno(a) especial',
  EGRESSO: 'Egresso(a)', DOCENTE_PERMANENTE: 'Docente permanente', DOCENTE_COLABORADOR: 'Docente colaborador',
  DOCENTE_VISITANTE: 'Docente visitante',
};
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : null);

function Dado({ rotulo, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{rotulo}</dt>
      <dd className="text-sm text-gray-900 mt-0.5 break-words">{children || '—'}</dd>
    </div>
  );
}

async function mensagemDe(res, padrao) {
  const corpo = await res.json().catch(() => ({}));
  return corpo.message || padrao;
}

export default function ContaDados() {
  const { conta, vinculos, recarregar } = useOutletContext();
  const { toast, Toasts } = useToast();

  // ---- contato e divulgação
  const [telefones, setTelefones] = useState(conta.telefones.length ? conta.telefones : ['']);
  const [lattes, setLattes] = useState(conta.lattes);
  const [orcid, setOrcid] = useState(conta.orcid);
  const [scholar, setScholar] = useState(conta.googleScholar);
  const [priv, setPriv] = useState(conta.privacidade);
  const [salvando, setSalvando] = useState(false);
  const ehDocente = conta.roles.includes('Professor');

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await apiFetch('/api/minha-conta', {
        method: 'PUT',
        json: { telefones, lattes, orcid, googleScholar: scholar, privacidade: priv },
      });
      if (res.ok) { toast.success('Dados atualizados.'); recarregar(); }
      else toast.error(await mensagemDe(res, 'Não foi possível salvar.'));
    } catch {
      toast.error('Sem conexão com o servidor. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  // ---- senha
  const [senha, setSenha] = useState({ atual: '', nova: '', confirma: '' });
  const [erroSenha, setErroSenha] = useState('');
  const [trocando, setTrocando] = useState(false);

  const trocarSenha = async (e) => {
    e.preventDefault();
    setErroSenha('');
    if (senha.nova.length < 8) return setErroSenha('A nova senha deve ter pelo menos 8 caracteres.');
    if (senha.nova !== senha.confirma) return setErroSenha('A confirmação não confere com a nova senha.');
    setTrocando(true);
    try {
      const res = await apiFetch('/api/minha-conta/senha', { method: 'PUT', json: { senhaAtual: senha.atual, novaSenha: senha.nova } });
      if (res.ok) {
        toast.success('Senha atualizada.');
        setSenha({ atual: '', nova: '', confirma: '' });
      } else {
        setErroSenha(await mensagemDe(res, 'Não foi possível trocar a senha.'));
      }
    } catch {
      setErroSenha('Sem conexão com o servidor. Tente de novo.');
    } finally {
      setTrocando(false);
    }
  };

  const secao = 'bg-white rounded-xl border border-gray-200 p-6';
  const titulo = 'font-heading text-lg font-semibold text-ufrpe-blue mb-4';
  const botao = 'bg-ufrpe-blue text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#2a3a66] disabled:opacity-50';

  return (
    <div className="space-y-6">
      <section aria-labelledby="t-identidade" className={secao}>
        <h2 id="t-identidade" className={titulo}>Identificação</h2>
        <dl className="grid sm:grid-cols-2 gap-4">
          <Dado rotulo="Nome">{conta.nome}</Dado>
          <Dado rotulo="E-mail (login)">{conta.email}</Dado>
          <Dado rotulo="CPF">{conta.cpfMascarado}</Dado>
          {ehDocente && <Dado rotulo="SIAPE">{conta.siape}</Dado>}
          <Dado rotulo="Perfil">{conta.roles.map((r) => PAPEL[r] || r).join(', ')}</Dado>
        </dl>
        <p className="text-xs text-gray-600 mt-4">
          Nome, CPF e e-mail são conferidos com a matrícula ou o cadastro funcional. Para corrigi-los, fale com a secretaria do seu programa.
        </p>
        {vinculos.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Vínculos com programas</h3>
            <ul className="space-y-1.5">
              {vinculos.map((v, i) => (
                <li key={i} className="text-sm text-gray-800">
                  <strong>{v.programa.sigla && v.programa.sigla !== 'S/SIGLA' ? v.programa.sigla : v.programa.nome}</strong>
                  {' — '}{PAPEL_VINCULO[v.papel] || v.papel}
                  {!v.ativo && <span className="text-gray-500"> (encerrado)</span>}
                  {v.inicio && <span className="text-gray-500"> · desde {fmt(v.inicio)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <form onSubmit={salvar} aria-labelledby="t-contato" className={secao}>
        <h2 id="t-contato" className={titulo}>Contato e divulgação</h2>
        <fieldset className="mb-5">
          <legend className="text-sm font-medium text-gray-700 mb-1">Telefones</legend>
          <div className="space-y-2">
            {telefones.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Field label={`Telefone ${i + 1}`} ocultarRotulo className="flex-1">
                  <Input type="tel" autoComplete="tel" value={t} placeholder="(81) 90000-0000"
                    onChange={(e) => setTelefones((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} />
                </Field>
                {telefones.length > 1 && (
                  <button type="button" onClick={() => setTelefones((prev) => prev.filter((_, j) => j !== i))}
                    className="p-2 text-red-700 hover:bg-red-50 rounded-md" aria-label={`Remover telefone ${i + 1}`}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {telefones.length < 5 && (
            <button type="button" onClick={() => setTelefones((prev) => [...prev, ''])}
              className="mt-2 inline-flex items-center gap-1 text-sm text-ufrpe-blue hover:underline">
              <Plus size={14} aria-hidden="true" /> Adicionar telefone
            </button>
          )}
        </fieldset>

        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <Field label="Currículo Lattes (link)"><Input type="url" value={lattes} onChange={(e) => setLattes(e.target.value)} placeholder="http://lattes.cnpq.br/…" /></Field>
          <Field label="ORCID (link)"><Input type="url" value={orcid} onChange={(e) => setOrcid(e.target.value)} placeholder="https://orcid.org/…" /></Field>
          <Field label="Google Acadêmico (link)"><Input type="url" value={scholar} onChange={(e) => setScholar(e.target.value)} /></Field>
        </div>

        <fieldset className="mb-5">
          <legend className="text-sm font-medium text-gray-700 mb-1">O que pode aparecer no site do programa</legend>
          <div className="space-y-1">
            <Checkbox label="Mostrar meu e-mail" checked={priv.mostrarEmail} onChange={(e) => setPriv((p) => ({ ...p, mostrarEmail: e.target.checked }))} />
            <Checkbox label="Mostrar meu telefone" checked={priv.mostrarTelefone} onChange={(e) => setPriv((p) => ({ ...p, mostrarTelefone: e.target.checked }))} />
          </div>
        </fieldset>
        <button type="submit" disabled={salvando} className={botao}>{salvando ? 'Salvando…' : 'Salvar alterações'}</button>
      </form>

      <form onSubmit={trocarSenha} aria-labelledby="t-senha" className={secao}>
        <h2 id="t-senha" className={titulo}>Senha</h2>
        {erroSenha && <div role="alert" className="bg-red-50 text-red-800 p-3 rounded-lg mb-4 text-sm">{erroSenha}</div>}
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <Field label="Senha atual" required><Input type="password" autoComplete="current-password" value={senha.atual} onChange={(e) => setSenha((s) => ({ ...s, atual: e.target.value }))} /></Field>
          <Field label="Nova senha" required hint="Pelo menos 8 caracteres."><Input type="password" autoComplete="new-password" value={senha.nova} onChange={(e) => setSenha((s) => ({ ...s, nova: e.target.value }))} /></Field>
          <Field label="Confirme a nova senha" required><Input type="password" autoComplete="new-password" value={senha.confirma} onChange={(e) => setSenha((s) => ({ ...s, confirma: e.target.value }))} /></Field>
        </div>
        <button type="submit" disabled={trocando} className={botao}>{trocando ? 'Trocando…' : 'Trocar senha'}</button>
      </form>
      {Toasts}
    </div>
  );
}
