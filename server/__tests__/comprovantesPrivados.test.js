import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';
import { PASTA_UPLOADS } from '../services/imagens.js';
import { PASTA_PRIVADA, localizarComprovantesPublicos, moverComprovante } from '../services/comprovantesPrivados.js';

// PRIV-01: comprovantes antigos de proficiência saem de /uploads (público).
const criados = [];
let adminToken;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});
afterAll(async () => {
  for (const f of criados) await fs.unlink(f).catch(() => {});
  await pool.end();
});

const comprovanteLegado = async ({ noDisco = true } = {}) => {
  const nome = `teste-comprovante-${crypto.randomUUID()}.pdf`;
  const conteudo = `%PDF comprovante ${nome}`;
  criados.push(path.join(PASTA_UPLOADS, nome), path.join(PASTA_PRIVADA, nome));
  if (noDisco) await fs.writeFile(path.join(PASTA_UPLOADS, nome), conteudo);
  const url = `/uploads/${nome}`;
  const id = `insc-${crypto.randomUUID()}`;
  await pool.query(
    `INSERT INTO inscricoes_proficiencia (id, nome, cpf, nivel, linguas, comprovante_residencia_url, titular_comprovante)
     VALUES ($1, 'Fulana', '11122233344', 'Mestrado', '{Inglês}', $2, TRUE)`, [id, url]);
  await pool.query(`INSERT INTO arquivos (id, url, nome_original) VALUES ($1, $2, 'comprovante.pdf')`, [`arq-${id}`, url]);
  return { nome, url, id, conteudo };
};

describe('comprovantes antigos de proficiência vão para a pasta privada', () => {
  it('move o arquivo, troca o endereço e passa a abrir só pelo download autenticado', async () => {
    const { nome, url, id, conteudo } = await comprovanteLegado();
    expect((await request(app).get(url)).status).toBe(200);
    expect((await request(app).get(`/api/proficiencia/inscricoes/${id}/comprovantes/residencia`)
      .set('Authorization', `Bearer ${adminToken}`)).status).toBe(404);

    const achados = await localizarComprovantesPublicos();
    expect(achados).toEqual([expect.objectContaining({ url, inscricoes: [id], noDisco: true, valido: true })]);

    expect((await moverComprovante(achados[0])).resultado).toBe('movido');
    const { rows: [insc] } = await pool.query('SELECT comprovante_residencia_url AS u FROM inscricoes_proficiencia WHERE id = $1', [id]);
    expect(insc.u).toBe(`/private-uploads/${nome}`);
    const { rows: [arq] } = await pool.query('SELECT url, sigiloso FROM arquivos WHERE id = $1', [`arq-${id}`]);
    expect(arq).toEqual({ url: `/private-uploads/${nome}`, sigiloso: true });

    expect((await request(app).get(url)).status).toBe(404);
    expect((await request(app).get(`/private-uploads/${nome}`)).status).not.toBe(200);
    const download = await request(app).get(`/api/proficiencia/inscricoes/${id}/comprovantes/residencia`)
      .set('Authorization', `Bearer ${adminToken}`).buffer(true).parse((res, cb) => {
        let dados = ''; res.on('data', (c) => { dados += c; }); res.on('end', () => cb(null, dados));
      });
    expect(download.status).toBe(200);
    expect(download.body).toBe(conteudo);

    expect(await localizarComprovantesPublicos()).toEqual([]);
  });

  it('endereço sem arquivo no disco também sai de /uploads', async () => {
    const { nome, id } = await comprovanteLegado({ noDisco: false });
    const [achado] = await localizarComprovantesPublicos();
    expect(achado.noDisco).toBe(false);
    expect((await moverComprovante(achado)).resultado).toBe('sem-arquivo');
    const { rows: [insc] } = await pool.query('SELECT comprovante_residencia_url AS u FROM inscricoes_proficiencia WHERE id = $1', [id]);
    expect(insc.u).toBe(`/private-uploads/${nome}`);
  });

  it('não sobrescreve arquivo que já existe na pasta privada', async () => {
    const { nome, url, id } = await comprovanteLegado();
    await fs.mkdir(PASTA_PRIVADA, { recursive: true });
    await fs.writeFile(path.join(PASTA_PRIVADA, nome), 'outro');
    const [achado] = await localizarComprovantesPublicos();
    expect(achado.jaNaPastaPrivada).toBe(true);
    expect((await moverComprovante(achado)).resultado).toBe('conflito');
    const { rows: [insc] } = await pool.query('SELECT comprovante_residencia_url AS u FROM inscricoes_proficiencia WHERE id = $1', [id]);
    expect(insc.u).toBe(url);
    expect(await fs.readFile(path.join(PASTA_PRIVADA, nome), 'utf8')).toBe('outro');
  });
});
