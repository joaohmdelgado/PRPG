import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Carregando, EstadoErro, EstadoVazio } from '../ui/Estados';
import { SelectAllCheckbox, RowCheckbox } from './BulkActions';
import { ORIGEM_PRPG, ORIGEM_TODAS } from '../../hooks/useListaServidor';

// A tabela única do painel (Fase U.3). Recebe o resultado de useListaServidor
// (`lista`) — a consulta, a ordenação, a busca e a paginação acontecem no
// servidor e ficam na URL — e desenha: barra de filtros, tabela com cabeçalhos
// ordenáveis (aria-sort), estados de carregando/erro/vazio e paginação.
//
//   colunas: [{ chave, rotulo, ordenar?: 'campoDoServidor', render(item), className?, ocultarRotulo? }]
//   acoes:   (item) => nós da última coluna
//   selecao: { ids: [...], isSelected, toggle, toggleAll, allSelected, someSelected } (de useBulkSelection) — opcional
//   filtros: nós extras na barra (selects próprios da tela)
//   programas: [{ id, rotulo }] → mostra o filtro de origem (só para a equipe da PRPG)

const SITUACOES = [
  ['', 'Todas as situações'], ['PUBLICADO', 'Publicado'], ['RASCUNHO', 'Rascunho'], ['ARQUIVADO', 'Arquivado'],
];

const campoBusca = 'px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none';

function Busca({ valor, onBuscar, rotulo }) {
  // O que se digita aparece na hora; a consulta ao servidor espera a pessoa parar.
  const [texto, setTexto] = useState(valor);
  const ultimo = useRef(valor);
  useEffect(() => { if (valor !== ultimo.current) { ultimo.current = valor; setTexto(valor); } }, [valor]);
  useEffect(() => {
    if (texto === ultimo.current) return undefined;
    const t = setTimeout(() => { ultimo.current = texto; onBuscar(texto); }, 350);
    return () => clearTimeout(t);
  }, [texto, onBuscar]);
  return (
    <div className="relative flex-1 min-w-[200px] max-w-md">
      <label htmlFor="tabela-busca" className="sr-only">{rotulo}</label>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
      <input id="tabela-busca" type="search" value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder={rotulo} className={`${campoBusca} w-full pl-9`} />
    </div>
  );
}

function CabecalhoOrdenavel({ coluna, lista }) {
  const ativo = lista.ordenar === coluna.ordenar;
  const Seta = !ativo ? ArrowUpDown : (lista.dir === 'desc' ? ArrowDown : ArrowUp);
  return (
    <button type="button" onClick={() => lista.alternarOrdem(coluna.ordenar)}
      className="inline-flex items-center gap-1.5 font-medium text-gray-600 hover:text-ufrpe-blue">
      {coluna.rotulo}
      <Seta size={14} aria-hidden="true" className={ativo ? 'text-ufrpe-blue' : 'text-gray-400'} />
      <span className="sr-only">
        {ativo ? `, ordenado ${lista.dir === 'desc' ? 'de Z a A' : 'de A a Z'}. Ativar para inverter` : ', ordenar por esta coluna'}
      </span>
    </button>
  );
}

function Paginacao({ lista }) {
  const { page, pages, total, limit, items } = lista;
  if (total === 0) return null;
  const de = (page - 1) * limit + 1;
  const ate = (page - 1) * limit + items.length;
  const botao = 'inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm text-gray-600">
      <p aria-live="polite">Mostrando {de}–{ate} de {total}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="tabela-limite">Por página</label>
          <select id="tabela-limite" value={limit} onChange={(e) => lista.definir({ limit: e.target.value === String(20) ? '' : e.target.value })}
            className={campoBusca}>
            {lista.LIMITES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <nav aria-label="Paginação" className="flex items-center gap-2">
          <button type="button" className={botao} disabled={page <= 1} onClick={() => lista.definir({ page: page - 1 })}>
            <ChevronLeft size={16} aria-hidden="true" /> Anterior
          </button>
          <span className="px-1" aria-current="page">Página {page} de {pages}</span>
          <button type="button" className={botao} disabled={page >= pages} onClick={() => lista.definir({ page: page + 1 })}>
            Próxima <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );
}

export default function DataTable({
  lista, colunas, acoes, selecao, filtros, programas, filtroStatus = true, rotuloBusca = 'Buscar…',
  legenda, vazio = {}, gestor = false, linhaId = (i) => i.id, rotuloItem = (i) => i.title || i.id,
}) {
  const colunasTotal = colunas.length + (acoes ? 1 : 0) + (selecao ? 1 : 0);
  const mostraOrigem = !gestor && programas;
  const semDados = !lista.primeiraCarga && !lista.erro && lista.items.length === 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Busca valor={lista.q} rotulo={rotuloBusca} onBuscar={(v) => lista.definir({ q: v })} />
        {filtroStatus && (
          <div>
            <label htmlFor="tabela-status" className="sr-only">Situação</label>
            <select id="tabela-status" value={lista.status} onChange={(e) => lista.definir({ status: e.target.value })} className={campoBusca}>
              {SITUACOES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
          </div>
        )}
        {mostraOrigem && (
          <div className="flex items-center gap-2">
            <label htmlFor="tabela-origem" className="text-sm text-gray-600 shrink-0">Origem</label>
            <select id="tabela-origem" value={lista.origem} onChange={(e) => lista.definir({ programa: e.target.value })} className={campoBusca}>
              <option value={ORIGEM_PRPG}>Somente PRPG (sem programa)</option>
              <option value={ORIGEM_TODAS}>Todas (PRPG e programas)</option>
              {programas.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
            </select>
          </div>
        )}
        {filtros}
        {lista.filtrosAtivos && (
          <button type="button" onClick={lista.limpar} className="inline-flex items-center gap-1 text-sm text-ufrpe-blue hover:underline">
            <X size={14} aria-hidden="true" /> Limpar filtros
          </button>
        )}
      </div>

      {lista.erro && (
        <EstadoErro erro={lista.erro} onTentar={lista.recarregar}
          titulo={lista.items.length ? 'Não foi possível atualizar a lista.' : 'Não foi possível carregar a lista.'} />
      )}

      {!lista.erro && lista.primeiraCarga && <Carregando texto="Carregando a lista…" />}

      {!lista.erro && !lista.primeiraCarga && (
        <div className={`overflow-x-auto transition-opacity ${lista.carregando ? 'opacity-60' : ''}`} aria-busy={lista.carregando}>
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">{legenda}</caption>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {selecao && (
                  <th scope="col" className="px-4 py-3 w-px">
                    <SelectAllCheckbox allSelected={selecao.allSelected} someSelected={selecao.someSelected}
                      onToggle={selecao.toggleAll} disabled={lista.items.length === 0} />
                  </th>
                )}
                {colunas.map((c) => (
                  <th key={c.chave} scope="col" className={`px-4 py-3 text-sm font-medium text-gray-600 ${c.cabecalhoClasse || ''}`}
                    aria-sort={c.ordenar && lista.ordenar === c.ordenar ? (lista.dir === 'desc' ? 'descending' : 'ascending') : undefined}>
                    {c.ordenar ? <CabecalhoOrdenavel coluna={c} lista={lista} /> : c.rotulo}
                  </th>
                ))}
                {acoes && <th scope="col" className="px-4 py-3 text-sm font-medium text-gray-600 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lista.items.map((item) => {
                const id = linhaId(item);
                return (
                  <tr key={id} className={`hover:bg-gray-50 ${selecao?.isSelected(id) ? 'bg-ufrpe-blue/5' : ''}`}>
                    {selecao && (
                      <td className="px-4 py-3">
                        {selecao.selecionavel && !selecao.selecionavel(item)
                          ? null
                          : <RowCheckbox checked={selecao.isSelected(id)} onToggle={() => selecao.toggle(id)} label={`Selecionar ${rotuloItem(item)}`} />}
                      </td>
                    )}
                    {colunas.map((c) => (
                      <td key={c.chave} className={`px-4 py-3 text-sm text-gray-700 ${c.className || ''}`}>{c.render(item)}</td>
                    ))}
                    {acoes && <td className="px-4 py-3 text-right"><div className="flex justify-end gap-2">{acoes(item)}</div></td>}
                  </tr>
                );
              })}
              {semDados && (
                <tr>
                  <td colSpan={colunasTotal}>
                    {lista.filtrosAtivos ? (
                      <EstadoVazio titulo="Nenhum resultado para estes filtros."
                        descricao="Tente outro termo ou limpe os filtros."
                        acao={<button type="button" onClick={lista.limpar} className="text-sm text-ufrpe-blue underline">Limpar filtros</button>} />
                    ) : (
                      <EstadoVazio icone={vazio.icone} titulo={vazio.titulo || 'Nenhum registro ainda.'}
                        descricao={vazio.descricao || 'Use o botão de novo registro para criar o primeiro.'} />
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!lista.erro && !lista.primeiraCarga && <Paginacao lista={lista} />}
    </div>
  );
}
