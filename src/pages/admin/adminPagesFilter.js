export function filterAdminPages(pages, searchQuery, selectedProgramaId = '') {
  const query = searchQuery.toLowerCase();

  return pages.filter((item) => {
    const title = item.title || '';
    const slug = item.slug || '';
    const bodyText = item.body?.value || '';

    const matchesSearch = title.toLowerCase().includes(query)
      || slug.toLowerCase().includes(query)
      || bodyText.toLowerCase().includes(query);
    const matchesPrograma = !selectedProgramaId || item.programaId === selectedProgramaId;

    return matchesSearch && matchesPrograma;
  });
}

// Páginas fixas de programa ainda vazias (Fase S.2: 6 por programa, 42
// programas) não entram na lista geral — são escritas pela tela "Site do
// Programa". Assim que ganham texto, voltam a aparecer aqui.
export function semFixasVaziasDePrograma(pages) {
  const vazia = (html) =>
    !html || !/\S/.test(String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' '));
  return pages.filter((p) => !(p.programaId && p.chave && vazia(p.body?.value)));
}
