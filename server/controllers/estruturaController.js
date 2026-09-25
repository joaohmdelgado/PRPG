// Fase H.4 (docs/revisao-portal-conteudo-2026-09-24.md): Equipe e Estrutura
// Organizacional da PRPG geradas dos dados (unidades + vinculos + contatos)
// e editáveis no painel em "Equipe e estrutura".
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { isPlainObject } from '../utils/sanitize.js';
import { hojeISO } from '../utils/datas.js';
import {
  RAIZ, carregarEstrutura, adicionarMembro, substituirContatosDoVinculo, substituirContatosDaUnidade,
} from '../db/estruturaPrpg.js';

const podeEditar = (user) => (user?.roles || []).some((r) => r === 'Administrator' || r === 'Gestor');
const texto = (v, max = 500) => (v == null ? null : String(v).trim().slice(0, max) || null);

const TIPOS_CONTATO = ['EMAIL', 'TELEFONE', 'CELULAR', 'WHATSAPP', 'RAMAL', 'SITE', 'ENDERECO', 'INSTAGRAM'];
const PAPEIS = ['PRO_REITOR', 'COORDENADOR', 'VICE_COORDENADOR', 'SECRETARIO', 'SERVIDOR', 'SUBSTITUTO_EVENTUAL'];
const IMAGEM_OK = /^(\/uploads\/|https?:\/\/)/i;

// Lista de contatos enviada pelo editor -> { erro } | { contatos }.
const validarContatos = (lista) => {
  if (lista === undefined) return { contatos: undefined };
  if (!Array.isArray(lista) || lista.length > 20) return { erro: 'Lista de contatos inválida.' };
  const contatos = [];
  for (const c of lista) {
    if (!isPlainObject(c) || !TIPOS_CONTATO.includes(c.tipo)) return { erro: 'Tipo de contato inválido.' };
    const valor = texto(c.valor, 300);
    if (valor) contatos.push({ tipo: c.tipo, valor, publico: c.publico !== false });
  }
  return { contatos };
};

// GET /estrutura — árvore pública; ?todos=1 (Admin/Gestor) para o editor.
export const getEstrutura = async (req, res) => {
  const todos = req.query.todos === '1' && podeEditar(req.user);
  const raiz = await carregarEstrutura({ todos });
  if (!raiz) return res.status(404).json({ message: 'Estrutura ainda não cadastrada.' });
  return res.json(raiz);
};

const unidadeDaArvore = async (id) => {
  const { rows } = await query(
    `WITH RECURSIVE arvore AS (
       SELECT id FROM unidades WHERE id = $1
       UNION ALL SELECT u.id FROM unidades u JOIN arvore a ON u.unidade_pai_id = a.id
     ) SELECT 1 FROM arvore WHERE id = $2`,
    [RAIZ, id]
  );
  return !!rows[0];
};

// PUT /estrutura/unidades/:id — nome, sigla, descrição, ordem, exibição, pai e contatos.
export const updateUnidadeEstrutura = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  if (!(await unidadeDaArvore(req.params.id))) return res.status(404).json({ message: 'Setor não encontrado.' });
  const b = req.body;
  const { contatos, erro } = validarContatos(b.contatos);
  if (erro) return res.status(400).json({ message: erro });
  if (b.nome !== undefined && !texto(b.nome, 200)) return res.status(400).json({ message: 'O nome é obrigatório.' });
  if (b.paiId !== undefined && req.params.id !== RAIZ) {
    if (b.paiId === req.params.id || !(await unidadeDaArvore(b.paiId))) {
      return res.status(400).json({ message: 'Setor superior inválido.' });
    }
  }
  await query(
    `UPDATE unidades SET
       nome = coalesce($2, nome), sigla = coalesce($3, sigla), descricao = $4,
       ordem = coalesce($5, ordem), exibir_no_site = coalesce($6, exibir_no_site),
       unidade_pai_id = CASE WHEN id = '${RAIZ}' THEN unidade_pai_id ELSE coalesce($7, unidade_pai_id) END
     WHERE id = $1`,
    [req.params.id, texto(b.nome, 200), texto(b.sigla, 60), texto(b.descricao, 1000),
      Number.isInteger(b.ordem) ? b.ordem : null, typeof b.exibirNoSite === 'boolean' ? b.exibirNoSite : null,
      b.paiId || null]
  );
  if (contatos) await substituirContatosDaUnidade(req.params.id, contatos, req.user?.id);
  return res.json(await carregarEstrutura({ todos: true }));
};

// POST /estrutura/unidades — novo setor abaixo de outro (padrão: a raiz).
export const createUnidadeEstrutura = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const nome = texto(req.body.nome, 200);
  if (!nome) return res.status(400).json({ message: 'O nome é obrigatório.' });
  const paiId = req.body.paiId || RAIZ;
  if (!(await unidadeDaArvore(paiId))) return res.status(400).json({ message: 'Setor superior inválido.' });
  const id = `prpg-${crypto.randomUUID().slice(0, 8)}`;
  await query(
    `INSERT INTO unidades (id, sigla, nome, tipo, unidade_pai_id, descricao, ordem, exibir_no_site, interna_prpg)
     VALUES ($1, $2, $3, 'SETOR', $4, $5, $6, TRUE, TRUE)`,
    [id, texto(req.body.sigla, 60) || nome.slice(0, 60), nome, paiId, texto(req.body.descricao, 1000),
      Number.isInteger(req.body.ordem) ? req.body.ordem : 99]
  );
  return res.status(201).json(await carregarEstrutura({ todos: true }));
};

const validarMembro = (b, { novo }) => {
  if (!isPlainObject(b)) return 'Dados inválidos.';
  if (novo && !b.pessoaId && !texto(b.nome, 200)) return 'Informe o nome da pessoa.';
  if (b.papel !== undefined && !PAPEIS.includes(b.papel)) return 'Papel inválido.';
  if (b.foto && !IMAGEM_OK.test(b.foto)) return 'Foto inválida: envie pela biblioteca ou use um endereço https://.';
  return null;
};

// POST /estrutura/unidades/:id/membros
export const addMembroEstrutura = async (req, res) => {
  if (!(await unidadeDaArvore(req.params.id))) return res.status(404).json({ message: 'Setor não encontrado.' });
  const erroMembro = validarMembro(req.body, { novo: true });
  if (erroMembro) return res.status(400).json({ message: erroMembro });
  const { contatos, erro } = validarContatos(req.body.contatos);
  if (erro) return res.status(400).json({ message: erro });
  const b = req.body;
  await adicionarMembro(req.params.id, {
    pessoaId: b.pessoaId || null, nome: b.nome, papel: b.papel || 'SERVIDOR', funcao: texto(b.funcao, 120),
    ordem: Number.isInteger(b.ordem) ? b.ordem : 99, foto: texto(b.foto, 1000), contatos: contatos || [],
  }, req.user?.id);
  return res.status(201).json(await carregarEstrutura({ todos: true }));
};

const vinculoDoSetor = async (id) => {
  const { rows } = await query('SELECT id, pessoa_id, unidade_id FROM vinculos WHERE id = $1 AND unidade_id IS NOT NULL', [id]);
  return rows[0] && (await unidadeDaArvore(rows[0].unidade_id)) ? rows[0] : null;
};

// PUT /estrutura/membros/:id — função, papel, ordem, foto e contatos da função.
export const updateMembroEstrutura = async (req, res) => {
  const v = await vinculoDoSetor(req.params.id);
  if (!v) return res.status(404).json({ message: 'Pessoa não encontrada neste setor.' });
  const erroMembro = validarMembro(req.body, { novo: false });
  if (erroMembro) return res.status(400).json({ message: erroMembro });
  const { contatos, erro } = validarContatos(req.body.contatos);
  if (erro) return res.status(400).json({ message: erro });
  const b = req.body;
  await query(
    `UPDATE vinculos SET papel = coalesce($2, papel), funcao = $3, ordem = coalesce($4, ordem) WHERE id = $1`,
    [v.id, b.papel || null, texto(b.funcao, 120), Number.isInteger(b.ordem) ? b.ordem : null]
  );
  if (b.foto !== undefined) await query('UPDATE pessoas SET foto_url = $2 WHERE id = $1', [v.pessoa_id, texto(b.foto, 1000)]);
  if (contatos) await substituirContatosDoVinculo(v.id, v.pessoa_id, contatos, req.user?.id);
  return res.json(await carregarEstrutura({ todos: true }));
};

// DELETE /estrutura/membros/:id — encerra o vínculo (some do site; a pessoa,
// o histórico e os contatos continuam no banco).
export const endMembroEstrutura = async (req, res) => {
  const v = await vinculoDoSetor(req.params.id);
  if (!v) return res.status(404).json({ message: 'Pessoa não encontrada neste setor.' });
  await query(
    `UPDATE vinculos SET ativo = FALSE, data_fim_mandato = coalesce(data_fim_mandato, $2::date) WHERE id = $1`,
    [v.id, hojeISO()]
  );
  return res.json(await carregarEstrutura({ todos: true }));
};
