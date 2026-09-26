# Site, SEO e desempenho — operação

Fase P de [`revisao-portal-conteudo-2026-09-24.md`](../revisao-portal-conteudo-2026-09-24.md).

## Como o site chega ao visitante

O front é uma SPA (`npm run build` → `dist/`). O servidor Express (`server/index.js`) entrega, além da API e de
`/uploads`:

| Endereço | O que responde |
|---|---|
| `/robots.txt`, `/sitemap.xml` | gerados na hora (cache de 10 min) — não dependem do build |
| `/assets/*` e demais arquivos de `dist/` | arquivos do build; `/assets` com cache de 1 ano (nome com hash) |
| qualquer outro endereço público | o `index.html` do build **com título, descrição, canonical, Open Graph, JSON-LD e situação HTTP daquela página**, montados a partir do banco (`server/seo/`) |

Só funciona com o build presente (`SPA_DIST_DIR`, padrão `./dist`). Sem ele (desenvolvimento, com o Vite servindo o
site) o servidor não entrega páginas; `robots.txt` e `sitemap.xml` continuam saindo dele (o Vite os repassa).

Duas formas de publicar:

1. **Servidor como origem única** — o proxy reverso manda tudo para o Express. `PUBLIC_SITE_URL` = o endereço
   público; `VITE_API_URL` no build = o mesmo endereço.
2. **Proxy serve os estáticos e manda as páginas HTML para o Express** — arquivos de `/assets` direto do disco,
   qualquer outro caminho que não seja arquivo vai ao Express (é ele quem sabe se a notícia existe: uma inexistente
   responde **404** de verdade). Se a API está em outro endereço que o site, defina `PUBLIC_API_URL` (igual ao
   `VITE_API_URL`) para o pré-carregamento e o `og:image` apontarem para o lugar certo.

O HTML sai com uma política de segurança própria (`script-src 'self'; object-src 'none'; base-uri 'self';
frame-ancestors 'self'`) — a da API (`default-src 'none'`) impediria a página de carregar. O endurecimento completo
(CSP com nonce, `img-src`, `connect-src`) é da Task 12 do plano de prontidão.

## O que cada página declara

`server/seo/metadados.js` espelha as rotas de `src/App.jsx` (um teste confere a lista das 14 páginas institucionais):

- notícia (`/noticia/:id`, `/<slug>/noticias/:id`): `NewsArticle` + `BreadcrumbList`; o **canonical** é o do
  microsite quando o programa tem microsite no ar, senão o do portal (os dois endereços mostram o mesmo texto);
- edital, programa (`/programas/:slug`), microsite e páginas: título, descrição, `BreadcrumbList`;
- home: `Organization` + `WebSite`; descrição e imagem padrão podem ser trocadas no painel
  (**Menus e portal → Buscadores e redes**);
- `/admin`, `/entrar`, `/minha-conta`, `/verificar/*`, `/declaracoes/*`, `/busca`: `noindex` (meta e `X-Robots-Tag`) e
  `Disallow` no `robots.txt`;
- conteúdo inexistente, rascunho ou agendado: **404** + `noindex` (o SPA carrega e mostra a mensagem; quem edita ainda
  pré-visualiza pelo painel/token);
- microsite fora do ar (`microsite_ativo = false`): `302` para `/programas/<slug>` (destino fixo dos domínios antigos,
  ver [`redirecionamentos-dominios-programas.md`](../redirecionamentos-dominios-programas.md)).

Os metadados por endereço ficam 30 s em memória (uma edição aparece em segundos; um rastreador não vira uma consulta
por página).

## Homologação

`SEO_NOINDEX=true`: `noindex` em toda página e `robots.txt` com `Disallow: /`. Desligue na virada.

## Imagens

`POST /api/upload` de uma imagem (jpg/png/webp) gera versões WebP em 240, 480, 800, 1280 e 1920 px (sem ampliar) em
`server/uploads-derivados/` e devolve `largura`/`altura`. `GET /uploads/<arquivo>?w=800` serve a versão (cache imutável
de 30 dias); largura fora da lista serve o original. Imagens que já estavam em `server/uploads` são convertidas na
primeira visita, ou todas de uma vez com `npm run imagens`. A pasta `uploads-derivados/` é cache regenerável: **não
entra no backup**. Ao apagar um arquivo da biblioteca, as versões vão junto.

## Orçamento de desempenho

Ver a seção "Orçamento" no fim deste arquivo (`npm run perf`).
