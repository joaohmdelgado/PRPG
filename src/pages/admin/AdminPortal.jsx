import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { apiFetch, urlMidia } from '../../api';
import MenuEditor from '../../components/admin/MenuEditor';
import MediaPicker from '../../components/admin/MediaPicker';
import { recarregarPortal } from '../../hooks/usePortal';

// "Menus e portal" (Fase H.1): menus, atalhos da home, contato e chamada da
// página inicial — o que antes exigia editar Navbar.jsx/Footer.jsx/Home.jsx.

// Rotas fixas do site, sugeridas no campo Destino (as páginas do painel
// entram junto, carregadas da API).
const ROTAS = [
  ['/', 'Início'], ['/noticias', 'Notícias'], ['/editais', 'Editais'], ['/resolucoes', 'Resoluções'],
  ['/formularios', 'Formulários'], ['/programas', 'Cursos Stricto Sensu'], ['/calendario-academico', 'Calendário Acadêmico'],
  ['/busca', 'Busca'], ['/proficiencia/inscricao', 'Inscrição em proficiência'], ['/sobre', 'Sobre a PRPG'],
  ['/missao-visao-valores', 'Missão, Visão e Valores'], ['/historico', 'Histórico'], ['/equipe', 'Equipe'],
  ['/estrutura-organizacional', 'Estrutura Organizacional'], ['/financeiro', 'Financeiro'], ['/proext-pg', 'Proext-PG'],
  ['/relatorios-autoavaliacao', 'Relatórios de Autoavaliação'], ['/especializacao', 'Especialização'],
  ['/residencia-profissional', 'Residência Profissional'], ['/sobre-internacionalizacao', 'Internacionalização'],
  ['/alunos-estrangeiros', 'Alunos Estrangeiros'], ['/capes-print', 'Capes PrInt'],
  ['/mobilidade-estudantil', 'Mobilidade Estudantil'], ['/reconhecimento', 'Reconhecimento de Diploma'],
];

// Formulários das configurações: [campo, rótulo, tipo, ajuda].
const CONFIGS = [
  {
    chave: 'contato', nome: 'Contato', descricao: 'Aparece na faixa do topo, no rodapé e no mapa de localização.',
    campos: [
      ['email', 'E-mail da secretaria', 'email'], ['telefone', 'Telefone', 'text'], ['whatsapp', 'WhatsApp', 'text'],
      ['endereco', 'Endereço (uma linha por quebra)', 'textarea'],
      ['mapa', 'Mapa (endereço de incorporação do Google Maps)', 'text', 'No Google Maps: Compartilhar → Incorporar um mapa → copie só o endereço que está em src="...".'],
    ],
  },
  {
    chave: 'home', nome: 'Página inicial', descricao: 'Banner do topo da página inicial.',
    campos: [
      ['selo', 'Selo (texto pequeno acima do título)', 'text'], ['titulo', 'Título', 'text'],
      ['destaque', 'Continuação do título (em amarelo)', 'text'], ['texto', 'Texto', 'textarea'], ['imagem', 'Imagem de fundo', 'imagem'],
    ],
  },
  { chave: 'identidade', nome: 'Identidade', descricao: 'Logo exibida no cabeçalho do site.', campos: [['logo', 'Logo', 'imagem']] },
];

function ConfigForm({ config, valorInicial }) {
  const [valor, setValor] = useState(valorInicial || {});
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { setValor(valorInicial || {}); }, [valorInicial]);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);
    const r = await apiFetch(`/api/configuracoes/${config.chave}`, { method: 'PUT', json: valor });
    const corpo = await r.json().catch(() => ({}));
    setSalvando(false);
    if (!r.ok) return setMsg({ tipo: 'erro', texto: corpo.message || 'Não foi possível salvar.' });
    setValor(corpo);
    recarregarPortal();
    return setMsg({ tipo: 'ok', texto: 'Salvo — o site já mostra a nova versão.' });
  };

  const set = (campo, v) => setValor((a) => ({ ...a, [campo]: v }));

  return (
    <form onSubmit={salvar} className="space-y-4">
      <p className="text-sm text-gray-500">{config.descricao}</p>
      {config.campos.map(([campo, rotulo, tipo, ajuda]) => {
        const id = `cfg-${config.chave}-${campo}`;
        return (
          <div key={campo}>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{rotulo}</label>
            {tipo === 'textarea' ? (
              <textarea id={id} rows={campo === 'endereco' ? 5 : 3} value={valor[campo] || ''} onChange={(e) => set(campo, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {tipo === 'imagem' && valor[campo] && <img src={urlMidia(valor[campo])} alt="" className="h-12 max-w-[120px] object-contain bg-gray-50 rounded border" />}
                <input id={id} type={tipo === 'email' ? 'email' : 'text'} value={valor[campo] || ''} onChange={(e) => set(campo, e.target.value)}
                  aria-describedby={ajuda ? `${id}-ajuda` : undefined}
                  className={`flex-1 min-w-[240px] px-3 py-2 border border-gray-300 rounded-md text-sm ${tipo === 'imagem' || campo === 'mapa' ? 'font-mono' : ''}`} />
                {tipo === 'imagem' && <MediaPicker tipo="imagem" onEscolher={(a) => set(campo, a.url)} />}
              </div>
            )}
            {ajuda && <p id={`${id}-ajuda`} className="text-xs text-gray-500 mt-1">{ajuda}</p>}
          </div>
        );
      })}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={salvando} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-ufrpe-blue text-white rounded-md disabled:opacity-50">
          <Save size={16} /> {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        {msg && <span role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`text-sm ${msg.tipo === 'erro' ? 'text-red-700' : 'text-green-700'}`}>{msg.texto}</span>}
      </div>
    </form>
  );
}

export default function AdminPortal() {
  const [menus, setMenus] = useState([]);
  const [configs, setConfigs] = useState({});
  const [destinos, setDestinos] = useState(ROTAS.map(([valor, rotulo]) => ({ valor, rotulo })));
  const [aba, setAba] = useState('principal');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const [rm, rc] = await Promise.all([apiFetch('/api/menus?todos=1'), apiFetch('/api/configuracoes')]);
      if (!rm.ok || !rc.ok) throw new Error();
      setMenus(await rm.json());
      setConfigs(await rc.json());
    } catch {
      setErro('Não foi possível carregar os menus.');
    }
  }, []);

  useEffect(() => {
    carregar();
    apiFetch('/api/pages?resumo=1').then((r) => (r.ok ? r.json() : [])).then((pages) => {
      const gerais = (Array.isArray(pages) ? pages : pages.items || []).filter((p) => !p.programaId && p.slug);
      setDestinos((d) => [...d, ...gerais.map((p) => ({ valor: `/${p.slug}`, rotulo: `Página: ${p.title}` }))]);
    }).catch(() => {});
  }, [carregar]);

  const menu = menus.find((m) => m.chave === aba);
  const config = CONFIGS.find((c) => c.chave === aba);

  const tab = (chave, nome) => (
    <button key={chave} type="button" onClick={() => setAba(chave)} aria-pressed={aba === chave}
      className={`py-2.5 px-3 text-sm font-semibold border-b-2 transition-all shrink-0 ${aba === chave ? 'border-ufrpe-blue text-ufrpe-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
      {nome}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-2">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin" aria-label="Voltar" className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Menus e portal</h2>
          <p className="text-sm text-gray-500">Menus, atalhos, contato e página inicial do site da PRPG — as mudanças aparecem no site ao salvar.</p>
        </div>
      </div>
      {erro && <p role="alert" className="text-sm text-red-700 mb-4">{erro}</p>}

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto gap-1">
        {menus.map((m) => tab(m.chave, m.nome))}
        {CONFIGS.map((c) => tab(c.chave, c.nome))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {menu && <MenuEditor key={menu.chave} menu={menu} destinos={destinos} onSalvo={carregar} />}
        {config && <ConfigForm key={config.chave} config={config} valorInicial={configs[config.chave]} />}
      </div>
    </div>
  );
}
