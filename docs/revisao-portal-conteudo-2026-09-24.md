# Revisão do portal PRPG/UFRPE — navegação, conteúdo, conexões, performance e arquitetura

**Data da análise:** 24 de setembro de 2026
**Escopo:** navegação e arquitetura da informação do site público e dos microsites, gestão de
conteúdo no painel, conexões entre os tipos de conteúdo, substituição das planilhas pelos módulos
de gestão, usabilidade/acessibilidade, performance e arquitetura.
**Método:** leitura do código (frontend, backend e `server/db/schema.sql`), do `PLANO.md`, da
[análise de prontidão de 09/09](analise-prontidao-producao-2026-09-09.md) e dos documentos de
requisitos; build do Vite numa pasta temporária; consultas somente leitura (`SELECT`) no banco de
desenvolvimento; medição de respostas da API local.
**Limites:** a suíte de testes não foi executada (o banco `prpg_test` é compartilhado com outras
sessões); não houve Lighthouse, teste de carga nem inspeção de produção. Números de volume são do
banco de **desenvolvimento**.

**Relação com os outros planos:** este documento **complementa** o `PLANO.md` (índice de execução
do modelo de dados e dos módulos de gestão) e o
[plano de prontidão](superpowers/plans/2026-09-09-prontidao-producao-prpg.md) (segurança e
operação). As fases usam letras novas (R, F, H, N, S, O, U, P) para não colidir com as do
`PLANO.md` (A, B, C, D, E, G, I, J, K, L, M). Onde há sobreposição com o plano de prontidão, a Task
correspondente é indicada.

---

## Sumário

1. [Diagnóstico em síntese](#1-diagnóstico-em-síntese)
2. [Achados](#2-achados)
3. [Plano de implementação](#3-plano-de-implementação)
4. [Decisões necessárias](#4-decisões-necessárias)
5. [Como medir](#5-como-medir)
6. [O que não recomendo](#6-o-que-não-recomendo)
7. [Registro de execução](#7-registro-de-execução)

---

## 1. Diagnóstico em síntese

O projeto tem dois níveis de maturidade bem diferentes:

- **O sistema de gestão é sólido.** O modelo relacional está harmonizado (pessoas, vínculos,
  unidades, atos com numeração atômica, eventos, declarações com QR). Câmara, Expedientes,
  Pós-doc, Contatos, prazos e painéis estão implementados, com 243 testes de backend.
- **O site e o CMS editorial ficaram para trás.** A home é fictícia, o conteúdo institucional
  está escrito direto no código e não existe rascunho nem publicação. As ligações que o banco já
  conhece (programa ↔ edital ↔ pessoa ↔ tese) quase não chegam ao visitante.
- **A troca das planilhas ainda não começou a trazer resultado.** Os módulos estão prontos, mas
  vazios no banco. Todos os importadores estão parados à espera de decisões. Enquanto isso, a
  planilha continua sendo a fonte da verdade.

| Indicador | Medido |
|---|---|
| Páginas públicas com conteúdo fixo no código | 16 (~3.700 linhas de JSX) |
| Home | 100% estática; 6 dos 8 atalhos sem destino |
| Programas com página pública | 2 de 42 (40 sem slug, 41 sem descrição curta, 41 páginas "Sobre" vazias) |
| Tabelas de conteúdo com status de publicação ou `criado_em`/`atualizado_em` | 0 de 11 |
| Módulos de gestão com dados | processos 0 · atos 0 · pós-doc 0 · contatos 0 · métricas 0 |
| `/api/news` (listagem) | 88 KB sem compressão, com o corpo completo das 62 notícias |
| Labels ligados ao campo (`htmlFor`) | 1 de 247 |
| Testes de frontend | 0 |

---

## 2. Achados

### 2.1 Navegação e arquitetura da informação

- **O menu é fixo no código** (`src/components/Navbar.jsx:4`). Páginas criadas no painel
  (`/p/:slug`, `/<slug>`) não entram em menu nenhum, e **Notícias não aparece no menu desktop**,
  só no mobile.
- **Nenhum caminho do portal leva aos microsites.** O catálogo `/programas`
  (`src/pages/ProgramasStrictoSensu.jsx`) não usa o `slug`, então o visitante só chega a `/pgh`
  digitando o endereço.
- **A busca é limitada.** Ela sempre vai para `/noticias?search=` e some em telas menores que
  1024 px. Existe um endpoint `/api/busca` no back (Fase L.10), mas nenhuma tela o usa.
- **Serviços ficam escondidos.** A inscrição em proficiência só aparece como banner dentro de
  Editais, e a verificação de declaração não tem nenhuma entrada no site.
- **Há elementos mortos:**
  - "Portal UFRPE / SIGAA / AVA" no topo são `<span>` sem link (`src/components/Navbar.jsx:77`).
  - Redes sociais, Privacidade e Termos usam `href="#"` (`src/components/Footer.jsx:40`, `:132`).
  - O botão "Sou Aluno" não faz nada, e "Conheça os Cursos" leva a Editais.
- **Há dependência do site antigo.** Logo, parceiros, catálogo e plano de internacionalização
  apontam para `prpg.ufrpe.br/sites/default/files` (Drupal). No banco, resoluções, formulários e
  imagens de notícia apontam para prpg.ufrpe.br, Google Drive e profiap.ufrpe.br. Tudo isso quebra
  quando o site antigo sair do ar.
- **O menu segue o organograma, não as tarefas.** Ele se organiza como "A Pós-Graduação" e
  "Documentos", e não pelo que candidato, aluno ou coordenação precisam fazer.

### 2.2 Gestão de conteúdo

- **Conteúdo no código.** Sobre, Missão, Histórico, Equipe, Estrutura Organizacional, Financeiro,
  Proext-PG, Especialização, Residência, Internacionalização (5 páginas), Reconhecimento,
  Relatórios de Autoavaliação e a Home estão em JSX. Trocar um nome ou um e-mail exige
  desenvolvedor e deploy. Equipe e Estrutura repetem dados que já existem em `unidades`,
  `vinculos` e `contatos`.
- **Sem ciclo editorial: salvar é publicar.** Não há rascunho, agendamento, pré-visualização nem
  histórico de versões. O selo "Microsite rascunho" engana: `GET /api/programas/slug/profiap`
  responde 200 mesmo com `microsite_ativo=false` (o campo não é verificado em
  `programasController.getProgramaBySlug`).
- **Datas e ordem erradas.** `news.date` é texto livre ("02 de Outubro…") misturado com datas
  ISO. O repositório ordena por `id` (padrão de `createRepository`), então `/noticias` sai em ordem
  alfabética de slug (confirmado: 2026, 2026, 2026, 2024, 2024…).
- **O público vê uma coisa, o painel mostra outra.** `/noticias` mostra 62 notícias, 56 delas de
  programas. A lista do painel geral esconde as de programa
  (`src/pages/admin/AdminNoticias.jsx:41`), então o gestor não encontra o que o público vê. O
  mesmo vale para editais agregados em `/editais`.
- **A classificação está espalhada em 4 mecanismos:** `taxonomias`, `vocabularios`,
  `taxonomia_refs` e listas fixas no código — categorias de notícia no formulário
  (`AdminNoticiaForm.jsx`), categorias de edital na página pública (`src/pages/Editais.jsx:27`),
  seções de resolução (`src/pages/Resolucoes.jsx:18`). Um edital com categoria fora das 4
  previstas some da página sem aviso.
- **Arquivos:**
  - Cada upload vira uma URL solta gravada em texto no registro.
  - A tabela `arquivos` registra o upload, mas nada usa esse registro (2 linhas; `anexos` tem 0).
  - Não há biblioteca de mídia, reuso, nem como saber onde um PDF é usado; órfãos nunca são limpos.
  - Falta o campo de texto alternativo da imagem da notícia, e a imagem de capa é obrigatória.
- **Editor:** CKEditor 5 carregado de CDN e configurado duas vezes (o formulário de notícia tem
  instância própria, fora de `RichTextEditor.jsx`), sem inserir imagem no corpo e sem link interno.
- **Listas do painel:**
  - Nenhuma tem paginação; quase nenhuma tem ordenação.
  - O "editado por" carrega `/api/users` completo, com CPF, SIAPE e telefones, em 25 telas
    (`src/hooks/useUsers.js:14`). É um problema de desempenho e também de minimização de dados
    (LGPD).
- **Aluno ou professor que faz login cai no painel de Notícias,** com o menu completo de conteúdo
  (a escrita é bloqueada no back, mas a experiência é de "entrei no lugar errado").
- **A página inicial do painel é a lista de notícias**, não uma visão do que precisa de atenção.

### 2.3 Conexões entre tipos de conteúdo

| Relação | No banco | Chega ao visitante? | Lacuna |
|---|---|---|---|
| Programa → notícias, editais, páginas, disciplinas, teses, FAQ, documentos | FK `programa_id` ✔ | Só no microsite (2 programas) | O portal não agrega nada com o selo do programa; 40 programas sem página |
| Pessoa → programa | `vinculos` ✔ (`pessoa_id` ainda polimórfico: `users.id` ou `pessoas.id`) | Listas no microsite | Não existe perfil de pessoa |
| Pessoa → tese (autor/orientador), disciplina (docente), grupo (líder), linhas | FKs ✔ (linhas ligadas a `users`, não a `pessoas`; `docente_pessoa_id` sem dado) | Não | Um perfil de docente reuniria tudo |
| Edital → ato numerado | `editais.ato_id` ✔ | Não | E.12 bloqueada (D-E5) |
| Edital → resolução, formulário, calendário, notícia | ✗ | — | Falta um bloco "Relacionados" |
| Resolução → resolução (revoga ou altera) | Só em `ato_referencias` | Não | Sem E.11 não dá para mostrar "vigente/revogada" |
| Calendário → prazos | Marcos com data em `TEXT` | Lista estática | Sem ligação com editais nem com `services/prazos.js`; sem `.ics` |
| Coordenação → portaria | 3 campos (`portaria`, `portaria_id`, `ato_id`) | Não | Unificar em `ato_id` |
| Contatos | `contatos` (0 linhas) + 8 campos espalhados | Campos espalhados | Falta uma fonte única (G.9/B.6) |
| Indicadores | `metricas_anuais` (0 linhas) | Números fixos na home | Poderiam ser calculados de vínculos e teses |

**Conclusão:** o modelo de dados já tem a maior parte das ligações. Faltam algumas relações
editoriais e, principalmente, telas que mostrem essas ligações.

### 2.4 Saída das planilhas

- Os importadores B.8, G.4, E.5 e C.5 estão bloqueados por cerca de 20 decisões (D-B1,
  D-G2..G8, D-E2/E3/E5, D-C3/C8/C9).
- O schema já guarda o dado de origem (`obs_original`, `periodo_original`, `programa_original`,
  `supervisor_original`…). Ou seja, ele já suporta **importar fielmente e interpretar depois**.
  O que trava é a estratégia de decidir tudo antes de importar.
- O agendador de prazos não está ligado (`server/services/agendador.js`), e o SMTP depende da
  decisão D-C5. Nenhum lembrete sai hoje.
- Não existe uma tela de pendências. A secretaria continua enxergando o que falta fazer na
  planilha.

### 2.5 Usabilidade e acessibilidade

- **Erros aparecem como lista vazia.** Exemplo: o microsite chama `/api/grupos-pesquisa` sem
  token, mas a rota exige login (`server/routes/adminRoutes.js:252`). O 401 aparece como "Nenhum
  grupo cadastrado" (`src/pages/programa/ProgramaGrupos.jsx:12`). Hoje ninguém percebe porque há
  0 grupos; o problema aparece no primeiro cadastro.
- **Menu do microsite.** É plano, com até 13 itens. Os 29 sites atuais dos programas (análises em
  `analises-sites-pos-graduacao/`, na raiz, ainda não versionada) usam quase todos o mesmo padrão
  em 4 grupos: **O Programa / Pessoas / Produção Científica / Admissão**. O público já conhece
  esse formato.
- **Painel administrativo.**
  - Não é responsivo (sidebar fixa de 256 px).
  - Tem 25 itens no menu, organizados por tabela e não por tarefa.
  - "Portarias" convive com "Expedientes", que é o mesmo conceito.
- **Acessibilidade.** Continua aberto o que a análise de 09/09 já apontava (A11Y-01 a A11Y-04):
  menu que só abre com o mouse, labels não associados aos campos, modais sem controle de foco,
  ícones sem nome.
- **Dois sistemas de ícones:** Font Awesome via CDN (438 usos) e lucide (64 arquivos).
- **Cabeçalho e breadcrumb copiados** em cada página institucional.

### 2.6 Performance

| Ponto | Medido |
|---|---|
| Caminho crítico | CSS do Font Awesome (102 KB, CDN, bloqueia a renderização) → JS 85 KB gz → CSS 15 KB gz → `@import` encadeado do Google Fonts (`src/styles/globals.css:1`) → chunk da rota → API |
| Chunk inicial | 280 KB (85 KB gz); todo visitante baixa `AdminLayout` e ícones do painel |
| `/programas` | 295 KB (98 KB gz), por causa de `import * as XLSX` usado só para exportar |
| `ProgramaSite` | 68 KB; as 16 subpáginas do microsite são importadas estaticamente |
| Página de notícia | Baixa todas as notícias para achar uma (`src/pages/Noticia.jsx:29`) |
| Editais | Uma consulta de eventos por edital, N+1 (`server/controllers/editaisController.js:86`) |
| Filtros | `getAll()` seguido de filtro em JavaScript em todos os controllers de conteúdo |
| API | Sem gzip e sem `Cache-Control` (`/api/news` 88,5 KB; `/api/programas` 59,7 KB) |
| Imagens | 36 `<img>` sem dimensões e sem carregamento tardio; hotlink para Unsplash e para o site antigo |
| SEO | Só renderização no cliente; título genérico em quase todas as rotas; sem sitemap nem robots |

### 2.7 Arquitetura e robustez

- **Risco de disponibilidade (o mais urgente):**
  - O Express 4 não captura erro de handler `async`.
  - A maioria dos handlers não tem `try/catch` (o `newsController`, por exemplo, tem 5 handlers
    e 1 `try`).
  - O `server/index.js:14` encerra o processo quando recebe um `unhandledRejection`.
  - **Resultado:** qualquer erro de banco não tratado derruba a API inteira.

  Dois exemplos, pela leitura do código (confirmar com teste antes de corrigir):
  - um `PUT /api/editais/:id` com data em formato inválido;
  - durante um período de proficiência aberto, um `POST /api/proficiencia/inscricoes` anônimo com
    `"nome": 123` (`.trim()` chamado sobre número).
- **Edição concorrente.** O `update` de `server/db/repository.js` lê, mescla e grava sem verificar
  se o registro mudou no meio. Se duas pessoas editam ao mesmo tempo, a última sobrescreve a outra
  em silêncio.
- **IDs gerados do título.** O acento não é removido ("Notícia" vira `not-cia`) e a colisão não é
  tratada: um título repetido gera erro 500 (`server/controllers/newsController.js:36`).
- **Duplicação.**
  - `resolveProgramaId` está copiado em 8 controllers e `formatDate` em 8 telas.
  - Há dois jeitos de chamar a API (`fetch(API_URL…)` e `apiFetch`).
  - Todas as rotas estão num único arquivo de 486 linhas.
- **Identidade em dois lugares.** Os dados pessoais existem em `users.perfil_*` e em `pessoas.*`,
  e `vinculos.pessoa_id` ainda aceita os dois IDs (FK adiada desde A.10/B.3).
- **Privacidade.** O endpoint anônimo `POST /api/proficiencia/verificar-aluno` confirma se um nome
  completo é de aluno ativo.
- **Deriva e código morto.**
  - `src/programasData.js`, `src/style.css` e a dependência `motion` não são usados.
  - `vite` e plugins estão em `dependencies`.
  - A documentação fala em 41 (`DOCUMENTACAO.md`) ou 103 (`CLAUDE.md`) testes; na verdade são 243
    em 34 arquivos.
  - A tabela `portarias` (0 linhas) convive com `atos`.

**A preservar:** as decisões de `arquitetura-dados.md` §4, a numeração atômica, os eventos
append-only, as declarações verificáveis, o escopo do GestorPrograma em 3 camadas e o
endurecimento de segurança do commit `52d3834`.

---

## 3. Plano de implementação

**Princípios:**

1. Colocar dados reais nos módulos existentes antes de criar módulos novos.
2. Nenhum texto ou menu do portal deve exigir deploy para mudar.
3. Convenções comuns entre as tabelas de conteúdo, sem tabela genérica `conteudos` (respeita
   `arquitetura-dados.md` §4.1).
4. Toda mudança de schema entra como migração forward-only via `npm run db:migrate:apply`
   (`server/db/migrateRunner.mjs`), nunca pelo seed destrutivo.

```
Sem. 1      R  Robustez imediata
Sem. 1      O.1 Oficina de decisões ─────────── trilha O segue em paralelo (sem. 2–10)
Sem. 2–3    F  Fundação editorial
Sem. 4–5    H  Portal dirigido por dados  +  U.1–U.2
Sem. 6–7    N  Conexões  +  S  Microsites em 4 grupos
Sem. 8–9    P  Performance/SEO  +  U.3–U.7
```

São cerca de 9 a 10 semanas de uma pessoa desenvolvedora no caminho principal. A trilha O depende
mais da agenda da secretaria do que de código.

### Fase R — Robustez imediata (~1 semana)

| | # | Ação | Onde |
|---|---|---|---|
| `[x]` | R.1 | Envolver todo handler `async` (helper aplicado no router, ou migrar para Express 5). Teste: payload inválido devolve erro em JSON e o processo continua vivo | `server/routes/adminRoutes.js`, `server/utils/`, `server/__tests__/` |
| `[x]` | R.2 | Validar datas e números na borda da API (400 com mensagem) antes de chegar ao banco | `server/utils/datas.js`, controllers de conteúdo |
| `[x]` | R.3 | Criar leitura pública de grupos por programa (só campos públicos); diferenciar erro de lista vazia | rota de grupos, `ProgramaGrupos.jsx` |
| `[x]` | R.4 | Com `microsite_ativo=false`, responder 404 para anônimos; botão "Pré-visualizar" para admin/gestor | `programasController.getProgramaBySlug`, `AdminProgramaSite.jsx` |
| `[x]` | R.5 | Converter `news.date` de texto para `DATE` e ordenar por data decrescente no repositório | migração, `server/db/repositories.js` |
| `[x]` | R.6 | Regra única de escopo nas listas (`?escopo=prpg\|programa\|todos`) e filtro por programa no painel, em vez de esconder | controllers de conteúdo, listas do admin |
| `[x]` | R.7 | `server/utils/slug.js` compartilhado: remove acentos; colisão gera sufixo ou 409, nunca 500 | news, pages, programas |
| `[x]` | R.8 | Criar `/api/users/resumo` (id, nome) ou devolver `atualizado_por_nome` via JOIN; aposentar o `useUsers` completo nas 25 telas | `usersController.js`, `src/hooks/useUsers.js` |
| `[x]` | R.9 | `compression` e `Cache-Control` curto nos GET públicos; cache longo em `/uploads` (nomes já são únicos) | `server/app.js` |
| `[x]` | R.10 | Consertos pontuais: `class=` em `src/pages/Noticia.jsx:64`, os 10 `href="#"`, os spans do topo, os CTAs mortos da home (esconder até a Fase H) | vários |
| `[x]` | R.11 | Remover `src/programasData.js`, `src/style.css` e `motion`; mover ferramentas de build para `devDependencies`; atualizar contagem de testes em `CLAUDE.md`/`DOCUMENTACAO.md` | — |

**Pronto quando:** um payload malformado não derruba a API (teste), as notícias saem em ordem
cronológica, o microsite em rascunho não é público e `/api/news` trafega comprimido.

> **Nota de execução (24/09/2026)** — todos os itens aplicados, com testes em
> `server/__tests__/robustez.test.js` (suíte: 259 testes verdes). Confirmado antes de
> corrigir: as duas rejeições apontadas no §2.7 derrubariam o processo. Achados de passagem,
> também corrigidos: o `EmptyState` do microsite ignorava `titulo`/`descricao` (5 páginas
> mostravam só o ícone); 63 respostas 500 escritas à mão vazavam `e.message` em produção;
> `.gitattributes` fixa LF nos `.sql` (o checksum do runner de migrações mudaria num clone
> Windows); o importador de notícias gravava data por extenso. Medido: `/api/news`
> 88 KB → 21 KB transferidos, `/api/programas` 60 KB → 8,5 KB. **Mudança visível:** o
> microsite do PROFIAP (`microsite_ativo=false`) deixou de ser público — só quem o
> administra vê, com faixa de pré-visualização. **Fica para a Fase H:** as notícias e
> editais fictícios da home (R.10 só tirou os links mortos). A regra de escopo (R.6) é só
> mecanismo: o que o portal agrega continua pendente da decisão D-R1.

### Fase F — Fundação editorial (~2 semanas)

| | # | Ação | Onde |
|---|---|---|---|
| `[x]` | F.1 | Campos comuns nas 11 tabelas de conteúdo: `status` (RASCUNHO/PUBLICADO/ARQUIVADO), `publicado_em` (permite agendar) e `criado_em`/`atualizado_em` com trigger. Na notícia, `destaque` e `imagem_alt`; `ordem` onde a lista é curada. As linhas existentes viram PUBLICADO, sem mudança visível. Endpoints públicos filtram `status='PUBLICADO' AND publicado_em <= now()` | migração, `schema.sql` |
| `[x]` | F.2 | Repositório: `list()` com filtros permitidos, ordenação, paginação e versão de listagem sem o corpo; `update` que confere `atualizado_em` e devolve 409 se alguém editou antes | `server/db/repository.js` |
| `[x]` | F.3 | Contrato de listagem pública `{items,total,page}` com filtros por programa, categoria, ano, busca e status; notícia individual por `/api/news/:id` e "relacionadas" por consulta | controllers e páginas públicas |
| `[x]` | F.4 | Classificação única em `vocabularios` (`noticia.categoria`, `edital.categoria`, `documento.secao`, com ordem e cor), editável no painel; `taxonomias` é absorvida; `taxonomia_refs` fica só para importação | `vocabulariosRepo.js`, formulários, `Editais.jsx`, `Resolucoes.jsx` |
| `[x]` | F.5 | Biblioteca de mídia sobre `arquivos`/`anexos`: listar, buscar, reutilizar, "onde é usado", substituir o arquivo mantendo as referências, preencher `sha256`. Rotina para trazer os arquivos de prpg.ufrpe.br e do Drive antes do desligamento do site antigo | `server/db/anexosRepo.js`, novo `MediaPicker` |
| `[x]` | F.6 | Formulário editorial comum: status e agendamento, pré-visualização, aviso de alterações não salvas, "editado por X em Y"; um único CKEditor (`RichTextEditor`) com upload de imagem para a biblioteca | `src/components/admin/` |
| `[x]` | F.7 | Histórico de versões leve (tabela `revisoes`: entidade, id, snapshot JSONB, autor, data) e opção de restaurar — cobre, para conteúdo, a metade de L.10 que ficou aberta | nova tabela + repositório |

**Pronto quando:** dá para salvar um rascunho invisível ao público, agendar uma notícia, restaurar
uma versão anterior, e toda lista pública e do painel é paginada no servidor.

> **Nota de execução (25/09/2026)** — os 7 itens aplicados, um commit por item (F.1+F.2 juntos),
> com testes em `publicacao.test.js`, `vocabularios.test.js`, `arquivos.test.js` e
> `revisoes.test.js` (suíte: 292 testes verdes). Migrações `2026-09-25_envelope_publicacao`,
> `_vocabularios_conteudo` e `_revisoes` aplicadas no banco de desenvolvimento.
> **Decisão assumida:** D-R3 como recomendado — sem motor de aprovação; o Gestor de Programa
> publica direto e vê rascunhos só do próprio programa. **Como ficou:**
> - F.1/F.2: envelope nas 11 tabelas (linhas antigas = PUBLICADO, `criado_em` NULL por não
>   se saber a data real); visibilidade em `server/utils/publicacao.js`; edição concorrente
>   pelo `_versao` (= `atualizado_em` carregado) no próprio `WHERE` do UPDATE → 409.
> - F.3: contrato `?page/&limit` → `{items,total,page,limit,pages}` (sem eles, array — os
>   consumidores antigos não mudam) e `?resumo=1` em todas as listagens de conteúdo. **Só a
>   página pública de Notícias consome a paginação no servidor**; as demais listas (públicas e
>   do painel) ainda pedem tudo — volumes pequenos hoje; migram na Fase U/P.
> - F.4: `vocabularios` com 5 domínios editáveis no painel ("Classificações", ex-Taxonomias):
>   renomear propaga para o conteúdo, excluir o que está em uso só desativa. `taxonomias`
>   **não** foi absorvida — continua servindo às listas do perfil de usuário (fora do escopo).
> - F.5: biblioteca em `/admin/midia` (buscar, "onde é usado" em 21 colunas, substituir
>   reescrevendo as referências, excluir só o que não é usado); `sha256` + deduplicação. O
>   `MediaPicker` está só na capa da notícia; os outros campos de arquivo seguem com upload
>   direto. `npm run arquivos -- --registrar-locais --externos` rodado (6 locais registrados;
>   288 URLs externas: 66 prpg.ufrpe.br, 219 profiap.ufrpe.br, 2 unsplash, 1 Drive). **O
>   download (`--executar`) não foi rodado** — depende de autorização.
> - F.6: `PublicacaoCampos` + `useAvisoAlteracoes` nos 11 formulários; CKEditor com configuração
>   única (`components/admin/ckeditor.js`) e upload de imagem pela biblioteca. **Limitação:** o
>   aviso de alterações só cobre fechar/recarregar a aba — a navegação interna do painel não é
>   interceptada (o app usa `BrowserRouter`, e o bloqueio de rota exige data router).
> - F.7: tabela `revisoes` (últimas 30 versões por item, apagadas junto com o item); painel
>   "Histórico de versões" nos 11 formulários. Restaurar devolve o conteúdo, mas mantém
>   situação, data de publicação, programa, endereço (slug) e ordem atuais, e é desfazível.
> **Não verificado no navegador:** as telas do painel (exigem login) — conferidas por build,
> typecheck e testes de API; a configuração do CKEditor e o proxy `/uploads` foram conferidos
> no navegador.

### Fase H — Portal dirigido por dados (~2 semanas, depende de F)

| | # | Ação |
|---|---|---|
| `[x]` | H.1 | Menus no banco (`menus`/`menu_itens`: principal, rodapé, topo, acesso rápido; destino = rota, página ou URL) com editor de ordem; Navbar, Footer e Home leem da API |
| `[x]` | H.2 | Home montada a partir dos dados: destaques, últimas notícias (PRPG + programas rotulados), editais abertos de todos os programas, próximos prazos, números calculados (programas, docentes, discentes, teses), parceiros configuráveis |
| `[x]` | H.3 | As 16 páginas institucionais passam para `pages` com uma `chave` fixa (mesmo padrão da "Sobre" do microsite), mantendo as URLs atuais; um script copia o texto uma única vez |
| `[x]` | H.4 | Equipe e Estrutura Organizacional geradas de `unidades` (árvore por `unidade_pai_id`) + `vinculos` (com novo `unidade_id` para servidores da PRPG) + contatos públicos — a mesma fonte da Agenda de Contatos |
| `[x]` | H.5 | Busca pública com índice full-text em português (`tsvector` + `unaccent`, GIN) sobre notícias, editais, páginas, documentos, programas e teses publicados; página `/busca` agrupada por tipo, também no mobile |
| `[x]` | H.6 | Um componente único de cabeçalho e breadcrumb, derivado da árvore de menus, eliminando a cópia nas páginas institucionais |
| `[x]` | H.7 | Política de Privacidade (LGPD — o site coleta comprovantes) e revisão dos links para o site antigo |

**Pronto quando:** nenhuma mudança de texto, menu ou atalho exige deploy, e a home não tem nenhum
item fictício.

> **Nota de execução (25/09/2026)** — os 7 itens aplicados (commits 5b4caa2 H.1+H.2, 833f8b3
> H.3, a91d257 H.6, f095fd8 H.4, ea9558b H.5, 8a96388 H.7), com testes em `portal.test.js` e
> `estrutura.test.js` (suíte: 312 testes verdes). Migrações `2026-09-25_menus_portal`,
> `_paginas_institucionais`, `_estrutura_prpg`, `_busca_publica` e `_busca_trechos`
> aplicadas no banco de desenvolvimento. **Decisão assumida:** D-R1 como recomendado — o portal
> agrega editais de programa sempre (com selo) e notícias de programa só quando marcadas
> (`?escopo=portal`, usado na home, em `/noticias` e nas relacionadas). **Mudança visível:**
> `/noticias` passou de 62 para 6 notícias — as 54 do PROFIAP e 2 do PGH continuam nos
> microsites; para trazer uma ao portal, marque "Mostrar também no portal da PRPG".
> **Como ficou:**
> - H.1: `menus`/`menu_itens` (8 listas: principal, topo, rodapé, redes sociais, acesso rápido,
>   jornada, cursos, parceiros) e `configuracoes` (contato, banner da home, logo), semeados com o
>   que o código mostrava; editor em "Menus e portal". O site guarda a última versão no
>   navegador para o menu aparecer na hora.
> - H.2: `/api/portal/home` (destaque, notícias, editais abertos com selo, próximos prazos do
>   calendário vigente, números). **Docentes/discentes ficaram fora dos números**: só uma parte dos
>   programas tem vínculos cadastrados (16 docentes) — entram depois da importação (Fase O).
>   Seguem fixos no código só os dois botões do banner ("Conheça os Cursos"/"Editais abertos").
> - H.3: 13 páginas (a lista do item, menos Equipe e Estrutura, que são H.4) viraram `pages` com
>   chave fixa. O texto foi extraído uma vez do JSX para `server/data/paginas-institucionais.json`
>   e é criado na subida do servidor/seed de dev, sem sobrescrever. **Perda de forma, não de
>   conteúdo:** cartões e grades viraram texto corrido; a busca interna de Especialização e de
>   Relatórios e o carrossel de Mobilidade viraram listas/imagens simples. O HTML do editor não
>   tinha estilo nenhum no site (o projeto não tem o plugin de tipografia): criado `.html-content`.
> - H.4: `unidades` (descrição, ordem, exibir no site) + `vinculos.unidade_id`/`funcao` +
>   `contatos`; tela "Equipe e estrutura"; carga inicial de 11 setores e 14 pessoas
>   (`server/data/estrutura-prpg.json`). **Divergências encontradas entre as páginas antigas —
>   conferir:** coordenador de Internacionalização (Equipe: Yuri Jacques Agra Bezerra da Silva;
>   Estrutura e Sobre a Internacionalização: Edivan Rodrigues de Souza — ficou Edivan); e-mail do
>   Lato Sensu (`latosensu@` × `latosensu.prpg@` — ficou o segundo); e-mail da secretaria
>   (`sec.prpg@` no setor × `secretaria.prpg@` no topo do site). Celulares/WhatsApp de servidores
>   continuam publicados como antes — vale revisar à luz da LGPD (dá para desmarcar "No site").
> - H.5: `/busca` com full-text em português sem acento (extensão `unaccent` — **exige
>   permissão para criar extensão no banco de produção**), índices GIN conferidos com EXPLAIN.
> - H.6: todas as páginas com cabeçalho copiado usam `CabecalhoPagina` (breadcrumb do menu e
>   título da aba).
> - H.7: **a Política de Privacidade é uma minuta** — descreve o que o sistema faz, mas prazo de
>   guarda e contato do encarregado estão genéricos: precisa da validação do encarregado de dados
>   da UFRPE antes de ir ao ar. Nenhum link para o site antigo sobrou no código; os que estão nos
>   dados (351 URLs, contando menus, banner e logo) entram no `npm run arquivos -- --externos`,
>   cujo `--executar` (download) **continua não rodado**.
> **Não verificado no navegador:** as telas novas do painel ("Menus e portal", "Equipe e
> estrutura"), que exigem login — conferidas por build, typecheck e testes de API. As páginas
> públicas (home, menus, institucionais, Equipe, Estrutura, busca pelo topo) foram conferidas no
> navegador.

### Fase N — Conexões entre conteúdos (~2 semanas, depende de F)

| | # | Ação |
|---|---|---|
| `[x]` | N.1 | Página de editais que agrega PRPG e programas, com selo e link para o microsite, filtros por programa/modalidade/situação; visão "Seleções abertas" para candidatos |
| `[x]` | N.2 | Catálogo de programas com link para o microsite e filtros (área, modalidade, nota CAPES, campus). Página automática para programas sem microsite (coordenação, contatos públicos, modalidades, linhas, editais abertos, docentes): **os 42 programas passam a ter página pública no primeiro dia** |
| `[x]` | N.3 | Repositório global de teses e dissertações (programa, ano, tipo, orientador) |
| `[⛔]` | N.4 | Perfil público do docente (programas e papéis, linhas, disciplinas, orientações, grupos, Lattes/ORCID, contatos públicos). Exige antes fechar a FK de `vinculos.pessoa_id` (B.3) e ligar as linhas de pesquisa a `pessoas`; visibilidade por flag + `contatos.publico` |
| `[x]` | N.5 | Tabela `referencias` (origem → destino, tipo; lista fechada de entidades, mesmo padrão já aceito para `anexos`) e bloco "Relacionados" em notícia, edital, resolução e página |
| `[x]` | N.6 | Calendário com marcos em `DATE`, opcionalmente ligados a edital; componente "Próximos prazos" (home, microsite, área do aluno); exportação `.ics` |
| `[⛔]` | N.7 | Destravar E.11: `documento.secao` (F.4) substitui `section_id`; resoluções e formulários migram para `atos`/`documentos`; a página de resoluções passa a mostrar "vigente/revogada/alterada por" via `ato_referencias` |
| `[⛔]` | N.8 | Contatos como fonte única (conclui G.9 e B.6) e fim dos 8 campos espalhados |
| `[x]` | N.9 | View de indicadores derivados por programa/ano (docentes, discentes, egressos, teses); `metricas_anuais` fica só para o que não dá para calcular |

**Pronto quando:** de qualquer conteúdo se chega aos relacionados em 1 clique, todo programa tem
página pública e nenhum número do site é digitado quando pode ser calculado.

> **Nota de execução (25/09/2026)** — 6 de 9 itens aplicados (commits 17bd433 N.1-N.3, 5eb1a82 N.5,
> abdeb70 N.6, 2a5dca4 N.9), com testes em `conexoes.test.js` (suíte: 320 testes verdes). Migrações
> `2026-09-25_programas_slug`, `_menu_teses`, `_referencias`, `_calendario_datas` e
> `_indicadores_programa` aplicadas no banco de desenvolvimento. **Como ficou:**
> - N.1: `/editais` com selo do programa (link para o microsite ou a página automática), filtros de
>   origem/programa/situação/ano no endereço e a visão "Seleções abertas". **Filtro por modalidade
>   não feito:** o edital não tem modalidade no cadastro (precisaria de campo novo).
> - N.2: **só 2 dos 42 programas tinham `slug`** — gerado para os outros 40 (sigla; sem sigla, o
>   nome). `/programas/<slug>` é a página automática (cursos, coordenação, docentes com Lattes,
>   linhas, editais em aberto, teses, números, contatos do programa — nenhum contato pessoal).
>   Catálogo com filtros de área, modalidade, nota CAPES e campus; **grande área e nota CAPES estão
>   vazias nos 42 programas**, então esses filtros ficam ocultos até a importação (Fase O).
> - N.3: `/teses` (repositório de todos os programas, paginado no servidor) — entrou no menu. **Achado
>   corrigido:** a API pública de teses devolvia o e-mail de autor e orientador; agora só o painel recebe.
> - N.5: tabela `referencias` + bloco "Relacionados" em notícia, edital e páginas, editor nos 5
>   formulários. Resolução e formulário não têm página própria: seus relacionados aparecem nos itens
>   ligados a eles.
> - N.6: marcos do calendário com `data_inicio`/`data_fim` (derivadas do texto do período, que
>   continua sendo o que se digita) e edital opcional; "Próximos prazos" na home e no microsite;
>   agenda `.ics` assinável (`/api/portal/calendario.ics`). **Área do aluno não existe** — o
>   componente fica pronto para ela.
> - N.9: view `indicadores_programa_ano`; `metricas_anuais` vale só para o não calculável e para
>   anos em que o cálculo dá zero (cadastro incompleto). Vínculo sem datas conta só no ano corrente.
> **Bloqueados (não iniciados):**
> - N.4 (perfil público do docente): **D-R2** — decisão do encarregado de dados — e o fechamento da FK
>   polimórfica de `vinculos.pessoa_id` (B.3, adiada desde a Fase A).
> - N.7 ("vigente/revogada" nas resoluções): depende da E.11, que depende do importador E.5 (**D-E2,
>   D-E3, D-E5**). A parte "`documento.secao` substitui `section_id`" já vale desde a F.4 (a seção
>   gravada é o valor do vocabulário).
> - N.8 (contatos como fonte única): depende de **D-G1** e da importação G.4 (D-G2..D-G8). Aposentar os
>   campos espalhados antes disso tiraria dado do ar ou a proteção de privacidade (nota B.6 do PLANO).
> **Não verificado no navegador:** o editor de relacionados e o de marcos no painel (exigem login) —
> conferidos por build e testes; as páginas públicas foram conferidas no navegador.

### Fase S — Microsites no modelo que os programas já usam (~1 semana)

| | # | Ação |
|---|---|---|
| `[x]` | S.1 | Menu em 4 grupos: O Programa / Pessoas / Produção / Admissão, mais Notícias, Documentos e Contato |
| `[x]` | S.2 | Páginas fixas para todos os programas (sobre, impacto social, autoavaliação, infraestrutura, internacionalização, planejamento), **ocultas enquanto estiverem vazias** |
| `[x]` | S.3 | Ocultar, reordenar e renomear módulos por programa (pendência registrada em 14/09) |
| `[x]` | S.4 | Checklist de publicação com percentual em "Site do Programa" (logo, cores, descrição, Sobre, coordenação, contatos, linhas) — ajuda a tirar os 40 programas do zero |
| `[x]` | S.5 | Validação de contraste das cores escolhidas pelo programa ao salvar |
| `[x]` | S.6 | Plano de redirecionamento dos domínios antigos (pgb.ufrpe.br etc.) com a TI — tabela de redirecionamentos |

> **Nota de execução (25/09/2026)** — 6 de 6 itens aplicados (commits 10e8c40 S.1, f20af02 S.2,
> 98b75dd S.3, 1ff3fa7 S.4, d6952f0 S.5, 712ba5e S.6), com testes em `programas_microsite.test.js`
> e `adminPagesFilter.test.js` (suíte: 346 testes verdes). Migrações
> `2026-09-25_paginas_fixas_programa` e `2026-09-25_programa_menu_itens` aplicadas no banco de
> desenvolvimento. **Como ficou:**
> - S.1: o modelo do menu fica no código (`server/utils/micrositeMenu.js`) e o servidor devolve o
>   menu pronto em `GET /programas/slug/:slug` (`menu`). **Decisão:** não reaproveitar
>   `menus`/`menu_itens` da H.1 — lá o menu é uma árvore de destinos gravada inteira; copiá-la para
>   42 programas congelaria o modelo (módulo novo = editar 42 menus) e não expressa "some enquanto
>   vazio", que é calculado. Grupos: **O Programa** (Sobre, Impacto Social, Linhas de Pesquisa,
>   Autoavaliação, Comissões, Disciplinas, Infraestrutura, Internacionalização, Planejamento,
>   Perguntas Frequentes + páginas criadas), **Pessoas** (Docentes, Discentes, Egressos),
>   **Produção** (Teses e Dissertações, Grupos de Pesquisa), **Admissão** (Editais); soltos:
>   Início, Notícias, Documentos, Contato. Novas subpáginas `/linhas-de-pesquisa` e `/egressos`
>   (egressos deixaram de contar como discentes). Documentos passa a aparecer também quando só há
>   formulários (antes dependia só de resoluções). Menu desktop a partir de `lg` (8 entradas).
> - S.2: 5 páginas fixas novas por programa (252 no banco de dev, com as 42 "Sobre"), fora do menu
>   até terem texto publicado; `<p>&nbsp;</p>` conta como vazio. Página comum que já usava o
>   endereço vira a fixa, com o texto. Buscas do microsite e do portal ignoram páginas sem texto; a
>   lista geral de páginas do painel esconde as fixas vazias dos programas (ficam em "Site do
>   Programa").
> - S.3: tabela `programa_menu_itens` guarda só as diferenças (nome, grupo, ordem, oculto) — o
>   programa pode inclusive mover um item ou página para outro grupo (ex.: "Como ingressar" em
>   Admissão). Início muda de nome, mas não some nem sai do topo. Editor em "Site do Programa";
>   `GET/PUT /api/programas/:id/menu` (Admin/Gestor e o Gestor do próprio programa).
> - S.4: checklist de 7 itens com percentual e atalho "Resolver"
>   (`GET /api/programas/:id/checklist`). No banco de dev: PGH 71% (faltam logo e coordenação),
>   PROFIAP 29% e os outros 40 programas 14%.
> - S.5: `server/utils/contraste.js` (WCAG 2.x, mínimo 4,5:1) confere primária × fundo claro (vale
>   para texto branco sobre a primária) e destaque × primária; o formulário importa o mesmo módulo
>   para a prévia ao vivo. Só valida quando alguma cor muda. **Achado corrigido:** a home do
>   microsite usava a cor de destaque como texto sobre fundo claro — com o amarelo padrão, 1,6:1;
>   essas 3 chamadas passaram a cinza.
> - S.6: [redirecionamentos-dominios-programas.md](redirecionamentos-dominios-programas.md) — 30
>   domínios (29 da análise + `pgh.ufrpe.br`), 29 identificados; `pgcds` não respondeu em 14/09 nem
>   em 25/09. Os sites antigos são a mesma instalação Drupal 8, então uma tabela de caminhos serve
>   para todos. Para o destino não mudar quando o programa publicar, `/<slug>` de microsite não
>   publicado leva agora à página automática `/programas/<slug>`. **Decisões novas para a PRPG:**
>   D-S1 (usar o subdomínio antigo como slug — hoje 40 slugs são o nome por extenso), D-S2
>   (preservar `/sites/default/files`), D-S3 (quando desligar cada Drupal).
> **Ficou de fora:** perfil/página "Coordenação" própria (fica no "Sobre"); "Informações gerais" de
> Admissão como página fixa (o programa pode criar uma página e movê-la para Admissão pela S.3);
> filtro de editais "abertos/fechados" no microsite; itens próprios de alguns sites (CCD,
> laboratórios, revistas) — viram páginas criadas pelo programa.
> **Não verificado no navegador:** as telas do painel (editor do menu, páginas fixas e checklist em
> "Site do Programa", prévia de contraste no formulário) — exigem login; conferidas por build,
> typecheck e testes da API. O microsite público (menu em grupos no desktop, página de linhas,
> página fixa vazia, redirecionamento de microsite não publicado) foi conferido no navegador; o
> menu mobile, pelo DOM (o painel não desenhou capturas no tamanho de celular).

### Fase O — Virada das planilhas (paralela, começa na semana 1)

| | # | Ação |
|---|---|---|
| `[x]` | O.1 | Uma oficina de cerca de 2 horas com secretaria e Câmara para as decisões do `PLANO.md` §4, levando uma recomendação pronta para cada uma |
| `[x]` | O.2 | Importar fielmente e revisar depois: o original fica nas colunas `*_original`, o registro é marcado para revisão e a interpretação acontece numa tela. **Isso destrava B.8, G.4, E.5 e C.5** sem esperar todas as respostas |
| `[x]` | O.3 | Importadores com simulação (dry-run), relatório e reexecução segura (chave natural: NUP, série/ano/número, CPF+período), na ordem Contatos → Expedientes → Câmara → PNPD |
| `[x]` | O.4 | Critério explícito para aposentar cada planilha: um ciclo em paralelo sem divergência; depois disso, a planilha fica só para leitura |
| `[x]` | O.5 | Ligar o agendador como processo ou cron separado, primeiro registrando só no painel; e-mail quando a D-C5 for respondida |
| `[x]` | O.6 | **Painel de pendências** como página inicial do admin: relatorias atrasadas, reservas de número em aberto, pós-docs vencendo, editais com prazo, rascunhos, cadastros incompletos |
| `[x]` | O.7 | Painel de qualidade de dados: CPF inválido, pessoas possivelmente duplicadas, vínculos sem data, links quebrados (verificador periódico) |

**Pronto quando:** cada uma das 4 planilhas está formalmente aposentada e a secretaria enxerga as
pendências no sistema, não na planilha.

### Fase U — Painel e acessibilidade (~2 semanas, complementa a Task 10 do plano de prontidão)

| | # | Ação |
|---|---|---|
| `[x]` | U.1 | Área `/minha-conta` para aluno e professor (dados, inscrições, declarações, relatorias), separada do `/admin`; o login leva cada papel ao seu lugar |
| `[x]` | U.2 | Menu do painel por tarefa: Site · Programas · Secretaria (Câmara, Expedientes, Pós-doc, Proficiência) · Pessoas e Contatos · Configuração; "Portarias" sai quando E.11 concluir |
| `[x]` | U.3 | Componente de tabela único, com paginação, ordenação e filtros no servidor e na URL; filtro de programa para admin global |
| `[x]` | U.4 | Componentes de formulário acessíveis (`Field`, `Select`, `FileField` com `htmlFor`/`aria`), `Dialog` com foco, Toast anunciado a leitores de tela, painel responsivo com drawer |
| `[x]` | U.5 | Busca no painel (Ctrl+K) usando o `/api/busca` que já existe, ampliado aos tipos de conteúdo |
| `[x]` | U.6 | Estados de carregando, vazio e erro distintos em todo o front; ErrorBoundary por área |
| `[x]` | U.7 | Um só sistema de ícones (lucide), removendo o Font Awesome da CDN |

> **Nota de execução (26/09/2026)** — os 7 itens aplicados, um commit por item (U.7, U.2, U.4, U.6,
> U.1, U.3, U.5, nessa ordem — os ícones e o menu primeiro porque tocam quase todos os arquivos),
> mais quatro commits de acabamento (rede de segurança dos rótulos, telas do painel que ficavam em
> branco, AdminLayout fora do chunk inicial). Suíte do servidor: 425 testes verdes em 48 arquivos
> (`npx vitest run`); suíte nova do front: 64 testes em 4 arquivos (`npm run test:front`, jsdom).
> **Como ficou:**
> - U.7: um só sistema de ícones. `src/components/Icone.jsx` aceita o valor antigo do banco
>   (`"fa-solid fa-gavel"`, gravado em menus, atalhos da home e redes sociais) e a forma curta
>   (`"gavel"`); dimensiona por `font-size` (1em) e herda a cor, então **as cores do programa e o
>   contraste validado na S.5 não mudam** (só o traço é mais fino que o do Font Awesome sólido). 214
>   `<i class="fa-…">` trocados por script + o restante à mão; nenhum sobrou no código nem no
>   `index.html` (saiu o CSS de 102 KB da CDN que bloqueava a renderização). O editor de menus troca o
>   campo livre de classes por um seletor de ícones. Entrada: 85 → 79 KB gz (com o `AdminLayout` fora do
>   chunk inicial). Migração `2026-09-26_icones_lucide` (aplicada no banco de desenvolvimento): só troca o texto de
>   ajuda da lista "Redes sociais", que mandava digitar a classe do Font Awesome.
> - U.2: menu por tarefa — **Site · Programas · Secretaria · Pessoas e Contatos · Configuração**,
>   grupos recolhíveis (`aria-expanded`; o da rota atual abre sozinho, a escolha fica no navegador),
>   `Pendências` como início. Secretaria: Câmara, Expedientes, Pós-Doutorado, Proficiência, **Portarias
>   (fica até a E.11 concluir)** e Meus processos; Configuração: Classificações, Planilhas, Importar
>   usuários, Qualidade dos dados e Notificações e agendador (só Administrator). O Gestor de Programa
>   vê a versão dele (Site do Programa, Programa, Secretaria). Um só arquivo de dados
>   (`components/admin/menuPainel.js`) alimenta o menu e a busca.
> - U.4: `components/ui/Field.jsx` (`Field`, `Input`, `Select`, `Textarea`, `Checkbox`, `FileField`:
>   `htmlFor`, `aria-describedby`, `aria-invalid`, `required`), `Dialog` (nome, `aria-modal`, foco preso e
>   devolvido, Escape; base do `ConfirmModal`, do mapa, da biblioteca de mídia e do modal da
>   proficiência), `Toast` com regiões vivas sempre montadas (sucesso `polite`, erro `assertive`; **erro
>   não some sozinho**), painel com **drawer abaixo de 1024 px** (fora da ordem de foco quando fechado,
>   prende o foco quando aberto), "Ir para o conteúdo", um só `<main>` (páginas públicas e do microsite
>   aninhavam `<main>`) e foco/rolagem na troca de rota. Migrados para os componentes: login, troca
>   de senha, inscrição de proficiência e /minha-conta. **Os outros ~240 rótulos não foram reescritos:**
>   `hooks/useAssociarRotulos.js` liga em tempo de execução cada `<label>` solto ao campo seguinte,
>   nomeia campo de arquivo, editor de texto rico e grupos de opções, e dá nome (pelo placeholder ou
>   pela primeira opção) a busca/filtro sem rótulo. Um teste renderiza 8 formulários reais do painel
>   (notícia, edital, resolução, tese, usuário, programa, Câmara, expediente) e exige **zero rótulos
>   soltos e zero campos sem nome** — mas é uma rede de segurança, não a migração.
> - U.6: `components/ui/Estados.jsx` (Carregando, EstadoVazio, EstadoErro com "Tentar de novo"),
>   `api.lerJson` (lança `ErroApi` em status ≠ 2xx), `useCarga` e `AreaErrorBoundary` (painel, portal,
>   microsite e /minha-conta; zera ao navegar). Falha de rede/401/500 deixa de aparecer como lista vazia
>   ou "não encontrado" no calendário, formulários, resoluções, programas, em 11 páginas do microsite e
>   em 6 telas do painel; as listas do painel ganharam os três estados pela tabela única (U.3).
> - U.1: `/minha-conta` (Meus dados, Inscrições, Declarações, Relatorias) para aluno e professor. API:
>   `GET/PUT /api/minha-conta`, `PUT /api/minha-conta/senha` (exige a senha atual) e `GET
>   /api/minha-conta/declaracoes/:id/pdf` — sempre a **própria** conta (o id vem do token), o PDF só sai
>   se a secretaria já emitiu e não foi revogado. Nome, CPF, e-mail e papéis **não** são editáveis pela
>   pessoa (o cadastro confere o nome com a matrícula); ela edita telefones, Lattes/ORCID/Scholar e o
>   que aparece no site. **Mudança de comportamento:** `/admin` passa a exigir papel da equipe
>   (Administrator, Gestor, GestorPrograma) — aluno e professor que abrirem `/admin` caem em
>   `/minha-conta`, e `/admin/meus-processos` é só da equipe (a relatoria do professor vive em
>   `/minha-conta/relatorias`). O login leva cada papel ao seu lugar e volta à tela pedida se o perfil
>   puder abri-la; "Entrar/Minha conta/Painel" na faixa do portal e "Minha conta" no cabeçalho do painel.
>   Slugs `minha-conta` e `entrar` reservados.
> - U.3: tabela única. Servidor: `responderLista` ganha `?q=` e `?ordenar=&dir=` restrito a uma lista de
>   campos por controller (nunca um caminho arbitrário do objeto; vazios no fim; ordem estável, então a
>   paginação não repete nem perde itens), aplicado a notícias, editais, resoluções, formulários,
>   calendários, teses, FAQ, disciplinas, bolsas, páginas, programas e usuários. Front: `useListaServidor`
>   (página, tamanho, busca, ordenação, situação e origem **na URL** — links compartilháveis),
>   `DataTable` (`aria-sort`, filtro de programa/origem para a PRPG, paginação) e `ListaAdmin` (exclusão
>   e exclusão em massa com confirmação, ações com nome acessível): **12 listas viraram configuração de
>   ~30 linhas** (a de usuários deixou de baixar todas as contas — com CPF — para filtrar no navegador).
>   "Páginas fixas vazias" e "somente PRPG" passaram a ser filtros do servidor (o helper saiu do front).
> - U.5: Ctrl/Cmd+K de qualquer tela do painel (e botão "Buscar" no cabeçalho). `/api/busca` ganhou
>   notícias, editais, resoluções, formulários, páginas, teses, FAQ, disciplinas, bolsas, usuários e
>   programas (sem diferenciar acento/caixa; `%` e `_` são texto; rascunhos entram); o Gestor de Programa
>   só encontra o do próprio programa. A paleta mostra "Ir para" (as telas), "Criar" e o conteúdo,
>   como combobox/listbox (setas, Enter, Esc, anúncio de resultados); erro da busca aparece como erro.
>   O atalho **não** dispara dentro do editor de texto (é o de link do CKEditor).
> **Decisões assumidas:** o menu do Gestor de Programa continua sem Câmara/Expedientes/Pós-doc (as
> rotas aceitam-no para leitura, mas o menu nunca os mostrou); "Dashboard / Métricas" virou
> "Indicadores e métricas" em Programas; "Importação" virou "Importar usuários"; declaração baixável
> só para proficiência (é o único tipo com gerador de PDF); `lucide-react` 0.546 ainda tem os ícones de
> Instagram/LinkedIn/Twitter, mas os marca como obsoletos (somem na 1.0).
> **Ficou de fora:**
> - reescrever os ~240 rótulos restantes com `Field` (a rede de segurança cobre; a troca é mecânica);
> - migrar para a tabela única as listas de Grupos de Pesquisa, Linhas, Portarias, Câmara, Reuniões,
>   Expedientes, Pós-doc, Contatos, Proficiência, Mídia, Notificações, Métricas — têm consultas e
>   filtros próprios no servidor ou não são tabelas de conteúdo;
> - ícones de marca sem equivalente no lucide são aproximações: WhatsApp → balão de mensagem, Google →
>   logotipo do Chrome, ORCID → cartão de pessoa;
> - o teclado no menu do site público além do que já existia, e "Portarias" saindo do menu (E.11);
> - estados de erro nas buscas auxiliares dos formulários (lista de programas, séries), na home do
>   microsite (notícias) e nos blocos decorativos (Relacionados, Próximos prazos) — seguem
>   silenciosos de propósito;
> - Playwright + axe, NVDA e a validação em 320/375/768/1024/1440 px com zoom de 200% (Task 10).
> **Não verificado:**
> - **nenhuma tela do painel nem a `/minha-conta` foi aberta num navegador** (exigem login, e a
>   instrução foi não entrar com senha): a conferência é build, typecheck, 64 testes de componentes em
>   jsdom (menu, drawer, Ctrl+K, tabela com URL/ordenação/erro/exclusão, formulários reais, /minha-conta)
>   e 30 testes de API novos. O que jsdom não mede — layout, foco visual, o drawer num celular de verdade,
>   leitor de tela — ficou sem medir;
> - as páginas públicas e o microsite foram conferidos no navegador (ícones, um só `<main>`, sem rolagem
>   horizontal a 375 px, campos com nome, Dialog do mapa com foco e Escape); capturas de tela no tamanho
>   de celular falham neste painel, então o celular foi conferido pelo DOM;
> - o contraste dos ícones foi mantido por construção (mesma cor, `currentColor`), não remedido;
> - o jsdom usado pelos testes de front vem do `isomorphic-dompurify` (dependência transitiva);
>   declará-lo em `devDependencies` exige atualizar o `package-lock.json`.

### Fase P — Performance e SEO (~1,5 semana, complementa a Task 11 do plano de prontidão)

| | # | Ação |
|---|---|---|
| `[x]` | P.1 | Tirar o código do painel do carregamento público (ganho modesto); carregar sob demanda as subpáginas do microsite; XLSX só no clique ou exportação pelo servidor. `/programas` cai de 98 KB para cerca de 4 KB gz |
| `[x]` | P.2 | Listagens enxutas, paginação, gzip e ETag; eliminar o N+1 de editais (uma consulta com agregação); filtros em SQL |
| `[x]` | P.3 | Imagens locais em WebP com vários tamanhos gerados no upload, dimensões declaradas, carregamento tardio, hero pré-carregado |
| `[x]` | P.4 | Metadados por rota injetados pelo servidor no `index.html` a partir do banco (título, descrição, canonical, OG) — alternativa barata ao SSR; `sitemap.xml` e `robots.txt` gerados do banco; JSON-LD (Organization, NewsArticle, BreadcrumbList) |
| `[x]` | P.5 | Fontes hospedadas no próprio site, acabando com o `@import` encadeado |
| `[x]` | P.6 | Orçamento de performance no CI (Lighthouse) e medição real de Web Vitals |

> **Nota de execução (28/09/2026)** — os 6 itens aplicados, um commit por item (P.1, P.2, P.5, P.3,
> P.4, mais um commit de acabamento do P.4, P.6, nessa ordem — as fontes vieram antes das imagens
> porque não dependiam de nada), com testes novos em `listagemSql`, `imagens`, `seo` e `webVitals`
> (suíte do servidor: 475 testes em 52 arquivos, verdes) e em `usePortal`, `rotaVitals` e `webVitals`
> do lado do front (suíte de componentes: 85 testes em 9 arquivos). Migração `2026-09-28_web_vitals`
> aplicada no banco de desenvolvimento (`npm run db:migrate:apply`). **Decisão assumida:** D-R4 como
> recomendado — injeção de metadados pelo servidor agora, sem SSR/prerender. **Como ficou:**
> - P.1: XLSX vira `import()` dinâmico no clique de exportar (`ProgramasStrictoSensu.jsx`); as 15
>   subpáginas do microsite (`ProgramaSite.jsx`) e as ~80 rotas do painel (novo `src/RotasPainel.jsx`,
>   carregado só por quem entra em `/admin/*`) saem do carregamento público. Medido: `/programas`
>   98 → 4,3 KB gz; `ProgramaSite` 15,6 → 5,3 KB gz; chunk de entrada 78,8 → 74,9 KB gz (antes das
>   fontes/Web Vitals da P.5/P.6, que somam de volta — ver a medição final abaixo).
> - P.2: `server/db/repository.js` ganhou `listar`/`contar` (SQL puro, sempre com `params`, nunca
>   texto da requisição), e `newsController.getNews` foi reescrito para filtrar, ordenar (por texto
>   sem acento/caixa) e paginar tudo no banco; `?resumo=1` tira corpo/citação/tags/legenda. Editais só
>   buscam erratas/resultados dos itens que vão na página (antes: uma consulta por edital de todos).
>   O painel (`useListaServidor`) passou a pedir `resumo=1`; o microsite passou a paginar as notícias
>   do programa (antes baixava todas). Medido: `/api/news` da página de notícias (paginada) 88 → 1,4 KB
>   gz. **Só `news` e `editais` migraram** para SQL puro — os demais controllers de listagem
>   continuam filtrando/ordenando em JavaScript sobre `getAll()` (volume pequeno hoje; ver H.5 para o
>   índice full-text, que já é SQL).
> - P.3: `server/services/imagens.js` (`sharp`) gera 5 larguras WebP (240 a 1920 px, sem ampliar) no
>   upload e sob demanda para o que já estava em `server/uploads` (`npm run imagens`);
>   `/uploads/<arquivo>?w=` serve a versão com cache imutável de 30 dias.
>   `src/components/Imagem.jsx` (srcset/sizes, `loading="lazy"` por padrão, `prioridade` para o LCP)
>   substitui `<img>` em 16 lugares; `SafeHtml` aplica o mesmo tratamento às imagens dentro do texto
>   do editor. `server/uploads-derivados/` é cache regenerável — fora do backup (`.gitignore`).
> - P.4: `server/seo/` (`metadados.js`, `html.js`, `sitemap.js`, `spa.js`) injeta título, descrição,
>   canonical, Open Graph e JSON-LD (`Organization`+`WebSite` na home; `NewsArticle` na notícia, com o
>   canonical no microsite quando ele está publicado e no portal senão; `BreadcrumbList` em todas) no
>   `index.html` do build, a partir do banco — conteúdo inexistente/rascunho/agendado responde **404**
>   de verdade (antes: 200 sempre, é uma SPA); área restrita (`/admin`, `/minha-conta`, `/busca`...)
>   sai como `noindex`. `sitemap.xml` e `robots.txt` também vêm do banco (só o publicado e canônico,
>   sem duplicar programa com/sem microsite); `SEO_NOINDEX=true` fecha tudo para homologação. O mesmo
>   HTML também embute menus e configurações (`<script id="dados-portal">`) — `usePortal` usa esse
>   bloco em vez de esperar duas requisições depois do JavaScript, com nova descrição/imagem padrão
>   configuráveis em "Menus e portal → Buscadores e redes". **Precisa do build (`SPA_DIST_DIR`,
>   padrão `dist/`)** — sem ele só `robots.txt`/`sitemap.xml` respondem (documentado em
>   `docs/operations/site-e-seo.md`).
> - P.5: Inter e Outfit variáveis (subconjunto latino) hospedadas em `src/assets/fontes/`
>   (licença OFL junto), pré-carregadas no `index.html`; sai o `@import` encadeado do Google Fonts —
>   zero recurso de terceiro bloqueando a primeira renderização.
> - P.6: `scripts/orcamento-desempenho.mjs` (`npm run perf:bundle`) builda numa pasta temporária e
>   mede em KB gzip o JS/CSS/fontes do carregamento inicial, cada chunk e o total por rota pública,
>   contra `orcamento-desempenho.json` — falha se estourar (CI: `.github/workflows/desempenho.yml`,
>   que também roda `lighthouserc.cjs` com Postgres de serviço, LCP/CLS/TBT e notas de
>   a11y/SEO/boas-práticas). `src/webVitals.js` (biblioteca `web-vitals`, `import()` dinâmico — não
>   pesa no carregamento inicial) reporta CLS/FCP/INP/LCP/TTFB reais por família de rota
>   (`src/utils/rotaVitals.js` agrupa `/noticia/abc` e `/noticia/xyz` em `/noticia/:id`) só no build
>   de produção; `POST /api/web-vitals` é anônimo (sem identificador, IP nem user-agent — LGPD).
>   `GET /api/web-vitals/resumo` (Admin/Gestor) calcula o p75 por rota e métrica (`percentile_cont`),
>   lido em **Qualidade dos dados → Desempenho real**. Achado de passagem, corrigido: o `<main>`
>   público e do microsite não tinha `min-h-screen` — enquanto a lista de notícias carregava, o
>   rodapé pulava; CLS medido em `/noticias` caiu de 0,62 para 0.
>
> **Medido (Lighthouse local, `chrome-launcher` headless, perfil móvel simulado, banco de dev clonado
> — não é CI real, ver "Não verificado"):** `/noticias` 64 → 88 (CLS 0,62 → 0, TBT 230 → 85 ms);
> `/programas` 84; home 74 → 84 **com um banner sintético leve no lugar do JPEG de 405 KB do site
> antigo** (a home real só melhora de verdade depois que a rotina de mídia da F.5 trouxer o banner
> para `/uploads`). Chunk de entrada final (com fontes pré-carregadas e o módulo de Web Vitals): 94,5
> KB gz — dentro do orçamento (105 KB).
>
> **Ficou de fora:**
> - trazer o banner da home e o logo do topo para `/uploads` (continuam em `prpg.ufrpe.br`, sem cache
>   nem WebP) — depende da mesma rotina de mídia (`npm run arquivos -- --externos --executar`) que as
>   Fases F e H já deixaram para depois, por exigir autorização;
> - AVIF (só WebP — cobre o navegador majoritário do público institucional; considerar depois, se o
>   ganho compensar mais um formato/tamanho por imagem);
> - contraste insuficiente que o Lighthouse aponta em `text-ufrpe-cyan`/`green-600`/`orange-600` e no
>   rodapé — fora do escopo desta fase (a S.5 tratou só as cores por programa);
> - retenção agendada de `web_vitals` (só a limpeza oportunista de 1 a cada 500 requisições, descrita
>   no controller) — um cron dedicado fica para quando o volume justificar;
> - o restante das listagens (grupos, portarias, Câmara, expedientes, pós-doc, contatos, disciplinas,
>   bolsas, formulários, resoluções, teses) continua filtrando em JavaScript sobre `getAll()` (P.2
>   só migrou notícias e editais, os dois medidos como críticos no diagnóstico da Fase P);
>   endurecimento completo da CSP do HTML servido (nonce, `connect-src`, `img-src`) — fica para a
>   Task 12 do plano de prontidão.
>
> **Não verificado:**
> - nenhuma tela do painel foi aberta num navegador logado (exige login com senha) — "Desempenho
>   real" em Qualidade dos dados foi conferido por build, typecheck e os testes de API/componente;
> - o relato real de Web Vitals nunca rodou num navegador de visitante de verdade (só testado por
>   mocks unitários e por `curl` manual em `/api/web-vitals`) — sem tráfego de produção o painel
>   mostra "ainda sem medições";
> - `npm run perf:lighthouse` (`lhci autorun` completo) não terminou limpo nesta máquina Windows — o
>   `chrome-launcher` tenta apagar a pasta temporária do perfil do Chrome e esbarra em EPERM depois de
>   já ter coletado os dados (`lhci assert` sobre a coleta funcionou); o workflow do CI roda em
>   Ubuntu, onde esse problema específico não é esperado, mas não foi testado num CI de verdade (o
>   repositório ainda não está num serviço de CI);
> - deploy atrás de um proxy reverso/CDN de verdade (cache, CSP, `SPA_DIST_DIR` em produção).

---

## 4. Decisões necessárias

| ID | Questão | Recomendação | Bloqueia |
|---|---|---|---|
| D-R1 | O portal da PRPG agrega conteúdo dos programas? | Editais sempre, com selo; notícias só quando marcadas como "destacar no portal" | R.6, H.2, N.1 |
| D-R2 | Perfil público de docente: visível por padrão com opção de ocultar, ou só com consentimento? | Decisão do encarregado de dados (LGPD) — ficha completa em [`decisoes-pendentes-conexoes-n.md`](decisoes-pendentes-conexoes-n.md#ficha--d-r2-perfil-público-de-docente-é-visível-por-padrão-ou-só-com-consentimento) | N.4 |
| D-R3 | O Gestor de Programa publica direto ou precisa de aprovação da PRPG? | Publica direto, com a PRPG podendo despublicar, sem motor de aprovação (`arquitetura-dados.md` §4.4) | F.1, F.6 |
| D-R4 | SEO: injeção de metadados pelo servidor agora, ou SSR/prerender completo? | Injeção pelo servidor agora; reavaliar SSR depois da Fase H | P.4 |
| D-R5 | Data da oficina de decisões (O.1) | O quanto antes — é o item que mais atrasa o resultado de sair das planilhas | toda a Fase O |

---

## 5. Como medir

| Indicador | Hoje (24/09/2026) | Meta |
|---|---|---|
| Páginas institucionais editáveis sem deploy | 0/16 | 16/16 |
| Programas com página pública | 2/42 | 42/42 |
| Planilhas aposentadas | 0/4 | 4/4 |
| Itens fictícios e links mortos | home inteira + 10 `href="#"` | 0 (verificador de links no CI) |
| Recursos externos que bloqueiam a renderização | Font Awesome 102 KB + fontes via `@import` | 0 |
| `/api/news` (listagem) | 88 KB sem gzip | < 10 KB |
| Labels associados aos campos | 1/247 | 100% |
| Testes de frontend/E2E | 0 | fluxos críticos cobertos |

---

## 6. O que não recomendo

- **Migrar para um CMS headless** (Strapi, Directus, WordPress): o valor está no modelo que liga
  conteúdo a pessoas, programas e atos, e um CMS externo partiria isso em dois.
- **Tabela genérica `conteudos` ou montador de páginas por blocos:** convenções comuns mais páginas
  com `chave` resolvem por uma fração do custo (`arquitetura-dados.md` §4.1).
- **Motor de workflow configurável:** o volume não justifica (`arquitetura-dados.md` §4.4).
- **Novos módulos de gestão** antes de a Fase O colocar dados reais nos que já existem.

---

## 7. Registro de execução

| Fase | Itens | Decisões antes | Início | Fim | Estado |
|---|---|---|---|---|---|
| R — Robustez imediata | 11 | — | 24/09/2026 | 24/09/2026 | ✅ concluída (ver nota da Fase R) |
| F — Fundação editorial | 7 | D-R3 | 25/09/2026 | 25/09/2026 | ✅ concluída (ver nota da Fase F) |
| H — Portal dirigido por dados | 7 | D-R1 | 25/09/2026 | 25/09/2026 | ✅ concluída (ver nota da Fase H) |
| N — Conexões entre conteúdos | 9 | D-R1, D-R2 | 25/09/2026 | 25/09/2026 | 🟡 6/9 (N.4 ⛔ D-R2; N.7 ⛔ E.11/D-E*; N.8 ⛔ D-G1 — ver nota da Fase N) |
| S — Microsites em 4 grupos | 6 | — | 25/09/2026 | 25/09/2026 | ✅ concluída (ver nota da Fase S; D-S1..D-S3 para a TI) |
| O — Virada das planilhas | 7 | D-R5 + `PLANO.md` §4 | 25/09/2026 | 25/09/2026 | 🟡 7/7 no código (400 testes verdes); **a virada em si depende da oficina (O.1) e da gravação das importações** — ver nota da Fase O |
| U — Painel e acessibilidade | 7 | — | 26/09/2026 | 26/09/2026 | 🟡 7/7 nos fluxos principais; migração dos ~240 rótulos e de 12 listas restantes fica para depois (ver nota da Fase U) |
| P — Performance e SEO | 6 | D-R4 | 26/09/2026 | 28/09/2026 | ✅ concluída (ver nota da Fase P) |
| | **60 itens** | **5 decisões** | | | |

> **Nota de execução (25/09/2026)** — os 7 itens aplicados, um commit por item (O.1 a O.7), com
> testes em `planilhasRevisao`, `planilhasImportadores`, `painel`, `qualidade` e `prazos` (suíte:
> ver a linha da Fase O no registro). Migrações `2026-09-25_importacao_revisao`,
> `_planilhas_aposentadoria`, `_agendador_execucoes` e `_qualidade_links` aplicadas no banco de
> desenvolvimento. Suíte: 400 testes em 45 arquivos, verdes. **Decisão assumida:** nenhuma das decisões do `PLANO.md` §4 foi tomada pelo
> código — o caminho foi "importar fielmente + marcar para revisão" (O.2). **Como ficou:**
> - O.1: [`oficina-decisoes-planilhas.md`](oficina-decisoes-planilhas.md) — uma ficha por decisão
>   (contexto, opções, recomendação, o que o sistema faz até a resposta), pauta de 2 h priorizando o
>   que destrava dado real (★), folha de respostas. Achado que muda a D-E3: **304 dos 306 números "em
>   branco" são a grade pré-numerada depois do último número usado**, não reservas (os buracos reais
>   ficam em `OFÍCIOS - 2024`). Não decide nada e não define data (D-R5 é da Pró-Reitoria).
> - O.2: `importacoes` (execução + arquivo original guardado por hash em
>   `server/private-uploads/importacoes/`), `importacao_origens` (chave natural → registro, com a linha
>   como veio), `importacao_pendencias` (cada uma com a D-xx que a responde) e `importacao_depara`.
>   Tela **Revisão da importação** (`/admin/planilhas/revisao`): pendências agrupadas por tipo e grafia;
>   "aplicar" grava a resposta em todos os registros do grupo (ex.: cor `#B6D7A8` → situação) e vira
>   de-para da próxima importação; "conferido"/"descartar". As fichas de processo, ato e pós-doc mostram
>   "Importado da planilha" com a linha original. Situação nova `A_CLASSIFICAR` nos processos.
> - O.3: os quatro importadores (`server/services/planilhas/`), `npm run planilha -- <fonte> <arquivo>
>   [--gravar]` e `npm run planilha -- todas <pasta>` (a sequência inteira numa transação só, desfeita) e a
>   tela **Planilhas** (`/admin/planilhas`: simular, importar, "simular de novo o último arquivo"). A
>   simulação é a importação real numa transação desfeita, então o relatório é exatamente o que a gravação
>   faria. **Simulado sobre as planilhas reais** (`Sites/Planilhas/`; nada gravado no banco):
>   Contatos — 40 programas entram, 7 ficam guardados por não terem correspondência (PGMP, PGCAP, PGF,
>   PPGPA e os 3 da UFAPE) e 29 vices ficam "a confirmar"; Expedientes — 550 atos, 17 referências entre
>   atos ligadas (4 só em texto), 7 números repetidos entre abas (editais de 2024 duplicados em
>   " EDITAIS PRPG 2025" e um 11/2025 que existe duas vezes) ficam para revisão; Câmara — 80 processos
>   (79 novos + 1 que já estava no banco de dev), 8 reuniões, 48 itens de pauta, 97 eventos de
>   tramitação, 42 relatorias; PNPD — 95 estágios (8 com período em aberto, 6 CPFs com problema, 5 sem
>   CPF, 3 sobreposições, 6–7 grafias de programa sem correspondência). Achados de passagem: o cadastro
>   tem outro coordenador que o da planilha no PROFIAP (vira `VINCULO_DIVERGENTE`, sem encerrar o
>   vínculo); 4 ofícios/editais com data de ano diferente do da aba (um de 2016). **Regras:** nenhum
>   programa é criado (D-G5/D-G6); a aba `Relatores` não é lida (D-G8); todo contato entra **não
>   público** (D-G1); a grade pré-numerada depois do último número não entra e os buracos viram
>   pendência que, se a resposta for "sim" (D-E3), cria os números como `CANCELADO`; período/CPF em
>   aberto entram sem inventar dado, e o estágio sem as duas datas fica "em análise" (não conta como
>   vigente); renovação de estágio só é sugerida.
> - O.4: situação por planilha (em uso → paralelo → só leitura) com quatro critérios **calculados**
>   (importação gravada; sem pendência aberta das decisões ★ da planilha; um ciclo de 30 dias em
>   paralelo — na Câmara, com ao menos uma reunião; simulação do dia sem linha nova, alterada ou em
>   conflito). Aposentar só com os quatro (a API responde 409 com a lista). Documento:
>   [`aposentadoria-planilhas.md`](aposentadoria-planilhas.md). O relatório de divergência é a última
>   simulação.
> - O.5: `npm run agendador` (uma avaliação e sai, para cron) ou `-- --continuo`; execução registrada
>   em `agendador_execucoes` (lock consultivo contra sobreposição), "Executar agora" e aviso de "parou
>   de rodar" (>36 h) em Notificações. **Modo só no painel por padrão** (`SO_PAINEL`, via
>   `AsyncLocalStorage` — não afeta requisições web): o aviso fica em `notificacoes` mesmo com SMTP
>   configurado; `AGENDADOR_EMAIL=true` liga o envio depois da D-C5. Operação:
>   [`operations/agendador.md`](operations/agendador.md).
> - O.6: `/admin` passa a ser o painel de **Pendências** (`GET /api/painel/pendencias`), calculado dos
>   dados na hora: relatorias atrasadas/vencendo, processos a classificar, números reservados e não
>   usados (alta se >15 dias), mandatos e portarias vencendo, estágios pós-doc vencendo/sem relatório,
>   editais com prazo em 14 dias, rascunhos e agendados (11 tabelas), programas sem sigla/coordenação,
>   estágios com período incompleto, pendências de revisão das planilhas, agendador parado. Gestor de
>   Programa vê só o seu programa; quem não é Admin/Gestor/Gestor de Programa continua caindo em
>   Notícias.
> - O.7: **Qualidade dos dados** (`/admin/qualidade`): CPF inválido (mascarado), pessoas possivelmente
>   duplicadas (mesmo nome sem acento/caixa, ou mesmo CPF — **só sinaliza, não mescla**), vínculos de
>   mandato sem data, contatos malformados, links quebrados. Verificador (`npm run links` por cron, ou o
>   botão): URLs de 12 tabelas/colunas e do HTML de notícias, páginas e FAQ; `/uploads` conferido no
>   disco; http(s) por HEAD/GET, sem seguir para host interno (proteção contra SSRF, redirecionamentos
>   revalidados); 404/host inexistente = quebrado, 403/429/5xx/timeout = "incerto". Rodado no banco de
>   dev: 309 URLs, **36 externas quebradas** (várias em `prpg.ufrpe.br/sites/default/files/...` —
>   arquivos do site antigo, para a rotina de mídia da F.5) e 4 incertas.
>
> **Bloqueado / depende de decisão (o importador roda, a interpretação espera):**
>
> | Decisão | O que ficou marcado para revisão |
> |---|---|
> | D-B1 (cores da Câmara) | 80 processos em `A_CLASSIFICAR`, com a cor guardada; 1 pendência por processo, resolvida por cor |
> | D-G8 | aba `Relatores` não lida |
> | D-G2 | 29 vices como `VICE_COORDENADOR`, "a confirmar" (uma resposta troca todos) |
> | D-G3 | nota `A` gravada como texto |
> | D-G5/D-G6 | 7 programas da planilha não entram; nenhum é criado |
> | D-G1 | todo contato importado é não público (G.9/N.8/B.6 seguem bloqueados) |
> | D-E2/D-E3/D-E5 | portarias de 2025 (179 números de grade), buracos e traços viram pendência; editais do livro sem página ligada listados |
> | D-C3/D-C8/D-C9 | 6 grafias de programa sem correspondência (ECOLOGIA), 8 períodos em aberto, sobreposições e renovações só sugeridas |
> | D-C5 | agendador só no painel; sem e-mail |
> | D-J1..J3, D-L1, D-K1, D-E1, D-E6..E8, D-C1/C2/C4/C6/C7 | não travam a importação; estão na oficina |
>
> **Ficou de fora:** as telas de importação em passos (B.9, G.8, E.10) — substituídas por Planilhas +
> Revisão, que cobrem simular, conciliar e aplicar em lote; "desfazer importação em 24 h"
> (`requisitos-*.md`) — não há: a segurança é simular antes, reimportar sem duplicar e não sobrescrever
> o que foi corrigido no sistema; **mesclar pessoas duplicadas** (O.7 só lista); E.14 (preencher
> `vinculos.ato_id` a partir das portarias) e E.11/E.12 (dependem das decisões); o de-para de pessoa em
> Expedientes (quem expediu) cria só a pendência — as 12 pessoas precisam de cadastro/login (D-E6);
> conciliação de editais só por link idêntico ao do site; trancar a planilha (arquivo externo — o
> sistema só registra que foi feito); K.5/N.4/N.7/N.8.
>
> **Não verificado:**
> - as telas do painel (Planilhas, Revisão, Pendências, Qualidade, fichas com "Importado da planilha",
>   Notificações com o agendador) — exigem login; conferidas por build, typecheck e testes de API. O
>   painel de pendências e o verificador de links foram rodados **contra o banco de dev** por script;
> - **nenhuma importação foi gravada** no banco de dev nem em produção — só simulações (a gravação está
>   coberta pelos testes, com planilhas sintéticas sem dado pessoal). A gravação real e a conferência de
>   10 processos com a secretaria (B.10) são o próximo passo, depois da oficina;
> - o envio de e-mail (sem SMTP), o cron de fato instalado em produção e o desempenho do verificador de
>   links com milhares de URLs (309 levaram ~5 min com 6 requisições em paralelo).
