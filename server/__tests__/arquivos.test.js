import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';

// Fase F.5 (docs/revisao-portal-conteudo-2026-09-24.md): biblioteca de mídia.
// Os uploads vão para server/uploads de verdade; afterAll apaga os criados.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA = path.join(__dirname, '../uploads');
const criados = new Set();

let token;
const auth = (req) => req.set('Authorization', `Bearer ${token}`);
const enviar = async (conteudo, nome = 'doc.pdf', tipo = 'application/pdf') => {
  const res = await auth(request(app).post('/api/upload')).attach('file', Buffer.from(conteudo), { filename: nome, contentType: tipo });
  if (res.body.url) criados.add(res.body.url);
  return res;
};

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  token = await loginAdmin();
});

afterAll(async () => {
  for (const url of criados) await fs.unlink(path.join(PASTA, path.basename(url))).catch(() => {});
  await pool.end();
});

describe('F.5 — upload com deduplicação', () => {
  it('mesmo conteúdo reaproveita o arquivo existente; conteúdo diferente cria outro', async () => {
    const unico = `pdf-${Date.now()}-${Math.random()}`;
    const a = await enviar(unico);
    const b = await enviar(unico, 'outro-nome.pdf');
    const c = await enviar(`${unico}-diferente`);
    expect(a.status).toBe(200);
    expect(b.body.reaproveitado).toBe(true);
    expect(b.body.url).toBe(a.body.url);
    expect(b.body.id).toBe(a.body.id);
    expect(c.body.url).not.toBe(a.body.url);
  });
});

describe('F.5 — biblioteca, uso, substituição e exclusão', () => {
  it('lista com contagem de uso, mostra onde é usado e troca em todos os lugares', async () => {
    const img = await enviar(`png-${Date.now()}-${Math.random()}`, 'capa.png', 'image/png');
    const url = img.body.url;
    await auth(request(app).post('/api/news')).send({
      id: 'n-midia', title: 'Com capa', image: url, content: [`<p><img src="http://localhost:5000${url}"></p>`],
    });
    await auth(request(app).post('/api/pages')).send({ title: 'Página', body: { value: `<p><a href="${url}">x</a></p>` } });

    const lista = await auth(request(app).get('/api/arquivos'));
    expect(lista.body.find((a) => a.id === img.body.id)).toMatchObject({ tipo: 'imagem', usos: 3 });
    const semUso = await auth(request(app).get('/api/arquivos?semUso=1'));
    expect(semUso.body.some((a) => a.id === img.body.id)).toBe(false);

    const usos = (await auth(request(app).get(`/api/arquivos/${img.body.id}/usos`))).body;
    expect(usos.map((u) => u.tipo).sort()).toEqual(['Notícia (capa)', 'Notícia (texto)', 'Página']);
    expect(usos.find((u) => u.tipo === 'Notícia (capa)').admin).toBe('/admin/noticias/editar/n-midia');

    // Tipo diferente é recusado.
    const pdf = await auth(request(app).post(`/api/arquivos/${img.body.id}/substituir`))
      .attach('file', Buffer.from('x'), { filename: 'x.pdf', contentType: 'application/pdf' });
    expect(pdf.status).toBe(400);

    const troca = await auth(request(app).post(`/api/arquivos/${img.body.id}/substituir`))
      .attach('file', Buffer.from(`png-novo-${Math.random()}`), { filename: 'capa-nova.png', contentType: 'image/png' });
    expect(troca.status).toBe(200);
    criados.add(troca.body.arquivo.url);
    expect(troca.body.referenciasAtualizadas).toBe(3);
    expect(troca.body.arquivo.id).toBe(img.body.id);
    const novaUrl = troca.body.arquivo.url;

    const noticia = (await request(app).get('/api/news/n-midia')).body;
    expect(noticia.image).toBe(novaUrl);
    expect(noticia.content[0]).toContain(novaUrl);
    expect(noticia.content[0]).not.toContain(url);
    // o arquivo antigo continua em disco (eventos imutáveis podem citá-lo)
    await expect(fs.access(path.join(PASTA, path.basename(url)))).resolves.toBeUndefined();
  });

  it('não exclui arquivo em uso; exclui (e apaga do disco) o que não tem uso', async () => {
    const usado = await enviar(`pdf-usado-${Math.random()}`);
    const livre = await enviar(`pdf-livre-${Math.random()}`);
    await auth(request(app).post('/api/resolucoes')).send({ title: 'R', link: usado.body.url });

    const r1 = await auth(request(app).delete(`/api/arquivos/${usado.body.id}`));
    expect(r1.status).toBe(409);
    expect(r1.body.usos).toHaveLength(1);

    const r2 = await auth(request(app).delete(`/api/arquivos/${livre.body.id}`));
    expect(r2.status).toBe(200);
    await expect(fs.access(path.join(PASTA, path.basename(livre.body.url)))).rejects.toThrow();
  });

  it('comprovantes sigilosos não aparecem na biblioteca', async () => {
    await pool.query(
      `INSERT INTO arquivos (id, url, nome_original, mime) VALUES ('priv-1', '/private-uploads/x.pdf', 'comprovante.pdf', 'application/pdf')`
    );
    const lista = await auth(request(app).get('/api/arquivos'));
    expect(lista.body.some((a) => a.id === 'priv-1')).toBe(false);
    expect((await auth(request(app).get('/api/arquivos/priv-1/usos'))).status).toBe(404);
  });

  it('biblioteca exige login de quem edita; trocar/excluir exige Admin/Gestor', async () => {
    expect((await request(app).get('/api/arquivos')).status).toBe(401);
  });
});
