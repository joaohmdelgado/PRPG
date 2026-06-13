import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Trash2, Upload } from 'lucide-react';
import { API_URL } from '../../api';

const AdminPortariaForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    data_portaria: '',
    data_vencimento: '',
    downloadLink: ''
  });

  const [loading, setLoading] = useState(isEditing);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      const fetchPortaria = async () => {
        try {
          const response = await fetch(`${API_URL}/api/portarias/${id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setFormData({
              title: data.title || '',
              data_portaria: data.data_portaria || '',
              data_vencimento: data.data_vencimento || '',
              downloadLink: data.downloadLink || ''
            });
          } else {
            setError('Portaria não encontrada');
          }
        } catch (err) {
          setError('Erro de conexão ao buscar portaria');
        } finally {
          setLoading(false);
        }
      };
      fetchPortaria();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    setError('');

    const fileData = new FormData();
    fileData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: fileData
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          downloadLink: data.url
        }));
      } else {
        const errData = await response.json();
        setError(errData.message || 'Erro ao enviar o arquivo.');
      }
    } catch (error) {
      console.error('Erro de upload:', error);
      setError('Erro de conexão ao enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditing 
        ? `${API_URL}/api/portarias/${id}` 
        : `${API_URL}/api/portarias`;
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        navigate('/admin/portarias');
      } else if (response.status === 401 || response.status === 403) {
        navigate('/admin/login');
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao salvar portaria.');
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) return <div className="p-6">Carregando...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/portarias" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-2xl font-semibold text-gray-800">
          {isEditing ? 'Editar Portaria' : 'Nova Portaria'}
        </h2>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título / Número da Portaria *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
            placeholder="Ex: PORTARIA GR/UFRPE Nº 846/2025"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data da Portaria *</label>
            <input
              type="date"
              name="data_portaria"
              value={formData.data_portaria}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento (Opcional)</label>
            <input
              type="date"
              name="data_vencimento"
              value={formData.data_vencimento}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Documento da Portaria (PDF) *</label>
          {formData.downloadLink ? (
            <div className="flex items-center gap-3 bg-gray-50 p-3 border border-gray-300 rounded-md">
              <FileText className="text-red-500" size={24} />
              <a 
                href={`${API_URL}${formData.downloadLink}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-blue-600 hover:underline flex-grow truncate font-medium"
              >
                Visualizar PDF Anexado
              </a>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, downloadLink: '' }))}
                className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                title="Remover documento"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ) : (
            <div className="relative">
              {uploading ? (
                <div className="flex items-center gap-3 px-4 py-3 border border-dashed border-blue-300 rounded-lg bg-blue-50/50 text-blue-600 text-sm font-medium animate-pulse">
                  <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                  Enviando arquivo...
                </div>
              ) : (
                <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 hover:border-blue-400 rounded-lg cursor-pointer bg-gray-50 hover:bg-blue-50/30 transition-all focus-within:ring-2 focus-within:ring-blue-500">
                  <Upload className="text-gray-400 shrink-0" size={20} />
                  <div className="flex-grow min-w-0">
                    <span className="block text-sm font-medium text-gray-700">Selecionar PDF</span>
                    <span className="block text-xs text-gray-400">Clique para escolher</span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    required
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Link
            to="/admin/portarias"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-4"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || uploading || !formData.downloadLink}
            className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Portaria'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminPortariaForm;
