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
| `[ ]` | F.1 | Campos comuns nas 11 tabelas de conteúdo: `status` (RASCUNHO/PUBLICADO/ARQUIVADO), `publicado_em` (permite agendar) e `criado_em`/`atualizado_em` com trigger. Na notícia, `destaque` e `imagem_alt`; `ordem` onde a lista é curada. As linhas existentes viram PUBLICADO, sem mudança visível. Endpoints públicos filtram `status='PUBLICADO' AND publicado_em <= now()` | migração, `schema.sql` |
| `[ ]` | F.2 | Repositório: `list()` com filtros permitidos, ordenação, paginação e versão de listagem sem o corpo; `update` que confere `atualizado_em` e devolve 409 se alguém editou antes | `server/db/repository.js` |
| `[ ]` | F.3 | Contrato de listagem pública `{items,total,page}` com filtros por programa, categoria, ano, busca e status; notícia individual por `/api/news/:id` e "relacionadas" por consulta | controllers e páginas públicas |
| `[ ]` | F.4 | Classificação única em `vocabularios` (`noticia.categoria`, `edital.categoria`, `documento.secao`, com ordem e cor), editável no painel; `taxonomias` é absorvida; `taxonomia_refs` fica só para importação | `vocabulariosRepo.js`, formulários, `Editais.jsx`, `Resolucoes.jsx` |
| `[ ]` | F.5 | Biblioteca de mídia sobre `arquivos`/`anexos`: listar, buscar, reutilizar, "onde é usado", substituir o arquivo mantendo as referências, preencher `sha256`. Rotina para trazer os arquivos de prpg.ufrpe.br e do Drive antes do desligamento do site antigo | `server/db/anexosRepo.js`, novo `MediaPicker` |
| `[ ]` | F.6 | Formulário editorial comum: status e agendamento, pré-visualização, aviso de alterações não salvas, "editado por X em Y"; um único CKEditor (`RichTextEditor`) com upload de imagem para a biblioteca | `src/components/admin/` |
| `[ ]` | F.7 | Histórico de versões leve (tabela `revisoes`: entidade, id, snapshot JSONB, autor, data) e opção de restaurar — cobre, para conteúdo, a metade de L.10 que ficou aberta | nova tabela + repositório |

**Pronto quando:** dá para salvar um rascunho invisível ao público, agendar uma notícia, restaurar
uma versão anterior, e toda lista pública e do painel é paginada no servidor.

### Fase H — Portal dirigido por dados (~2 semanas, depende de F)

| | # | Ação |
|---|---|---|
| `[ ]` | H.1 | Menus no banco (`menus`/`menu_itens`: principal, rodapé, topo, acesso rápido; destino = rota, página ou URL) com editor de ordem; Navbar, Footer e Home leem da API |
| `[ ]` | H.2 | Home montada a partir dos dados: destaques, últimas notícias (PRPG + programas rotulados), editais abertos de todos os programas, próximos prazos, números calculados (programas, docentes, discentes, teses), parceiros configuráveis |
| `[ ]` | H.3 | As 16 páginas institucionais passam para `pages` com uma `chave` fixa (mesmo padrão da "Sobre" do microsite), mantendo as URLs atuais; um script copia o texto uma única vez |
| `[ ]` | H.4 | Equipe e Estrutura Organizacional geradas de `unidades` (árvore por `unidade_pai_id`) + `vinculos` (com novo `unidade_id` para servidores da PRPG) + contatos públicos — a mesma fonte da Agenda de Contatos |
| `[ ]` | H.5 | Busca pública com índice full-text em português (`tsvector` + `unaccent`, GIN) sobre notícias, editais, páginas, documentos, programas e teses publicados; página `/busca` agrupada por tipo, também no mobile |
| `[ ]` | H.6 | Um componente único de cabeçalho e breadcrumb, derivado da árvore de menus, eliminando a cópia nas páginas institucionais |
| `[ ]` | H.7 | Política de Privacidade (LGPD — o site coleta comprovantes) e revisão dos links para o site antigo |

**Pronto quando:** nenhuma mudança de texto, menu ou atalho exige deploy, e a home não tem nenhum
item fictício.

### Fase N — Conexões entre conteúdos (~2 semanas, depende de F)

| | # | Ação |
|---|---|---|
| `[ ]` | N.1 | Página de editais que agrega PRPG e programas, com selo e link para o microsite, filtros por programa/modalidade/situação; visão "Seleções abertas" para candidatos |
| `[ ]` | N.2 | Catálogo de programas com link para o microsite e filtros (área, modalidade, nota CAPES, campus). Página automática para programas sem microsite (coordenação, contatos públicos, modalidades, linhas, editais abertos, docentes): **os 42 programas passam a ter página pública no primeiro dia** |
| `[ ]` | N.3 | Repositório global de teses e dissertações (programa, ano, tipo, orientador) |
| `[ ]` | N.4 | Perfil público do docente (programas e papéis, linhas, disciplinas, orientações, grupos, Lattes/ORCID, contatos públicos). Exige antes fechar a FK de `vinculos.pessoa_id` (B.3) e ligar as linhas de pesquisa a `pessoas`; visibilidade por flag + `contatos.publico` |
| `[ ]` | N.5 | Tabela `referencias` (origem → destino, tipo; lista fechada de entidades, mesmo padrão já aceito para `anexos`) e bloco "Relacionados" em notícia, edital, resolução e página |
| `[ ]` | N.6 | Calendário com marcos em `DATE`, opcionalmente ligados a edital; componente "Próximos prazos" (home, microsite, área do aluno); exportação `.ics` |
| `[ ]` | N.7 | Destravar E.11: `documento.secao` (F.4) substitui `section_id`; resoluções e formulários migram para `atos`/`documentos`; a página de resoluções passa a mostrar "vigente/revogada/alterada por" via `ato_referencias` |
| `[ ]` | N.8 | Contatos como fonte única (conclui G.9 e B.6) e fim dos 8 campos espalhados |
| `[ ]` | N.9 | View de indicadores derivados por programa/ano (docentes, discentes, egressos, teses); `metricas_anuais` fica só para o que não dá para calcular |

**Pronto quando:** de qualquer conteúdo se chega aos relacionados em 1 clique, todo programa tem
página pública e nenhum número do site é digitado quando pode ser calculado.

### Fase S — Microsites no modelo que os programas já usam (~1 semana)

| | # | Ação |
|---|---|---|
| `[ ]` | S.1 | Menu em 4 grupos: O Programa / Pessoas / Produção / Admissão, mais Notícias, Documentos e Contato |
| `[ ]` | S.2 | Páginas fixas para todos os programas (sobre, impacto social, autoavaliação, infraestrutura, internacionalização, planejamento), **ocultas enquanto estiverem vazias** |
| `[ ]` | S.3 | Ocultar, reordenar e renomear módulos por programa (pendência registrada em 14/09) |
| `[ ]` | S.4 | Checklist de publicação com percentual em "Site do Programa" (logo, cores, descrição, Sobre, coordenação, contatos, linhas) — ajuda a tirar os 40 programas do zero |
| `[ ]` | S.5 | Validação de contraste das cores escolhidas pelo programa ao salvar |
| `[ ]` | S.6 | Plano de redirecionamento dos domínios antigos (pgb.ufrpe.br etc.) com a TI — tabela de redirecionamentos |

### Fase O — Virada das planilhas (paralela, começa na semana 1)

| | # | Ação |
|---|---|---|
| `[ ]` | O.1 | Uma oficina de cerca de 2 horas com secretaria e Câmara para as decisões do `PLANO.md` §4, levando uma recomendação pronta para cada uma |
| `[ ]` | O.2 | Importar fielmente e revisar depois: o original fica nas colunas `*_original`, o registro é marcado para revisão e a interpretação acontece numa tela. **Isso destrava B.8, G.4, E.5 e C.5** sem esperar todas as respostas |
| `[ ]` | O.3 | Importadores com simulação (dry-run), relatório e reexecução segura (chave natural: NUP, série/ano/número, CPF+período), na ordem Contatos → Expedientes → Câmara → PNPD |
| `[ ]` | O.4 | Critério explícito para aposentar cada planilha: um ciclo em paralelo sem divergência; depois disso, a planilha fica só para leitura |
| `[ ]` | O.5 | Ligar o agendador como processo ou cron separado, primeiro registrando só no painel; e-mail quando a D-C5 for respondida |
| `[ ]` | O.6 | **Painel de pendências** como página inicial do admin: relatorias atrasadas, reservas de número em aberto, pós-docs vencendo, editais com prazo, rascunhos, cadastros incompletos |
| `[ ]` | O.7 | Painel de qualidade de dados: CPF inválido, pessoas possivelmente duplicadas, vínculos sem data, links quebrados (verificador periódico) |

**Pronto quando:** cada uma das 4 planilhas está formalmente aposentada e a secretaria enxerga as
pendências no sistema, não na planilha.

### Fase U — Painel e acessibilidade (~2 semanas, complementa a Task 10 do plano de prontidão)

| | # | Ação |
|---|---|---|
| `[ ]` | U.1 | Área `/minha-conta` para aluno e professor (dados, inscrições, declarações, relatorias), separada do `/admin`; o login leva cada papel ao seu lugar |
| `[ ]` | U.2 | Menu do painel por tarefa: Site · Programas · Secretaria (Câmara, Expedientes, Pós-doc, Proficiência) · Pessoas e Contatos · Configuração; "Portarias" sai quando E.11 concluir |
| `[ ]` | U.3 | Componente de tabela único, com paginação, ordenação e filtros no servidor e na URL; filtro de programa para admin global |
| `[ ]` | U.4 | Componentes de formulário acessíveis (`Field`, `Select`, `FileField` com `htmlFor`/`aria`), `Dialog` com foco, Toast anunciado a leitores de tela, painel responsivo com drawer |
| `[ ]` | U.5 | Busca no painel (Ctrl+K) usando o `/api/busca` que já existe, ampliado aos tipos de conteúdo |
| `[ ]` | U.6 | Estados de carregando, vazio e erro distintos em todo o front; ErrorBoundary por área |
| `[ ]` | U.7 | Um só sistema de ícones (lucide), removendo o Font Awesome da CDN |

### Fase P — Performance e SEO (~1,5 semana, complementa a Task 11 do plano de prontidão)

| | # | Ação |
|---|---|---|
| `[ ]` | P.1 | Tirar o código do painel do carregamento público (ganho modesto); carregar sob demanda as subpáginas do microsite; XLSX só no clique ou exportação pelo servidor. `/programas` cai de 98 KB para cerca de 4 KB gz |
| `[ ]` | P.2 | Listagens enxutas, paginação, gzip e ETag; eliminar o N+1 de editais (uma consulta com agregação); filtros em SQL |
| `[ ]` | P.3 | Imagens locais em WebP com vários tamanhos gerados no upload, dimensões declaradas, carregamento tardio, hero pré-carregado |
| `[ ]` | P.4 | Metadados por rota injetados pelo servidor no `index.html` a partir do banco (título, descrição, canonical, OG) — alternativa barata ao SSR; `sitemap.xml` e `robots.txt` gerados do banco; JSON-LD (Organization, NewsArticle, BreadcrumbList) |
| `[ ]` | P.5 | Fontes hospedadas no próprio site, acabando com o `@import` encadeado |
| `[ ]` | P.6 | Orçamento de performance no CI (Lighthouse) e medição real de Web Vitals |

---

## 4. Decisões necessárias

| ID | Questão | Recomendação | Bloqueia |
|---|---|---|---|
| D-R1 | O portal da PRPG agrega conteúdo dos programas? | Editais sempre, com selo; notícias só quando marcadas como "destacar no portal" | R.6, H.2, N.1 |
| D-R2 | Perfil público de docente: visível por padrão com opção de ocultar, ou só com consentimento? | Decisão do encarregado de dados (LGPD) | N.4 |
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
| F — Fundação editorial | 7 | D-R3 | | | ⬜ não iniciada |
| H — Portal dirigido por dados | 7 | D-R1 | | | ⬜ não iniciada |
| N — Conexões entre conteúdos | 9 | D-R1, D-R2 | | | ⬜ não iniciada |
| S — Microsites em 4 grupos | 6 | — | | | ⬜ não iniciada |
| O — Virada das planilhas | 7 | D-R5 + `PLANO.md` §4 | | | ⬜ não iniciada |
| U — Painel e acessibilidade | 7 | — | | | ⬜ não iniciada |
| P — Performance e SEO | 6 | D-R4 | | | ⬜ não iniciada |
| | **60 itens** | **5 decisões** | | | |
