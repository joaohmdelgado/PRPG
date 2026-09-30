// Achado de segurança de 30/09/2026: os importadores de alunos e professores
// criavam contas com a senha padrão sem marcar `senha_temporaria`. Este script
// confere (bcrypt) quais contas ainda têm a senha padrão e as marca como
// provisórias, para o primeiro acesso exigir a troca. Não altera nenhuma senha.
//
//   npm run senhas:padrao             simulação: lista as contas, nada é gravado
//   npm run senhas:padrao -- --gravar marca senha_temporaria = TRUE nelas
//
// Idempotente: contas já marcadas (ou que já trocaram a senha) não entram.
import 'dotenv/config';
import { pool } from '../db/pool.js';
import { localizarContasComSenhaPadrao, marcarSenhaTemporaria } from '../services/senhaPadrao.js';

const gravar = process.argv.includes('--gravar');

try {
  const { examinadas, achadas } = await localizarContasComSenhaPadrao();
  console.log(`[Senhas] ${examinadas} conta(s) sem a marca de senha provisória examinada(s); ${achadas.length} com a senha padrão.`);
  for (const c of achadas) console.log(`  ${c.email}`);
  if (!gravar) {
    console.log('SIMULAÇÃO — nada gravado. Use --gravar para marcar as contas.');
  } else {
    const n = await marcarSenhaTemporaria(achadas.map((c) => c.id));
    console.log(`[Senhas] ${n} conta(s) marcada(s) como senha provisória.`);
  }
} catch (e) {
  console.error('[Senhas] falhou:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
