import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { PASTA_UPLOADS, PASTA_DERIVADOS, LARGURAS, ehImagemRaster, variante } from '../services/imagens.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';

// Fase P.3 (docs/revisao-portal-conteudo-2026-09-24.md): imagens enviadas
// ganham versões WebP em larguras fixas (no upload e sob demanda), servidas
// por /uploads/<arquivo>?w=<largura>. Os uploads e as versões vão para o disco
// de verdade; afterAll apaga o que os testes criaram.

const criados = new Set();
let token;
const auth = (req) => req.set('Authorization', `Bearer ${token}`);

// Imagem sintética de cor lisa, do tamanho pedido.
const png = (largura, altura) => sharp({
  create: { width: largura, height: altura, channels: 3, background: { r: 30, g: 90, b: 160 } },
}).png().toBuffer();

const enviar = async (buffer, nome = 'foto.png', tipo = 'image/png') => {
  const res = await auth(request(app).post('/api/upload')).attach('file', buffer, { filename: nome, contentType: tipo });
  if (res.body.url) criados.add(path.basename(res.body.url));
  return res;
};

const larguraDe = async (buffer) => (await sharp(buffer).metadata()).width;
const binario = (res, cb) => { res.setEncoding('binary'); let d = ''; res.on('data', (c) => { d += c; }); res.on('end', () => cb(null, Buffer.from(d, 'binary'))); };

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  token = await loginAdmin();
});

afterAll(async () => {
  for (const nome of criados) {
    await fs.unlink(path.join(PASTA_UPLOADS, nome)).catch(() => {});
    const base = path.basename(nome, path.extname(nome));
    for (const l of LARGURAS) await fs.unlink(path.join(PASTA_DERIVADOS, `${base}-${l}.webp`)).catch(() => {});
  }
  await pool.end();
});

describe('P.3 — versões no upload', () => {
  it('devolve as dimensões e gera uma versão WebP por largura, sem ampliar', async () => {
    const res = await enviar(await png(1000, 500));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ largura: 1000, altura: 500 });
    const base = path.basename(res.body.url, '.png');
    for (const l of LARGURAS) {
      const meta = await sharp(path.join(PASTA_DERIVADOS, `${base}-${l}.webp`)).metadata();
      expect(meta.format, `${l}`).toBe('webp');
      expect(meta.width, `${l}`).toBe(Math.min(l, 1000)); // nunca maior que o original
    }
  });

  it('PDF não vira imagem: sem dimensões e sem versões', async () => {
    const res = await enviar(Buffer.from(`%PDF-1.4 ${Date.now()}${Math.random()}`), 'doc.pdf', 'application/pdf');
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('largura');
    expect(ehImagemRaster(res.body.url)).toBe(false);
  });

  it('arquivo que diz ser PNG mas não é imagem não derruba o upload', async () => {
    const res = await enviar(Buffer.from(`falso-${Date.now()}-${Math.random()}`), 'falso.png');
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('largura');
  });
});

describe('P.3 — /uploads/<arquivo>?w=', () => {
  it('serve a versão WebP com cache longo e sem sniffing', async () => {
    const up = await enviar(await png(2400, 1200));
    const res = await request(app).get(`${up.body.url}?w=800`).buffer(true).parse(binario);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/webp/);
    expect(res.headers['cache-control']).toMatch(/max-age=2592000/);
    expect(res.headers['cache-control']).toMatch(/immutable/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(await larguraDe(res.body)).toBe(800);
  });

  it('largura fora da lista serve o original (o visitante não escolhe um tamanho)', async () => {
    const up = await enviar(await png(700, 300));
    for (const w of ['999', '0', '-5', 'abc', '480;drop']) {
      const res = await request(app).get(`${up.body.url}?w=${w}`);
      expect(res.status, w).toBe(200);
      expect(res.headers['content-type'], w).toMatch(/image\/png/);
    }
  });

  it('gera sob demanda para imagem que já estava no disco antes do pipeline', async () => {
    const nome = `antigo-${Date.now()}.png`;
    await fs.writeFile(path.join(PASTA_UPLOADS, nome), await png(1600, 900));
    criados.add(nome);
    const res = await request(app).get(`/uploads/${nome}?w=1280`).buffer(true).parse(binario);
    expect(res.status).toBe(200);
    expect(await larguraDe(res.body)).toBe(1280);
    // Depois disso a versão fica em cache no disco.
    await expect(fs.access(path.join(PASTA_DERIVADOS, `${path.basename(nome, '.png')}-1280.webp`))).resolves.toBeUndefined();
  });

  it('visitas simultâneas à mesma versão funcionam (uma só conversão)', async () => {
    const nome = `simultaneo-${Date.now()}.png`;
    await fs.writeFile(path.join(PASTA_UPLOADS, nome), await png(1500, 700));
    criados.add(nome);
    const respostas = await Promise.all(Array.from({ length: 6 }, () => request(app).get(`/uploads/${nome}?w=480`).buffer(true).parse(binario)));
    for (const r of respostas) expect(r.status).toBe(200);
    expect(new Set(respostas.map((r) => r.body.length)).size).toBe(1);
  });

  it('não sai da pasta de uploads nem converte o que não é imagem raster', async () => {
    expect(await variante('../app.js', 480)).toBeNull();
    expect(await variante('..%2Fapp.js', 480)).toBeNull();
    expect(await variante('doc.pdf', 480)).toBeNull();
    expect(await variante('inexistente.png', 480)).toBeNull();
    const res = await request(app).get('/uploads/..%2Fapp.js?w=480');
    expect(res.headers['content-type'] || '').not.toMatch(/image\/webp/);
    expect(res.status).not.toBe(200);
  });

  it('sem ?w= o original continua sendo servido como antes', async () => {
    const buf = await png(600, 400);
    const up = await enviar(buf);
    const res = await request(app).get(up.body.url).buffer(true).parse(binario);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect(res.body.equals(buf)).toBe(true);
  });
});

describe('P.3 — exclusão', () => {
  it('apagar o arquivo da biblioteca apaga as versões derivadas', async () => {
    const up = await enviar(await png(900, 450));
    const base = path.basename(up.body.url, '.png');
    await expect(fs.access(path.join(PASTA_DERIVADOS, `${base}-800.webp`))).resolves.toBeUndefined();
    const del = await auth(request(app).delete(`/api/arquivos/${up.body.id}`));
    expect(del.status).toBe(200);
    for (const l of LARGURAS) await expect(fs.access(path.join(PASTA_DERIVADOS, `${base}-${l}.webp`))).rejects.toThrow();
  });
});
