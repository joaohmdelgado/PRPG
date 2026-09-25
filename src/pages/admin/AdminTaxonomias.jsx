import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TaxonomiaRefManager from '../../components/admin/TaxonomiaRefManager';
import VocabularioManager from '../../components/admin/VocabularioManager';

// Classificações de conteúdo (Fase F.4): moram em `vocabularios`. Antes eram
// listas fixas no código (categorias de notícia/edital, seções de documentos)
// ou listas soltas em `taxonomias` (subcategoria de resolução, tipo de bolsa).
const VOCAB_TABS = [
  { key: 'noticia.categoria', label: 'Categorias de Notícia', placeholder: 'Nova categoria (ex.: Extensão)', descricao: 'Aparecem no formulário de notícia e no filtro de /noticias; a cor é a do selo no site.', comCor: true },
  { key: 'edital.categoria', label: 'Categorias de Edital', placeholder: 'Nova categoria (ex.: Pós-Doutorado)', descricao: 'Agrupam os editais na página pública, na ordem definida aqui.' },
  { key: 'documento.secao', label: 'Seções de Documentos', placeholder: 'Nova seção', descricao: 'Seções das páginas de Resoluções e Formulários, na ordem definida aqui.' },
  { key: 'resolucao.subcategoria', label: 'Subcategorias de Resolução', placeholder: 'Nova subcategoria (ex.: Credenciamento de Docentes)' },
  { key: 'bolsa.tipo', label: 'Tipos de Bolsa', placeholder: 'Novo tipo de bolsa (ex.: CNPq - Mestrado)' },
];

// Listas do cadastro de aluno, em taxonomia_refs (CRUD com programa + ID legado).
const REF_TABS = [
  { key: 'entrada', label: 'Períodos de Entrada', valorPlaceholder: 'ex.: 2024.1' },
  { key: 'situacao_aluno', label: 'Situação do Aluno', valorPlaceholder: 'ex.: Matriculado' },
];

const AdminTaxonomias = () => {
  const [activeTab, setActiveTab] = useState(VOCAB_TABS[0].key);
  const vocabTab = VOCAB_TABS.find((t) => t.key === activeTab);
  const refTab = REF_TABS.find((t) => t.key === activeTab);

  const tabBtn = (key, label) => (
    <button key={key} type="button" onClick={() => setActiveTab(key)} aria-pressed={activeTab === key}
      className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all shrink-0 ${activeTab === key ? 'border-ufrpe-blue text-ufrpe-blue' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-2">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin" aria-label="Voltar" className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Classificações</h2>
          <p className="text-sm text-gray-500">Categorias, seções e listas de opções usadas no site e no painel — editáveis sem precisar de desenvolvedor.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto gap-2">
        {VOCAB_TABS.map((t) => tabBtn(t.key, t.label))}
        {REF_TABS.map((t) => tabBtn(t.key, t.label))}
      </div>

      {vocabTab && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <VocabularioManager key={vocabTab.key} dominio={vocabTab.key} placeholder={vocabTab.placeholder} descricao={vocabTab.descricao} comCor={!!vocabTab.comCor} />
        </div>
      )}

      {refTab && (
        <>
          <p className="text-sm text-gray-500 mb-4 -mt-2">
            Lista usada no cadastro do aluno. O <span className="font-mono">ID legado</span> é
            opcional e serve apenas para a importação do site antigo (pode variar por programa).
          </p>
          <TaxonomiaRefManager key={refTab.key} campo={refTab.key} valorPlaceholder={refTab.valorPlaceholder} />
        </>
      )}
    </div>
  );
};

export default AdminTaxonomias;
