import { useState, useEffect } from 'react';
import { API_URL } from '../api';

// Busca a lista de usuários uma vez (para resolver criado_por/atualizado_por em
// nomes). Endpoint é restrito a Admin/Gestor; sem permissão retorna lista vazia
// e os componentes de autoria simplesmente não exibem nada.
export default function useUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (r.ok && active) setUsers(await r.json());
      } catch (e) {
        // silencioso
      }
    })();
    return () => { active = false; };
  }, []);

  return users;
}
