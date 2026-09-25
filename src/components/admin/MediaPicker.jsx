import React, { useEffect, useRef, useState } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { API_URL, apiFetch } from '../../api';

export const urlArquivo = (url) => (url?.startsWith('http') ? url : `${API_URL}${url}`);

// Escolher um arquivo já enviado (Fase F.5): evita reenviar o mesmo PDF ou a
// mesma imagem para cada notícia/edital. `tipo`: 'imagem' | 'pdf' | undefined.
// onEscolher recebe { id, url, nome }.
export default function MediaPicker({ tipo, onEscolher, rotulo = 'Escolher da biblioteca' }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const botaoRef = useRef(null);
  const dialogoRef = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    let vivo = true;
    setCarregando(true);
    const params = new URLSearchParams({ page: '1', limit: '60' });
    if (tipo) params.set('tipo', tipo);
    if (busca.trim()) params.set('q', busca.trim());
    const t = setTimeout(() => {
      apiFetch(`/api/arquivos?${params}`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => { if (vivo) setItens(d.items || []); })
        .catch(() => { if (vivo) setItens([]); })
        .finally(() => { if (vivo) setCarregando(false); });
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [aberto, busca, tipo]);

  // Foco entra no diálogo ao abrir, Escape fecha e o foco volta ao botão.
  useEffect(() => {
    if (!aberto) return undefined;
    dialogoRef.current?.querySelector('input')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aberto]);

  const fechar = () => { setAberto(false); botaoRef.current?.focus(); };

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto(true)}
        className="text-sm text-ufrpe-blue hover:underline mt-2"
      >
        {rotulo}
      </button>
      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={fechar} aria-hidden="true" />
          <div ref={dialogoRef} role="dialog" aria-modal="true" aria-labelledby="media-picker-titulo"
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 id="media-picker-titulo" className="font-semibold text-gray-800">Biblioteca de mídia</h3>
              <button type="button" onClick={fechar} aria-label="Fechar" className="text-gray-500 hover:text-gray-800"><X size={20} /></button>
            </div>
            <div className="p-4 border-b">
              <label htmlFor="media-picker-busca" className="sr-only">Buscar arquivo</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input id="media-picker-busca" value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar pelo nome do arquivo…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
            </div>
            <div className="p-4 overflow-y-auto">
              {carregando ? (
                <p className="text-sm text-gray-400">Carregando…</p>
              ) : itens.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum arquivo encontrado.</p>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {itens.map((a) => (
                    <li key={a.id}>
                      <button type="button" onClick={() => { onEscolher({ id: a.id, url: a.url, nome: a.nome }); fechar(); }}
                        className="w-full text-left border border-gray-200 rounded-lg overflow-hidden hover:ring-2 hover:ring-ufrpe-yellow focus:ring-2 focus:ring-ufrpe-yellow">
                        {a.tipo === 'imagem' ? (
                          <img src={urlArquivo(a.url)} alt="" loading="lazy" className="w-full h-24 object-cover bg-gray-100" />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center bg-gray-50 text-gray-400"><FileText size={32} aria-hidden="true" /></div>
                        )}
                        <span className="block px-2 py-1 text-xs text-gray-700 truncate">{a.nome || a.url}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
