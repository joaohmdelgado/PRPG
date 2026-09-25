import React, { useState } from 'react';
import { History, RotateCcw, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../api';
import SafeHtml from '../SafeHtml';

// Histórico de versões de um item (Fase F.7): cada vez que alguém salva, a
// versão anterior fica guardada no servidor (as últimas 30 — ver
// server/db/revisoesRepo.js). Daqui dá para ver uma versão e restaurá-la; a
// restauração devolve o conteúdo, mas mantém a situação, a data de
// publicação, o programa e o endereço atuais, e também pode ser desfeita.

const dataHora = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// O texto principal de um item, qualquer que seja o tipo de conteúdo.
const textoPrincipal = (s) => {
  if (!s) return '';
  if (s.body?.value) return s.body.value;
  if (Array.isArray(s.content) && s.content.length) return s.content.join('');
  return s.resposta || s.description || s.desc || s.excerpt || '';
};

export default function HistoricoVersoes({ entidade, id, versao, sujo = false }) {
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [vendo, setVendo] = useState(null); // { id, snapshot }
  const [restaurando, setRestaurando] = useState(null);

  const carregar = async () => {
    setErro('');
    try {
      const res = await apiFetch(`/api/revisoes/${entidade}/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Não foi possível carregar o histórico.');
      setLista(await res.json());
    } catch (e) {
      setErro(e.message);
    }
  };

  const alternar = () => {
    if (!aberto && lista === null) carregar();
    setAberto(!aberto);
  };

  const ver = async (rev) => {
    if (vendo?.id === rev.id) { setVendo(null); return; }
    const res = await apiFetch(`/api/revisoes/${entidade}/${encodeURIComponent(id)}/${rev.id}`);
    if (res.ok) setVendo({ id: rev.id, snapshot: (await res.json()).snapshot });
    else setErro('Não foi possível abrir esta versão.');
  };

  const restaurar = async (rev) => {
    const aviso = `Restaurar a versão salva em ${dataHora(rev.versaoDe)}?\n\n`
      + 'O conteúdo volta a ser o daquela versão; a situação (publicado/rascunho), a data de publicação e o endereço continuam os atuais. '
      + 'A versão de agora fica guardada no histórico.'
      + (sujo ? '\n\nAtenção: as alterações não salvas neste formulário serão perdidas.' : '');
    if (!window.confirm(aviso)) return;
    setRestaurando(rev.id);
    setErro('');
    try {
      const res = await apiFetch(`/api/revisoes/${entidade}/${encodeURIComponent(id)}/${rev.id}/restaurar`, {
        method: 'POST', json: { _versao: versao || undefined },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Não foi possível restaurar.');
      // O formulário carrega os dados ao montar: recarregar mostra o item restaurado.
      window.location.reload();
    } catch (e) {
      setErro(e.message);
      setRestaurando(null);
    }
  };

  return (
    <div className="md:col-span-2 border border-gray-200 rounded-lg">
      <button type="button" onClick={alternar} aria-expanded={aberto}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg">
        {aberto ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
        <History size={16} aria-hidden="true" /> Histórico de versões
        {lista && <span className="font-normal text-gray-500">({lista.length})</span>}
      </button>
      {aberto && (
        <div className="px-4 pb-4">
          {erro && <p role="alert" className="text-sm text-red-700 mb-2">{erro}</p>}
          {lista === null && !erro && <p className="text-sm text-gray-500">Carregando…</p>}
          {lista?.length === 0 && (
            <p className="text-sm text-gray-500">Nenhuma versão anterior ainda. Cada vez que este item for salvo, a versão anterior aparece aqui.</p>
          )}
          {lista?.length > 0 && (
            <ol className="divide-y divide-gray-100 border border-gray-100 rounded-md">
              {lista.map((rev) => (
                <li key={rev.id} className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium text-gray-800">{dataHora(rev.versaoDe)}</span>
                    <span className="text-gray-500">{rev.autorNome || 'autor desconhecido'}</span>
                    {rev.titulo && <span className="text-gray-600 truncate max-w-xs" title={rev.titulo}>“{rev.titulo}”</span>}
                    <span className="ml-auto flex gap-2">
                      <button type="button" onClick={() => ver(rev)} aria-expanded={vendo?.id === rev.id}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
                        <Eye size={14} aria-hidden="true" /> {vendo?.id === rev.id ? 'Fechar' : 'Ver'}
                      </button>
                      <button type="button" onClick={() => restaurar(rev)} disabled={restaurando !== null}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-ufrpe-blue/40 text-ufrpe-blue rounded hover:bg-ufrpe-blue/5 disabled:opacity-50">
                        <RotateCcw size={14} aria-hidden="true" /> {restaurando === rev.id ? 'Restaurando…' : 'Restaurar'}
                      </button>
                    </span>
                  </div>
                  {vendo?.id === rev.id && (
                    <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-100 max-h-80 overflow-auto">
                      <p className="font-semibold text-gray-800 mb-2">{vendo.snapshot.title}</p>
                      {textoPrincipal(vendo.snapshot)
                        ? <SafeHtml html={textoPrincipal(vendo.snapshot)} className="prose prose-sm max-w-none" />
                        : <p className="text-sm text-gray-500">Sem texto principal nesta versão.</p>}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
