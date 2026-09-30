// Contas que ainda usam a senha padrão conhecida ('Mudar123'). Os importadores
// legados (alunos/professores) criavam o usuário com essa senha sem marcar
// `senha_temporaria`, então o primeiro acesso não forçava a troca. O hash é
// bcrypt, que o SQL não compara sozinho (sem pgcrypto); por isso a varredura
// é feita aqui, com bcryptjs, e só a marcação vai ao banco.
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';

export const SENHA_PADRAO = 'Mudar123';

// Contas com a senha padrão que ainda NÃO estão marcadas como provisórias.
export const localizarContasComSenhaPadrao = async () => {
  const { rows } = await query(
    `SELECT id, email, password_hash FROM users
      WHERE senha_temporaria IS NOT TRUE ORDER BY email`
  );
  const achadas = [];
  for (const r of rows) {
    if (await bcrypt.compare(SENHA_PADRAO, r.password_hash)) achadas.push({ id: r.id, email: r.email });
  }
  return { examinadas: rows.length, achadas };
};

// Marca as contas como provisórias (o login passa a devolver senhaTemporaria
// e o painel exige a troca). Não mexe em mais nada da conta.
export const marcarSenhaTemporaria = async (ids) => {
  if (!ids.length) return 0;
  const r = await query(
    'UPDATE users SET senha_temporaria = TRUE WHERE id = ANY($1) AND senha_temporaria IS NOT TRUE',
    [ids]
  );
  return r.rowCount;
};
