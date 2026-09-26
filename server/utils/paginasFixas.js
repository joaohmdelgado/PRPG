// Páginas fixas de programa ainda vazias (Fase S.2: 6 por programa, 42
// programas) não entram na lista geral do painel — são escritas pela tela "Site
// do Programa". Assim que ganham texto, voltam a aparecer na lista.
// (Antes vivia no front, em src/pages/admin/adminPagesFilter.js; a lista agora
// é filtrada, ordenada e paginada no servidor — Fase U.3.)
const vazia = (html) =>
  !html || !/\S/.test(String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' '));

export const semFixasVaziasDePrograma = (pages) =>
  pages.filter((p) => !(p.programaId && p.chave && vazia(p.body?.value)));
