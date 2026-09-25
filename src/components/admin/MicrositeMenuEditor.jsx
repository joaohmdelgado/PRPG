import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Save, Undo2 } from 'lucide-react';
import { apiFetch } from '../../api';

// Editor do menu do microsite de um programa (Fase S.3): renomear, ocultar,
// reordenar e mudar item de grupo. O modelo é o mesmo para todos os programas
// (server/utils/micrositeMenu.js); o que se grava aqui são só as diferenças.
// Trabalha numa cópia e manda o menu inteiro ao salvar
// (PUT /api/programas/:id/menu).

const copiar = (menu) => (menu || []).map((e) => ({ ...e, itens: e.itens ? e.itens.map((i) => ({ ...i })) : undefined }));

const trocar = (lista, a, b) => {
  const out = [...lista];
  [out[a], out[b]] = [out[b], out[a]];
  return out;
};

const TIPO_VAZIO = {
  modulo: 'sem conteúdo — aparece quando houver',
  'pagina-fixa': 'página vazia — aparece quando tiver texto',
};

function Linha({ entrada, nivel, primeiro, ultimo, grupos, onChange, onMover, onGrupo }) {
  const fixo = entrada.fixo; // Início: só muda de nome
  const vazio = entrada.temConteudo === false;
  return (
    <div className={`flex flex-wrap items-center gap-2 py-2 ${nivel ? 'pl-6' : ''} ${entrada.oculto ? 'opacity-60' : ''}`}>
      <div className="flex flex-col">
        <button type="button" disabled={fixo || primeiro} onClick={() => onMover(-1)} aria-label={`Subir ${entrada.rotulo}`}
          className="p-0.5 text-gray-400 hover:text-ufrpe-blue disabled:opacity-30"><ArrowUp size={14} /></button>
        <button type="button" disabled={fixo || ultimo} onClick={() => onMover(1)} aria-label={`Descer ${entrada.rotulo}`}
          className="p-0.5 text-gray-400 hover:text-ufrpe-blue disabled:opacity-30"><ArrowDown size={14} /></button>
      </div>
      <input
        type="text"
        value={entrada.rotulo === entrada.rotuloPadrao ? '' : entrada.rotulo}
        placeholder={entrada.rotuloPadrao}
        maxLength={60}
        onChange={(e) => onChange({ rotulo: e.target.value.trim() ? e.target.value : entrada.rotuloPadrao })}
        aria-label={`Nome no menu para "${entrada.rotuloPadrao}"`}
        className={`border border-gray-200 rounded px-2 py-1 text-sm w-56 ${entrada.tipo === 'grupo' ? 'font-semibold' : ''}`}
      />
      {nivel > 0 && (
        <select
          value={entrada.grupo}
          onChange={(e) => onGrupo(e.target.value)}
          aria-label={`Grupo de "${entrada.rotulo}"`}
          className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-600"
        >
          {grupos.map((g) => <option key={g.chave} value={g.chave}>{g.rotulo}</option>)}
        </select>
      )}
      <button
        type="button"
        disabled={fixo}
        onClick={() => onChange({ oculto: !entrada.oculto })}
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border disabled:opacity-40 ${entrada.oculto ? 'border-gray-200 text-gray-500' : 'border-green-200 text-green-700 bg-green-50'}`}
        aria-pressed={!entrada.oculto}
      >
        {entrada.oculto ? <><EyeOff size={13} /> Oculto</> : <><Eye size={13} /> Visível</>}
      </button>
      {vazio && TIPO_VAZIO[entrada.tipo] && (
        <span className="text-xs text-gray-400">{TIPO_VAZIO[entrada.tipo]}</span>
      )}
      {entrada.tipo === 'pagina' && <span className="text-xs text-gray-400">página do programa</span>}
    </div>
  );
}

export default function MicrositeMenuEditor({ programaId }) {
  const [original, setOriginal] = useState(null);
  const [menu, setMenu] = useState(null);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);

  const aplicar = (dados) => { setOriginal(dados); setMenu(copiar(dados)); };

  useEffect(() => {
    apiFetch(`/api/programas/${programaId}/menu`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Não foi possível carregar o menu.');
        return r.json();
      })
      .then(aplicar)
      .catch((e) => setErro(e.message));
  }, [programaId]);

  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (!menu) return <p className="text-sm text-gray-400">Carregando o menu…</p>;

  const sujo = JSON.stringify(menu) !== JSON.stringify(original);
  const grupos = menu.filter((e) => e.tipo === 'grupo');

  const alterarTopo = (i, mudanca) => setMenu((m) => m.map((e, k) => (k === i ? { ...e, ...mudanca } : e)));
  const alterarItem = (gi, ii, mudanca) => setMenu((m) => m.map((e, k) => (k !== gi ? e
    : { ...e, itens: e.itens.map((it, j) => (j === ii ? { ...it, ...mudanca } : it)) })));
  const moverTopo = (i, d) => setMenu((m) => {
    const alvo = i + d;
    if (alvo < 1 || alvo >= m.length) return m; // Início fica em primeiro
    return trocar(m, i, alvo);
  });
  const moverItem = (gi, ii, d) => setMenu((m) => m.map((e, k) => {
    if (k !== gi) return e;
    const alvo = ii + d;
    return alvo < 0 || alvo >= e.itens.length ? e : { ...e, itens: trocar(e.itens, ii, alvo) };
  }));
  const mudarGrupo = (gi, ii, destino) => setMenu((m) => {
    const item = { ...m[gi].itens[ii], grupo: destino };
    return m.map((e, k) => {
      if (k === gi) return { ...e, itens: e.itens.filter((_, j) => j !== ii) };
      if (e.chave === destino) return { ...e, itens: [...e.itens, item] };
      return e;
    });
  });

  const salvar = async () => {
    setSalvando(true);
    setMsg(null);
    const itens = [];
    menu.forEach((e, i) => {
      itens.push({ chave: e.chave, rotulo: e.rotulo, ordem: i, oculto: !!e.oculto });
      (e.itens || []).forEach((it, j) => {
        itens.push({ chave: it.chave, rotulo: it.rotulo, grupo: e.chave, ordem: j, oculto: !!it.oculto });
      });
    });
    const r = await apiFetch(`/api/programas/${programaId}/menu`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
    });
    const dados = await r.json().catch(() => null);
    setSalvando(false);
    if (r.ok) { aplicar(dados); setMsg({ ok: true, texto: 'Menu salvo.' }); }
    else setMsg({ ok: false, texto: dados?.message || 'Não foi possível salvar o menu.' });
  };

  return (
    <div>
      <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg px-3">
        {menu.map((e, i) => (
          <div key={e.chave}>
            <Linha
              entrada={e}
              nivel={0}
              primeiro={i <= 1}
              ultimo={i === menu.length - 1}
              grupos={grupos}
              onChange={(mud) => alterarTopo(i, mud)}
              onMover={(d) => moverTopo(i, d)}
            />
            {e.itens && e.itens.length === 0 && (
              <p className="pl-6 pb-2 text-xs text-gray-400">Nenhum item neste grupo — ele fica fora do menu.</p>
            )}
            {e.itens && e.itens.map((it, j) => (
              <Linha
                key={it.chave}
                entrada={it}
                nivel={1}
                primeiro={j === 0}
                ultimo={j === e.itens.length - 1}
                grupos={grupos}
                onChange={(mud) => alterarItem(i, j, mud)}
                onMover={(d) => moverItem(i, j, d)}
                onGrupo={(destino) => mudarGrupo(i, j, destino)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={salvar}
          disabled={!sujo || salvando}
          className="inline-flex items-center gap-2 text-sm font-medium text-white bg-ufrpe-blue hover:bg-[#2a3a66] px-4 py-2 rounded-md disabled:opacity-50"
        >
          <Save size={15} /> {salvando ? 'Salvando…' : 'Salvar menu'}
        </button>
        {sujo && (
          <button type="button" onClick={() => setMenu(copiar(original))} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <Undo2 size={14} /> Desfazer
          </button>
        )}
        {msg && <span role="status" className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.texto}</span>}
      </div>
    </div>
  );
}
