import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api';
import { getUserId, destinoPadrao, destinoPermitido, clearSession } from '../../auth';
import { Field, Input } from '../../components/ui/Field';

// Troca obrigatória de senha no primeiro acesso (senha provisória 'Mudar123' ou
// reset feito pelo admin). Enquanto a flag `senhaTemporaria` existir, o
// RequireAuth tranca o painel nesta página.
const AdminTrocarSenha = () => {
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (senha.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (senha !== confirma) {
      setError('A confirmação não confere com a nova senha.');
      return;
    }
    if (senha === 'Mudar123') {
      setError('Escolha uma senha diferente da senha provisória.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch(`/api/users/${getUserId()}`, {
        method: 'PUT',
        json: { password: senha },
      });

      if (response.ok) {
        localStorage.removeItem('senhaTemporaria');
        navigate(destinoPermitido(location.state?.de) || destinoPadrao(), { replace: true });
      } else if (response.status === 401) {
        navigate('/admin/login');
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.message || 'Não foi possível atualizar a senha.');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-ufrpe-blue flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="font-heading font-extrabold text-4xl text-white leading-none border-b-4 border-ufrpe-yellow pb-1.5 inline-block">
            PRPG
          </span>
          <p className="text-white/70 mt-4 font-heading tracking-wide">Pró-Reitoria de Pós-Graduação</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-2xl">
          <h1 className="font-heading text-xl font-semibold text-ufrpe-blue">Defina uma nova senha</h1>
          <p className="text-sm text-gray-600 mt-1 mb-6">
            Sua senha é provisória. Por segurança, escolha uma nova senha antes de continuar.
          </p>

          {error && (
            <div role="alert" className="bg-red-50 text-red-800 p-3 rounded-lg mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nova senha" required hint="Pelo menos 8 caracteres.">
              <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                className="px-4 py-2.5 rounded-lg" autoComplete="new-password" />
            </Field>
            <Field label="Confirme a nova senha" required>
              <Input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)}
                className="px-4 py-2.5 rounded-lg" autoComplete="new-password" />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ufrpe-blue text-white py-2.5 rounded-lg font-medium hover:bg-[#2a3a66] transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar e continuar'}
            </button>
          </form>

          <button
            type="button"
            onClick={logout}
            className="w-full mt-4 text-sm text-gray-600 hover:text-ufrpe-blue transition-colors"
          >
            Sair
          </button>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Pró-Reitoria de Pós-Graduação · UFRPE
        </p>
      </div>
    </div>
  );
};

export default AdminTrocarSenha;
