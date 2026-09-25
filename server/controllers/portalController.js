// Fase H.1 (docs/revisao-portal-conteudo-2026-09-24.md): menus, atalhos e
// dados de contato do portal, editáveis no painel (tabelas menus,
// menu_itens e configuracoes).
import { pool, query } from '../db/pool.js';
import { isPlainObject } from '../utils/sanitize.js';
import { newsRepo, editaisRepo, calendariosRepo } from '../db/repositories.js';
import { filtrarPorEscopo } from '../utils/escopoPrograma.js';
import { estaPublicado, sqlPublicado } from '../utils/publicacao.js';
import { calculateEditalStatus } from './editaisController.js';
import { hojeISO } from '../utils/datas.js';
import { mapaProgramas } from '../utils/programaResumo.js';

const podeEditar = (user) => (user?.roles || []).some((r) => r === 'Administrator' || r === 'Gestor');

const MAX_ITENS = 120;

// Destinos aceitos: rota interna, âncora, URL http(s), e-mail e telefone.
// Nada de `javascript:` ou `data:` num link que vai para o site público.
const DESTINO_OK = /^(\/|#|https?:\/\/|mailto:|tel:)/i;
// Ícone = classes do Font Awesome ("fa-solid fa-gavel").
const ICONE_OK = /^[a-z0-9 -]{0,80}$/;
const IMAGEM_OK = /^(\/uploads\/|https?:\/\/)/i;

const texto = (v, max = 500) => (v == null ? null : String(v).trim().slice(0, max) || null);

const itemFromRow = (r) => ({
  id: Number(r.id), rotulo: r.rotulo, destino: r.destino, descricao: r.descricao,
  icone: r.icone, imagem: r.imagem, ativo: r.ativo,
});

// Linhas (já ordenadas) -> árvore { chave: [item + filhos] }.
const montarArvores = (rows) => {
  const porId = new Map();
  const menus = {};
  for (const r of rows) porId.set(Number(r.id), { ...itemFromRow(r), filhos: [] });
  for (const r of rows) {
    const item = porId.get(Number(r.id));
    if (r.pai_id != null) porId.get(Number(r.pai_id))?.filhos.push(item);
    else (menus[r.menu] ||= []).push(item);
  }
  return menus;
};

const carregar = async ({ todos = false, chave = null } = {}) => {
  const cond = [];
  const params = [];
  if (!todos) cond.push('i.ativo');
  if (chave) { params.push(chave); cond.push(`i.menu = $${params.length}`); }
  // Um item ativo cujo pai está inativo também some.
  if (!todos) cond.push('(i.pai_id IS NULL OR p.ativo)');
  const { rows } = await query(
    `SELECT i.* FROM menu_itens i LEFT JOIN menu_itens p ON p.id = i.pai_id
      ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''}
      ORDER BY i.menu, i.pai_id NULLS FIRST, i.ordem, i.id`,
    params
  );
  return montarArvores(rows);
};

// GET /menus — todas as listas ativas, { chave: árvore }. Com ?todos=1 (Admin/
// Gestor) inclui os itens inativos e a descrição de cada lista (editor).
export const getMenus = async (req, res) => {
  const todos = req.query.todos === '1' && podeEditar(req.user);
  const arvores = await carregar({ todos });
  if (!todos) return res.json(arvores);
  const { rows } = await query('SELECT * FROM menus ORDER BY ordem, chave');
  return res.json(rows.map((m) => ({ ...m, itens: arvores[m.chave] || [] })));
};

export const getMenu = async (req, res) => {
  const { rows } = await query('SELECT 1 FROM menus WHERE chave = $1', [req.params.chave]);
  if (!rows[0]) return res.status(404).json({ message: 'Menu não encontrado.' });
  return res.json((await carregar({ chave: req.params.chave }))[req.params.chave] || []);
};

// Valida a árvore enviada pelo editor; devolve { erro } ou { itens }.
const validarItens = (itens, menu) => {
  if (!Array.isArray(itens)) return { erro: 'Envie a lista de itens.' };
  let total = 0;
  const limpar = (lista, nivel) => {
    const out = [];
    for (const [i, bruto] of lista.entries()) {
      if (!isPlainObject(bruto)) throw new Error(`Item ${i + 1} inválido.`);
      total += 1;
      if (total > MAX_ITENS) throw new Error(`No máximo ${MAX_ITENS} itens por menu.`);
      const rotulo = texto(bruto.rotulo, 120);
      if (!rotulo) throw new Error('Todo item precisa de um rótulo.');
      const destino = texto(bruto.destino, 1000);
      if (destino && !DESTINO_OK.test(destino)) {
        throw new Error(`Destino inválido em "${rotulo}": use uma rota (/editais), uma página ou um endereço https://.`);
      }
      const icone = texto(bruto.icone, 80);
      if (icone && !ICONE_OK.test(icone)) throw new Error(`Ícone inválido em "${rotulo}".`);
      const imagem = texto(bruto.imagem, 1000);
      if (imagem && !IMAGEM_OK.test(imagem)) throw new Error(`Imagem inválida em "${rotulo}".`);
      const filhos = Array.isArray(bruto.filhos) ? bruto.filhos : [];
      if (filhos.length && nivel >= menu.niveis) throw new Error(`"${menu.nome}" não tem subitens.`);
      out.push({
        rotulo, destino, icone, imagem,
        descricao: texto(bruto.descricao, 500),
        ativo: bruto.ativo !== false,
        filhos: filhos.length ? limpar(filhos, nivel + 1) : [],
      });
    }
    return out;
  };
  try {
    return { itens: limpar(itens, 1) };
  } catch (e) {
    return { erro: e.message };
  }
};

// PUT /menus/:chave — substitui a lista inteira (o editor manda a árvore toda).
export const updateMenu = async (req, res) => {
  const { rows } = await query('SELECT * FROM menus WHERE chave = $1', [req.params.chave]);
  const menu = rows[0];
  if (!menu) return res.status(404).json({ message: 'Menu não encontrado.' });
  const { itens, erro } = validarItens(req.body?.itens, menu);
  if (erro) return res.status(400).json({ message: erro });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM menu_itens WHERE menu = $1', [menu.chave]);
    const inserir = async (lista, paiId) => {
      for (const [ordem, it] of lista.entries()) {
        const { rows: [novo] } = await client.query(
          `INSERT INTO menu_itens (menu, pai_id, rotulo, destino, descricao, icone, imagem, ordem, ativo, atualizado_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [menu.chave, paiId, it.rotulo, it.destino, it.descricao, it.icone, it.imagem, ordem, it.ativo, req.user?.id ?? null]
        );
        await inserir(it.filhos, novo.id);
      }
    };
    await inserir(itens, null);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  const todos = await carregar({ todos: true, chave: menu.chave });
  return res.json(todos[menu.chave] || []);
};

// ------------------------------------------------------------ configurações
// Chaves e campos aceitos (tudo aqui é informação pública do portal).
export const CONFIGURACOES = {
  contato: ['email', 'telefone', 'whatsapp', 'endereco', 'mapa'],
  home: ['selo', 'titulo', 'destaque', 'texto', 'imagem'],
  identidade: ['logo'],
};

export const getConfiguracoes = async (req, res) => {
  const { rows } = await query('SELECT chave, valor FROM configuracoes');
  const out = {};
  for (const r of rows) if (CONFIGURACOES[r.chave]) out[r.chave] = r.valor;
  return res.json(out);
};

export const updateConfiguracao = async (req, res) => {
  const campos = CONFIGURACOES[req.params.chave];
  if (!campos) return res.status(404).json({ message: 'Configuração não encontrada.' });
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const valor = {};
  for (const c of campos) {
    const v = texto(req.body[c], 2000);
    if (v) valor[c] = v;
  }
  for (const c of ['imagem', 'logo']) {
    if (valor[c] && !IMAGEM_OK.test(valor[c])) return res.status(400).json({ message: 'Imagem inválida: envie pela biblioteca ou use um endereço https://.' });
  }
  if (valor.mapa && !/^https:\/\/www\.google\.com\/maps\/embed\?/.test(valor.mapa)) {
    return res.status(400).json({ message: 'Mapa inválido: use o endereço de incorporação do Google Maps (https://www.google.com/maps/embed?...).' });
  }
  const { rows } = await query(
    `INSERT INTO configuracoes (chave, valor, atualizado_por) VALUES ($1, $2, $3)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_por = EXCLUDED.atualizado_por
     RETURNING valor`,
    [req.params.chave, JSON.stringify(valor), req.user?.id ?? null]
  );
  return res.json(rows[0].valor);
};

// ------------------------------------------------------------ página inicial
// GET /portal/home (Fase H.2): tudo o que a home mostra além dos menus, numa
// só requisição e já filtrado pelo que é público — antes eram notícias,
// editais e números fixos no código.

// "02/03/2026 a 06/03/2026", "até 24/04/2026", "09/03/2026" -> última data
// do texto em ISO (o marco "vence" nela). null se não houver data.
export const fimDoMarco = (texto) => {
  const datas = [...String(texto || '').matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)];
  if (!datas.length) return null;
  const [, d, m, a] = datas[datas.length - 1];
  return `${a}-${m}-${d}`;
};

const QTD_NOTICIAS = 3;
const QTD_EDITAIS = 4;
const QTD_PRAZOS = 6;

export const getHome = async (req, res) => {
  const hoje = hojeISO();
  const programas = await mapaProgramas();
  const comPrograma = (item) => ({ ...item, programa: item.programaId ? programas.get(item.programaId) || null : null });

  // Notícias: o que o portal agrega (D-R1), mais recentes primeiro. A de
  // destaque é a mais recente marcada como destaque; sem nenhuma, a mais recente.
  const noticias = (await filtrarPorEscopo(await newsRepo.getAll(), { escopo: 'portal' }))
    .filter((n) => estaPublicado(n))
    .map(({ content, ...resto }) => comPrograma(resto));
  const destaque = noticias.find((n) => n.destaque) || noticias[0] || null;
  const recentes = noticias.filter((n) => n !== destaque).slice(0, QTD_NOTICIAS);

  // Editais: os de inscrição aberta (prazo mais próximo primeiro) e, se
  // sobrar espaço, os em andamento. Os de programa entram com o selo (D-R1).
  const editais = (await editaisRepo.getAll()).filter((e) => estaPublicado(e)).map(calculateEditalStatus);
  const fim = (e) => e.field_periodo?.data_fim || e.deadline || '9999-12-31';
  const abertos = editais.filter((e) => e.situation === 'abertas').sort((a, b) => fim(a).localeCompare(fim(b)));
  const andamento = editais.filter((e) => e.situation === 'andamento')
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
  const editaisHome = [...abertos, ...andamento].slice(0, QTD_EDITAIS).map((e) => comPrograma({
    id: e.id, title: e.title, numero: e.numero, situation: e.situation, situationLabel: e.situationLabel,
    publishedAt: e.publishedAt, dataFim: e.field_periodo?.data_fim || e.deadline || null,
    downloadLink: e.downloadLink || null, programaId: e.programaId,
  }));

  // Próximos prazos: fim das inscrições abertas + marcos do calendário vigente.
  const prazos = abertos.filter((e) => fim(e) !== '9999-12-31').map((e) => ({
    data: fim(e), titulo: `Inscrições: ${e.title}`, destino: `/editais/${e.id}`, tipo: 'edital',
  }));
  const calendario = (await calendariosRepo.getAll()).find((c) => c.isCurrent && estaPublicado(c));
  for (const m of calendario?.milestones || []) {
    const data = fimDoMarco(m.date);
    if (data && data >= hoje) prazos.push({ data, titulo: m.event, periodo: m.date, destino: '/calendario-academico', tipo: 'calendario' });
  }
  prazos.sort((a, b) => a.data.localeCompare(b.data));

  // Números calculados. Docentes e discentes só contam os vínculos já
  // cadastrados no sistema (a importação das planilhas é da Fase O) — a home
  // decide o que mostrar.
  const { rows: [numeros] } = await query(`
    SELECT
      (SELECT count(*)::int FROM programas WHERE status = 'ATIVO') AS programas,
      (SELECT count(*)::int FROM modalidades m JOIN programas p ON p.id = m.programa_id WHERE p.status = 'ATIVO' AND m.tipo = 'M') AS mestrados,
      (SELECT count(*)::int FROM modalidades m JOIN programas p ON p.id = m.programa_id WHERE p.status = 'ATIVO' AND m.tipo = 'D') AS doutorados,
      (SELECT count(*)::int FROM modalidades m JOIN programas p ON p.id = m.programa_id WHERE p.status = 'ATIVO' AND m.tipo = 'P') AS profissionais,
      (SELECT count(*)::int FROM teses_dissertacoes t WHERE ${sqlPublicado('t')}) AS teses,
      (SELECT count(DISTINCT pessoa_id)::int FROM vinculos WHERE papel LIKE 'DOCENTE%') AS docentes,
      (SELECT count(DISTINCT pessoa_id)::int FROM vinculos WHERE papel LIKE 'DISCENTE%') AS discentes`);

  res.json({ destaque, noticias: recentes, editais: editaisHome, prazos: prazos.slice(0, QTD_PRAZOS), numeros });
};
