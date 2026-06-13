import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import { API_URL } from '../../api';

const AdminTaxonomias = () => {
  const [taxonomias, setTaxonomias] = useState({ entradas: [], linhas_pesquisa: [], subcategorias_resolucao: [], tipo_bolsa: [] });
  const [newEntrada, setNewEntrada] = useState('');
  const [newLinha, setNewLinha] = useState('');
  const [newSubcategoria, setNewSubcategoria] = useState('');
  const [newTipoBolsa, setNewTipoBolsa] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeTab, setActiveTab] = useState('entradas'); // 'entradas', 'linhas_pesquisa', 'subcategorias_resolucao', 'tipo_bolsa'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTaxonomias();
  }, []);

  const fetchTaxonomias = async () => {
    try {
      const response = await fetch(`${API_URL}/api/taxonomias`);
      if (response.ok) {
        const data = await response.json();
        setTaxonomias({
          entradas: data.entradas || [],
          linhas_pesquisa: data.linhas_pesquisa || [],
          subcategorias_resolucao: data.subcategorias_resolucao || [],
          tipo_bolsa: data.tipo_bolsa || []
        });
      }
    } catch (err) {
      setError('Erro ao carregar taxonomias');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    try {
      const response = await fetch(`${API_URL}/api/taxonomias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedData)
      });
      if (response.ok) {
        setSuccess('Taxonomia atualizada com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Erro ao salvar taxonomia');
      }
    } catch (err) {
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
    if (!newLinha.trim()) return;
    const updated = { ...taxonomias, linhas_pesquisa: [...taxonomias.linhas_pesquisa, newLinha.trim()] };
    setTaxonomias(updated);
    setNewLinha('');
    handleSave(updated);
  };

  const removeLinha = (index) => {
    const updated = { ...taxonomias, linhas_pesquisa: taxonomias.linhas_pesquisa.filter((_, i) => i !== index) };
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const getPlaceholder = () => {
    if (activeTab === 'entradas') return "Novo período (Ex: 2024.1)";
    if (activeTab === 'linhas_pesquisa') return "Nova linha (Ex: Inteligência Artificial)";
    if (activeTab === 'tipo_bolsa') return "Novo tipo de bolsa (Ex: CNPq - Mestrado)";
    return "Nova subcategoria (Ex: Credenciamento de Docentes)";
  };

  const getNewValue = () => {
    if (activeTab === 'entradas') return newEntrada;
    if (activeTab === 'linhas_pesquisa') return newLinha;
    if (activeTab === 'tipo_bolsa') return newTipoBolsa;
    return newSubcategoria;
  };

  const handleNewValueChange = (val) => {
    if (activeTab === 'entradas') setNewEntrada(val);
    else if (activeTab === 'linhas_pesquisa') setNewLinha(val);
    else if (activeTab === 'tipo_bolsa') setNewTipoBolsa(val);
    else setNewSubcategoria(val);
  };

  const handleAdd = () => {
    if (activeTab === 'entradas') addEntrada();
    else if (activeTab === 'linhas_pesquisa') addLinha();
    else if (activeTab === 'tipo_bolsa') addTipoBolsa();
    else addSubcategoria();
  };

  const handleRemove = (originalIndex) => {
    if (activeTab === 'entradas') removeEntrada(originalIndex);
    else if (activeTab === 'linhas_pesquisa') removeLinha(originalIndex);
    else if (activeTab === 'tipo_bolsa') removeTipoBolsa(originalIndex);
    else removeSubcategoria(originalIndex);
  };

  const getActiveList = () => {
    if (activeTab === 'entradas') return taxonomias.entradas || [];
    if (activeTab === 'linhas_pesquisa') return taxonomias.linhas_pesquisa || [];
    if (activeTab === 'tipo_bolsa') return taxonomias.tipo_bolsa || [];
    return taxonomias.subcategorias_resolucao || [];
  };

  const filteredList = () => {
    const list = getActiveList();
    if (!searchQuery.trim()) return list;
    return list.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const getOriginalIndex = (item) => {
    const list = getActiveList();
    return list.indexOf(item);
  };

  if (loading) return <div className="p-6 text-center text-gray-500 font-medium">Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-2">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin" className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gerenciar Taxonomias</h2>
          <p className="text-sm text-gray-500">Configure as listas de opções e subcategorias dinâmicas do sistema</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 border border-green-100">{success}</div>}

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto gap-2">
        <button
          onClick={() => handleTabChange('entradas')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'entradas'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Períodos de Entrada ({taxonomias.entradas.length})
        </button>
        <button
          onClick={() => handleTabChange('linhas_pesquisa')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'linhas_pesquisa'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Linhas de Pesquisa ({taxonomias.linhas_pesquisa.length})
        </button>
        <button
          onClick={() => handleTabChange('subcategorias_resolucao')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'subcategorias_resolucao'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Subcategorias de Resolução ({(taxonomias.subcategorias_resolucao || []).length})
        </button>
        <button
          onClick={() => handleTabChange('tipo_bolsa')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'tipo_bolsa'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Tipos de Bolsa ({(taxonomias.tipo_bolsa || []).length})
        </button>
      </div>

      {/* Tab Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {/* Tab Header with Input & Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
          <div className="flex gap-2 w-full md:max-w-lg">
            <input
              type="text"
              placeholder={getPlaceholder()}
              value={getNewValue()}
              onChange={(e) => handleNewValueChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
            />
            <button
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold text-sm transition-all shadow-sm hover:shadow active:scale-95 shrink-0"
            >
              <Plus size={18} /> Adicionar
            </button>
          </div>

          <div className="relative w-full md:max-w-xs shrink-0">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar itens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm bg-gray-50/50"
            />
          </div>
        </div>

        {/* List of items */}
        {filteredList().length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500 text-sm font-medium">
              {searchQuery ? "Nenhum resultado corresponde à busca." : "Nenhum item cadastrado nesta categoria."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredList().map((item, idx) => {
              const originalIndex = getOriginalIndex(item);
              return (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-gray-50/50 hover:bg-gray-50/80 p-4 rounded-xl border border-gray-200 transition-all hover:shadow-sm group"
                >
                  <span className="text-sm font-medium text-gray-700 truncate mr-4">{item}</span>
                  <button
                    onClick={() => handleRemove(originalIndex)}
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remover item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTaxonomias;
