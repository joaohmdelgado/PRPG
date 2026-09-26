// Fase L.10 (Acabamento documental, PLANO.md): busca full-text sobre as
// entidades centrais (processos da Câmara, atos/expedientes, estágios PNPD).
// Log de auditoria por campo (quem mudou qual valor, de/para) FICOU DE FORA
// desta fase: exigiria triggers de banco ou um wrapper de escrita genérico
// registrando diffs em todas as tabelas — infraestrutura nova e transversal,
// desproporcional ao tempo restante. O que já existe hoje (`criado_por`/
// `atualizado_por` em toda tabela, e a linha do tempo append-only em
// `eventos`) cobre "quem e quando", só não "qual campo mudou de que para quê".
import { query } from '../db/pool.js';
import { posDoutoradoRepo } from '../db/posDoutoradoRepo.js';
import { isProgramaScoped } from '../middleware/authMiddleware.js';

// Fase U.5 (busca do painel, Ctrl+K): além das entidades centrais, o painel
// encontra os tipos de conteúdo. Cada tipo diz de que tabela vem, qual coluna é
// o título, em quais colunas procurar e se pertence a programa (o Gestor de
// Programa só vê o do próprio; tipos globais da PRPG ficam fora para ele).
// Rascunhos e arquivados entram — o painel edita o que o público ainda não vê.
const CONTEUDO = [
  { chave: 'noticias', tabela: 'news', titulo: 'title', detalhe: 'category', colunas: ['title', 'excerpt', 'category'], programa: 'programa_id', status: true, ordem: 'date DESC NULLS LAST' },
  { chave: 'editais', tabela: 'editais', titulo: 'title', detalhe: 'numero', colunas: ['title', 'numero', 'category_title'], programa: 'programa_id', status: true, ordem: 'published_at DESC NULLS LAST' },
  { chave: 'resolucoes', tabela: 'resolucoes', titulo: 'title', detalhe: 'category_title', colunas: ['title', 'category_title', 'section_title'], programa: 'programa_id', status: true, ordem: 'title' },
  { chave: 'formularios', tabela: 'formularios', titulo: 'title', detalhe: 'category_title', colunas: ['title', 'category_title', 'section_title'], programa: 'programa_id', status: true, ordem: 'title' },
  { chave: 'paginas', tabela: 'pages', titulo: 'title', detalhe: 'slug', colunas: ['title', 'slug'], programa: 'programa_id', status: true, ordem: 'title' },
  { chave: 'teses', tabela: 'teses_dissertacoes', titulo: 'title', detalhe: 'tipo', colunas: ['title'], programa: 'programa_id', status: true, ordem: 'title' },
  { chave: 'faq', tabela: 'faq', titulo: 'title', colunas: ['title', 'resposta'], programa: 'programa_id', status: true, ordem: 'title' },
  { chave: 'disciplinas', tabela: 'disciplinas', titulo: 'title', detalhe: 'tipo_disciplina', colunas: ['title'], programa: 'programa_id', status: true, ordem: 'title' },
  // Globais da PRPG (sem programa): não aparecem para o Gestor de Programa.
  { chave: 'bolsas', tabela: 'bolsas', titulo: 'title', detalhe: 'tipo_bolsa', colunas: ['title', 'tipo_bolsa'], status: true, ordem: 'title', soPrpg: true },
  { chave: 'usuarios', tabela: 'users', titulo: "COALESCE(NULLIF(btrim(perfil_nome), ''), email)", detalhe: 'email', colunas: ['perfil_nome', 'email'], ordem: 'perfil_nome', soPrpg: true },
  // O próprio programa: o Gestor de Programa só encontra o dele.
  { chave: 'programas', tabela: 'programas', titulo: 'nome', detalhe: 'sigla', colunas: ['nome', 'sigla'], ordem: 'nome', ehPrograma: true },
];

// Escapa a barra invertida, % e _ do que a pessoa digitou (é texto, não padrão do LIKE).
const escaparLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const buscarConteudo = (tipo, q, scopedPrograma) => {
  // Sem acento nos dois lados: "selecao" encontra "Seleção" (busca_limpar = unaccent sem tags HTML).
  const where = tipo.colunas.map((c) => `busca_limpar(${c}::text) ILIKE '%' || busca_limpar($1) || '%'`).join(' OR ');
  const params = [escaparLike(q)];
  let escopo = '';
  if (scopedPrograma) {
    if (tipo.soPrpg) return Promise.resolve({ rows: [] });
    params.push(scopedPrograma);
    escopo = tipo.ehPrograma ? ' AND id = $2' : (tipo.programa ? ` AND ${tipo.programa} = $2` : '');
  }
  return query(
    `SELECT id, ${tipo.titulo} AS titulo, ${tipo.detalhe || 'NULL'}::text AS detalhe${tipo.status ? ', status' : ''}
       FROM ${tipo.tabela} WHERE (${where})${escopo} ORDER BY ${tipo.ordem} LIMIT 8`,
    params
  );
};

export const buscaGlobal = async (req, res) => {
  const q = String(req.query.q || '').trim();
  const vazio = { processos: [], atos: [], posDoutorado: [], ...Object.fromEntries(CONTEUDO.map((t) => [t.chave, []])) };
  if (q.length < 2) return res.json(vazio);
  const like = `%${q}%`;
  const scopedPrograma = isProgramaScoped(req.user) ? req.user.programaId : null;

  const [conteudo, processos, atos, posDoutorado] = await Promise.all([
    Promise.all(CONTEUDO.map((t) => buscarConteudo(t, q, scopedPrograma))),
    query(
      `SELECT id, numero, assunto, status FROM processos
        WHERE (numero ILIKE $1 OR assunto ILIKE $1) AND ($2::text IS NULL OR programa_id = $2)
        ORDER BY criado_em DESC LIMIT 20`,
      [like, scopedPrograma]
    ),
    query(
      `SELECT a.id, a.assunto, a.situacao, a.ano, a.sequencial, s.sigla AS serie_sigla
       FROM atos a JOIN ato_series s ON s.id = a.serie_id
       WHERE (a.assunto ILIKE $1 OR a.destinatario_texto ILIKE $1) AND ($2::text IS NULL OR a.programa_id = $2)
       ORDER BY a.criado_em DESC LIMIT 20`,
      [like, scopedPrograma]
    ),
    posDoutoradoRepo.getAll({ q, programa: scopedPrograma || undefined }),
  ]);

  res.json({
    ...Object.fromEntries(CONTEUDO.map((t, i) => [t.chave, conteudo[i].rows])),
    processos: processos.rows,
    atos: atos.rows.map((a) => ({ ...a, numeroExibicao: `${a.serie_sigla} Nº ${a.sequencial}/${a.ano}` })),
    posDoutorado: posDoutorado.slice(0, 20).map((p) => ({ id: p.id, nome: p.nome, projetoTitulo: p.projetoTitulo, situacao: p.situacao })),
  });
};
