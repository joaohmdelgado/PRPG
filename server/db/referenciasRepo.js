import { query } from './pool.js';
import { sqlPublicado } from '../utils/publicacao.js';

// Ligações "Relacionados" entre conteúdos (Fase N.5). Lista fechada de tipos
// (mesma do CHECK da tabela `referencias`): tipo -> tabela e como montar o
// endereço público do item.
export const TIPOS_REFERENCIA = {
  noticia: { tabela: 'news', rotulo: 'Notícia', data: 'date', destino: (r) => `/noticia/${r.id}` },
  edital: { tabela: 'editais', rotulo: 'Edital', data: 'published_at', destino: (r) => `/editais/${r.id}` },
  resolucao: { tabela: 'resolucoes', rotulo: 'Resolução', data: null, destino: (r) => r.link || '/resolucoes' },
  formulario: { tabela: 'formularios', rotulo: 'Formulário', data: null, destino: (r) => r.link || '/formularios' },
  pagina: {
    tabela: 'pages', rotulo: 'Página', data: null,
    destino: (r) => (r.programa_slug ? `/${r.programa_slug}/${r.slug}` : `/${r.slug}`),
  },
};
const TIPO_POR_TABELA = Object.fromEntries(Object.entries(TIPOS_REFERENCIA).map(([t, c]) => [c.tabela, t]));

// Mesmas colunas para todo tipo (a busca de candidatos une todos num UNION);
// o que o tipo não tem vai NULL.
const colunas = (tipo) => {
  const c = TIPOS_REFERENCIA[tipo];
  const temLink = tipo === 'resolucao' || tipo === 'formulario';
  return [
    't.id', 't.title AS titulo', 't.status', 't.publicado_em', 't.programa_id',
    c.data ? `t.${c.data}::date AS data` : 'NULL::date AS data',
    temLink ? 't.link' : 'NULL::text AS link',
    tipo === 'pagina' ? 't.slug' : 'NULL::text AS slug',
    'p.slug AS programa_slug',
  ].join(', ');
};

const itemDe = (tipo, r) => ({
  tipo, rotuloTipo: TIPOS_REFERENCIA[tipo].rotulo, id: r.id, titulo: r.titulo,
  destino: TIPOS_REFERENCIA[tipo].destino(r), data: r.data || null, status: r.status,
});

// Resolve pares { tipo, id } em itens exibíveis. `publicos`: só o que o
// público vê (publicado e já na data).
export async function resolverItens(pares, { publicos = true } = {}) {
  const porTipo = {};
  for (const p of pares) (porTipo[p.tipo] ||= []).push(String(p.id));
  const achados = new Map();
  for (const [tipo, ids] of Object.entries(porTipo)) {
    const c = TIPOS_REFERENCIA[tipo];
    if (!c) continue;
    const { rows } = await query(
      `SELECT ${colunas(tipo)} FROM ${c.tabela} t LEFT JOIN programas p ON p.id = t.programa_id
        WHERE t.id = ANY($1) ${publicos ? `AND ${sqlPublicado('t')}` : ''}`,
      [ids]
    );
    for (const r of rows) achados.set(`${tipo}:${r.id}`, itemDe(tipo, r));
  }
  // Mantém a ordem pedida; some o que não existe (ou não é público).
  return pares.map((p) => achados.get(`${p.tipo}:${p.id}`)).filter(Boolean);
}

// Ligações de um item, nos dois sentidos, na ordem em que foram gravadas.
export async function listarReferencias(tipo, id) {
  const { rows } = await query(
    `SELECT CASE WHEN origem_tipo = $1 AND origem_id = $2 THEN destino_tipo ELSE origem_tipo END AS tipo,
            CASE WHEN origem_tipo = $1 AND origem_id = $2 THEN destino_id ELSE origem_id END AS id
       FROM referencias
      WHERE (origem_tipo = $1 AND origem_id = $2) OR (destino_tipo = $1 AND destino_id = $2)
      ORDER BY ordem, id`,
    [tipo, String(id)]
  );
  return rows;
}

// Substitui todas as ligações do item (as gravadas a partir dele e as que
// outros itens fizeram para ele: o editor mostra e salva o conjunto todo).
export async function substituirReferencias(client, tipo, id, itens, actor) {
  await client.query(
    'DELETE FROM referencias WHERE (origem_tipo = $1 AND origem_id = $2) OR (destino_tipo = $1 AND destino_id = $2)',
    [tipo, String(id)]
  );
  for (const [ordem, it] of itens.entries()) {
    await client.query(
      `INSERT INTO referencias (origem_tipo, origem_id, destino_tipo, destino_id, ordem, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [tipo, String(id), it.tipo, String(it.id), ordem, actor || null]
    );
  }
}

// Chamada pelo repositório ao excluir um item de conteúdo.
export async function apagarReferenciasDaTabela(tabela, id) {
  const tipo = TIPO_POR_TABELA[tabela];
  if (!tipo) return;
  await query(
    'DELETE FROM referencias WHERE (origem_tipo = $1 AND origem_id = $2) OR (destino_tipo = $1 AND destino_id = $2)',
    [tipo, String(id)]
  );
}

// Busca de itens para ligar (painel): título sem acento, inclui rascunhos.
export async function buscarCandidatos(termo, limite = 20) {
  const like = `%${termo}%`;
  const partes = Object.entries(TIPOS_REFERENCIA).map(([tipo, c]) =>
    `(SELECT '${tipo}' AS tipo, ${colunas(tipo)} FROM ${c.tabela} t LEFT JOIN programas p ON p.id = t.programa_id
       WHERE busca_limpar(t.title) ILIKE busca_limpar($1) ORDER BY t.title LIMIT $2)`);
  const { rows } = await query(partes.join(' UNION ALL '), [like, limite]);
  return rows.map((r) => itemDe(r.tipo, r));
}
