import { TableSkeleton } from '../../components/admin/AdminUI';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import { API_URL } from '../../api';

const auth = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const AdminTaxonomias = () => {
  const [taxonomias, setTaxonomias] = useState({
    entradas: [],
    linhas_pesquisa: [],
    subcategorias_resolucao: [],
    tipo_bolsa: [],
  });
  const [newEntrada, setNewEntrada] = useState('');
  const [newLinha, setNewLinha] = useState({ label: '', target_id: '' });
  const [newSubcategoria, setNewSubcategoria] = useState('');
  const [newTipoBolsa, setNewTipoBolsa] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('entradas');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchTaxonomias(); }, []);

  const fetchTaxonomias = async () => {
    try {
      const response = await fetch(`${API_URL}/api/taxonomias`);
      if (response.ok) {
        const data = await response.json();
        setTaxonomias({
          entradas: data.entradas || [],
          linhas_pesquisa: (data.linhas_pesquisa || []).map((l) =>
            typeof l === 'object' ? l : { label: l, target_id: null }
          ),
          subcategorias_resolucao: data.subcategorias_resolucao || [],
          tipo_bolsa: data.tipo_bolsa || [],
        });
      }
    } catch {
      setError('Erro ao carregar taxonomias');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    try {
      const response = await fetch(`${API_URL}/api/taxonomias`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify(updatedData),
      });
      if (response.ok) {
        const data = await response.json();
        setTaxonomias({
          entradas: data.entradas || [],
          linhas_pesquisa: (data.linhas_pesquisa || []).map((l) =>
            typeof l === 'object' ? l : { label: l, target_id: null }
          ),
          subcategorias_resolucao: data.subcategorias_resolucao || [],
          tipo_bolsa: data.tipo_bolsa || [],
        });
        setSuccess('Salvo.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Erro ao salvar taxonomia');
      }
    } catch {
      setError('Erro de conexão ao salvar');
    }
  };

  const addEntrada = () => {
    if (!newEntrada.trim()) return;
    const updated = { ...taxonomias, entradas: [...taxonomias.entradas, newEntrada.trim()] };
    setTaxonomias(updated);
    setNewEntrada('');
    handleSave(updated);
  };
  const removeEntrada = (index) => {
    const updated = { ...taxonomias, entradas: taxonomias.entradas.filter((_, i) => i !== index) };
    setTaxonomias(updated);
    handleSave(updated);
  };

  const addLinha = () => {
    const label = newLinha.label.trim();
    if (!label) return;
    if (taxonomias.linhas_pesquisa.some((l) => l.label === label)) {
      setError('Linha já cadastrada.');
      return;
    }
    const target_id = newLinha.target_id.trim() || null;
    const updated = {
      ...taxonomias,
      linhas_pesquisa: [...taxonomias.linhas_pesquisa, { label, target_id }],
    };
    setTaxonomias(updated);
    setNewLinha({ label: '', target_id: '' });
    setError('');
    handleSave(updated);
  };
  const removeLinha = (index) => {
    const updated = { ...taxonomias, linhas_pesquisa: taxonomias.linhas_pesquisa.filter((_, i) => i !== index) };
    setTaxonomias(updated);
    handleSave(updated);
  };
  const updateLinhaTargetId = (index, value) => {
    const updated = {
      ...taxonomias,
      linhas_pesquisa: taxonomias.linhas_pesquisa.map((l, i) =>
        i === index ? { ...l, target_id: value.trim() || null } : l
      ),
    };
    setTaxonomias(updated);
    handleSave(updated);
  };

  const addSubcategoria = () => {
    if (!newSubcategoria.trim()) return;
    const updated = { ...taxonomias, subcategorias_resolucao: [...(taxonomias.subcategorias_resolucao || []), newSubcategoria.trim()] };
    setTaxonomias(updated);
    setNewSubcategoria('');
    handleSave(updated);
  };
  const removeSubcategoria = (index) => {
    const updated = { ...taxonomias, subcategorias_resolucao: (taxonomias.subcategorias_resolucao || []).filter((_, i) => i !== index) };
    setTaxonomias(updated);
    handleSave(updated);
  };

  const addTipoBolsa = () => {
    if (!newTipoBolsa.trim()) return;
    const updated = { ...taxonomias, tipo_bolsa: [...(taxonomias.tipo_bolsa || []), newTipoBolsa.trim()] };
    setTaxonomias(updated);
    setNewTipoBolsa('');
    handleSave(updated);
  };
  const removeTipoBolsa = (index) => {
    const updated = { ...taxonomias, tipo_bolsa: (taxonomias.tipo_bolsa || []).filter((_, i) => i !== index) };
    setTaxonomias(updated);
    handleSave(updated);
  };

  const handleTabChange = (tab) => { setActiveTab(tab); setSearchQuery(''); };

  if (loading) return <TableSkeleton />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-2">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin" className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gerenciar Taxonomias</h2>
          <p className="text-sm text-gray-500">Configure as listas de opções e subcategorias dinâmicas do sistema</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 border border-red-100">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-4 border border-green-100">{success}</div>}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto gap-2">
        {[
          { key: 'entradas', label: `Períodos de Entrada (${taxonomias.entradas.length})` },
          { key: 'linhas_pesquisa', label: `Linhas de Pesquisa (${taxonomias.linhas_pesquisa.length})` },
          { key: 'subcategorias_resolucao', label: `Subcategorias de Resolução (${(taxonomias.subcategorias_resolucao || []).length})` },
          { key: 'tipo_bolsa', label: `Tipos de Bolsa (${(taxonomias.tipo_bolsa || []).length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => handleTabChange(key)}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all shrink-0 ${activeTab === key ? 'border-ufrpe-blue text-ufrpe-blue' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Linhas de pesquisa — tab especial */}
      {activeTab === 'linhas_pesquisa' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-4">
            As linhas cadastradas aqui são as <strong>oficiais</strong> da PRPG e podem ser selecionadas pelos programas.
            O <strong>ID legado</strong> é o <code>target_id</code> do Drupal — necessário para mapeamento na importação.
          </p>
          {/* Adicionar */}
          <div className="flex flex-wrap gap-2 mb-6">
            <input
              type="text"
              placeholder="Nome da linha de pesquisa"
              value={newLinha.label}
              onChange={(e) => setNewLinha((v) => ({ ...v, label: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addLinha()}
              className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ufrpe-yellow outline-none"
            />
            <input
              type="text"
              placeholder="ID legado (target_id)"
              value={newLinha.target_id}
              onChange={(e) => setNewLinha((v) => ({ ...v, target_id: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addLinha()}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-ufrpe-yellow outline-none"
            />
            <button onClick={addLinha}
              className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-5 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm transition-all shadow-sm shrink-0">
              <Plus size={16} /> Adicionar
            </button>
          </div>
          {/* Busca */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar linhas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-ufrpe-yellow outline-none"
            />
          </div>
          {/* Lista */}
          {taxonomias.linhas_pesquisa.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-500 text-sm">Nenhuma linha de pesquisa cadastrada.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
              {taxonomias.linhas_pesquisa
                .filter((l) => !searchQuery.trim() || l.label.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((l, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50 transition-colors">
                    <span className="flex-1 text-sm text-gray-700">{l.label}</span>
                    <TargetIdInput
                      value={l.target_id || ''}
                      onSave={(val) => updateLinhaTargetId(taxonomias.linhas_pesquisa.indexOf(l), val)}
                    />
                    <button onClick={() => removeLinha(taxonomias.linhas_pesquisa.indexOf(l))}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
            </div>
          )}
          {taxonomias.linhas_pesquisa.length > 0 && (
            <p className="text-xs text-gray-400 mt-2 text-right">{taxonomias.linhas_pesquisa.length} linha(s)</p>
          )}
        </div>
      ) : (
        /* Tabs genéricas */
        <SimpleListTab
          items={
            activeTab === 'entradas' ? taxonomias.entradas :
            activeTab === 'tipo_bolsa' ? (taxonomias.tipo_bolsa || []) :
            (taxonomias.subcategorias_resolucao || [])
          }
          placeholder={
            activeTab === 'entradas' ? 'Novo período (Ex: 2024.1)' :
            activeTab === 'tipo_bolsa' ? 'Novo tipo de bolsa (Ex: CNPq - Mestrado)' :
            'Nova subcategoria (Ex: Credenciamento de Docentes)'
          }
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={(val) => {
            if (activeTab === 'entradas') {
              const updated = { ...taxonomias, entradas: [...taxonomias.entradas, val] };
              setTaxonomias(updated); handleSave(updated); setNewEntrada('');
            } else if (activeTab === 'tipo_bolsa') {
              const updated = { ...taxonomias, tipo_bolsa: [...(taxonomias.tipo_bolsa || []), val] };
              setTaxonomias(updated); handleSave(updated); setNewTipoBolsa('');
            } else {
              const updated = { ...taxonomias, subcategorias_resolucao: [...(taxonomias.subcategorias_resolucao || []), val] };
              setTaxonomias(updated); handleSave(updated); setNewSubcategoria('');
            }
          }}
          onRemove={(idx) => {
            let updated;
            if (activeTab === 'entradas') {
              updated = { ...taxonomias, entradas: taxonomias.entradas.filter((_, i) => i !== idx) };
            } else if (activeTab === 'tipo_bolsa') {
              updated = { ...taxonomias, tipo_bolsa: (taxonomias.tipo_bolsa || []).filter((_, i) => i !== idx) };
            } else {
              updated = { ...taxonomias, subcategorias_resolucao: (taxonomias.subcategorias_resolucao || []).filter((_, i) => i !== idx) };
            }
            setTaxonomias(updated); handleSave(updated);
          }}
        />
      )}
    </div>
  );
};

function SimpleListTab({ items, placeholder, searchQuery, onSearchChange, onAdd, onRemove }) {
  const [val, setVal] = useState('');
  const filtered = searchQuery.trim() ? items.filter((i) => i.toLowerCase().includes(searchQuery.toLowerCase())) : items;
  const handle = () => { if (!val.trim()) return; onAdd(val.trim()); setVal(''); };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex gap-2 w-full md:max-w-lg">
          <input type="text" placeholder={placeholder} value={val}
            onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handle()}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ufrpe-yellow outline-none" />
          <button onClick={handle}
            className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold text-sm transition-all shadow-sm shrink-0">
            <Plus size={18} /> Adicionar
          </button>
        </div>
        <div className="relative w-full md:max-w-xs shrink-0">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input type="text" placeholder="Buscar itens..." value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50/50 focus:ring-2 focus:ring-ufrpe-yellow outline-none" />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-sm">{searchQuery ? 'Nenhum resultado.' : 'Nenhum item cadastrado.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-gray-50/50 hover:bg-gray-50/80 p-4 rounded-xl border border-gray-200 transition-all group">
              <span className="text-sm font-medium text-gray-700 truncate mr-4">{item}</span>
              <button onClick={() => onRemove(items.indexOf(item))}
                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TargetIdInput({ value, onSave }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const handleBlur = () => { if (local !== value) onSave(local); };
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
      placeholder="ID legado"
      title="ID legado (target_id do Drupal)"
      className="w-32 border border-gray-200 rounded px-2 py-1 text-xs font-mono text-gray-500 focus:ring-1 focus:ring-ufrpe-blue/30 outline-none"
    />
  );
}

export default AdminTaxonomias;
