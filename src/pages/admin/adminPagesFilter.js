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
