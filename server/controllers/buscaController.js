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

export const buscaGlobal = async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ processos: [], atos: [], posDoutorado: [] });
  const like = `%${q}%`;
  const scopedPrograma = isProgramaScoped(req.user) ? req.user.programaId : null;

  const [processos, atos, posDoutorado] = await Promise.all([
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
    processos: processos.rows,
    atos: atos.rows.map((a) => ({ ...a, numeroExibicao: `${a.serie_sigla} Nº ${a.sequencial}/${a.ano}` })),
    posDoutorado: posDoutorado.slice(0, 20).map((p) => ({ id: p.id, nome: p.nome, projetoTitulo: p.projetoTitulo, situacao: p.situacao })),
  });
};
