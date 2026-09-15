export function filterAdminPages(pages, searchQuery) {
  const query = searchQuery.toLowerCase();

  return pages.filter((item) => {
    const title = item.title || '';
    const slug = item.slug || '';
    const bodyText = item.body?.value || '';

    return title.toLowerCase().includes(query)
      || slug.toLowerCase().includes(query)
      || bodyText.toLowerCase().includes(query);
  });
}
