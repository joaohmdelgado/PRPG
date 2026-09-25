// Onde o conteúdo aponta para arquivos (Fase F.5 — biblioteca de mídia).
//
// O conteúdo grava a URL do arquivo em texto ('/uploads/xxx.pdf', às vezes
// com o host na frente, ou dentro do HTML do corpo), não o id de `arquivos`.
// Este mapa é a única fonte de "onde este arquivo é usado" e de "trocar este
// arquivo em todos os lugares". Coluna nova que guarde URL de arquivo entra aqui.
//
//   modo 'texto': a URL aparece na coluna (igual ou dentro de HTML)
//   modo 'array': coluna TEXT[] (corpo da notícia, um parágrafo por item)
//   modo 'id':    coluna com o id de `arquivos` (atos, anexos)
//
// Eventos (erratas/resultados de edital) também citam arquivos, mas são
// append-only: aparecem em "onde é usado" e NÃO são reescritos ao substituir
// — por isso o arquivo antigo continua em disco.
import { query } from './pool.js';

export const USOS = [
  { tabela: 'news', coluna: 'image', modo: 'texto', tipo: 'Notícia (capa)', titulo: 'title', admin: (id) => `/admin/noticias/editar/${id}` },
  { tabela: 'news', coluna: 'content', modo: 'array', tipo: 'Notícia (texto)', titulo: 'title', admin: (id) => `/admin/noticias/editar/${id}` },
  { tabela: 'editais', coluna: 'download_link', modo: 'texto', tipo: 'Edital', titulo: 'title', admin: (id) => `/admin/editais/editar/${id}` },
  { tabela: 'editais', coluna: 'description', modo: 'texto', tipo: 'Edital (descrição)', titulo: 'title', admin: (id) => `/admin/editais/editar/${id}` },
  { tabela: 'resolucoes', coluna: 'link', modo: 'texto', tipo: 'Resolução', titulo: 'title', admin: (id) => `/admin/resolucoes/editar/${id}` },
  { tabela: 'formularios', coluna: 'link', modo: 'texto', tipo: 'Formulário', titulo: 'title', admin: (id) => `/admin/formularios/editar/${id}` },
  { tabela: 'pages', coluna: 'body_value', modo: 'texto', tipo: 'Página', titulo: 'title', admin: (id) => `/admin/paginas/editar/${id}` },
  { tabela: 'grupos_pesquisa', coluna: 'body_value', modo: 'texto', tipo: 'Grupo de pesquisa', titulo: 'title', admin: (id) => `/admin/grupos-pesquisa/editar/${id}` },
  { tabela: 'disciplinas', coluna: 'ementa_url', modo: 'texto', tipo: 'Disciplina (ementa)', titulo: 'title', admin: (id) => `/admin/disciplinas/editar/${id}` },
  { tabela: 'teses_dissertacoes', coluna: 'arquivo_url', modo: 'texto', tipo: 'Tese/Dissertação', titulo: 'title', admin: (id) => `/admin/teses-dissertacoes/editar/${id}` },
  { tabela: 'calendarios', coluna: 'pdf_link', modo: 'texto', tipo: 'Calendário', titulo: 'title', admin: (id) => `/admin/calendarios/editar/${id}` },
  { tabela: 'portarias', coluna: 'download_link', modo: 'texto', tipo: 'Portaria', titulo: 'title', admin: (id) => `/admin/portarias/editar/${id}` },
  { tabela: 'programas', coluna: 'logo_url', modo: 'texto', tipo: 'Programa (logo)', titulo: 'nome', admin: (id) => `/admin/programas/editar/${id}` },
  { tabela: 'programas', coluna: 'hero_imagem_url', modo: 'texto', tipo: 'Programa (imagem de capa)', titulo: 'nome', admin: (id) => `/admin/programas/editar/${id}` },
  { tabela: 'programas', coluna: 'regimento_url', modo: 'texto', tipo: 'Programa (regimento)', titulo: 'nome', admin: (id) => `/admin/programas/editar/${id}` },
  { tabela: 'programas', coluna: 'regulamento_url', modo: 'texto', tipo: 'Programa (regulamento)', titulo: 'nome', admin: (id) => `/admin/programas/editar/${id}` },
  { tabela: 'users', coluna: 'perfil_foto_url', modo: 'texto', tipo: 'Usuário (foto)', titulo: 'perfil_nome', admin: (id) => `/admin/users/editar/${id}` },
  { tabela: 'pessoas', coluna: 'foto_url', modo: 'texto', tipo: 'Pessoa (foto)', titulo: 'nome', admin: () => null },
  { tabela: 'atos', coluna: 'arquivo_id', modo: 'id', tipo: 'Expediente', titulo: 'numero_exibicao', admin: (id) => `/admin/atos/${id}` },
  { tabela: 'anexos', coluna: 'arquivo_id', modo: 'id', tipo: 'Anexo', titulo: 'descricao', admin: () => null },
  { tabela: 'eventos', coluna: "dados->>'link'", modo: 'texto', tipo: 'Edital (errata/resultado)', titulo: 'tipo', admin: () => null, idColuna: 'entidade_id', imutavel: true },
];

const condicao = (u, param) => {
  if (u.modo === 'array') return `EXISTS (SELECT 1 FROM unnest(${u.coluna}) AS parte WHERE position(${param} IN parte) > 0)`;
  if (u.modo === 'id') return `${u.coluna} = ${param}`;
  return `position(${param} IN coalesce(${u.coluna}, '')) > 0`;
};

// Lista de lugares que usam um arquivo.
export async function listarUsos(arquivo) {
  const usos = [];
  for (const u of USOS) {
    const param = u.modo === 'id' ? arquivo.id : arquivo.url;
    const idCol = u.idColuna || 'id';
    const { rows } = await query(
      `SELECT ${idCol} AS id, ${u.titulo}::text AS titulo FROM ${u.tabela} WHERE ${condicao(u, '$1')} LIMIT 50`,
      [param]
    );
    for (const r of rows) usos.push({ tipo: u.tipo, id: r.id, titulo: r.titulo, admin: u.admin(r.id), imutavel: !!u.imutavel });
  }
  return usos;
}

// Contagem de uso de todos os arquivos, uma consulta por coluna do mapa (não
// uma por arquivo). Devolve Map(arquivoId -> n).
export async function contarUsos() {
  const total = new Map();
  for (const u of USOS) {
    const cond = u.modo === 'id'
      ? `t.${u.coluna} = a.id`
      : condicao({ ...u, coluna: `t.${u.coluna}` }, 'a.url');
    const { rows } = await query(
      `SELECT a.id, count(*)::int AS n FROM arquivos a JOIN ${u.tabela} t ON ${cond} GROUP BY a.id`
    );
    for (const r of rows) total.set(r.id, (total.get(r.id) || 0) + r.n);
  }
  return total;
}

// Troca a URL antiga pela nova em todo o conteúdo (menos os eventos, que são
// imutáveis). Roda no `client` de uma transação aberta pelo chamador.
// Devolve quantas linhas foram alteradas.
export async function substituirReferencias(client, urlAntiga, urlNova) {
  let alteradas = 0;
  for (const u of USOS) {
    if (u.imutavel || u.modo === 'id') continue; // colunas por id não mudam: o id do arquivo é o mesmo
    const set = u.modo === 'array'
      ? `${u.coluna} = ARRAY(SELECT replace(parte, $1, $2) FROM unnest(${u.coluna}) AS parte)`
      : `${u.coluna} = replace(${u.coluna}, $1, $2)`;
    const { rowCount } = await client.query(
      `UPDATE ${u.tabela} SET ${set} WHERE ${condicao(u, '$1')}`,
      [urlAntiga, urlNova]
    );
    alteradas += rowCount;
  }
  return alteradas;
}
