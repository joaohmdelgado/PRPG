import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Info, CheckCircle2, RefreshCw, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../api';
import { TableSkeleton } from '../../components/admin/AdminUI';
import { hasRole } from '../../auth';
import AdminNoticias from './AdminNoticias';

// Fase O.6: página inicial do admin — o que precisa de ação, calculado dos
// dados na hora. Substitui "abrir a planilha para ver o que falta".
const SEVERIDADE = {
  alta: { rotulo: 'Atrasado', icon: AlertTriangle, borda: 'border-l-rose-500', chip: 'bg-rose-100 text-rose-800' },
  media: { rotulo: 'Vence logo', icon: Clock, borda: 'border-l-amber-400', chip: 'bg-amber-100 text-amber-800' },
  info: { rotulo: 'Para conferir', icon: Info, borda: 'border-l-sky-300', chip: 'bg-sky-100 text-sky-800' },
};

function Secao({ s }) {
  const sev = SEVERIDADE[s.severidade] || SEVERIDADE.info;
  const Icon = sev.icon;
  return (
    <section className={`bg-white rounded-xl border border-gray-100 border-l-4 ${sev.borda} shadow-sm p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading font-semibold text-gray-900 text-sm flex items-center gap-2">
          <Icon size={15} aria-hidden="true" /> {s.titulo}
          <span className={`text-xs px-2 py-0.5 rounded-full ${sev.chip}`}>{s.total}</span>
        </h2>
        {s.link && (
          <Link to={s.link} className="text-xs text-ufrpe-blue hover:underline inline-flex items-center">
            ver tudo <ChevronRight size={12} />
          </Link>
        )}
      </div>
      <ul className="mt-2 divide-y divide-gray-50">
        {s.itens.map((it) => (
          <li key={`${it.rotulo}-${it.detalhe}`} className="py-1.5 text-sm flex flex-wrap items-baseline justify-between gap-x-3">
            {it.link ? <Link to={it.link} className="text-gray-800 hover:text-ufrpe-blue hover:underline">{it.rotulo}</Link> : <span className="text-gray-800">{it.rotulo}</span>}
            <span className="text-xs text-gray-500">{it.detalhe}</span>
          </li>
        ))}
      </ul>
      {s.total > s.itens.length && <p className="text-xs text-gray-400 mt-1">… e mais {s.total - s.itens.length}.</p>}
    </section>
  );
}

function Painel() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await apiFetch('/api/painel/pendencias');
    if (res.ok) { setDados(await res.json()); setErro(null); } else setErro('Não foi possível carregar as pendências.');
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  if (erro) return <p className="text-sm text-red-600" role="alert">{erro}</p>;
  if (!dados) return <TableSkeleton rows={6} cols={2} />;

  const comItens = dados.secoes.filter((s) => s.total > 0);
  const emDia = dados.secoes.filter((s) => s.total === 0 && s.vazio);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900">Pendências</h1>
          <p className="text-sm text-gray-500">
            {dados.alertas > 0 ? `${dados.alertas} item(ns) pedem atenção (atrasados ou que vencem logo).` : 'Nada atrasado nem vencendo.'}
            {' '}Atualizado às {new Date(dados.geradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
          </p>
        </div>
        <button onClick={carregar} disabled={carregando} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
          <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>
      {comItens.map((s) => <Secao key={s.id} s={s} />)}
      {emDia.length > 0 && (
        <ul className="text-sm text-gray-500 space-y-1">
          {emDia.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" aria-hidden="true" /> {s.vazio}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-400 pt-2">
        Atalhos: <Link to="/admin/noticias" className="hover:underline">Notícias</Link> · <Link to="/admin/editais" className="hover:underline">Editais</Link>
        {hasRole('Administrator', 'Gestor') && <> · <Link to="/admin/qualidade" className="hover:underline">Qualidade dos dados</Link> · <Link to="/admin/planilhas" className="hover:underline">Planilhas</Link></>}
      </p>
    </div>
  );
}

// Quem não é Admin/Gestor/Gestor de Programa continua caindo em Notícias.
export default function AdminPainel() {
  return hasRole('Administrator', 'Gestor', 'GestorPrograma') ? <Painel /> : <AdminNoticias />;
}
