import { TableSkeleton } from '../../components/admin/AdminUI';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import { API_URL } from '../../api';
import TaxonomiaRefManager from '../../components/admin/TaxonomiaRefManager';

const auth = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// Abas baseadas em taxonomia_refs (CRUD completo, com programa + ID legado).
const REF_TABS = [
  { key: 'entrada', label: 'Períodos de Entrada', valorPlaceholder: 'ex.: 2024.1' },
  { key: 'situacao_aluno', label: 'Situação do Aluno', valorPlaceholder: 'ex.: Matriculado' },
];
// Abas de listas simples (taxonomias chave -> valores[]).
const SIMPLE_TABS = [
  { key: 'subcategorias_resolucao', label: 'Subcategorias de Resolução', placeholder: 'Nova subcategoria (Ex: Credenciamento de Docentes)' },
  { key: 'tipo_bolsa', label: 'Tipos de Bolsa', placeholder: 'Novo tipo de bolsa (Ex: CNPq - Mestrado)' },
];

const AdminTaxonomias = () => {
  const [taxonomias, setTaxonomias] = useState({ subcategorias_resolucao: [], tipo_bolsa: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('entrada');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchTaxonomias(); }, []);

  const fetchTaxonomias = async () => {
    try {
      const response = await fetch(`${API_URL}/api/taxonomias`);
      if (response.ok) {
        const data = await response.json();
        setTaxonomias({
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

  // As listas simples ainda são salvas em bloco via POST /api/taxonomias.
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

  const handleTabChange = (tab) => { setActiveTab(tab); setSearchQuery(''); };

  const simpleTab = SIMPLE_TABS.find((t) => t.key === activeTab);
  const refTab = REF_TABS.find((t) => t.key === activeTab);

  if (loading) return <TableSkeleton />;

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => handleTabChange(key)}
      className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all shrink-0 ${activeTab === key ? 'border-ufrpe-blue text-ufrpe-blue' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-2">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin" className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gerenciar Taxonomias</h2>
          <p className="text-sm text-gray-500">Configure as listas de opções dinâmicas do sistema</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 border border-red-100">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-4 border border-green-100">{success}</div>}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto gap-2">
        {REF_TABS.map((t) => tabBtn(t.key, t.label))}
        {SIMPLE_TABS.map((t) => tabBtn(t.key, `${t.label} (${(taxonomias[t.key] || []).length})`))}
      </div>

      {refTab && (
        <>
          <p className="text-sm text-gray-500 mb-4 -mt-2">
            Lista usada no cadastro do aluno. O <span className="font-mono">ID legado</span> é
            opcional e serve apenas para a importação do site antigo (pode variar por programa).
          </p>
          <TaxonomiaRefManager
            key={refTab.key}
            campo={refTab.key}
            valorPlaceholder={refTab.valorPlaceholder}
          />
        </>
      )}

      {simpleTab && (
        <SimpleListTab
          items={taxonomias[simpleTab.key] || []}
          placeholder={simpleTab.placeholder}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={(val) => {
            const updated = { ...taxonomias, [simpleTab.key]: [...(taxonomias[simpleTab.key] || []), val] };
            setTaxonomias(updated); handleSave(updated);
          }}
          onRemove={(idx) => {
            const updated = { ...taxonomias, [simpleTab.key]: (taxonomias[simpleTab.key] || []).filter((_, i) => i !== idx) };
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


export default AdminTaxonomias;
