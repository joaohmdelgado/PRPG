import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Save, Trash2, UserMinus, ExternalLink } from 'lucide-react';
import { apiFetch, urlMidia } from '../../api';
import MediaPicker from '../../components/admin/MediaPicker';
import { useConfirm } from '../../components/admin/ConfirmModal';

// "Equipe e estrutura" (Fase H.4): setores da PRPG, quem está em cada um e os
// contatos públicos — alimenta as páginas Equipe e Estrutura Organizacional.

const TIPOS = [
  ['EMAIL', 'E-mail'], ['TELEFONE', 'Telefone'], ['CELULAR', 'Celular'], ['WHATSAPP', 'WhatsApp'],
  ['RAMAL', 'Ramal'], ['SITE', 'Site'], ['ENDERECO', 'Endereço'], ['INSTAGRAM', 'Instagram'],
];
const PAPEIS = [
  ['PRO_REITOR', 'Pró-Reitor(a)'], ['COORDENADOR', 'Coordenador(a)'], ['VICE_COORDENADOR', 'Vice-coordenador(a)'],
  ['SECRETARIO', 'Secretário(a)'], ['SERVIDOR', 'Servidor(a)'], ['SUBSTITUTO_EVENTUAL', 'Substituto eventual'],
];
const campo = 'px-2.5 py-1.5 border border-gray-300 rounded-md text-sm';

// Contatos em edição: [{ tipo, valor, publico }].
const paraEdicao = (contatos) => (contatos || []).map((c) => ({ tipo: c.tipo, valor: c.exibicao || c.valor, publico: c.publico !== false }));

function ContatosEditor({ id, contatos, onChange }) {
  const set = (i, k, v) => onChange(contatos.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  return (
    <fieldset>
      <legend className="text-xs font-medium text-gray-600 mb-1">Contatos</legend>
      <ul className="space-y-2">
        {contatos.map((c, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <select aria-label="Tipo" value={c.tipo} onChange={(e) => set(i, 'tipo', e.target.value)} className={`${campo} bg-white`}>
              {TIPOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
            <input aria-label="Valor" value={c.valor} onChange={(e) => set(i, 'valor', e.target.value)} className={`${campo} flex-1 min-w-[200px]`} />
            <label className="text-xs text-gray-600 flex items-center gap-1">
              <input type="checkbox" checked={c.publico} onChange={(e) => set(i, 'publico', e.target.checked)} /> No site
            </label>
            <button type="button" onClick={() => onChange(contatos.filter((_, j) => j !== i))} aria-label="Remover contato" className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...contatos, { tipo: 'EMAIL', valor: '', publico: true }])}
        className="mt-2 inline-flex items-center gap-1 text-xs text-ufrpe-blue hover:underline" id={`${id}-add-contato`}>
        <Plus size={13} /> Contato
      </button>
    </fieldset>
  );
}

function MembroEditor({ membro, primeiro, ultimo, onMover, onSalvar, onEncerrar }) {
  const [m, setM] = useState(() => ({ papel: membro.papel, funcao: membro.funcaoPropria || '', foto: membro.foto || '', contatos: paraEdicao(membro.contatos) }));
  const id = `membro-${membro.id}`;
  return (
    <li className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex flex-wrap items-start gap-3">
        {m.foto
          ? <img src={urlMidia(m.foto)} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
          : <span className="w-12 h-12 rounded-lg bg-gray-100" aria-hidden="true"></span>}
        <div className="flex-1 min-w-[220px] space-y-2">
          <p className="font-semibold text-gray-800">{membro.nome}</p>
          <div className="flex flex-wrap gap-2">
            <select aria-label={`Papel de ${membro.nome}`} value={m.papel} onChange={(e) => setM({ ...m, papel: e.target.value })} className={`${campo} bg-white`}>
              {PAPEIS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
            <input aria-label={`Função exibida de ${membro.nome}`} placeholder="Função exibida (ex.: Secretária)" value={m.funcao}
              onChange={(e) => setM({ ...m, funcao: e.target.value })} className={`${campo} flex-1 min-w-[180px]`} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input aria-label={`Foto de ${membro.nome}`} placeholder="Foto: /uploads/... ou https://..." value={m.foto}
              onChange={(e) => setM({ ...m, foto: e.target.value })} className={`${campo} flex-1 min-w-[220px] font-mono`} />
            <MediaPicker tipo="imagem" onEscolher={(a) => setM({ ...m, foto: a.url })} />
          </div>
          <ContatosEditor id={id} contatos={m.contatos} onChange={(contatos) => setM({ ...m, contatos })} />
        </div>
        <div className="flex flex-col gap-1 items-end">
          <div className="flex">
            <button type="button" onClick={() => onMover(-1)} disabled={primeiro} aria-label={`Subir ${membro.nome}`} className="p-1.5 text-gray-500 disabled:opacity-30"><ArrowUp size={16} /></button>
            <button type="button" onClick={() => onMover(1)} disabled={ultimo} aria-label={`Descer ${membro.nome}`} className="p-1.5 text-gray-500 disabled:opacity-30"><ArrowDown size={16} /></button>
          </div>
          <button type="button" onClick={() => onSalvar(m)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-ufrpe-blue text-white rounded-md"><Save size={14} /> Salvar</button>
          <button type="button" onClick={onEncerrar} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-700 border border-red-200 rounded-md hover:bg-red-50"><UserMinus size={14} /> Retirar do setor</button>
        </div>
      </div>
    </li>
  );
}

function UnidadeEditor({ unidade, raiz, chamar }) {
  const [u, setU] = useState(() => ({
    nome: unidade.nome, sigla: unidade.sigla || '', descricao: unidade.descricao || '', ordem: unidade.ordem ?? 0,
    exibirNoSite: unidade.exibirNoSite, contatos: paraEdicao(unidade.contatos),
  }));
  const [novo, setNovo] = useState({ nome: '', papel: 'SERVIDOR', funcao: '' });
  const { confirm, ConfirmModal } = useConfirm();
  const id = `setor-${unidade.id}`;

  const moverMembro = async (i, delta) => {
    const lista = [...unidade.membros];
    const j = i + delta;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    for (const [ordem, mb] of lista.entries()) {
      if (mb.ordem !== ordem) await chamar(`/api/estrutura/membros/${mb.id}`, 'PUT', { ordem }, null);
    }
    await chamar(null);
  };

  return (
    <section className={`rounded-xl border ${u.exibirNoSite ? 'border-gray-200' : 'border-dashed border-gray-300'} bg-gray-50/50 p-5`} aria-labelledby={`${id}-t`}>
      <ConfirmModal />
      <h3 id={`${id}-t`} className="font-bold text-gray-800 mb-3">{unidade.nome} {!u.exibirNoSite && <span className="text-xs font-normal text-gray-500">(fora do site)</span>}</h3>
      <div className="grid md:grid-cols-4 gap-3">
        <label className="md:col-span-2 text-xs font-medium text-gray-600">Nome
          <input value={u.nome} onChange={(e) => setU({ ...u, nome: e.target.value })} className={`${campo} w-full mt-1`} />
        </label>
        <label className="text-xs font-medium text-gray-600">Sigla
          <input value={u.sigla} onChange={(e) => setU({ ...u, sigla: e.target.value })} className={`${campo} w-full mt-1`} />
        </label>
        <label className="text-xs font-medium text-gray-600">Posição
          <input type="number" value={u.ordem} onChange={(e) => setU({ ...u, ordem: Number.parseInt(e.target.value, 10) || 0 })} className={`${campo} w-full mt-1`} />
        </label>
        <label className="md:col-span-4 text-xs font-medium text-gray-600">Descrição (aparece no organograma)
          <textarea rows={2} value={u.descricao} onChange={(e) => setU({ ...u, descricao: e.target.value })} className={`${campo} w-full mt-1`} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <ContatosEditor id={id} contatos={u.contatos} onChange={(contatos) => setU({ ...u, contatos })} />
        <div className="flex items-center gap-3">
          {!raiz && (
            <label className="text-sm text-gray-700 flex items-center gap-1.5">
              <input type="checkbox" checked={u.exibirNoSite} onChange={(e) => setU({ ...u, exibirNoSite: e.target.checked })} /> Mostrar no site
            </label>
          )}
          <button type="button" onClick={() => chamar(`/api/estrutura/unidades/${unidade.id}`, 'PUT', u, 'Setor salvo.')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-ufrpe-blue text-white rounded-md"><Save size={15} /> Salvar setor</button>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-gray-700 mt-5 mb-2">Pessoas</h4>
      <ul className="space-y-2">
        {unidade.membros.map((mb, i) => (
          <MembroEditor
            key={`${mb.id}-${mb.ordem}`} membro={mb} primeiro={i === 0} ultimo={i === unidade.membros.length - 1}
            onMover={(d) => moverMembro(i, d)}
            onSalvar={(dados) => chamar(`/api/estrutura/membros/${mb.id}`, 'PUT', dados, 'Pessoa salva.')}
            onEncerrar={async () => {
              if (await confirm(`Retirar ${mb.nome} de "${unidade.nome}"? A pessoa sai do site; o histórico fica guardado.`)) {
                chamar(`/api/estrutura/membros/${mb.id}`, 'DELETE', undefined, 'Pessoa retirada do setor.');
              }
            }}
          />
        ))}
      </ul>
      <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(e) => {
        e.preventDefault();
        if (!novo.nome.trim()) return;
        chamar(`/api/estrutura/unidades/${unidade.id}/membros`, 'POST', { ...novo, ordem: unidade.membros.length }, 'Pessoa adicionada.')
          .then((ok) => { if (ok) setNovo({ nome: '', papel: 'SERVIDOR', funcao: '' }); });
      }}>
        <input aria-label="Nome da nova pessoa" placeholder="Nome completo" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} className={`${campo} flex-1 min-w-[200px]`} />
        <select aria-label="Papel da nova pessoa" value={novo.papel} onChange={(e) => setNovo({ ...novo, papel: e.target.value })} className={`${campo} bg-white`}>
          {PAPEIS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <input aria-label="Função exibida da nova pessoa" placeholder="Função exibida" value={novo.funcao} onChange={(e) => setNovo({ ...novo, funcao: e.target.value })} className={campo} />
        <button type="submit" className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-white"><Plus size={15} /> Adicionar pessoa</button>
      </form>
    </section>
  );
}

export default function AdminEstrutura() {
  const [raiz, setRaiz] = useState(null);
  const [msg, setMsg] = useState(null);
  const [novoSetor, setNovoSetor] = useState('');
  const [versao, setVersao] = useState(0); // remonta os editores após salvar

  const carregar = useCallback(async () => {
    const r = await apiFetch('/api/estrutura?todos=1');
    if (r.ok) { setRaiz(await r.json()); setVersao((v) => v + 1); } else setMsg({ tipo: 'erro', texto: 'Não foi possível carregar a estrutura.' });
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // Chama a API e atualiza a tela com a árvore devolvida. path=null só recarrega.
  const chamar = async (path, method, json, sucesso) => {
    if (!path) { await carregar(); return true; }
    const r = await apiFetch(path, { method, json });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg({ tipo: 'erro', texto: corpo.message || 'Não foi possível salvar.' }); return false; }
    if (sucesso !== null) {
      setRaiz(corpo);
      setVersao((v) => v + 1);
      if (sucesso) setMsg({ tipo: 'ok', texto: sucesso });
    }
    return true;
  };

  const setores = raiz ? [raiz, ...raiz.filhos.flatMap((f) => [f, ...(f.filhos || [])])] : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-2">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin" aria-label="Voltar" className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">Equipe e estrutura</h2>
          <p className="text-sm text-gray-500">Setores da PRPG, quem está em cada um e os contatos — alimentam as páginas Equipe e Estrutura Organizacional.</p>
        </div>
        <a href="/equipe" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-ufrpe-blue hover:underline">Ver no site <ExternalLink size={14} /></a>
      </div>
      {msg && <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`mb-4 text-sm ${msg.tipo === 'erro' ? 'text-red-700' : 'text-green-700'}`}>{msg.texto}</p>}
      <div className="space-y-5" key={versao}>
        {setores.map((s) => <UnidadeEditor key={s.id} unidade={s} raiz={s.id === raiz.id} chamar={chamar} />)}
      </div>
      {raiz && (
        <form className="mt-6 flex flex-wrap gap-2 items-center" onSubmit={(e) => {
          e.preventDefault();
          if (novoSetor.trim()) chamar('/api/estrutura/unidades', 'POST', { nome: novoSetor.trim() }, 'Setor criado.').then((ok) => ok && setNovoSetor(''));
        }}>
          <input aria-label="Nome do novo setor" placeholder="Nome do novo setor" value={novoSetor} onChange={(e) => setNovoSetor(e.target.value)} className={`${campo} flex-1 min-w-[240px]`} />
          <button type="submit" className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"><Plus size={15} /> Novo setor</button>
        </form>
      )}
    </div>
  );
}
