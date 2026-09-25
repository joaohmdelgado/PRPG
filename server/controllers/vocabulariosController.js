// Fase B.5 (G10, PLANO.md): endpoint público de leitura do vocabulário.
// Fase F.4 (docs/revisao-portal-conteudo-2026-09-24.md): classificações de
// conteúdo editáveis no painel.
import { vocabulariosRepo } from '../db/vocabulariosRepo.js';
import { pool, query } from '../db/pool.js';
import { isPlainObject } from '../utils/sanitize.js';
import { slugify } from '../utils/slug.js';

// Só estes domínios são editáveis pelo painel. Os demais (situação de
// processo, papel de vínculo...) governam regras de negócio e continuam
// mantidos pelo código/schema.
//
// Onde cada domínio é gravado no conteúdo: `chave` guarda o valor estável e
// `rotulo` guarda uma cópia do rótulo (desnormalizada, lida pelas telas).
// Sem `chave`, o próprio rótulo é a referência (subcategoria, tipo de bolsa).
export const DOMINIOS_EDITAVEIS = {
  'noticia.categoria': [{ tabela: 'news', chave: 'category_slug', rotulo: 'category' }],
  'edital.categoria': [{ tabela: 'editais', chave: 'category_id', rotulo: 'category_title' }],
  'documento.secao': [
    { tabela: 'resolucoes', chave: 'section_id', rotulo: 'section_title' },
    { tabela: 'formularios', chave: 'section_id', rotulo: 'section_title' },
  ],
  'resolucao.subcategoria': [{ tabela: 'resolucoes', chave: null, rotulo: 'category_title' }],
  'bolsa.tipo': [{ tabela: 'bolsas', chave: null, rotulo: 'tipo_bolsa' }],
};

const podeEditar = (user) => (user?.roles || []).some((r) => r === 'Administrator' || r === 'Gestor');

// Quantos itens de conteúdo usam o valor (para avisar antes de excluir).
const contarUso = async (v) => {
  let total = 0;
  for (const alvo of DOMINIOS_EDITAVEIS[v.dominio] || []) {
    const [col, val] = alvo.chave ? [alvo.chave, v.valor] : [alvo.rotulo, v.rotulo];
    const { rows } = await query(`SELECT count(*)::int AS n FROM ${alvo.tabela} WHERE ${col} = $1`, [val]);
    total += rows[0].n;
  }
  return total;
};

// GET /vocabularios?dominio=  (público: só ativos)
// ?todos=1 (Admin/Gestor, domínio editável): inclui inativos e a contagem de uso.
export const getVocabularios = async (req, res) => {
  const { dominio, programa, todos } = req.query;
  if (!dominio) return res.status(400).json({ message: 'Informe o domínio.' });
  if (todos === '1' && podeEditar(req.user) && DOMINIOS_EDITAVEIS[dominio]) {
    const { rows } = await query(
      'SELECT * FROM vocabularios WHERE dominio = $1 AND programa_id IS NULL ORDER BY ordem ASC, rotulo ASC',
      [dominio]
    );
    const itens = rows.map(vocabulariosRepo.fromRow);
    for (const v of itens) v.emUso = await contarUso(v);
    return res.json(itens);
  }
  res.json(await vocabulariosRepo.getByDominio(dominio, programa));
};

export const createVocabulario = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const { dominio, rotulo, cor, ordem } = req.body;
  if (!DOMINIOS_EDITAVEIS[dominio]) return res.status(400).json({ message: 'Domínio não editável.' });
  const r = String(rotulo || '').trim();
  if (!r) return res.status(400).json({ message: 'Informe o rótulo.' });
  const valor = slugify(req.body.valor || r);
  if (!valor) return res.status(400).json({ message: 'Rótulo inválido.' });
  const { rows } = await query(
    `INSERT INTO vocabularios (dominio, valor, rotulo, cor, ordem)
     VALUES ($1, $2, $3, $4, COALESCE($5, (SELECT COALESCE(max(ordem), -1) + 1 FROM vocabularios WHERE dominio = $1)))
     RETURNING *`,
    [dominio, valor, r, cor || null, Number.isInteger(ordem) ? ordem : null]
  );
  res.status(201).json(vocabulariosRepo.fromRow(rows[0]));
};

// Atualiza rótulo/cor/ordem/ativo. O `valor` não muda (é a chave gravada no
// conteúdo). Renomear propaga o rótulo novo às cópias no conteúdo, na mesma
// transação — senão o site continuaria mostrando o nome antigo.
export const updateVocabulario = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const { rows: atual } = await query('SELECT * FROM vocabularios WHERE id = $1', [req.params.id]);
  const v = atual[0];
  if (!v || !DOMINIOS_EDITAVEIS[v.dominio]) return res.status(404).json({ message: 'Item não encontrado.' });

  const rotulo = req.body.rotulo !== undefined ? String(req.body.rotulo).trim() : v.rotulo;
  if (!rotulo) return res.status(400).json({ message: 'Informe o rótulo.' });
  const cor = req.body.cor !== undefined ? (req.body.cor || null) : v.cor;
  const ordem = Number.isInteger(req.body.ordem) ? req.body.ordem : v.ordem;
  const ativo = req.body.ativo !== undefined ? !!req.body.ativo : v.ativo;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'UPDATE vocabularios SET rotulo = $1, cor = $2, ordem = $3, ativo = $4 WHERE id = $5 RETURNING *',
      [rotulo, cor, ordem, ativo, v.id]
    );
    if (rotulo !== v.rotulo) {
      for (const alvo of DOMINIOS_EDITAVEIS[v.dominio]) {
        const [col, val] = alvo.chave ? [alvo.chave, v.valor] : [alvo.rotulo, v.rotulo];
        await client.query(`UPDATE ${alvo.tabela} SET ${alvo.rotulo} = $1 WHERE ${col} = $2`, [rotulo, val]);
      }
    }
    await client.query('COMMIT');
    res.json(vocabulariosRepo.fromRow(rows[0]));
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

// Excluir: se algum conteúdo usa o valor, só desativa (some das listas de
// escolha, mas os itens antigos continuam classificados).
export const deleteVocabulario = async (req, res) => {
  const { rows } = await query('SELECT * FROM vocabularios WHERE id = $1', [req.params.id]);
  const v = rows[0];
  if (!v || !DOMINIOS_EDITAVEIS[v.dominio]) return res.status(404).json({ message: 'Item não encontrado.' });
  const uso = await contarUso(v);
  if (uso > 0) {
    await query('UPDATE vocabularios SET ativo = FALSE WHERE id = $1', [v.id]);
    return res.json({ desativado: true, emUso: uso, message: `Em uso por ${uso} item(ns): desativado em vez de excluído.` });
  }
  await query('DELETE FROM vocabularios WHERE id = $1', [v.id]);
  res.json({ excluido: true });
};
