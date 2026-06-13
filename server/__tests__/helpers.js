import bcrypt from 'bcryptjs';
import request from 'supertest';
import { pool } from '../db/pool.js';
import { app } from '../app.js';
import { usersRepo } from '../db/repositories.js';

const TABLES = `news, editais, resolucoes, formularios, portarias, teses_dissertacoes,
  faq, disciplinas, bolsas, pages, users, taxonomias, grupos_pesquisa,
  calendarios, calendario_milestones, programas, pessoas, modalidades, vinculos`;

export async function resetDb() {
  await pool.query(`TRUNCATE ${TABLES} RESTART IDENTITY CASCADE`);
}

export async function seedAdmin() {
  const password_hash = await bcrypt.hash('admin123', 10);
  await usersRepo.create({
    id: 'admin-test',
    email: 'admin@test.com',
    password_hash,
    roles: ['Administrator'],
    perfil_geral: { nome: 'Admin Teste' },
  });
}

export async function loginAdmin() {
  const res = await request(app)
    .post('/api/login')
    .send({ username: 'admin@test.com', password: 'admin123' });
  return res.body.token;
}
