// Fase A.2 (G1) do PLANO.md: cria uma linha em `pessoas` para cada `users` que
// ainda nao tem `pessoa_id`, usando o mapeamento decidido na inspecao A.2a
// (arquitetura-dados.md SS5.1). Idempotente: só age sobre pessoa_id IS NULL.
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pool, query } from './pool.js';

export async function backfillPessoas() {
  const { rows: users } = await query(
    `SELECT id, perfil_nome, perfil_cpf, perfil_siape, perfil_foto_url, perfil_telefones,
            acad_lattes, acad_orcid, acad_google_scholar, acad_publons,
            perfil_aluno, perfil_professor
     FROM users WHERE pessoa_id IS NULL`
  );

  let criadas = 0;
  for (const u of users) {
    const perfil = u.perfil_aluno || u.perfil_professor || {};
    const sexo = perfil.sexo ?? null;
    const nacionalidade = perfil.nacionalidade || null;
    const estrangeiro = !!perfil.estrangeiro;
    const telefones = Array.isArray(u.perfil_telefones) && u.perfil_telefones.length
      ? u.perfil_telefones.join(', ')
      : null;
    const pessoaId = crypto.randomUUID();

    await query(
      `INSERT INTO pessoas
        (id, nome, cpf, siape, sexo, nacionalidade, estrangeiro, foto_url, telefones,
         lattes, orcid, google_scholar, publons)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [pessoaId, u.perfil_nome || null, u.perfil_cpf || null, u.perfil_siape || null,
       sexo, nacionalidade, estrangeiro, u.perfil_foto_url || null, telefones,
       u.acad_lattes || null, u.acad_orcid || null, u.acad_google_scholar || null,
       u.acad_publons || null]
    );
    await query('UPDATE users SET pessoa_id = $1 WHERE id = $2', [pessoaId, u.id]);
    criadas++;
  }
  return { criadas, total: users.length };
}

// Executado diretamente (node server/db/backfill-pessoas.mjs): roda uma vez e encerra o pool.
// Via import (migrate.mjs): so a função, o chamador controla o pool.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  backfillPessoas()
    .then(({ criadas, total }) => {
      console.log(`pessoas criadas e vinculadas: ${criadas}/${total}`);
      return pool.end();
    })
    .catch(async (e) => {
      console.error('Falha no backfill de pessoas:', e);
      await pool.end();
      process.exit(1);
    });
}
