import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, login, seedUser } from './helpers.js';
import {
  linksDoHtml, normalizarUrl, hostPermitido, verificarUrl, verificarLinks,
} from '../services/verificadorLinks.js';

// Fase O.7: painel de qualidade de dados e verificador de links.

let adminToken;
beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
});
afterAll(async () => { await pool.end(); });

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const categoria = async (id) => (await asAdmin(request(app).get('/api/painel/qualidade'))).body.categorias.find((c) => c.id === id);

describe('qualidade dos dados (O.7)', () => {
  it('só Admin/Gestor da PRPG', async () => {
    expect((await request(app).get('/api/painel/qualidade')).status).toBe(401);
    await seedUser({ id: 'aluno', email: 'aluno@test.com', roles: ['Aluno'] });
    const token = await login('aluno@test.com');
    expect((await request(app).get('/api/painel/qualidade').set('Authorization', `Bearer ${token}`)).status).toBe(403);
  });

  it('CPF inválido: lista com o CPF mascarado; válido e vazio não entram', async () => {
    await pool.query(`INSERT INTO pessoas (id, nome, cpf, cpf_valido) VALUES
      ('p1', 'Cpf Ruim', '59957687404', FALSE), ('p2', 'Cpf Bom', '05252951438', TRUE), ('p3', 'Sem Cpf', NULL, TRUE)`);
    const c = await categoria('cpf_invalido');
    expect(c.total).toBe(1);
    expect(c.itens[0]).toMatchObject({ rotulo: 'Cpf Ruim', detalhe: expect.stringContaining('***.576.874-**') });
    expect(JSON.stringify(c)).not.toContain('59957687404');
  });

  it('pessoas duplicadas: mesmo nome sem acento/caixa/espaço, ou mesmo CPF', async () => {
    await pool.query(`INSERT INTO pessoas (id, nome, cpf, email_institucional) VALUES
      ('a1', 'José da Silva', '11111111111', 'jose@ufrpe.br'), ('a2', 'JOSE  DA SILVA', NULL, NULL),
      ('b1', 'Maria Souza', '22222222222', NULL), ('b2', 'Maria S.', '222.222.222-22', NULL),
      ('c1', 'Única Pessoa', NULL, NULL)`);
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel) VALUES ('v1', 'a1', 'COORDENADOR')`);
    const c = await categoria('pessoas_duplicadas');
    expect(c.total).toBe(2);
    const nome = c.itens.find((i) => i.detalhe.startsWith('mesmo nome'));
    expect(nome.pessoas.map((p) => p.id)).toEqual(['a1', 'a2']);
    expect(nome.pessoas[0]).toMatchObject({ vinculos: 1, cpf: '***.111.111-**' });
    expect(c.itens.find((i) => i.detalhe.startsWith('mesmo CPF')).pessoas.map((p) => p.id)).toEqual(['b1', 'b2']);
  });

  it('vínculos sem data: lista só cargos com mandato; docente sem data só entra na contagem por papel', async () => {
    await pool.query("INSERT INTO programas (id, nome, sigla) VALUES ('pr', 'Programa', 'PR')");
    await pool.query(`INSERT INTO pessoas (id, nome) VALUES ('x', 'Fulano Coord'), ('y', 'Beltrano Docente'), ('z', 'Ciclano Datado')`);
    await pool.query(`INSERT INTO vinculos (id, programa_id, pessoa_id, papel, data_inicio_mandato) VALUES
      ('v1', 'pr', 'x', 'COORDENADOR', NULL), ('v2', 'pr', 'y', 'DOCENTE_PERMANENTE', NULL), ('v3', 'pr', 'z', 'COORDENADOR', '2025-01-01')`);
    const c = await categoria('vinculos_sem_data');
    expect(c.itens.map((i) => i.rotulo)).toEqual(['Fulano Coord — coordenador']);
    expect(c.totalGeral).toBe(2);
    expect(c.resumoPorPapel).toEqual(expect.arrayContaining([{ papel: 'DOCENTE_PERMANENTE', n: 1 }]));
  });

  it('contatos malformados: e-mail sem domínio e telefone sem DDD', async () => {
    await pool.query(`INSERT INTO contatos (id, entidade, entidade_id, tipo, valor) VALUES
      ('c1', 'programa', 'x', 'EMAIL', 'semarroba.ufrpe.br'), ('c2', 'programa', 'x', 'EMAIL', 'ok@ufrpe.br'),
      ('c3', 'programa', 'x', 'TELEFONE', '33206460'), ('c4', 'programa', 'x', 'CELULAR', '81996116668')`);
    const c = await categoria('contatos_invalidos');
    expect(c.itens.map((i) => i.rotulo).sort()).toEqual(['semarroba.ufrpe.br', 'telefone 33206460']);
  });
});

describe('verificador de links (O.7)', () => {
  it('extrai href/src e só considera http(s) e /uploads/', () => {
    const html = '<a href="https://a.com/x?y=1&amp;z=2#topo">a</a><img src="/uploads/1.png"><a href="/sobre">i</a><a href="mailto:a@b.c">m</a><a href="#ancora">t</a>';
    expect(linksDoHtml(html).map(normalizarUrl).filter(Boolean)).toEqual(['https://a.com/x?y=1&z=2', '/uploads/1.png']);
  });

  it('não busca hosts internos (loopback, rede privada, link-local, DNS que resolve para IP privado)', async () => {
    expect(await hostPermitido('127.0.0.1')).toBe(false);
    expect(await hostPermitido('10.1.2.3')).toBe(false);
    expect(await hostPermitido('192.168.0.5')).toBe(false);
    expect(await hostPermitido('169.254.169.254')).toBe(false);
    expect(await hostPermitido('::1')).toBe(false);
    expect(await hostPermitido('8.8.8.8')).toBe(true);
    expect(await hostPermitido('intranet.exemplo', async () => [{ address: '10.0.0.7' }])).toBe(false);
    expect(await hostPermitido('site.exemplo', async () => [{ address: '93.184.216.34' }])).toBe(true);
    const r = await verificarUrl('http://127.0.0.1:5000/api/users', { fetchImpl: () => { throw new Error('não deveria buscar'); } });
    expect(r).toMatchObject({ situacao: 'INCERTO', erro: expect.stringContaining('interno') });
  });

  const resposta = (status, headers = {}) => ({ status, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, body: null });
  const publico = async () => [{ address: '93.184.216.34' }];

  it('classifica: 200 ok, 404 quebrado, 403 incerto, HEAD rejeitado cai para GET, redirecionamento seguido, DNS inexistente', async () => {
    const chamadas = [];
    const fetchImpl = async (url, { method }) => {
      chamadas.push(`${method} ${url}`);
      if (url.endsWith('/ok')) return resposta(200);
      if (url.endsWith('/sumiu')) return resposta(404);
      if (url.endsWith('/bloqueado')) return resposta(403);
      if (url.endsWith('/sohget')) return method === 'HEAD' ? resposta(405) : resposta(200);
      if (url.endsWith('/antigo')) return resposta(301, { location: '/novo' });
      if (url.endsWith('/novo')) return resposta(200);
      if (url.includes('inexistente')) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
      return resposta(500);
    };
    const deps = { fetchImpl, resolver: publico };
    expect((await verificarUrl('https://s.exemplo/ok', deps)).situacao).toBe('OK');
    expect(await verificarUrl('https://s.exemplo/sumiu', deps)).toMatchObject({ situacao: 'QUEBRADO', statusHttp: 404 });
    expect((await verificarUrl('https://s.exemplo/bloqueado', deps)).situacao).toBe('INCERTO');
    expect((await verificarUrl('https://s.exemplo/sohget', deps)).situacao).toBe('OK');
    expect(chamadas).toContain('GET https://s.exemplo/sohget');
    expect((await verificarUrl('https://s.exemplo/antigo', deps)).situacao).toBe('OK');
    expect(await verificarUrl('https://inexistente.exemplo/x', deps)).toMatchObject({ situacao: 'QUEBRADO', erro: expect.stringContaining('ENOTFOUND') });
  });

  it('um redirecionamento para host interno não é seguido', async () => {
    const fetchImpl = async () => resposta(302, { location: 'http://127.0.0.1:5000/admin' });
    const r = await verificarUrl('https://s.exemplo/x', { fetchImpl, resolver: publico });
    expect(r).toMatchObject({ situacao: 'INCERTO', erro: expect.stringContaining('interno') });
  });

  it('arquivo de /uploads: existe = ok; ausente = quebrado', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prpg-up-'));
    process.env.UPLOADS_DIR = dir;
    try {
      await fs.writeFile(path.join(dir, 'existe.pdf'), 'x');
      expect((await verificarUrl('/uploads/existe.pdf')).situacao).toBe('OK');
      expect(await verificarUrl('/uploads/falta.pdf')).toMatchObject({ situacao: 'QUEBRADO', interno: true });
    } finally { delete process.env.UPLOADS_DIR; }
  });

  it('varre o conteúdo, grava o resultado, lembra desde quando quebrou e esquece o que deixou de ser usado; o painel mostra', async () => {
    await pool.query(`INSERT INTO news (id, title, status, content, image) VALUES
      ('n1', 'Notícia', 'PUBLICADO', ARRAY['<a href="https://s.exemplo/sumiu">x</a>', '<a href="https://s.exemplo/ok">y</a>'], NULL)`);
    await pool.query(`INSERT INTO editais (id, title, status, download_link) VALUES ('e1', 'Edital', 'PUBLICADO', 'https://s.exemplo/sumiu')`);
    await pool.query(`INSERT INTO editais (id, title, status, download_link) VALUES ('e2', 'Arquivado', 'ARQUIVADO', 'https://s.exemplo/de-arquivado')`);
    const deps = {
      resolver: async () => [{ address: '93.184.216.34' }],
      fetchImpl: async (url) => ({ status: url.endsWith('/ok') ? 200 : 404, headers: { get: () => null }, body: null }),
    };
    const r1 = await verificarLinks({ deps });
    expect(r1).toMatchObject({ total: 2, OK: 1, QUEBRADO: 1 });

    const c = await categoria('links_quebrados');
    expect(c.total).toBe(1);
    expect(c.itens[0]).toMatchObject({ rotulo: 'https://s.exemplo/sumiu', link: '/admin/noticias/editar/n1' });
    expect(c.itens[0].usos.map((u) => u.tabela).sort()).toEqual(['editais', 'news']);
    expect(c.verificados).toBe(2);

    const { rows: [antes] } = await pool.query("SELECT quebrado_desde FROM links_verificados WHERE url = 'https://s.exemplo/sumiu'");
    await pool.query("UPDATE links_verificados SET quebrado_desde = quebrado_desde - interval '10 days'");
    await verificarLinks({ deps });
    const { rows: [depois] } = await pool.query("SELECT quebrado_desde FROM links_verificados WHERE url = 'https://s.exemplo/sumiu'");
    expect(new Date(depois.quebrado_desde).getTime()).toBeLessThan(new Date(antes.quebrado_desde).getTime()); // não reiniciou

    await pool.query("DELETE FROM editais WHERE id = 'e1'");
    await pool.query("UPDATE news SET content = ARRAY['sem links'] WHERE id = 'n1'");
    await verificarLinks({ deps });
    expect((await pool.query('SELECT count(*)::int AS n FROM links_verificados')).rows[0].n).toBe(0);
  });

  it('a API dispara a verificação em segundo plano (202) e recusa duas ao mesmo tempo', async () => {
    const res = await asAdmin(request(app).post('/api/painel/qualidade/links/verificar'));
    expect(res.status).toBe(202);
    await new Promise((r) => setTimeout(r, 400)); // sem conteúdo com links: termina logo
  });
});
