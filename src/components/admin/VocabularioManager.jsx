import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Check, X, Pencil } from 'lucide-react';
import { apiFetch } from '../../api';
import useVocabulario, { PALETA_SELOS } from '../../hooks/useVocabulario';
import { useConfirm } from './ConfirmModal';

// Edição de um domínio de vocabulário (Fase F.4): criar, renomear (o rótulo
// novo é propagado ao conteúdo pelo servidor), reordenar, ativar/desativar e
// excluir (em uso: o servidor só desativa). O `valor` gravado no conteúdo
// nunca muda.
// `comCor`: o domínio tem selo colorido no site (categoria de notícia).
export default function VocabularioManager({ dominio, descricao, placeholder = 'Novo item', comCor = false }) {
  const { itens, carregando, recarregar } = useVocabulario(dominio, { todos: true });
  const [novo, setNovo] = useState('');
  const [editando, setEditando] = useState(null); // { id, rotulo }
  const [mensagem, setMensagem] = useState(null); // { tipo: 'ok'|'erro', texto }
  const { confirm, ConfirmModal } = useConfirm();

  const avisar = (tipo, texto) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem(null), 4000);
  };

  const chamar = async (path, opcoes, sucesso) => {
    const r = await apiFetch(path, opcoes);
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) return avisar('erro', corpo.message || 'Não foi possível salvar.');
    await recarregar();
    avisar('ok', corpo.message || sucesso);
  };

  const criar = async (e) => {
    e.preventDefault();
    if (!novo.trim()) return;
    await chamar('/api/vocabularios', { method: 'POST', json: { dominio, rotulo: novo.trim() } }, 'Item criado.');
    setNovo('');
  };

  const salvarRotulo = async () => {
    const atual = itens.find((v) => v.id === editando.id);
    if (!editando.rotulo.trim() || editando.rotulo.trim() === atual?.rotulo) return setEditando(null);
    const emUso = atual?.emUso || 0;
    if (emUso > 0 && !await confirm(`Renomear para "${editando.rotulo.trim()}"? O novo nome aparece nos ${emUso} item(ns) que já usam esta classificação.`)) return;
    await chamar(`/api/vocabularios/${editando.id}`, { method: 'PUT', json: { rotulo: editando.rotulo.trim() } }, 'Renomeado.');
    setEditando(null);
  };

  // Troca a ordem com o vizinho (as ordens são normalizadas para 0..n-1).
  const mover = async (indice, delta) => {
    const alvo = indice + delta;
    if (alvo < 0 || alvo >= itens.length) return;
    const lista = [...itens];
    [lista[indice], lista[alvo]] = [lista[alvo], lista[indice]];
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].ordem !== i) {
        await apiFetch(`/api/vocabularios/${lista[i].id}`, { method: 'PUT', json: { ordem: i } });
      }
    }
    await recarregar();
  };

  const mudarCor = (v, cor) => chamar(`/api/vocabularios/${v.id}`, { method: 'PUT', json: { cor } }, 'Cor atualizada.');

  const alternarAtivo = (v) => chamar(`/api/vocabularios/${v.id}`, { method: 'PUT', json: { ativo: !v.ativo } }, v.ativo ? 'Desativado.' : 'Reativado.');

  const excluir = async (v) => {
    const aviso = v.emUso > 0
      ? `"${v.rotulo}" é usado por ${v.emUso} item(ns). Ele será desativado (some das opções, mas os itens antigos continuam classificados).`
      : `Excluir "${v.rotulo}"?`;
    if (!await confirm(aviso)) return;
    await chamar(`/api/vocabularios/${v.id}`, { method: 'DELETE' }, 'Excluído.');
  };

  return (
    <div>
      {descricao && <p className="text-sm text-gray-500 mb-4">{descricao}</p>}

      <form onSubmit={criar} className="flex gap-2 mb-4">
        <label htmlFor={`novo-${dominio}`} className="sr-only">{placeholder}</label>
        <input
          id={`novo-${dominio}`}
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-ufrpe-yellow focus:border-ufrpe-yellow"
        />
        <button type="submit" className="bg-ufrpe-blue text-white px-4 py-2 rounded-md text-sm flex items-center gap-1.5 hover:bg-[#2a3a66]">
          <Plus size={16} aria-hidden="true" /> Adicionar
        </button>
      </form>

      {mensagem && (
        <p role="status" className={`text-sm mb-3 ${mensagem.tipo === 'erro' ? 'text-red-600' : 'text-green-700'}`}>{mensagem.texto}</p>
      )}

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum item cadastrado.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md">
          {itens.map((v, i) => (
            <li key={v.id} className={`flex items-center gap-3 px-3 py-2 ${v.ativo ? '' : 'bg-gray-50 text-gray-400'}`}>
              <div className="flex flex-col">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${v.rotulo}`} className="text-gray-400 hover:text-ufrpe-blue disabled:opacity-30"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === itens.length - 1} aria-label={`Descer ${v.rotulo}`} className="text-gray-400 hover:text-ufrpe-blue disabled:opacity-30"><ArrowDown size={14} /></button>
              </div>
              <div className="flex-1 min-w-0">
                {editando?.id === v.id ? (
                  <div className="flex gap-2">
                    <label htmlFor={`edit-${v.id}`} className="sr-only">Novo nome</label>
                    <input
                      id={`edit-${v.id}`}
                      autoFocus
                      value={editando.rotulo}
                      onChange={(e) => setEditando({ ...editando, rotulo: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); salvarRotulo(); } if (e.key === 'Escape') setEditando(null); }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button type="button" onClick={salvarRotulo} aria-label="Salvar nome" className="text-green-700"><Check size={16} /></button>
                    <button type="button" onClick={() => setEditando(null)} aria-label="Cancelar" className="text-gray-500"><X size={16} /></button>
                  </div>
                ) : (
                  <span className="text-sm">
                    {v.rotulo}
                    {!v.ativo && <span className="ml-2 text-[10px] uppercase font-semibold">inativo</span>}
                    <span className="ml-2 text-xs text-gray-400">{v.emUso ? `${v.emUso} em uso` : 'sem uso'}</span>
                  </span>
                )}
              </div>
              {editando?.id !== v.id && (
                <div className="flex items-center gap-3">
                  {comCor && (
                    <>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${v.cor || 'bg-gray-600 text-white'}`}>{v.rotulo}</span>
                      <label htmlFor={`cor-${v.id}`} className="sr-only">Cor do selo de {v.rotulo}</label>
                      <select id={`cor-${v.id}`} value={v.cor || ''} onChange={(e) => mudarCor(v, e.target.value)} className="text-xs border border-gray-300 rounded px-1 py-0.5">
                        <option value="">Padrão</option>
                        {PALETA_SELOS.map((p) => <option key={p.cor} value={p.cor}>{p.nome}</option>)}
                      </select>
                    </>
                  )}
                  <button type="button" onClick={() => setEditando({ id: v.id, rotulo: v.rotulo })} aria-label={`Renomear ${v.rotulo}`} className="text-ufrpe-blue hover:text-ufrpe-yellow"><Pencil size={16} /></button>
                  <button type="button" onClick={() => alternarAtivo(v)} className="text-xs text-gray-500 hover:text-ufrpe-blue underline">{v.ativo ? 'Desativar' : 'Reativar'}</button>
                  <button type="button" onClick={() => excluir(v)} aria-label={`Excluir ${v.rotulo}`} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {ConfirmModal}
    </div>
  );
}
