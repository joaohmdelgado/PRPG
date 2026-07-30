// Fase D (Legado Drupal, PLANO.md): resolução compartilhada de identidade.
// Extraído de posDoutoradoRepo.js (Fase C) para ser reusado por qualquer
// módulo que hoje guarda "pessoa como string" (teses/disciplinas/bolsas) e
// precisa migrar para uma referência real em `pessoas` — ver
// arquitetura-dados.md §2.1.
import crypto from 'crypto';
import { query } from './pool.js';
import { normalizarCpf, cpfValido } from '../utils/cpf.js';

// Mesmo mapeamento de server/db/backfill-pessoas.mjs (Fase A.2/G1): cria uma
// pessoa a partir do perfil de um usuário que ainda não tinha uma, e já
// vincula users.pessoa_id (idempotente daí em diante).
const criarPessoaDeUsuario = async (userId) => {
  const { rows } = await query(
    `SELECT perfil_nome, perfil_cpf, perfil_siape, perfil_foto_url, perfil_telefones,
            acad_lattes, acad_orcid, acad_google_scholar, acad_publons,
            perfil_aluno, perfil_professor
     FROM users WHERE id = $1`,
    [userId]
  );
  const u = rows[0];
  if (!u) return null;
  const perfil = u.perfil_aluno || u.perfil_professor || {};
  const telefones = Array.isArray(u.perfil_telefones) && u.perfil_telefones.length
    ? u.perfil_telefones.join(', ')
    : null;
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO pessoas
      (id, nome, cpf, siape, sexo, nacionalidade, estrangeiro, foto_url, telefones,
       lattes, orcid, google_scholar, publons)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, u.perfil_nome || null, u.perfil_cpf || null, u.perfil_siape || null,
     perfil.sexo ?? null, perfil.nacionalidade || null, !!perfil.estrangeiro,
     u.perfil_foto_url || null, telefones, u.acad_lattes || null, u.acad_orcid || null,
     u.acad_google_scholar || null, u.acad_publons || null]
  );
  await query('UPDATE users SET pessoa_id = $1 WHERE id = $2', [id, userId]);
  return id;
};

// Cria uma pessoa mínima (nome + CPF/e-mail opcionais) quando o combobox não
// encontrou cadastro — mesmo caminho usado para o pós-doutorando e para o
// (co)supervisor sem `pessoas` prévia.
export const resolverOuCriarPessoa = async ({ pessoaId, nome, cpf, email, telefone }) => {
  if (pessoaId) {
    const { rows } = await query('SELECT id FROM pessoas WHERE id = $1', [pessoaId]);
    if (rows[0]) return rows[0].id;
    // pessoaId pode ser, na verdade, users.id (identidade polimórfica, como em vinculos.pessoa_id).
    const { rows: viaUser } = await query('SELECT id, pessoa_id FROM users WHERE id = $1', [pessoaId]);
    if (viaUser[0]?.pessoa_id) return viaUser[0].pessoa_id;
    // Usuário existe mas nunca ganhou uma pessoa (backfill sob demanda) —
    // sem isso, referências como autor_pessoa_id ficariam silenciosamente nulas.
    if (viaUser[0]) return criarPessoaDeUsuario(viaUser[0].id);
  }
  if (!nome || !String(nome).trim()) return null;
  const id = crypto.randomUUID();
  const cpfNorm = cpf ? normalizarCpf(cpf) : null;
  await query(
    `INSERT INTO pessoas (id, nome, cpf, cpf_valido, email_institucional, telefones)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, nome.trim(), cpfNorm, cpfNorm ? cpfValido(cpfNorm) : true, email || null, telefone || null]
  );
  return id;
};
