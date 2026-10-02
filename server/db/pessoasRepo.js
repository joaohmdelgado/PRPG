// Fase D (Legado Drupal, PLANO.md): resolução compartilhada de identidade.
// Extraído de posDoutoradoRepo.js (Fase C) para ser reusado por qualquer
// módulo que hoje guarda "pessoa como string" (teses/disciplinas/bolsas) e
// precisa migrar para uma referência real em `pessoas` — ver
// arquitetura-dados.md §2.1.
import crypto from 'crypto';
import { query } from './pool.js';
import { normalizarCpf, cpfValido } from '../utils/cpf.js';

// Cria uma pessoa mínima (nome + CPF/e-mail opcionais) quando o combobox não
// encontrou cadastro — mesmo caminho usado para o pós-doutorando e para o
// (co)supervisor sem `pessoas` prévia.
export const resolverOuCriarPessoa = async ({ pessoaId, nome, cpf, email, telefone }) => {
  if (pessoaId) {
    const { rows } = await query('SELECT id FROM pessoas WHERE id = $1', [pessoaId]);
    if (rows[0]) return rows[0].id;
    // O painel manda users.id: resolve para a pessoa ligada ao login (B.13 / G1:
    // todo login tem pessoa — ela nasce antes dele, no usersRepo.create).
    const { rows: viaUser } = await query('SELECT pessoa_id FROM users WHERE id = $1', [pessoaId]);
    if (viaUser[0]?.pessoa_id) return viaUser[0].pessoa_id;
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
