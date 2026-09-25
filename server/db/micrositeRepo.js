// Dados do menu do microsite de um programa (Fases S.1–S.3 de
// docs/revisao-portal-conteudo-2026-09-24.md): quanto conteúdo publicado cada
// módulo tem, as páginas do programa e os ajustes gravados pelo programa.
// Usado pela leitura pública (GET /programas/slug/:slug) e pelo editor do
// painel (GET/PUT /programas/:id/menu), para os dois verem o mesmo menu.
import { pool, query } from './pool.js';
import { pagesRepo } from './repositories.js';
import { visivelPara, sqlPublicado } from '../utils/publicacao.js';
import { montarMenu, temTexto, checklistPublicacao } from '../utils/micrositeMenu.js';

const TABELAS_MODULO = [
  ['disciplinas', 'disciplinas'],
  ['teses', 'teses_dissertacoes'],
  ['faq', 'faq'],
  ['grupos', 'grupos_pesquisa'],
  ['resolucoes', 'resolucoes'],
  ['formularios', 'formularios'],
];

// Contagem por módulo. Vínculos: só os ativos (mesma regra das listas
// públicas de docentes/discentes/comissões).
export async function contarModulos(programaId) {
  const modulos = {};
  await Promise.all(TABELAS_MODULO.map(async ([chave, tabela]) => {
    const { rows } = await query(`SELECT count(*)::int AS n FROM ${tabela} WHERE programa_id = $1 AND ${sqlPublicado()}`, [programaId]);
    modulos[chave] = rows[0]?.n ?? 0;
  }));
  const { rows: [v] } = await query(
    `SELECT count(*) FILTER (WHERE papel IN ('DOCENTE_PERMANENTE', 'DOCENTE_COLABORADOR'))::int AS docentes,
            count(*) FILTER (WHERE papel IN ('DISCENTE_MESTRADO', 'DISCENTE_DOUTORADO', 'DISCENTE_PROFISSIONAL'))::int AS discentes,
            count(*) FILTER (WHERE papel = 'EGRESSO')::int AS egressos,
            count(*) FILTER (WHERE papel LIKE 'COMISSAO\\_%')::int AS comissoes
       FROM vinculos WHERE programa_id = $1 AND ativo`,
    [programaId]
  );
  const { rows: [l] } = await query('SELECT count(*)::int AS n FROM programa_linhas_pesquisa WHERE programa_id = $1', [programaId]);
  Object.assign(modulos, v);
  modulos.pessoas = modulos.docentes; // nome antigo, usado pela home do microsite
  modulos.documentos = modulos.resolucoes + modulos.formularios;
  modulos.linhas = l.n;
  return modulos;
}

export async function getAjustes(programaId) {
  const { rows } = await query('SELECT * FROM programa_menu_itens WHERE programa_id = $1', [programaId]);
  return rows;
}

// Substitui todos os ajustes do programa (o editor manda o menu inteiro).
export async function salvarAjustes(programaId, linhas, actor) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM programa_menu_itens WHERE programa_id = $1', [programaId]);
    for (const l of linhas) {
      await client.query(
        `INSERT INTO programa_menu_itens (programa_id, chave, rotulo, grupo, ordem, oculto, atualizado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [programaId, l.chave, l.rotulo, l.grupo, l.ordem, l.oculto, actor ?? null]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Menu do programa como `user` o vê. `todos` = forma do editor do painel.
// `modulos` pode vir pronto (a leitura pública já contou).
export async function menuDoPrograma(programaId, user, { todos = false, modulos } = {}) {
  const [contagem, criadas, fixas, ajustes] = await Promise.all([
    modulos ? Promise.resolve(modulos) : contarModulos(programaId),
    pagesRepo.getByPrograma(programaId),
    pagesRepo.getFixedByPrograma(programaId),
    getAjustes(programaId),
  ]);
  return montarMenu({
    modulos: contagem,
    paginas: criadas.filter((p) => visivelPara(user, p)),
    // Fixa conta como "com conteúdo" só publicada e com texto — no editor
    // também, para mostrar o que o público vai ver.
    paginasFixas: fixas.filter((p) => visivelPara(todos ? null : user, p) && temTexto(p.body?.value)).map((p) => p.chave),
    ajustes,
    todos,
  });
}

// Checklist de publicação (Fase S.4) de um programa; null se não existe.
export async function checklistDoPrograma(programaId) {
  const { rows: [programa] } = await query('SELECT * FROM programas WHERE id = $1', [programaId]);
  if (!programa) return null;
  const [sobre, coord, linhas] = await Promise.all([
    pagesRepo.getFixed(programaId, 'sobre'),
    query(`SELECT 1 FROM vinculos WHERE programa_id = $1 AND papel = 'COORDENADOR_ATUAL' AND ativo LIMIT 1`, [programaId]),
    query('SELECT count(*)::int AS n FROM programa_linhas_pesquisa WHERE programa_id = $1', [programaId]),
  ]);
  return checklistPublicacao({ programa, sobre, temCoordenacao: coord.rows.length > 0, linhas: linhas.rows[0].n });
}
