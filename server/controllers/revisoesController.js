import {
  newsRepo, editaisRepo, resolucoesRepo, formulariosRepo, pagesRepo, faqRepo,
  disciplinasRepo, tesesRepo, gruposRepo, bolsasRepo, calendariosRepo,
} from '../db/repositories.js';
import { listarRevisoes, obterRevisao, camposRestauraveis } from '../db/revisoesRepo.js';
import { isProgramaScoped } from '../middleware/authMiddleware.js';

// Histórico de versões (Fase F.7). `:entidade` é o nome da tabela, o mesmo
// gravado em revisoes.entidade. `global`: conteúdo que o gestor de programa
// não edita (mesma regra do blockProgramaScoped nas rotas PUT).
const ENTIDADES = {
  news: { repo: newsRepo },
  editais: { repo: editaisRepo },
  resolucoes: { repo: resolucoesRepo },
  formularios: { repo: formulariosRepo },
  pages: { repo: pagesRepo },
  faq: { repo: faqRepo },
  disciplinas: { repo: disciplinasRepo },
  teses_dissertacoes: { repo: tesesRepo },
  grupos_pesquisa: { repo: gruposRepo },
  bolsas: { repo: bolsasRepo, global: true },
  calendarios: { repo: calendariosRepo, global: true },
};

// Middleware: a entidade existe, o item existe e quem pede pode editá-lo
// (as mesmas regras do PUT do conteúdo). Deixa o item em req.itemRevisado.
export const autorizarRevisao = async (req, res, next) => {
  const cfg = ENTIDADES[req.params.entidade];
  if (!cfg) return res.status(404).json({ message: 'Tipo de conteúdo sem histórico.' });
  const escopado = isProgramaScoped(req.user);
  if (escopado && cfg.global) return res.status(403).json({ message: 'Ação não permitida para gestor de programa.' });
  const item = await cfg.repo.getById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item não encontrado.' });
  if (escopado && (item.programaId ?? null) !== req.user.programaId) {
    return res.status(403).json({ message: 'Você só pode gerenciar conteúdo do seu programa.' });
  }
  req.itemRevisado = item;
  req.repoRevisado = cfg.repo;
  return next();
};

export const getRevisoes = async (req, res) => {
  res.json(await listarRevisoes(req.params.entidade, req.params.id));
};

// A revisão pedida, desde que pertença ao item da URL.
const revisaoDoItem = async (req) => {
  const rev = await obterRevisao(Number.parseInt(req.params.revisaoId, 10) || 0);
  if (!rev || rev.entidade !== req.params.entidade || rev.entidadeId !== String(req.params.id)) return null;
  return rev;
};

export const getRevisao = async (req, res) => {
  const rev = await revisaoDoItem(req);
  if (!rev) return res.status(404).json({ message: 'Versão não encontrada.' });
  return res.json(rev);
};

// Restaura o conteúdo da versão escolhida (não a situação/data de publicação,
// o programa nem o endereço — ver camposRestauraveis). O próprio update
// guarda a versão atual no histórico, então a restauração pode ser desfeita.
// `_versao` no corpo ativa a checagem de edição concorrente, como no PUT.
export const restaurarRevisao = async (req, res) => {
  const rev = await revisaoDoItem(req);
  if (!rev) return res.status(404).json({ message: 'Versão não encontrada.' });
  const dados = camposRestauraveis(rev.snapshot);
  if (req.body?._versao) dados._versao = req.body._versao;
  const atualizado = await req.repoRevisado.update(req.params.id, dados, req.user?.id);
  if (!atualizado) return res.status(404).json({ message: 'Item não encontrado.' });
  return res.json(atualizado);
};
