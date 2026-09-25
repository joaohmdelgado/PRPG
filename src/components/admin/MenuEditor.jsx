import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, IndentIncrease, IndentDecrease, Save, Undo2 } from 'lucide-react';
import { apiFetch, urlMidia } from '../../api';
import MediaPicker from './MediaPicker';
import { recarregarPortal } from '../../hooks/usePortal';

// Editor de uma lista do portal (Fase H.1): o editor trabalha numa cópia da
// árvore e manda tudo de uma vez ao salvar (PUT /api/menus/:chave).
// `menu`: { chave, nome, descricao, niveis, campos, itens }.
// `destinos`: sugestões para o campo Destino ([{ valor, rotulo }]).

const novoItem = () => ({ rotulo: '', destino: '', descricao: '', icone: '', imagem: '', ativo: true, filhos: [] });

// Cópia só com os campos editáveis (o id do banco muda a cada gravação).
const copiar = (itens) => (itens || []).map((i) => ({
  rotulo: i.rotulo || '', destino: i.destino || '', descricao: i.descricao || '',
  icone: i.icone || '', imagem: i.imagem || '', ativo: i.ativo !== false,
  filhos: copiar(i.filhos),
}));

const trocar = (lista, a, b) => {
  const out = [...lista];
  [out[a], out[b]] = [out[b], out[a]];
  return out;
};

export default function MenuEditor({ menu, destinos = [], onSalvo }) {
  const [itens, setItens] = useState(() => copiar(menu.itens));
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);
  const original = JSON.stringify(copiar(menu.itens));
  const sujo = JSON.stringify(itens) !== original;
  const campos = new Set(menu.campos || []);
  const doisNiveis = menu.niveis === 2;

  useEffect(() => { setItens(copiar(menu.itens)); }, [menu]);

  // Operações pelo caminho [i] (primeiro nível) ou [i, j] (subitem).
  const alterar = (caminho, campo, valor) => setItens((atual) => atual.map((it, i) => {
    if (i !== caminho[0]) return it;
    if (caminho.length === 1) return { ...it, [campo]: valor };
    return { ...it, filhos: it.filhos.map((f, j) => (j === caminho[1] ? { ...f, [campo]: valor } : f)) };
  }));

  const mover = (caminho, delta) => setItens((atual) => {
    if (caminho.length === 1) {
      const alvo = caminho[0] + delta;
      return alvo < 0 || alvo >= atual.length ? atual : trocar(atual, caminho[0], alvo);
    }
    return atual.map((it, i) => {
      if (i !== caminho[0]) return it;
      const alvo = caminho[1] + delta;
      return alvo < 0 || alvo >= it.filhos.length ? it : { ...it, filhos: trocar(it.filhos, caminho[1], alvo) };
    });
  });

  const remover = (caminho) => setItens((atual) => (caminho.length === 1
    ? atual.filter((_, i) => i !== caminho[0])
    : atual.map((it, i) => (i === caminho[0] ? { ...it, filhos: it.filhos.filter((_, j) => j !== caminho[1]) } : it))));

  // Recuar: o item vira subitem do item de cima (só itens sem subitens).
  const recuar = (i) => setItens((atual) => {
    if (i === 0 || atual[i].filhos.length) return atual;
    const out = atual.filter((_, k) => k !== i);
    out[i - 1] = { ...out[i - 1], filhos: [...out[i - 1].filhos, { ...atual[i], filhos: [] }] };
    return out;
  });

  // Avançar: o subitem sai do grupo e vira item logo depois dele.
  const avancar = ([i, j]) => setItens((atual) => {
    const filho = atual[i].filhos[j];
    const out = atual.map((it, k) => (k === i ? { ...it, filhos: it.filhos.filter((_, m) => m !== j) } : it));
    out.splice(i + 1, 0, { ...filho, filhos: [] });
    return out;
  });

  const adicionarFilho = (i) => setItens((atual) => atual.map((it, k) => (k === i ? { ...it, filhos: [...it.filhos, novoItem()] } : it)));

  const salvar = async () => {
    setSalvando(true);
    setMsg(null);
    try {
      const r = await apiFetch(`/api/menus/${menu.chave}`, { method: 'PUT', json: { itens } });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corpo.message || 'Não foi possível salvar.');
      setMsg({ tipo: 'ok', texto: 'Salvo — o site já mostra a nova versão.' });
      recarregarPortal();
      onSalvo?.();
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e.message });
    } finally {
      setSalvando(false);
    }
  };

  const idBase = `menu-${menu.chave}`;
  const botaoIcone = 'p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent';

  const linha = (item, caminho, total) => {
    const id = `${idBase}-${caminho.join('-')}`;
    const pos = caminho[caminho.length - 1];
    return (
      <div className={`p-3 rounded-lg border ${item.ativo ? 'border-gray-200 bg-white' : 'border-dashed border-gray-300 bg-gray-50'}`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label htmlFor={`${id}-rotulo`} className="block text-xs font-medium text-gray-600 mb-1">Rótulo</label>
            <input id={`${id}-rotulo`} value={item.rotulo} onChange={(e) => alterar(caminho, 'rotulo', e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm" />
          </div>
          <div className="flex-[2] min-w-[220px]">
            <label htmlFor={`${id}-destino`} className="block text-xs font-medium text-gray-600 mb-1">
              Destino {doisNiveis && caminho.length === 1 && <span className="font-normal text-gray-400">(vazio = só agrupa)</span>}
            </label>
            <input id={`${id}-destino`} value={item.destino} list={`${idBase}-destinos`}
              onChange={(e) => alterar(caminho, 'destino', e.target.value)}
              placeholder="/editais, /sobre ou https://..."
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm font-mono" />
          </div>
          {campos.has('icone') && (
            <div className="min-w-[180px]">
              <label htmlFor={`${id}-icone`} className="block text-xs font-medium text-gray-600 mb-1">
                Ícone <a href="https://fontawesome.com/search?o=r&m=free" target="_blank" rel="noopener noreferrer" className="text-ufrpe-blue underline font-normal">(catálogo)</a>
              </label>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-ufrpe-blue shrink-0" aria-hidden="true">
                  <i className={item.icone || 'fa-solid fa-link'}></i>
                </span>
                <input id={`${id}-icone`} value={item.icone} onChange={(e) => alterar(caminho, 'icone', e.target.value)}
                  placeholder="fa-solid fa-gavel" className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm font-mono" />
              </div>
            </div>
          )}
          <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-1.5">
            <input type="checkbox" checked={item.ativo} onChange={(e) => alterar(caminho, 'ativo', e.target.checked)} />
            Visível
          </label>
          <div className="flex items-center gap-0.5 pb-0.5">
            <button type="button" className={botaoIcone} onClick={() => mover(caminho, -1)} disabled={pos === 0} aria-label={`Subir "${item.rotulo}"`}><ArrowUp size={16} /></button>
            <button type="button" className={botaoIcone} onClick={() => mover(caminho, 1)} disabled={pos === total - 1} aria-label={`Descer "${item.rotulo}"`}><ArrowDown size={16} /></button>
            {doisNiveis && caminho.length === 1 && (
              <button type="button" className={botaoIcone} onClick={() => recuar(caminho[0])} disabled={pos === 0 || item.filhos.length > 0}
                aria-label={`Tornar "${item.rotulo}" subitem do item de cima`} title="Tornar subitem do item de cima"><IndentIncrease size={16} /></button>
            )}
            {caminho.length === 2 && (
              <button type="button" className={botaoIcone} onClick={() => avancar(caminho)}
                aria-label={`Tirar "${item.rotulo}" do grupo`} title="Tirar do grupo"><IndentDecrease size={16} /></button>
            )}
            <button type="button" className={`${botaoIcone} hover:text-red-600`} onClick={() => remover(caminho)} aria-label={`Remover "${item.rotulo}"`}><Trash2 size={16} /></button>
          </div>
        </div>
        {campos.has('descricao') && (
          <div className="mt-2">
            <label htmlFor={`${id}-descricao`} className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
            <textarea id={`${id}-descricao`} rows={2} value={item.descricao} onChange={(e) => alterar(caminho, 'descricao', e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm" />
          </div>
        )}
        {campos.has('imagem') && (
          <div className="mt-2 flex flex-wrap items-end gap-3">
            {item.imagem && <img src={urlMidia(item.imagem)} alt="" className="h-12 w-20 object-contain bg-gray-50 rounded border border-gray-100" />}
            <div className="flex-1 min-w-[240px]">
              <label htmlFor={`${id}-imagem`} className="block text-xs font-medium text-gray-600 mb-1">Imagem</label>
              <input id={`${id}-imagem`} value={item.imagem} onChange={(e) => alterar(caminho, 'imagem', e.target.value)}
                placeholder="/uploads/... ou https://..." className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm font-mono" />
            </div>
            <MediaPicker tipo="imagem" onEscolher={(a) => alterar(caminho, 'imagem', a.url)} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {menu.descricao && <p className="text-sm text-gray-500 mb-4">{menu.descricao}</p>}
      <datalist id={`${idBase}-destinos`}>
        {destinos.map((d) => <option key={d.valor} value={d.valor}>{d.rotulo}</option>)}
      </datalist>

      <ol className="space-y-3">
        {itens.map((item, i) => (
          <li key={i}>
            {linha(item, [i], itens.length)}
            {doisNiveis && (
              <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-100 pl-4">
                <ol className="space-y-2">
                  {item.filhos.map((f, j) => <li key={j}>{linha(f, [i, j], item.filhos.length)}</li>)}
                </ol>
                <button type="button" onClick={() => adicionarFilho(i)} className="inline-flex items-center gap-1 text-xs text-ufrpe-blue hover:underline">
                  <Plus size={14} /> Subitem em "{item.rotulo || 'sem rótulo'}"
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button type="button" onClick={() => setItens((a) => [...a, novoItem()])}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
          <Plus size={16} /> Adicionar item
        </button>
        <span className="flex-1" />
        {sujo && <span className="text-xs font-medium text-amber-700">● Alterações não salvas</span>}
        <button type="button" onClick={() => setItens(copiar(menu.itens))} disabled={!sujo || salvando}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40">
          <Undo2 size={16} /> Descartar
        </button>
        <button type="button" onClick={salvar} disabled={!sujo || salvando}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-ufrpe-blue text-white rounded-md hover:bg-ufrpe-blue/90 disabled:opacity-40">
          <Save size={16} /> {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
      {msg && <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`mt-3 text-sm ${msg.tipo === 'erro' ? 'text-red-700' : 'text-green-700'}`}>{msg.texto}</p>}
    </div>
  );
}
