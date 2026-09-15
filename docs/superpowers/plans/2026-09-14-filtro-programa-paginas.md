# Filtro de programa na lista administrativa de páginas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir filtrar a lista de páginas administrativas pelo programa selecionado, sem ocultar páginas institucionais na visão padrão.

**Architecture:** `AdminPagesList` manterá o identificador do programa selecionado em estado local e aplicará esse critério junto à busca textual antes de derivar a seleção em massa e renderizar a tabela. O carregamento atual de páginas e programas será preservado; não haverá mudança de rota nem de API.

**Tech Stack:** React 19, JavaScript, Vitest e Tailwind CSS.

---

## Estrutura de arquivos

- Modificar: `src/pages/admin/AdminPagesList.jsx` — adicionar o estado, o seletor acessível e o critério de programa à lista derivada.
- Criar: `src/pages/admin/adminPagesFilter.js` — concentrar a filtragem pura de texto e programa, para que o comportamento possa ser testado sem dependências de renderização.
- Criar: `server/__tests__/adminPagesFilter.test.js` — cobrir a visão padrão e a seleção de programa, conforme a convenção de descoberta do Vitest neste projeto.

### Task 1: Filtragem de páginas por programa

**Files:**
- Create: `src/pages/admin/adminPagesFilter.js`
- Test: `server/__tests__/adminPagesFilter.test.js`

- [x] **Step 1: Write the failing test**

```js
import { describe, expect, it } from 'vitest';
import { filterAdminPages } from '../../src/pages/admin/adminPagesFilter.js';

const pages = [
  { id: 'geral', title: 'Institucional', slug: 'institucional', body: { value: 'Conteúdo geral' } },
  { id: 'a', title: 'Página A', slug: 'pagina-a', programaId: 'ppg-a', body: { value: 'Conteúdo A' } },
  { id: 'b', title: 'Página B', slug: 'pagina-b', programaId: 'ppg-b', body: { value: 'Conteúdo B' } },
];

describe('filterAdminPages', () => {
  it('mantém páginas institucionais e de programas quando nenhum programa é selecionado', () => {
    expect(filterAdminPages(pages, '', '')).toEqual(pages);
  });

  it('filtra por título, slug ou conteúdo', () => {
    expect(filterAdminPages(pages, 'conteúdo b', '')).toEqual([pages[2]]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- server/__tests__/adminPagesFilter.test.js`

Expected: FAIL because `./adminPagesFilter` does not exist.

- [x] **Step 3: Write minimal implementation**

```js
export function filterAdminPages(pages, searchQuery) {
  const query = searchQuery.toLowerCase();

  return pages.filter((item) => {
    const title = item.title || '';
    const slug = item.slug || '';
    const bodyText = item.body?.value || '';
    const matchesSearch = title.toLowerCase().includes(query)
      || slug.toLowerCase().includes(query)
      || bodyText.toLowerCase().includes(query);
    return matchesSearch;
  });
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- server/__tests__/adminPagesFilter.test.js`

Expected: PASS with two assertions passing.

- [x] **Step 5: Commit**

```bash
git add src/pages/admin/adminPagesFilter.js server/__tests__/adminPagesFilter.test.js
git commit -m "test: cobre filtro de páginas por programa"
```

### Task 2: Seletor na lista administrativa

**Files:**
- Modify: `src/pages/admin/AdminPagesList.jsx:1-84` — importar `filterAdminPages`, armazenar `selectedProgramaId` e utilizá-lo para derivar `filteredPages`.
- Modify: `src/pages/admin/AdminPagesList.jsx:115-131` — adicionar o campo de seleção junto à busca textual.
- Test: `server/__tests__/adminPagesFilter.test.js`

- [x] **Step 1: Write the failing test**

```js
it('mantém somente as páginas do programa selecionado', () => {
  expect(filterAdminPages(pages, '', 'ppg-a')).toEqual([pages[1]]);
});

it('retorna uma lista vazia quando o programa escolhido não possui páginas', () => {
  expect(filterAdminPages(pages, '', 'ppg-sem-paginas')).toEqual([]);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- server/__tests__/adminPagesFilter.test.js`

Expected: FAIL because `filterAdminPages` ainda ignora o terceiro argumento.

- [x] **Step 3: Write minimal implementation**

Em `AdminPagesList.jsx`, introduzir o estado e substituir o filtro local atual:

```js
import { filterAdminPages } from './adminPagesFilter';

const [selectedProgramaId, setSelectedProgramaId] = useState('');

const filteredPages = filterAdminPages(pages, searchQuery, selectedProgramaId);
```

Atualizar `filterAdminPages` para aceitar o terceiro argumento e combinar os dois critérios:

```js
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
```

Antes da barra de pesquisa, renderizar o seletor:

```jsx
<div className="mb-4 max-w-md">
  <label htmlFor="programa-filter" className="block text-sm font-medium text-gray-700 mb-1.5">
    Filtrar por programa
  </label>
  <select
    id="programa-filter"
    value={selectedProgramaId}
    onChange={(event) => setSelectedProgramaId(event.target.value)}
    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-ufrpe-yellow focus:border-ufrpe-yellow text-sm"
  >
    <option value="">Todos os programas</option>
    {programas.map((programa) => (
      <option key={programa.id} value={programa.id}>
        {programa.sigla && programa.sigla !== 'S/SIGLA' ? programa.sigla : programa.nome}
      </option>
    ))}
  </select>
</div>
```

- [x] **Step 4: Run tests and type checking**

Run: `npm test -- server/__tests__/adminPagesFilter.test.js`

Expected: PASS with four assertions passing.

Run: `npm run lint`

Expected: process exits with code 0.

- [x] **Step 5: Commit**

```bash
git add src/pages/admin/AdminPagesList.jsx src/pages/admin/adminPagesFilter.js server/__tests__/adminPagesFilter.test.js
git commit -m "feat(paginas): filtra lista administrativa por programa"
```

## Self-review

- O plano cobre o seletor solicitado, a preservação da visão com todos os programas, a coexistência com a busca textual e o estado vazio.
- Não há alteração de API ou de autorização; o escopo fica restrito à lista administrativa.
- Os nomes usados no teste, utilitário e componente são consistentes: `filterAdminPages` e `selectedProgramaId`.
