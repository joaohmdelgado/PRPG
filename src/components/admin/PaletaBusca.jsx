import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Plus, Search } from 'lucide-react';
import { lerJson } from '../../api';
import Dialog from '../ui/Dialog';
import { Carregando, EstadoErro } from '../ui/Estados';
import { destinosDoPainel } from './menuPainel';

// Busca do painel (Ctrl+K — Fase U.5). Uma caixa que faz três coisas:
//   Ir para  → as telas do painel (o menu, sem precisar abrir grupos)
//   Criar    → atalhos para os formulários de "novo"
//   Encontrar→ o que já existe: /api/busca (notícias, editais, resoluções,
//              formulários, páginas, programas, teses, FAQ, disciplinas, bolsas,
//              usuários, processos da Câmara, expedientes e estágios pós-doc)
// Padrão "combobox" com lista: setas movem, Enter abre, Escape fecha.

const CRIAR = [
  { to: '/admin/noticias/nova', label: 'Nova notícia', papeis: 'todos' },
  { to: '/admin/editais/novo', label: 'Novo edital', papeis: 'todos' },
  { to: '/admin/paginas/nova', label: 'Nova página', papeis: 'todos' },
  { to: '/admin/resolucoes/nova', label: 'Nova resolução', papeis: 'todos' },
  { to: '/admin/formularios/novo', label: 'Novo formulário', papeis: 'todos' },
  { to: '/admin/camara/novo', label: 'Novo processo da Câmara', papeis: 'prpg' },
  { to: '/admin/atos/novo', label: 'Novo expediente', papeis: 'prpg' },
  { to: '/admin/users/novo', label: 'Novo usuário', papeis: 'todos' },
];

// Grupos que /api/busca devolve: chave → { rótulo, rota do item }.
export const GRUPOS_BUSCA = {
  noticias: { rotulo: 'Notícias', rota: (i) => `/admin/noticias/editar/${i.id}` },
  editais: { rotulo: 'Editais', rota: (i) => `/admin/editais/editar/${i.id}` },
  resolucoes: { rotulo: 'Resoluções', rota: (i) => `/admin/resolucoes/editar/${i.id}` },
  formularios: { rotulo: 'Formulários', rota: (i) => `/admin/formularios/editar/${i.id}` },
  paginas: { rotulo: 'Páginas', rota: (i) => `/admin/paginas/editar/${i.id}` },
  programas: { rotulo: 'Programas', rota: (i) => `/admin/programas/editar/${i.id}` },
  teses: { rotulo: 'Teses e dissertações', rota: (i) => `/admin/teses-dissertacoes/editar/${i.id}` },
  faq: { rotulo: 'FAQ', rota: (i) => `/admin/faq/editar/${i.id}` },
  disciplinas: { rotulo: 'Disciplinas', rota: (i) => `/admin/disciplinas/editar/${i.id}` },
  bolsas: { rotulo: 'Bolsas', rota: (i) => `/admin/bolsas/editar/${i.id}` },
  usuarios: { rotulo: 'Usuários', rota: (i) => `/admin/users/editar/${i.id}` },
  processos: { rotulo: 'Processos da Câmara', rota: (i) => `/admin/camara/${i.id}` },
  atos: { rotulo: 'Expedientes', rota: (i) => `/admin/atos/${i.id}` },
  posDoutorado: { rotulo: 'Pós-doutorado', rota: (i) => `/admin/pos-doutorado/${i.id}` },
};

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Monta a lista plana de opções a partir do texto e da resposta do servidor.
export function montarOpcoes({ texto, destinos, resposta, superAdmin }) {
  const t = semAcento(texto).trim();
  const bate = (s) => !t || semAcento(s).includes(t);
  const secoes = [];

  const irPara = destinos.filter((d) => bate(d.label) || bate(d.grupo)).slice(0, t ? 6 : 8)
    .map((d) => ({ id: `ir-${d.to}`, rotulo: d.label, detalhe: d.grupo, to: d.to }));
  if (irPara.length) secoes.push({ chave: 'ir', rotulo: 'Ir para', itens: irPara });

  if (t) {
    const criar = CRIAR.filter((c) => (c.papeis === 'todos' || superAdmin) && bate(c.label))
      .map((c) => ({ id: `criar-${c.to}`, rotulo: c.label, detalhe: 'Criar', to: c.to, criar: true }));
    if (criar.length) secoes.push({ chave: 'criar', rotulo: 'Criar', itens: criar });
  }

  for (const [chave, def] of Object.entries(GRUPOS_BUSCA)) {
    const itens = (resposta?.[chave] || []).map((i) => ({
      id: `${chave}-${i.id}`,
      rotulo: i.titulo || i.nome || i.assunto || i.numeroExibicao || i.numero || i.id,
      detalhe: i.detalhe || i.numeroExibicao || i.numero || i.situacao || '',
      status: i.status,
      to: def.rota(i),
    }));
    if (itens.length) secoes.push({ chave, rotulo: def.rotulo, itens });
  }
  return secoes;
}

export default function PaletaBusca({ aberta, onFechar, perfil }) {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [ativo, setAtivo] = useState(0);
  const [estado, setEstado] = useState({ resposta: null, carregando: false, erro: null });
  const listaId = useId();
  const contador = useRef(0);

  const destinos = useMemo(() => destinosDoPainel(perfil), [perfil]);

  // Consulta o servidor quando a pessoa para de digitar (mínimo 2 letras).
  useEffect(() => {
    if (!aberta) return undefined;
    const t = texto.trim();
    if (t.length < 2) { setEstado({ resposta: null, carregando: false, erro: null }); return undefined; }
    const minha = ++contador.current;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    const espera = setTimeout(() => {
      lerJson(`/api/busca?q=${encodeURIComponent(t)}`)
        .then((resposta) => { if (minha === contador.current) setEstado({ resposta, carregando: false, erro: null }); })
        .catch((erro) => { if (minha === contador.current) setEstado({ resposta: null, carregando: false, erro }); });
    }, 250);
    return () => { clearTimeout(espera); contador.current += 1; };
  }, [texto, aberta]);

  useEffect(() => { if (!aberta) { setTexto(''); setAtivo(0); setEstado({ resposta: null, carregando: false, erro: null }); } }, [aberta]);

  const secoes = useMemo(
    () => montarOpcoes({ texto, destinos, resposta: estado.resposta, superAdmin: perfil.superAdmin }),
    [texto, destinos, estado.resposta, perfil.superAdmin]
  );
  const opcoes = useMemo(() => secoes.flatMap((s) => s.itens), [secoes]);
  useEffect(() => { setAtivo(0); }, [texto, estado.resposta]);

  const abrir = (op) => { onFechar(); navigate(op.to); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => Math.min(a + 1, opcoes.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setAtivo(0); }
    else if (e.key === 'End') { e.preventDefault(); setAtivo(Math.max(opcoes.length - 1, 0)); }
    else if (e.key === 'Enter' && opcoes[ativo]) { e.preventDefault(); abrir(opcoes[ativo]); }
  };

  // A opção ativa acompanha o teclado dentro da lista com rolagem.
  useEffect(() => {
    document.getElementById(`${listaId}-op-${ativo}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [ativo, listaId]);

  const buscando = texto.trim().length >= 2;
  const resumo = estado.carregando ? 'Buscando…' : `${opcoes.length} ${opcoes.length === 1 ? 'resultado' : 'resultados'}`;
  let indice = -1;

  return (
    <Dialog aberto={aberta} onFechar={onFechar} titulo="Buscar no painel" tamanho="lg" inicial="#paleta-busca-campo">
      <div className="relative mb-3">
        <label htmlFor="paleta-busca-campo" className="sr-only">Buscar telas, conteúdo, processos, pessoas…</label>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          id="paleta-busca-campo" type="text" role="combobox" autoComplete="off" value={texto}
          onChange={(e) => setTexto(e.target.value)} onKeyDown={onKeyDown}
          aria-expanded="true" aria-haspopup="listbox" aria-controls={listaId} aria-autocomplete="list"
          aria-activedescendant={opcoes[ativo] ? `${listaId}-op-${ativo}` : undefined}
          placeholder="Buscar telas, conteúdo, processos, pessoas…"
          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none"
        />
      </div>
      <p className="sr-only" role="status" aria-live="polite">{resumo}</p>

      {estado.erro && <EstadoErro erro={estado.erro} titulo="A busca não respondeu." onTentar={() => setTexto((t) => `${t} `.trimEnd())} className="py-6" />}
      {estado.carregando && !estado.resposta && <Carregando texto="Buscando…" className="py-4" />}

      <div id={listaId} role="listbox" aria-label="Resultados" className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
        {secoes.map((s) => (
          <div key={s.chave} role="group" aria-labelledby={`${listaId}-g-${s.chave}`} className="mb-2">
            <p id={`${listaId}-g-${s.chave}`} className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{s.rotulo}</p>
            {s.itens.map((op) => {
              indice += 1;
              const i = indice;
              const sel = i === ativo;
              return (
                <div key={op.id} id={`${listaId}-op-${i}`} role="option" aria-selected={sel}
                  onMouseMove={() => setAtivo(i)} onClick={() => abrir(op)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm ${sel ? 'bg-ufrpe-blue text-white' : 'text-gray-800 hover:bg-gray-50'}`}>
                  {op.criar && <Plus size={14} aria-hidden="true" className="shrink-0" />}
                  <span className="min-w-0 flex-1 truncate">{op.rotulo}</span>
                  {op.status && op.status !== 'PUBLICADO' && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sel ? 'bg-white/20' : 'bg-gray-200 text-gray-800'}`}>
                      {op.status === 'RASCUNHO' ? 'Rascunho' : 'Arquivado'}
                    </span>
                  )}
                  {op.detalhe && <span className={`text-xs shrink-0 ${sel ? 'text-white/80' : 'text-gray-500'}`}>{op.detalhe}</span>}
                  {sel && <CornerDownLeft size={14} aria-hidden="true" className="shrink-0" />}
                </div>
              );
            })}
          </div>
        ))}
        {!estado.carregando && !estado.erro && buscando && opcoes.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-gray-600">Nada encontrado para “{texto.trim()}”. Tente outro termo.</p>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        <kbd className="px-1 border rounded">↑</kbd> <kbd className="px-1 border rounded">↓</kbd> navegar · <kbd className="px-1 border rounded">Enter</kbd> abrir · <kbd className="px-1 border rounded">Esc</kbd> fechar
      </p>
    </Dialog>
  );
}
