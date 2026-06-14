import bcrypt from 'bcryptjs';
import request from 'supertest';
import { pool } from '../db/pool.js';
import { app } from '../app.js';
import { usersRepo } from '../db/repositories.js';

const TABLES = `news, editais, resolucoes, formularios, portarias, teses_dissertacoes,
  faq, disciplinas, bolsas, pages, users, taxonomias, grupos_pesquisa,
  calendarios, calendario_milestones, programas, pessoas, modalidades, vinculos,
  metricas_anuais`;

export async function resetDb() {
  await pool.query(`TRUNCATE ${TABLES} RESTART IDENTITY CASCADE`);
}

// Cria um usuário com papel/perfil arbitrários (senha padrão "senha123").
export async function seedUser({ id, email, roles = ['Aluno'], perfil_geral = {}, password = 'senha123' }) {
  const password_hash = await bcrypt.hash(password, 10);
  return usersRepo.create({ id, email, password_hash, roles, perfil_geral });
}

export async function seedAdmin() {
  return seedUser({
    id: 'admin-test',
    email: 'admin@test.com',
    roles: ['Administrator'],
    perfil_geral: { nome: 'Admin Teste' },
    password: 'admin123',
  });
}

export async function login(email, password = 'senha123') {
  const res = await request(app).post('/api/login').send({ username: email, password });
  return res.body.token;
}

export async function loginAdmin() {
  return login('admin@test.com', 'admin123');
}

// Insere uma pessoa (legado) diretamente, para testar a resolução por pessoas.
export async function seedPessoa({ id, nome, cpf = '', siape = '' }) {
  await pool.query(
    'INSERT INTO pessoas (id, nome, cpf, siape) VALUES ($1, $2, $3, $4)',
    [id, nome, cpf, siape]
  );
}
