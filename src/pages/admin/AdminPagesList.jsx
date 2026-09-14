import { TableSkeleton, EmptyRow } from '../../components/admin/AdminUI';
import { useConfirm } from '../../components/admin/ConfirmModal';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, File, ExternalLink } from 'lucide-react';
import { apiFetch } from '../../api';
import { withProgramaScope } from '../../auth';
import { LastEdited } from '../../components/AuditInfo';
import { useBulkSelection, SelectAllCheckbox, RowCheckbox, BulkActionBar, bulkDelete } from '../../components/admin/BulkActions';
import useUsers from '../../hooks/useUsers';

const AdminPagesList = () => {
  const [pages, setPages] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const users = useUsers();
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    apiFetch('/api/programas')
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setProgramas(Array.isArray(d) ? d : []));
  }, []);

  const programaById = (id) => programas.find((p) => p.id === id);

  const fetchPages = async () => {
    try {
      const response = await apiFetch(withProgramaScope('/api/pages'));
      if (response.ok) {
        const data = await response.json();
        setPages(data);
      }
    } catch (error) {
      console.error('Erro ao buscar páginas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleDelete = async (id) => {
    if (await confirm('Tem certeza que deseja excluir esta página?')) {
      try {
        const response = await apiFetch(`/api/pages/${id}`, { method: 'DELETE' });

        if (response.ok) {
          fetchPages();
        } else if (response.status === 401) {
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Erro ao excluir página:', error);
      }
    }
  };

  const filteredPages = pages.filter(item => {
    const title = item.title || '';
    const slug = item.slug || '';
    const bodyText = item.body?.value || '';
    const query = searchQuery.toLowerCase();
    return title.toLowerCase().includes(query) || slug.toLowerCase().includes(query) || bodyText.toLowerCase().includes(query);
  });

  const { selectedIds, selectedCount, isSelected, toggle, toggleAll, clear, allSelected, someSelected } = useBulkSelection(filteredPages);

  const handleBulkDelete = async () => {
    if (!selectedCount) return;
    if (!await confirm(`Excluir ${selectedCount === 1 ? 'a página selecionada' : `as ${selectedCount} páginas selecionadas`}? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    await bulkDelete('/api/pages', selectedIds, { onUnauthorized: () => navigate('/admin/login') });
    setDeleting(false);
    clear();
    fetchPages();
  };

  if (loading) {
    return (
      <TableSkeleton />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ufrpe-blue flex items-center gap-2">
            <File className="text-ufrpe-blue" size={24} />
            Gerenciar Páginas Customizadas
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Criação de páginas institucionais com conteúdos ricos e URLs dinâmicas
          </p>
        </div>
        <Link 
          to="/admin/paginas/nova" 
          className="bg-ufrpe-blue hover:bg-[#2a3a66] text-white px-4 py-2.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Nova Página
        </Link>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por título, slug ou conteúdo..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm placeholder-gray-400"
        />
      </div>

      <BulkActionBar count={selectedCount} onDelete={handleBulkDelete} onClear={clear} deleting={deleting} />

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 w-px">
                <SelectAllCheckbox allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} disabled={filteredPages.length === 0} />
              </th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 w-1/3">Título</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Programa</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 w-1/3">Link Público</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right w-1/5">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredPages.map((item) => (
              <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isSelected(item.id) ? 'bg-ufrpe-blue/5' : ''}`}>
                <td className="px-6 py-4">
                  <RowCheckbox checked={isSelected(item.id)} onToggle={() => toggle(item.id)} label={`Selecionar ${item.title}`} />
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 pr-10" title={item.title}>
                  {item.title}
                  <LastEdited criadoPor={item.criado_por} atualizadoPor={item.atualizado_por} users={users} className="mt-0.5" />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.programaId ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-ufrpe-blue/10 text-ufrpe-blue">
                      {(() => {
                        const p = programaById(item.programaId);
                        if (!p) return 'Programa';
                        return p.sigla && p.sigla !== 'S/SIGLA' ? p.sigla : p.nome;
                      })()}
                    </span>
                  ) : (
                    <span className="text-gray-400">— Geral —</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <a
                    href={`/p/${item.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ufrpe-blue hover:underline inline-flex items-center gap-1.5 font-medium"
                  >
                    /p/{item.slug}
                    <ExternalLink size={14} />
                  </a>
                  {item.programaId && programaById(item.programaId)?.slug && (
                    <a
                      href={`/${programaById(item.programaId).slug}/sobre`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:underline inline-flex items-center gap-1.5 mt-1"
                    >
                      /{programaById(item.programaId).slug}/sobre
                      <ExternalLink size={12} />
                    </a>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right">
                  <div className="flex justify-end gap-3">
                    <Link 
                      to={`/admin/paginas/editar/${item.id}`}
                      className="text-ufrpe-blue hover:text-ufrpe-yellow bg-ufrpe-blue/5 hover:bg-ufrpe-blue/10 p-1.5 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPages.length === 0 && (
              <EmptyRow colSpan={5} message="Nenhuma página institucional encontrada." />
            )}
          </tbody>
        </table>
      </div>
      {ConfirmModal}
    </div>
  );
};

export default AdminPagesList;
