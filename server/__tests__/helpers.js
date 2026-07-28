import bcrypt from 'bcryptjs';
import request from 'supertest';
import { pool } from '../db/pool.js';
import { app } from '../app.js';
import { usersRepo } from '../db/repositories.js';

const TABLES = `news, editais, resolucoes, formularios, portarias, teses_dissertacoes,
  faq, disciplinas, bolsas, pages, users, taxonomias, grupos_pesquisa,
  calendarios, calendario_milestones, programas, programa_paginas, pessoas,
  modalidades, vinculos, metricas_anuais,
  inscricoes_proficiencia,
  processos, camara_reunioes, camara_pauta_itens,
  camara_relatorias, camara_atos,
  arquivos, anexos, contatos, eventos,
  ato_series, atos, ato_referencias, documentos, declaracoes`;

export async function resetDb() {
  await pool.query(`TRUNCATE ${TABLES} RESTART IDENTITY CASCADE`);
  // vocabularios nao entra em TABLES (seed proprio, como unidades), mas
  // TRUNCATE ... CASCADE em `programas` arrasta junto por causa da FK
  // vocabularios.programa_id -> programas(id) ON DELETE CASCADE. Reseeda
  // o vocabulario global (programa_id IS NULL) se ficou vazio.
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM vocabularios');
  if (rows[0].n === 0) await reseedVocabularios();
}

async function reseedVocabularios() {
  await pool.query(`
    INSERT INTO vocabularios (dominio, valor, rotulo, cor, ordem) VALUES
      ('processo.situacao', 'RECEBIDO', 'Recebido', 'bg-gray-100 text-gray-700', 0),
      ('processo.situacao', 'APTO_PAUTA', 'Apto para pauta', 'bg-sky-100 text-sky-800', 2),
      ('processo.situacao', 'PUBLICADO', 'Publicado', 'bg-green-100 text-green-800', 8),
      ('processo.pauta.deliberacao', 'APROVADO', 'Aprovado', NULL, 0),
      ('evento.tipo', 'TRAMITACAO', 'Tramitação', NULL, 0),
      ('evento.tipo', 'STATUS', 'Status', NULL, 1),
      ('vinculo.papel', 'COORDENADOR', 'Coordenador(a)', NULL, 0),
      ('vinculo.papel', 'SECRETARIO', 'Secretário(a)', NULL, 3)
    ON CONFLICT (dominio, valor, COALESCE(programa_id, '')) DO NOTHING
  `);
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
