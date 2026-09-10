import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, '..');
let adminToken;
let uploadedUrl;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
  uploadedUrl = null;
});

afterEach(async () => {
  if (!uploadedUrl) return;
  const directory = uploadedUrl.startsWith('/private-uploads/') ? 'private-uploads' : 'uploads';
  await fs.rm(path.join(serverDir, directory, path.basename(uploadedUrl)), { force: true });
});

afterAll(async () => {
  await pool.end();
});

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

async function criarPeriodoAberto() {
  const res = await asAdmin(request(app).post('/api/editais')).send({
    title: 'Proficiência - comprovantes privados',
    proficiencia: true,
    field_periodo: { data_inicio: '2000-01-01', data_fim: '2999-12-31' },
  });
  return res.body.id;
}

describe('comprovantes de proficiência privados', () => {
  it('armazena o upload fora de /uploads e não o expõe anonimamente', async () => {
    const upload = await request(app)
      .post('/api/proficiencia/upload')
      .attach('file', Buffer.from('%PDF-1.4\n'), {
        filename: 'residencia.pdf',
        contentType: 'application/pdf',
      });

    uploadedUrl = upload.body.url;
    expect(upload.status).toBe(200);
    expect(upload.body.url).toMatch(/^\/private-uploads\/[0-9a-f-]+\.pdf$/);

    const publico = await request(app).get(upload.body.url);
    expect(publico.status).toBe(404);
  });

  it('entrega o comprovante apenas à equipe gestora autenticada', async () => {
    await criarPeriodoAberto();
    const upload = await request(app)
      .post('/api/proficiencia/upload')
      .attach('file', Buffer.from('%PDF-1.4\n'), {
        filename: 'residencia.pdf',
        contentType: 'application/pdf',
      });
    uploadedUrl = upload.body.url;

    const inscricao = await asAdmin(request(app).post('/api/proficiencia/inscricoes')).send({
      nome: 'Candidato de teste',
      cpf: '111.222.333-44',
      nivel: 'Mestrado',
      linguas: ['Inglês'],
      comprovanteResidenciaUrl: uploadedUrl,
    });
    expect(inscricao.status).toBe(201);

    const anonimo = await request(app)
      .get(`/api/proficiencia/inscricoes/${inscricao.body.id}/comprovantes/residencia`);
    expect(anonimo.status).toBe(401);

    const gestor = await asAdmin(request(app)
      .get(`/api/proficiencia/inscricoes/${inscricao.body.id}/comprovantes/residencia`));
    expect(gestor.status).toBe(200);
    expect(gestor.headers['content-type']).toContain('application/pdf');
    expect(gestor.headers['cache-control']).toContain('private');
  });
});
