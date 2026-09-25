import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

// Busca uma vez os nomes de quem pode ser autor de conteúdo, para resolver
// criado_por/atualizado_por (ver AuditInfo). Usa /api/users/resumo — só
// { id, nome } das contas da equipe —, não o cadastro completo com CPF e
// telefones. Sem permissão retorna lista vazia e a autoria não é exibida.
export default function useUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await apiFetch('/api/users/resumo');
        if (r.ok && active) setUsers(await r.json());
      } catch (e) {
        // silencioso
      }
    })();
    return () => { active = false; };
  }, []);

  return users;
}
