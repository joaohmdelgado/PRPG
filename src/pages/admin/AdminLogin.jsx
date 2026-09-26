import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api';
import { destinoPadrao, destinoPermitido } from '../../auth';
import { Field, Input } from '../../components/ui/Field';

// Entrada única do sistema (equipe e comunidade). Depois do login, cada papel
// vai ao seu lugar: a equipe ao painel, aluno e professor a /minha-conta. Se a
// pessoa tentou abrir uma tela protegida, volta para ela — desde que o perfil
// possa abri-la (Fase U.1).
const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/login', {
        method: 'POST',
        auth: false,
        json: { username, password },
      });

      const data = await response.json();

      if (response.ok) {
        const roles = data.roles || [];
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('roles', JSON.stringify(roles));
        if (data.nome) localStorage.setItem('nome', data.nome);
        if (data.gestorPrograma) {
          localStorage.setItem('gestorPrograma', JSON.stringify(data.gestorPrograma));
        } else {
          localStorage.removeItem('gestorPrograma');
        }
        // Senha provisória (padrão/reset): obriga a troca antes de liberar o painel.
        if (data.senhaTemporaria) {
          localStorage.setItem('senhaTemporaria', 'true');
          navigate('/admin/trocar-senha', { state: { de: location.state?.de } });
        } else {
          localStorage.removeItem('senhaTemporaria');
          navigate(destinoPermitido(location.state?.de, roles) || destinoPadrao(roles), { replace: true });
        }
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
      <main className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="font-heading font-extrabold text-4xl text-white leading-none border-b-4 border-ufrpe-yellow pb-1.5 inline-block">
            PRPG
          </span>
          <p className="text-white/70 mt-4 font-heading tracking-wide">Pró-Reitoria de Pós-Graduação</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl">
          <h1 className="font-heading text-xl font-semibold text-ufrpe-blue">Acesso restrito</h1>
          <p className="text-sm text-gray-600 mt-1 mb-6">Entre com suas credenciais institucionais.</p>

          {error && (
            <div role="alert" className="bg-red-50 text-red-800 p-3 rounded-lg mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="E-mail" required>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="px-4 py-2.5 rounded-lg"
              />
            </Field>
            <Field label="Senha" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="px-4 py-2.5 rounded-lg"
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ufrpe-blue text-white py-2.5 rounded-lg font-medium hover:bg-[#2a3a66] transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          Pró-Reitoria de Pós-Graduação · UFRPE
        </p>
      </main>
    </div>
  );
};

export default AdminLogin;
