import React, { useEffect, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { API_URL, lerJson } from '../../api';
import Dialog from '../ui/Dialog';
import { Carregando, EstadoVazio, EstadoErro } from '../ui/Estados';

export const urlArquivo = (url) => (url?.startsWith('http') ? url : `${API_URL}${url}`);

// Escolher um arquivo já enviado (Fase F.5): evita reenviar o mesmo PDF ou a
// mesma imagem para cada notícia/edital. `tipo`: 'imagem' | 'pdf' | undefined.
// onEscolher recebe { id, url, nome }.
export default function MediaPicker({ tipo, onEscolher, rotulo = 'Escolher da biblioteca' }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!aberto) return undefined;
    let vivo = true;
    setCarregando(true);
    setErro(null);
    const params = new URLSearchParams({ page: '1', limit: '60' });
    if (tipo) params.set('tipo', tipo);
    if (busca.trim()) params.set('q', busca.trim());
    const t = setTimeout(() => {
      // Falha de rede ou de permissão é erro — antes virava "nenhum arquivo".
      lerJson(`/api/arquivos?${params}`)
        .then((d) => { if (vivo) setItens(d.items || []); })
        .catch((e) => { if (vivo) { setItens([]); setErro(e); } })
        .finally(() => { if (vivo) setCarregando(false); });
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [aberto, busca, tipo, tentativa]);

  const fechar = () => setAberto(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-sm text-ufrpe-blue hover:underline mt-2"
      >
        {rotulo}
      </button>
      <Dialog aberto={aberto} onFechar={fechar} titulo="Biblioteca de mídia" tamanho="lg" inicial="#media-picker-busca">
        <div className="pb-4">
          <label htmlFor="media-picker-busca" className="sr-only">Buscar arquivo</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input id="media-picker-busca" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pelo nome do arquivo…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
        </div>
        {carregando ? (
          <Carregando />
        ) : erro ? (
          <EstadoErro erro={erro} onTentar={() => setTentativa((n) => n + 1)} titulo="Não foi possível carregar a biblioteca." />
        ) : itens.length === 0 ? (
          <EstadoVazio titulo="Nenhum arquivo encontrado." descricao={busca ? 'Tente outro nome.' : 'Envie um arquivo pelo formulário e ele aparece aqui.'} />
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
      </Dialog>
    </>
  );
}
