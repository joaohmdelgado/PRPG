import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, FileText, RefreshCw, Trash2, Search } from 'lucide-react';
import { apiFetch } from '../../api';
import { hasRole } from '../../auth';
import { TableSkeleton } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import { urlArquivo } from '../../components/admin/MediaPicker';

const POR_PAGINA = 24;
const tamanho = (b) => (b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// Biblioteca de mídia (Fase F.5): tudo que foi enviado pelo painel, com onde
// cada arquivo é usado, troca em todos os lugares e exclusão só sem uso.
export default function AdminMidia() {
  const podeAlterar = hasRole('Administrator', 'Gestor');
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [semUso, setSemUso] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState({ items: [], total: 0, pages: 1 });
  const [carregando, setCarregando] = useState(true);
  const [usosAbertos, setUsosAbertos] = useState({}); // id -> lista
  const [mensagem, setMensagem] = useState(null);
  const { confirm, ConfirmModal } = useConfirm();

  const avisar = (tipoMsg, texto) => { setMensagem({ tipo: tipoMsg, texto }); setTimeout(() => setMensagem(null), 5000); };

  const carregar = async () => {
    const params = new URLSearchParams({ page: String(pagina), limit: String(POR_PAGINA) });
    if (busca.trim()) params.set('q', busca.trim());
    if (tipo) params.set('tipo', tipo);
    if (semUso) params.set('semUso', '1');
    try {
      const r = await apiFetch(`/api/arquivos?${params}`);
      if (!r.ok) throw new Error();
      setDados(await r.json());
    } catch {
      avisar('erro', 'Não foi possível carregar a biblioteca.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [busca, tipo, semUso, pagina]); // eslint-disable-line react-hooks/exhaustive-deps

  const verUsos = async (a) => {
    if (usosAbertos[a.id]) return setUsosAbertos(({ [a.id]: _, ...resto }) => resto);
    const r = await apiFetch(`/api/arquivos/${a.id}/usos`);
    const lista = r.ok ? await r.json() : [];
    setUsosAbertos((u) => ({ ...u, [a.id]: lista }));
  };

  const copiar = async (a) => {
    try { await navigator.clipboard.writeText(urlArquivo(a.url)); avisar('ok', 'Endereço copiado.'); }
    catch { avisar('erro', 'Não foi possível copiar.'); }
  };

  const substituir = async (a, file) => {
    if (!file) return;
    if (!await confirm(`Trocar "${a.nome}" por "${file.name}" em todos os ${a.usos} lugar(es) que o usam?`)) return;
    const corpo = new FormData();
    corpo.append('file', file);
    const r = await apiFetch(`/api/arquivos/${a.id}/substituir`, { method: 'POST', body: corpo });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return avisar('erro', d.message || 'Não foi possível substituir.');
    avisar('ok', `Arquivo trocado; ${d.referenciasAtualizadas} referência(s) atualizada(s).`);
    setUsosAbertos({});
    carregar();
  };

  const excluir = async (a) => {
    if (!await confirm(`Excluir "${a.nome}" definitivamente?`)) return;
    const r = await apiFetch(`/api/arquivos/${a.id}`, { method: 'DELETE' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return avisar('erro', d.message || 'Não foi possível excluir.');
    avisar('ok', 'Arquivo excluído.');
    carregar();
  };

  if (carregando) return <TableSkeleton />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="font-heading text-xl font-semibold text-ufrpe-blue">Biblioteca de Mídia</h2>
        <p className="text-sm text-gray-500">Imagens e PDFs enviados pelo painel. Veja onde cada um é usado e troque um arquivo em todos os lugares de uma vez.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <label htmlFor="midia-busca" className="sr-only">Buscar</label>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input id="midia-busca" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            placeholder="Buscar pelo nome…" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label htmlFor="midia-tipo" className="sr-only">Tipo</label>
          <select id="midia-tipo" value={tipo} onChange={(e) => { setTipo(e.target.value); setPagina(1); }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
            <option value="">Todos os tipos</option>
            <option value="imagem">Imagens</option>
            <option value="pdf">PDFs</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={semUso} onChange={(e) => { setSemUso(e.target.checked); setPagina(1); }} />
          Só arquivos sem uso
        </label>
      </div>

      {mensagem && <p role="status" className={`text-sm mb-3 ${mensagem.tipo === 'erro' ? 'text-red-600' : 'text-green-700'}`}>{mensagem.texto}</p>}

      <p className="text-xs text-gray-400 mb-2">{dados.total} arquivo(s)</p>
      {dados.items.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Nenhum arquivo encontrado.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md">
          {dados.items.map((a) => (
            <li key={a.id} className="p-3">
              <div className="flex items-center gap-4">
                {a.tipo === 'imagem' ? (
                  <img src={urlArquivo(a.url)} alt="" loading="lazy" className="w-16 h-12 object-cover rounded border border-gray-200 bg-gray-50" />
                ) : (
                  <div className="w-16 h-12 flex items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-400"><FileText size={22} aria-hidden="true" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <a href={urlArquivo(a.url)} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-gray-800 truncate hover:text-ufrpe-blue">{a.nome || a.url}</a>
                  <span className="text-xs text-gray-400">
                    {tamanho(a.tamanhoBytes)}{a.enviadoEm ? ` · ${new Date(a.enviadoEm).toLocaleDateString('pt-BR')}` : ''} ·{' '}
                    <button type="button" onClick={() => verUsos(a)} className="underline hover:text-ufrpe-blue">
                      {a.usos === 0 ? 'sem uso' : `usado em ${a.usos} lugar(es)`}
                    </button>
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button type="button" onClick={() => copiar(a)} aria-label={`Copiar endereço de ${a.nome}`} className="text-gray-500 hover:text-ufrpe-blue"><Copy size={16} /></button>
                  {podeAlterar && (
                    <label className="text-gray-500 hover:text-ufrpe-blue cursor-pointer" title="Substituir em todos os lugares">
                      <RefreshCw size={16} aria-hidden="true" />
                      <span className="sr-only">Substituir {a.nome}</span>
                      <input type="file" accept={a.tipo === 'imagem' ? 'image/*' : 'application/pdf'} className="sr-only"
                        onChange={(e) => { substituir(a, e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                  )}
                  {podeAlterar && (
                    <button type="button" onClick={() => excluir(a)} disabled={a.usos > 0}
                      aria-label={`Excluir ${a.nome}`} title={a.usos > 0 ? 'Em uso: troque ou remova as referências antes' : 'Excluir'}
                      className="text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
              {usosAbertos[a.id] && (
                <ul className="mt-2 ml-20 text-xs text-gray-600 space-y-1">
                  {usosAbertos[a.id].length === 0 && <li>Nenhum uso encontrado.</li>}
                  {usosAbertos[a.id].map((u, i) => (
                    <li key={i}>
                      <span className="text-gray-400">{u.tipo}:</span>{' '}
                      {u.admin ? <Link to={u.admin} className="text-ufrpe-blue hover:underline">{u.titulo || u.id}</Link> : (u.titulo || u.id)}
                      {u.imutavel && <span className="text-gray-400"> (histórico — não é trocado)</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {dados.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button type="button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Anterior</button>
          <span className="text-sm text-gray-500 px-2 py-1">Página {dados.page} de {dados.pages}</span>
          <button type="button" disabled={pagina >= dados.pages} onClick={() => setPagina(pagina + 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Próxima</button>
        </div>
      )}
      {ConfirmModal}
    </div>
  );
}
