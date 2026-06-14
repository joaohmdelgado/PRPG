import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../api';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('roles', JSON.stringify(data.roles || []));
        navigate('/admin');
      } else {
        setError(data.message || 'Erro ao fazer login');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ufrpe-blue flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="font-heading font-extrabold text-4xl text-white leading-none border-b-4 border-ufrpe-yellow pb-1.5 inline-block">
            PRPG
          </span>
          <p className="text-white/55 mt-4 font-heading tracking-wide">Painel Administrativo</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-2xl">
          <h1 className="font-heading text-xl font-semibold text-ufrpe-blue">Acesso restrito</h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">Entre com suas credenciais institucionais.</p>

          {error && (
            <div className="bg-red-50 text-ufrpe-red p-3 rounded-lg mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ufrpe-blue text-white py-2.5 rounded-lg font-medium hover:bg-[#2a3a66] transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Pró-Reitoria de Pós-Graduação · UFRPE
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
