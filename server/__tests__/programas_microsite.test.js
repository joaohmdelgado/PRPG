import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin, login } from './helpers.js';

let token;

beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  token = await loginAdmin();
});

afterAll(async () => {
  await pool.end();
});

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

const novoPrograma = (over = {}) => ({
  nome: 'PPG História',
  sigla: 'pgh',
  modalidades: [{ tipo: 'M', ano_inicio: 2006, nota_capes: '4' }],
  // Publicado: estes testes leem o microsite como visitante anônimo, e o
  // rascunho (microsite_ativo=false) responde 404 ao público (Fase R.4).
  microsite_ativo: true,
  ...over,
});

const criar = async (over) => (await auth(request(app).post('/api/programas')).send(novoPrograma(over))).body;

describe('microsite — slug', () => {
  it('gera slug a partir do nome e responde em /programas/slug/:slug', async () => {
    const { slug } = await criar();
    expect(slug).toBe('ppg-historia');

    const res = await request(app).get(`/api/programas/slug/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('PPG História');
  });

  it('respeita slug informado e garante unicidade', async () => {
    const a = await criar({ slug: 'pgh' });
    expect(a.slug).toBe('pgh');
    const b = await criar({ slug: 'pgh' });
    expect(b.slug).toBe('pgh-1');
  });

  it('recusa slug reservado (colidiria com rotas da PRPG)', async () => {
    const { slug } = await criar({ slug: 'editais' });
    expect(slug).toBe('editais-pg');
  });

  it('retorna 404 para slug inexistente', async () => {
    const res = await request(app).get('/api/programas/slug/nao-existe');
    expect(res.status).toBe(404);
  });
});

describe('microsite — rascunho (Fase R.4)', () => {
  it('rascunho responde 404 ao público e aparece para o admin (pré-visualização)', async () => {
    const { slug } = await criar({ slug: 'rasc', microsite_ativo: false });

    const anon = await request(app).get(`/api/programas/slug/${slug}`);
    expect(anon.status).toBe(404);

    const admin = await auth(request(app).get(`/api/programas/slug/${slug}`));
    expect(admin.status).toBe(200);
    expect(admin.body.microsite_ativo).toBe(false);
  });

  it('token inválido é tratado como anônimo', async () => {
    const { slug } = await criar({ slug: 'rasc2', microsite_ativo: false });
    const res = await request(app).get(`/api/programas/slug/${slug}`).set('Authorization', 'Bearer lixo');
    expect(res.status).toBe(404);
  });
});

describe('microsite — grupos de pesquisa públicos (Fase R.3)', () => {
  it('lista os grupos do programa sem login e sem e-mail dos líderes', async () => {
    const { id, slug } = await criar({ slug: 'pgh' });
    const lider = await pool.query(
      `INSERT INTO pessoas (id, nome, email_institucional) VALUES ('pes-lider', 'Líder X', 'lider@x.br') RETURNING id`
    );
    const grupo = await auth(request(app).post('/api/grupos-pesquisa')).send({
      title: 'Grupo Y', programaId: id, liderIds: [lider.rows[0].id],
    });
    expect(grupo.status).toBe(201);

    const res = await request(app).get(`/api/programas/slug/${slug}/grupos`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Grupo Y');
    expect(res.body[0].lideres).toEqual([{ id: 'pes-lider', nome: 'Líder X' }]);
  });

  it('404 para programa inexistente', async () => {
    const res = await request(app).get('/api/programas/slug/nao-existe/grupos');
    expect(res.status).toBe(404);
  });
});

describe('microsite — página fixa "Sobre"', () => {
  it('cria automaticamente a página fixa ao criar o programa, sem sufixo -1', async () => {
    const { id, slug } = await criar({ slug: 'pgh' });

    const pub = await request(app).get(`/api/programas/slug/${slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.pagina_sobre).toMatchObject({ slug: 'sobre', chave: 'sobre', programaId: id });

    // Endereço próprio dentro do microsite (ver ProgramaSite.jsx/pagesController);
    // ?programa= escopa a busca (slug só é único dentro do programa).
    const bySlug = await request(app).get(`/api/pages/slug/sobre?programa=${slug}`);
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.programaId).toBe(id);

    // Sem escopo, "sobre" não é uma página geral (é a fixa do programa) → 404.
    const semEscopo = await request(app).get('/api/pages/slug/sobre');
    expect(semEscopo.status).toBe(404);
  });

  it('dois programas diferentes têm cada um sua própria página "sobre" (escopo por programa_id)', async () => {
    const a = await criar({ slug: 'pgh' });
    const b = await criar({ nome: 'PPG Letras', sigla: 'ppgl', slug: 'ppgl' });

    const pubA = await request(app).get(`/api/programas/slug/${a.slug}`);
    const pubB = await request(app).get(`/api/programas/slug/${b.slug}`);
    expect(pubA.body.pagina_sobre.slug).toBe('sobre');
    expect(pubB.body.pagina_sobre.slug).toBe('sobre'); // não vira "sobre-1"
    expect(pubA.body.pagina_sobre.id).not.toBe(pubB.body.pagina_sobre.id);
  });

  it('edita o conteúdo (sanitizado) sem mudar slug/programa mesmo se o cliente tentar', async () => {
    const { id, slug } = await criar({ slug: 'pgh' });
    const pagina = (await request(app).get(`/api/pages/slug/sobre?programa=${slug}`)).body;

    const upd = await auth(request(app).put(`/api/pages/${pagina.id}`)).send({
      title: 'Sobre o PGH',
      slug: 'outra-coisa',
      programaId: null,
      body: { value: '<p>Texto novo</p><script>alert(1)</script>' },
    });
    expect(upd.status).toBe(200);
    expect(upd.body.slug).toBe('sobre'); // travado
    expect(upd.body.programaId).toBe(id); // travado
    expect(upd.body.title).toBe('Sobre o PGH'); // título livre
    expect(upd.body.body.value).toContain('<p>Texto novo</p>');
    expect(upd.body.body.value).not.toContain('<script>');
  });

  it('recusa excluir a página fixa', async () => {
    const { slug } = await criar({ slug: 'pgh' });
    const pagina = (await request(app).get(`/api/pages/slug/sobre?programa=${slug}`)).body;

    const del = await auth(request(app).delete(`/api/pages/${pagina.id}`));
    expect(del.status).toBe(400);

    const stillThere = await request(app).get(`/api/pages/slug/sobre?programa=${slug}`);
    expect(stillThere.status).toBe(200);
  });
});

describe('microsite — páginas comuns por programa (slug escopado)', () => {
  it('permite o mesmo slug em programas diferentes (antes era único globalmente)', async () => {
    const a = await criar({ slug: 'pgh' });
    const b = await criar({ nome: 'PPG Letras', sigla: 'ppgl', slug: 'ppgl' });

    const pa = await auth(request(app).post('/api/pages')).send({
      title: 'Regimento', programaId: a.id, body: { value: '<p>x</p>' },
    });
    const pb = await auth(request(app).post('/api/pages')).send({
      title: 'Regimento', programaId: b.id, body: { value: '<p>y</p>' },
    });
    expect(pa.body.slug).toBe('regimento');
    expect(pb.body.slug).toBe('regimento'); // não "regimento-1"
  });

  it('ainda evita colidir com as sub-rotas fixas do microsite (ex.: "noticias")', async () => {
    const { id } = await criar({ slug: 'pgh' });
    const p = await auth(request(app).post('/api/pages')).send({
      title: 'Notícias', programaId: id, body: { value: '<p>x</p>' },
    });
    expect(p.body.slug).toBe('noticias-1');
  });

  it('página geral ainda evita as rotas institucionais da PRPG e o slug de programas', async () => {
    await criar({ slug: 'pgh' });
    const geral = await auth(request(app).post('/api/pages')).send({
      title: 'Sobre', body: { value: '<p>x</p>' }, // sem programaId
    });
    expect(geral.body.slug).toBe('sobre-1'); // "sobre" é rota fixa da PRPG

    const colidePrograma = await auth(request(app).post('/api/pages')).send({
      title: 'pgh', body: { value: '<p>x</p>' },
    });
    expect(colidePrograma.body.slug).toBe('pgh-1'); // "pgh" já é slug de programa
  });

  it('GET /api/programas/slug/:slug traz as páginas criadas (não a fixa) para o menu "O Programa"', async () => {
    const { id, slug } = await criar({ slug: 'pgh' });
    await auth(request(app).post('/api/pages')).send({
      title: 'Regimento', programaId: id, body: { value: '<p>x</p>' },
    });

    const pub = await request(app).get(`/api/programas/slug/${slug}`);
    expect(pub.body.paginas).toHaveLength(1);
    expect(pub.body.paginas[0]).toMatchObject({ title: 'Regimento', slug: 'regimento', chave: null });
    // a página fixa não aparece aqui — ela já vem em pagina_sobre.
    expect(pub.body.paginas.some((p) => p.chave === 'sobre')).toBe(false);
  });
});

describe('microsite — busca inclui páginas do programa', () => {
  it('encontra uma página pelo título e aponta para o slug certo', async () => {
    const { id, slug } = await criar({ slug: 'pgh' });
    await auth(request(app).post('/api/pages')).send({
      title: 'Infraestrutura e Laboratórios', programaId: id, body: { value: '<p>Texto</p>' },
    });

    const res = await request(app).get(`/api/programas/slug/${slug}/busca?q=Infraestrutura`);
    expect(res.status).toBe(200);
    const pagina = res.body.find((r) => r.tipo === 'pagina');
    expect(pagina).toBeTruthy();
    expect(pagina.slug).toBe('infraestrutura-e-laboratorios');
    expect(pagina.titulo).toBe('Infraestrutura e Laboratórios');
  });
});

describe('microsite — conteúdo vinculado ao programa', () => {
  it('filtra notícias por programa (id e slug); itens sem programa ficam globais', async () => {
    const prog = await criar({ slug: 'pgh' });

    await auth(request(app).post('/api/news')).send({ title: 'Notícia do PGH', programaId: prog.id });
    await auth(request(app).post('/api/news')).send({ title: 'Notícia geral da PRPG' });

    const todas = await request(app).get('/api/news');
    expect(todas.body).toHaveLength(2);

    const porId = await request(app).get(`/api/news?programa=${prog.id}`);
    expect(porId.body).toHaveLength(1);
    expect(porId.body[0].title).toBe('Notícia do PGH');

    const porSlug = await request(app).get('/api/news?programa=pgh');
    expect(porSlug.body).toHaveLength(1);
    expect(porSlug.body[0].programaId).toBe(prog.id);
  });

  it('filtra editais por programa', async () => {
    const prog = await criar({ slug: 'pgh' });
    await auth(request(app).post('/api/editais')).send({ title: 'Edital PGH', programaId: prog.id });
    await auth(request(app).post('/api/editais')).send({ title: 'Edital geral' });

    const porSlug = await request(app).get('/api/editais?programa=pgh');
    expect(porSlug.body).toHaveLength(1);
    expect(porSlug.body[0].title).toBe('Edital PGH');
  });
});

describe('microsite — menu em 4 grupos (Fase S.1)', () => {
  const chaves = (menu) => menu.map((e) => e.chave);
  const grupo = (menu, chave) => menu.find((e) => e.chave === chave);

  it('programa vazio: só Início, O Programa (Sobre), Admissão (Editais), Notícias e Contato', async () => {
    const { slug } = await criar({ slug: 'vazio' });
    const { body } = await request(app).get(`/api/programas/slug/${slug}`);
    expect(chaves(body.menu)).toEqual(['inicio', 'programa', 'admissao', 'noticias', 'contato']);
    expect(grupo(body.menu, 'programa').itens.map((i) => i.chave)).toEqual(['sobre']);
    expect(grupo(body.menu, 'admissao').itens).toEqual([{ chave: 'editais', rotulo: 'Editais', sub: 'editais' }]);
  });

  it('módulos com conteúdo entram no grupo certo; páginas criadas no fim de "O Programa"', async () => {
    const { id, slug } = await criar({ slug: 'cheio' });
    await auth(request(app).post('/api/disciplinas')).send({ title: 'Metodologia', programaId: id });
    await auth(request(app).post('/api/teses-dissertacoes')).send({ title: 'Uma tese', programaId: id });
    await auth(request(app).post('/api/pages')).send({ title: 'Regimento', programaId: id, body: { value: '<p>x</p>' } });
    // Só formulário: antes o item "Documentos" dependia apenas de resoluções.
    await auth(request(app).post('/api/formularios')).send({ title: 'Requerimento', programaId: id });

    const { body } = await request(app).get(`/api/programas/slug/${slug}`);
    expect(chaves(body.menu)).toEqual(['inicio', 'programa', 'producao', 'admissao', 'noticias', 'documentos', 'contato']);
    const itens = grupo(body.menu, 'programa').itens;
    expect(itens.map((i) => i.chave)).toEqual(['sobre', 'disciplinas', expect.stringMatching(/^pagina:/)]);
    expect(itens[2]).toMatchObject({ rotulo: 'Regimento', sub: 'regimento' });
    expect(grupo(body.menu, 'producao').itens.map((i) => i.sub)).toEqual(['teses']);
  });

  it('rascunho não conta: disciplina não publicada não abre item no menu', async () => {
    const { id, slug } = await criar({ slug: 'rasc-menu' });
    await auth(request(app).post('/api/disciplinas')).send({ title: 'Em preparo', programaId: id, status: 'RASCUNHO' });
    const { body } = await request(app).get(`/api/programas/slug/${slug}`);
    expect(grupo(body.menu, 'programa').itens.map((i) => i.chave)).toEqual(['sobre']);
  });

  it('página de programa não pode usar as sub-rotas novas (egressos, linhas-de-pesquisa)', async () => {
    const { id } = await criar({ slug: 'sub' });
    const a = await auth(request(app).post('/api/pages')).send({ title: 'Egressos', programaId: id });
    const b = await auth(request(app).post('/api/pages')).send({ title: 'Linhas de Pesquisa', programaId: id });
    expect(a.body.slug).toBe('egressos-1');
    expect(b.body.slug).toBe('linhas-de-pesquisa-1');
  });
});

describe('microsite — páginas fixas de todo programa (Fase S.2)', () => {
  const FIXAS = ['autoavaliacao', 'impacto-social', 'infraestrutura', 'internacionalizacao', 'planejamento', 'sobre'];
  const fixasDo = async (id) =>
    (await auth(request(app).get(`/api/pages?programa=${id}`))).body.filter((p) => p.chave);
  const itensPrograma = (menu) => menu.find((e) => e.chave === 'programa').itens.map((i) => i.chave);

  it('cria as seis páginas fixas, vazias e fora do menu (só "Sobre" aparece)', async () => {
    const { id, slug } = await criar({ slug: 'fixas' });
    const fixas = await fixasDo(id);
    expect(fixas.map((p) => p.chave).sort()).toEqual(FIXAS);
    expect(fixas.every((p) => p.slug === p.chave)).toBe(true);

    const { body } = await request(app).get(`/api/programas/slug/${slug}`);
    expect(itensPrograma(body.menu)).toEqual(['sobre']);
    // Continuam fora da lista de páginas criadas.
    expect(body.paginas).toEqual([]);
  });

  it('página fixa com texto entra no menu na posição do modelo; "<p>&nbsp;</p>" conta como vazia', async () => {
    const { id, slug } = await criar({ slug: 'fixas2' });
    const fixas = await fixasDo(id);
    const infra = fixas.find((p) => p.chave === 'infraestrutura');
    const impacto = fixas.find((p) => p.chave === 'impacto-social');
    await auth(request(app).put(`/api/pages/${infra.id}`)).send({ body: { value: '<p>Laboratórios</p>' } });
    await auth(request(app).put(`/api/pages/${impacto.id}`)).send({ body: { value: '<p>&nbsp;</p>' } });

    const { body } = await request(app).get(`/api/programas/slug/${slug}`);
    expect(itensPrograma(body.menu)).toEqual(['sobre', 'infraestrutura']);
    expect(body.menu.find((e) => e.chave === 'programa').itens[1]).toMatchObject({ rotulo: 'Infraestrutura', sub: 'infraestrutura' });
  });

  it('página fixa em rascunho não aparece no menu público', async () => {
    const { id, slug } = await criar({ slug: 'fixas3' });
    const plan = (await fixasDo(id)).find((p) => p.chave === 'planejamento');
    await auth(request(app).put(`/api/pages/${plan.id}`)).send({ body: { value: '<p>PPI</p>' }, status: 'RASCUNHO' });
    const { body } = await request(app).get(`/api/programas/slug/${slug}`);
    expect(itensPrograma(body.menu)).toEqual(['sobre']);
  });

  it('é idempotente e adota página comum que já usava o endereço (texto mantido)', async () => {
    const { id } = await criar({ slug: 'adota' });
    const antiga = (await fixasDo(id)).find((p) => p.chave === 'infraestrutura');
    // Simula o legado: a "infraestrutura" era uma página comum do programa.
    await pool.query('UPDATE pages SET chave = NULL, body_value = $2 WHERE id = $1', [antiga.id, '<p>Texto antigo</p>']);

    await auth(request(app).put(`/api/programas/${id}`)).send({ nome: 'PPG História' }); // auto-cura
    const fixas = await fixasDo(id);
    expect(fixas).toHaveLength(6);
    const infra = fixas.find((p) => p.chave === 'infraestrutura');
    expect(infra.id).toBe(antiga.id);
    expect(infra.body.value).toBe('<p>Texto antigo</p>');
  });

  it('não pode excluir nem mudar o endereço de uma página fixa nova', async () => {
    const { id } = await criar({ slug: 'trava' });
    const auto = (await fixasDo(id)).find((p) => p.chave === 'autoavaliacao');
    expect((await auth(request(app).delete(`/api/pages/${auto.id}`))).status).toBe(400);
    const upd = await auth(request(app).put(`/api/pages/${auto.id}`)).send({ title: 'Relatórios de Autoavaliação' });
    expect(upd.body.slug).toBe('autoavaliacao');
  });

  it('páginas vazias não aparecem na busca do microsite nem na busca do portal', async () => {
    const { id, slug } = await criar({ slug: 'busca-fixa' });
    const res = await request(app).get(`/api/programas/slug/${slug}/busca?q=Infraestrutura`);
    expect(res.body.filter((r) => r.tipo === 'pagina')).toEqual([]);

    const infra = (await fixasDo(id)).find((p) => p.chave === 'infraestrutura');
    await auth(request(app).put(`/api/pages/${infra.id}`)).send({ body: { value: '<p>Laboratórios</p>' } });
    const res2 = await request(app).get(`/api/programas/slug/${slug}/busca?q=Infraestrutura`);
    expect(res2.body.filter((r) => r.tipo === 'pagina').map((r) => r.slug)).toEqual(['infraestrutura']);

    const vazia = await request(app).get('/api/portal/busca?q=Planejamento');
    expect(JSON.stringify(vazia.body)).not.toContain('/busca-fixa/planejamento');
    const plan = (await fixasDo(id)).find((p) => p.chave === 'planejamento');
    await auth(request(app).put(`/api/pages/${plan.id}`)).send({ body: { value: '<p>Metas do quadriênio</p>' } });
    const cheia = await request(app).get('/api/portal/busca?q=Planejamento');
    expect(JSON.stringify(cheia.body)).toContain('/busca-fixa/planejamento');
  });
});

describe('microsite — ocultar, reordenar e renomear o menu (Fase S.3)', () => {
  const grupo = (menu, chave) => menu.find((e) => e.chave === chave);

  it('editor devolve o menu inteiro, inclusive o que ainda não tem conteúdo', async () => {
    const { id } = await criar({ slug: 'editor' });
    const res = await auth(request(app).get(`/api/programas/${id}/menu`));
    expect(res.status).toBe(200);
    expect(res.body.map((e) => e.chave)).toEqual(['inicio', 'programa', 'pessoas', 'producao', 'admissao', 'noticias', 'documentos', 'contato']);
    const docentes = grupo(res.body, 'pessoas').itens.find((i) => i.chave === 'docentes');
    expect(docentes).toMatchObject({ rotulo: 'Docentes', rotuloPadrao: 'Docentes', temConteudo: false, oculto: false, grupo: 'pessoas' });
  });

  it('renomeia, oculta, reordena e muda item de grupo; o público vê o resultado', async () => {
    const { id, slug } = await criar({ slug: 'ajustado' });
    await auth(request(app).post('/api/disciplinas')).send({ title: 'D1', programaId: id });
    const put = await auth(request(app).put(`/api/programas/${id}/menu`)).send({
      itens: [
        { chave: 'noticias', ordem: 1 },
        { chave: 'programa', rotulo: 'Institucional', ordem: 2 },
        { chave: 'contato', oculto: true },
        { chave: 'disciplinas', grupo: 'admissao', ordem: 0, rotulo: 'Estrutura Curricular' },
        { chave: 'editais', grupo: 'admissao', ordem: 1 },
      ],
    });
    expect(put.status).toBe(200);

    const { body } = await request(app).get(`/api/programas/slug/${slug}`);
    expect(body.menu.map((e) => e.chave)).toEqual(['inicio', 'noticias', 'programa', 'admissao']);
    expect(grupo(body.menu, 'programa').rotulo).toBe('Institucional');
    expect(grupo(body.menu, 'programa').itens.map((i) => i.chave)).toEqual(['sobre']);
    expect(grupo(body.menu, 'admissao').itens).toEqual([
      { chave: 'disciplinas', rotulo: 'Estrutura Curricular', sub: 'disciplinas' },
      { chave: 'editais', rotulo: 'Editais', sub: 'editais' },
    ]);

    // Só o que difere do padrão é gravado (editais no grupo de sempre).
    const { rows } = await pool.query('SELECT chave, rotulo, grupo, oculto FROM programa_menu_itens WHERE programa_id = $1 ORDER BY chave', [id]);
    expect(rows.find((r) => r.chave === 'editais')).toMatchObject({ grupo: null, rotulo: null });
  });

  it('item oculto sem conteúdo continua fora; Início não pode ser ocultado', async () => {
    const { id, slug } = await criar({ slug: 'inicio-fixo' });
    await auth(request(app).put(`/api/programas/${id}/menu`)).send({
      itens: [{ chave: 'inicio', oculto: true, rotulo: 'Página inicial' }],
    });
    const { body } = await request(app).get(`/api/programas/slug/${slug}`);
    expect(body.menu[0]).toMatchObject({ chave: 'inicio', rotulo: 'Página inicial' });
  });

  it('página criada pelo programa pode ser movida para outro grupo', async () => {
    const { id, slug } = await criar({ slug: 'mover' });
    const pg = await auth(request(app).post('/api/pages')).send({ title: 'Como ingressar', programaId: id, body: { value: '<p>x</p>' } });
    const put = await auth(request(app).put(`/api/programas/${id}/menu`)).send({
      itens: [{ chave: `pagina:${pg.body.id}`, grupo: 'admissao', ordem: 0 }],
    });
    expect(put.status).toBe(200);
    const { body } = await request(app).get(`/api/programas/slug/${slug}`);
    expect(grupo(body.menu, 'admissao').itens.map((i) => i.rotulo)).toEqual(['Como ingressar', 'Editais']);
    expect(grupo(body.menu, 'programa').itens.map((i) => i.chave)).toEqual(['sobre']);
  });

  it('recusa chave desconhecida, página de outro programa, grupo inválido e nome longo (400)', async () => {
    const a = await criar({ slug: 'val-a' });
    const b = await criar({ nome: 'PPG B', sigla: 'b', slug: 'val-b' });
    const alheia = await auth(request(app).post('/api/pages')).send({ title: 'De B', programaId: b.id });
    const casos = [
      [{ chave: 'inventado' }],
      [{ chave: `pagina:${alheia.body.id}` }],
      [{ chave: 'docentes', grupo: 'nao-existe' }],
      [{ chave: 'noticias', grupo: 'pessoas' }], // entrada do topo não vira item de grupo
      [{ chave: 'faq', rotulo: 'x'.repeat(61) }],
      [{ chave: 'faq' }, { chave: 'faq' }],
    ];
    for (const itens of casos) {
      const res = await auth(request(app).put(`/api/programas/${a.id}/menu`)).send({ itens });
      expect(res.status, JSON.stringify(itens)).toBe(400);
    }
  });

  it('gestor de programa edita só o menu do próprio programa; anônimo não edita', async () => {
    const a = await criar({ slug: 'gp-a' });
    const b = await criar({ nome: 'PPG B', sigla: 'b', slug: 'gp-b' });
    await auth(request(app).post('/api/users')).send({
      email: 'gestor@menu.com', password: 'senha123', roles: ['GestorPrograma'], programaId: a.id, perfil_geral: { nome: 'G' },
    });
    const gt = await login('gestor@menu.com');
    const como = (req) => req.set('Authorization', `Bearer ${gt}`);
    const corpo = { itens: [{ chave: 'faq', oculto: true }] };
    expect((await como(request(app).put(`/api/programas/${a.id}/menu`)).send(corpo)).status).toBe(200);
    expect((await como(request(app).put(`/api/programas/${b.id}/menu`)).send(corpo)).status).toBe(403);
    expect((await request(app).put(`/api/programas/${a.id}/menu`).send(corpo)).status).toBe(401);
  });
});
