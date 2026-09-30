# Análise — B.13: fechar a G1 (`users` só credencial, dados da pessoa em `pessoas`)

**Preparado em:** 30/09/2026, a partir de leitura de código na worktree `mystifying-noether-191f7d`
(`server/`, `src/`, testes) e de consultas **somente de leitura** ao banco de desenvolvimento
(container `prpg-postgres`, banco `prpg`). Nada foi alterado.
**Status:** decisões tomadas em 30/09/2026 (§7); plano em docs/superpowers/plans/2026-09-30-b13-g1-users-credencial.md.

## 1. O problema, em uma frase

A arquitetura (`arquitetura-dados.md` §5.1) decidiu que `pessoas` é a pessoa e `users` é só a credencial
(`id`, `pessoa_id`, `email`, `password_hash`, `senha_temporaria`, `roles`, `programa_id`). A A.2 criou
`pessoas` e a B.11/B.12 fizeram as chaves estrangeiras apontarem para ela, mas **`users` ainda carrega 13
colunas de dados da pessoa** (`perfil_nome`, `perfil_cpf`, `perfil_siape`, `perfil_foto_url`,
`perfil_telefones`, `acad_lattes/orcid/google_scholar/publons`, `priv_mostrar_email/telefone`) **e dois
JSONB** (`perfil_aluno`, `perfil_professor`), e **todo o formato da API de usuários** (`perfil_geral`,
`dados_academicos`, `perfil_aluno`, `perfil_professor`) nasce dessas colunas. Hoje as duas cópias só ficam
em dia por um remendo: `server/db/pessoaDoUsuario.js` copia `users → pessoas` a cada gravação
(D-B11b); não há caminho `pessoas → users`.

## 2. O dado hoje (banco de desenvolvimento, 30/09/2026)

| | |
|---|---|
| `users` | 91 (73 Aluno, 16 Professor, 1 Administrator, 1 GestorPrograma, 0 Gestor) |
| `users` sem `pessoa_id` | 0 |
| `pessoas` | 147 — 56 sem login (secretários, coordenadores, pró-reitor, servidor: vêm da estrutura da PRPG e da planilha de contatos) |
| divergência `users` × `pessoas` (nome, CPF, SIAPE, foto, telefones, Lattes, ORCID, Scholar, Publons) | **0 em todos os campos** |
| CPF preenchido | 0 em `users` e 0 em `pessoas` (os importadores legados gravam `cpf: ''`) |
| SIAPE / telefones | 0 / 0 |
| Lattes / ORCID / Scholar / Publons | 39 / 22 / 7 / 0 (iguais nas duas tabelas) |
| foto | 75 em `users`, 85 em `pessoas` (as 10 a mais vêm da estrutura) |
| `priv_mostrar_email` / `priv_mostrar_telefone` marcados | 1 / 0 |
| `users.programa_id` preenchido | **90** de 91 (só 1 é GestorPrograma) |
| `user_linhas_pesquisa` | 76 linhas, 76 usuários |
| `users` com e-mail sintético (`@import.prpg.local`) | 15 |
| `users` com senha padrão `Mudar123` | **89 de 91**, nenhum com `senha_temporaria = true` (ver §4.11) |
| `contatos` de pessoa | 9 linhas (e-mail 1, telefone 2, celular 2, WhatsApp 4) |

O dev está "limpo" porque **tudo veio dos importadores legados** e depois da migração A da B.11. Isso
**não** diz nada sobre a produção, onde o `AdminUserForm`, o `/minha-conta`, a tela de Estrutura e os
importadores da Fase O convivem há mais tempo. **A pré-verificação (§8) precisa rodar na produção antes
de qualquer passo de dado.**

### 2.1 O conteúdo real dos JSONB (dev)

`perfil_aluno` — 73 registros, 12 chaves; `perfil_professor` — 16 registros, 5 chaves.

| Chave | Valores / estado medido |
|---|---|
| `sexo` (aluno e professor) | 62+14 preenchidos = os 76 `pessoas.sexo` (já propagado pela migração A) |
| `estrangeiro` | `false` nos 73 alunos |
| `nacionalidade` | vazia nos 73 |
| `nivel` (aluno) | `Mestrando` 37, `Mestre` 36 — **nunca `Doutorando`/`Doutor`** neste banco |
| `egresso` | `true` 36, `false` 37 |
| `situacao` | `Matriculado` 56, `Egresso` 17 — **inconsistente com `egresso`**: 19 alunos têm `egresso=true` e `situacao=Matriculado` |
| `entrada` | 44 preenchidos (`2023.1`, `2022.1`…), 29 vazios |
| `qualificacao` | **69 de 73 com a mesma data, `2020-10-29`** — cara de valor-padrão da importação, não de dado real |
| `defesa` | 24 preenchidos |
| `orientador_id` | 48 preenchidos, **todos = `users.id` de um professor** que existe (12 orientadores distintos, todos com vínculo docente); 25 vazios. É um id de **login**, não de pessoa |
| `uid_legado`, `origem_import` | todos (`origem_import = profiap`); `uid_legado` único nos 89 |
| professor `tipo` | `Permanente` 14, `Colaborador` 2 (= o papel do vínculo nos 16) |
| professor `programas` | 1 programa em cada um dos 16; **bate 100% com os vínculos ativos** (0 divergências nos dois sentidos) |

Consistência com `vinculos` (dev): todo aluno tem vínculo discente/egresso (0 sem); `nivel` × papel:
`Mestrando → DISCENTE_MESTRADO` (37), `Mestre → EGRESSO` (36). Nenhum usuário tem vínculos em dois programas.

## 3. Inventário (verificado por arquivo e linha)

### 3.1 Camada de dados

| Local | Papel |
|---|---|
| `server/db/repositories.js:268-300` `userFromRow`/`userToRow` | **a tradução**: colunas ↔ `perfil_geral`, `dados_academicos`, `perfil_aluno`, `perfil_professor`, `privacidade`. `toRow` grava **todas** as colunas em todo `update` (a fábrica faz `{...existente, ...dados}` — `repository.js:96`) |
| `repositories.js:302-353` `usersRepo` | `create`/`update` chamam `sincronizarPessoaDoUsuario`; `findByCpf` lê `users.perfil_cpf` (`:326`); `getScopedToPrograma`/`isLinkedToPrograma` só usam `users.programa_id` e `pessoa_id` |
| `server/db/pessoaDoUsuario.js` | a cópia `users → pessoas` (D-B11b). Só propaga nome, CPF, SIAPE, foto, telefones, Lattes/ORCID/Scholar/Publons — **não** sexo/nacionalidade/estrangeiro (ver §4.6) |
| `server/db/pessoasRepo.js:12-40` `criarPessoaDeUsuario` | lê `users.perfil_*`, `perfil_aluno`, `perfil_professor` para criar a pessoa; `resolverOuCriarPessoa` (`:43-`) chama-o |
| `server/db/backfill-pessoas.mjs` | mesmo mapeamento, script avulso (A.2) |
| `server/db/migrations/2026-09-30_b11a_pessoas_de_usuarios.sql:20-39` | lê `users.perfil_*`/`acad_*`/`perfil_aluno` — **não pode ser editada** (checksum) e quebra num banco novo sem essas colunas (§4.12) |
| `server/db/migrate.mjs:137` | semeia `users.json` (formato `perfil_geral`…) pelo `usersRepo` |
| `server/scripts/seedAdmin.js:27-37` | grava `users.json` no formato `perfil_geral`/`dados_academicos` |
| `server/db/schema.sql:13-42` | as colunas; `:344-365` `pessoas` (sem colunas de privacidade, sem `uid_legado`) |

### 3.2 Leituras SQL diretas de `users.perfil_*` / `acad_*` (não passam pelo `usersRepo`)

| Local | Uso |
|---|---|
| `db/identidadeVinculo.js:22-25` `campoPessoa`, `nomePessoa` | `COALESCE(p.x, u.perfil_x)` — **o ponto único** por onde a maior parte abaixo lê |
| `controllers/programasController.js:106-118,141-145` (`VINCULOS_JOIN_SELECT`) | seleciona `u.perfil_nome/cpf/siape/telefones` como reserva |
| `programasController.js:607-610` (`membrosDoPrograma`) | `campoPessoa('foto_url','perfil_foto_url')`, Lattes, ORCID, Scholar — **páginas públicas de docentes/discentes** |
| `controllers/programaPublicoController.js:25` | `campoPessoa('lattes','acad_lattes')` (público) |
| `controllers/contatosController.js:28-32` | agenda: `u.perfil_nome`, `u.perfil_foto_url` |
| `controllers/gruposPesquisaController.js:20` | líderes: `u.perfil_nome` |
| `controllers/painelController.js:90`, `qualidadeController.js:63` | `COALESCE(pe.nome, u.perfil_nome)` |
| `controllers/buscaController.js:29` | **Ctrl+K: a busca de usuários** é `FROM users` com `perfil_nome` (título, coluna de busca e ordem) |
| `controllers/importacoesController.js:173`, `db/revisoesRepo.js:52` | nome de quem executou/salvou (`u.perfil_nome`) |
| `controllers/usersController.js:105` (`getUsersResumo`) | `COALESCE(NULLIF(btrim(perfil_nome),''), email)` — alimenta o "editado por" de todas as telas |
| `controllers/proficienciaController.js:128` (`verificarAluno`) | compara o nome digitado com `users.perfil_nome` |
| `db/estruturaPrpg.js:70,140` | `pessoaPorNome` procura também em `users.perfil_nome`; membros da estrutura usam `u.perfil_nome/perfil_foto_url` |
| `db/posDoutoradoRepo.js:23-26,82-83` | reserva de nome/CPF/telefone do login |
| `services/planilhas/cadastro.js:199` | **índice de identidade dos importadores da Fase O** (`COALESCE(p.nome, u.perfil_nome)`, `COALESCE(p.cpf, u.perfil_cpf)`) |
| `services/planilhas/contatosImporter.js:267` | `COALESCE(p.nome, u.perfil_nome)` |
| `db/arquivosUsos.js:35` | **inventário de arquivos**: `users.perfil_foto_url` como uso de um arquivo (há uma linha idêntica para `pessoas.foto_url` em `:36`); com a coluna removida a consulta dessa linha falha e leva junto a Biblioteca de Mídia |

### 3.3 Leituras/gravações pelo formato da API (`perfil_geral`, `dados_academicos`)

| Local | Uso |
|---|---|
| `controllers/authController.js:35` | `nome` do login: `user.perfil_geral?.nome \|\| user.email` |
| `controllers/minhaContaController.js:83-89,133-142,156-159` | lê nome, CPF (mascarado), SIAPE, telefones (array), Lattes/ORCID/Scholar; grava telefones e links **via `usersRepo.update`** |
| `controllers/usersController.js:60,74,152,166,225-228,313-314` | ordenação/busca da lista, checagem de CPF duplicado, criação e merge do `PUT` |
| `controllers/proficienciaController.js:150-151` | nome e CPF pré-preenchidos da inscrição |
| `db/pessoaDoUsuario.js:15-26,80` | mapa campo → valor do usuário |
| 3 importadores (§3.5) | montam `perfil_geral`/`dados_academicos` ao criar `users` |

### 3.4 `perfil_aluno` / `perfil_professor`: quem lê, quem escreve

**Leitores de regra de negócio — só três:**
- `proficienciaController.js:66` `nivelDoCadastro` lê `perfil_aluno.nivel`; `:153` lê `perfil_aluno.estrangeiro`
  (define se a língua obrigatória é o português).
- `programasController.js:692-697` `removeDocente` mantém `perfil_professor.programas` em dia.
- `usersController.js:185-193,279-283` exige `perfil_professor.programas` não vazio (400) para quem tem o papel
  Professor, no cadastro e na edição.

**Escritores:** `AdminUserForm.jsx` (formulário), os importadores de alunos e de professores, `createUser`
(`:185,227-228`) e `removeDocente`.

**Leituras de importador por chave:** `alunosImporter.js:120` (`perfil_professor->>'uid_legado'` → orientador),
`tesesImporter.js:96-97` (`perfil_aluno`/`perfil_professor ->> 'uid_legado'` → autor da tese).

**Nenhum código operacional lê `entrada`, `situacao`, `qualificacao`, `defesa`, `orientador_id`, `egresso`,
`tipo`/`tipo_professor`, `origem_import`** — só o formulário (que edita) e os importadores (que gravam). São
dado que existe e não alimenta nada.

### 3.5 Importadores legados (ativos, em "Importar usuários")

| Arquivo | O que faz com o modelo antigo |
|---|---|
| `services/importers/alunosImporter.js:158-170,184,214,231-237` | cria `users` (senha `Mudar123`, e-mail sintético se faltar) com `perfil_geral`, `dados_academicos`, `perfil_aluno`; decide o papel do vínculo por `situacao`/`egresso` (`:126-131`); o mesmo registro vira `users` **e** vínculo |
| `services/importers/professoresImporter.js:133,147-149,172-178` | idem para professores; `perfil_professor.programas`; `tipo` |
| `services/importers/tesesImporter.js:90-101,124-130` | resolve o autor por `uid_legado` **global** e vai de `users.id` a `pessoa_id` |

Os três criam **login** para quem no modelo-alvo não deveria ter (`arquitetura-dados.md` §5.1: "nada de
e-mail falso ou senha fictícia").

### 3.6 Front-end (`src/`)

O painel consome o formato antigo da API em **10 arquivos** (mais 2 telas públicas com código morto e 1 teste). Nenhuma tela lê `users.id` de outro
jeito que não o do login.

| Arquivo | Campos |
|---|---|
| `pages/admin/AdminUserForm.jsx` | **todos**: `perfil_geral` (nome, CPF, SIAPE, telefones[]), `dados_academicos`, `privacidade`, `perfil_aluno` (nivel, entrada, situacao, qualificacao, defesa, estrangeiro, nacionalidade), `perfil_professor` (`tipo_professor`, programas[], estrangeiro, nacionalidade); `emptyAluno`/`emptyProfessor` (`:19-20`) |
| `pages/admin/AdminUsersList.jsx:17,45,72` | nome e a coluna "Visibilidade" (`privacidade.perfil_publico`) |
| `pages/admin/AdminBolsaForm`, `AdminDisciplinaForm`, `AdminGrupoPesquisaForm`, `AdminTeseForm` | `perfil_geral?.nome` em seletores de pessoa (`GET /api/users`) |
| `pages/admin/AdminProgramaForm.jsx:229-233,724,967,1001`, `AdminProgramaPessoas.jsx:53,85,303`, `AdminProgramaComissoes.jsx:43,100` | nome, CPF, SIAPE, telefones; `AdminProgramaPessoas.jsx:85` **cria usuário** com `perfil_geral` |
| `components/AuditInfo.jsx:10` | nome (vem de `/api/users/resumo`, já plano) |
| `pages/programa/ProgramaComissoes.jsx:16-17`, `ProgramaSobre.jsx:58` | `perfil_nome`/`perfil_foto_url` como reserva — **código morto** (a API pública já devolve `nome`/`foto_url`) |
| `pages/conta/ContaDados.jsx` | usa o formato **próprio** de `/api/minha-conta` (`telefones[]`, `lattes`, `googleScholar`, `privacidade.mostrarEmail`) — desacoplado do `perfil_geral` |

Seletores de pessoa só oferecem quem **tem login** (vêm de `/api/users`); as 56 pessoas sem login só existem
para a estrutura, a agenda e as planilhas.

### 3.7 Testes

- Servidor: **72 linhas em 19 arquivos**, quase todas via API/`seedUser`/`usersRepo` no formato
  `perfil_geral` (`gestor_programa` 18, `vinculosPessoa` 11, `legado` 7, `helpers` 4). SQL cru em coluna:
  `migracoesB11.test.js:35` (`acad_lattes`), `robustez.test.js:83` (`INSERT INTO users … perfil_nome, perfil_cpf`),
  `vinculosPessoa.test.js:168-173` (`perfil_professor`), `users.test.js:64`.
- `migracoesB11.test.js` executa a migração A (que lê `perfil_*`) contra o banco de teste, criado de `schema.sql`.
- Front: `vinculosUsuario.test.jsx:14-15` (`perfil_geral.nome`).
- `server/__tests__/globalSetup.js` cria o banco de teste **só do `schema.sql`** — não roda as migrações.

### 3.8 Pendurado em `users.id` fora do perfil

- `user_linhas_pesquisa` (PK `user_id` → `users`, CASCADE): linhas de pesquisa são da **pessoa**, mas ficam
  penduradas no login (`repositories.js:632-649`, `usersController.js:130,242,325`, os dois importadores).
  Quem não tem login não pode ter linhas.
- `users.programa_id` (90/91 preenchidos) tem **dois sentidos**: o programa que o `GestorPrograma` administra
  (alvo da arquitetura) **e** o "programa dono" de alunos e professores, que decide se o gestor pode editar o
  cadastro (`usersController.js:263`, `requireProgramaOwnership` em `adminRoutes.js:309`,
  `repositories.js:340`).
- FKs de auditoria para `users.id` (`arquivos.enviado_por`, `eventos.criado_por`, `revisoes.autor`, …): **não
  mudam** — `users.id` continua sendo o ator.

## 4. Achados que mudam o plano (o que os documentos não diziam, ou dizem diferente)

1. **`vinculos.dados` não existe.** A A.2a decidiu (`arquitetura-dados.md` §5.1) que o estruturado vai para
   `vinculos.dados JSONB`, mas a coluna nunca foi criada (conferido em `information_schema`). A A.2 marcou `[x]`
   sem ela.
2. **`nivel → papel` perde informação no egresso.** `EGRESSO` não diz se foi Mestre ou Doutor; hoje essa
   informação só existe em `perfil_aluno.nivel` (36 alunos). Precisa de um lugar (`vinculos.dados.nivel`, ou
   papéis novos).
3. **`perfil_professor.tipo` × `tipo_professor`**: o importador grava `tipo`; o formulário edita
   `tipo_professor`; ninguém lê nenhum dos dois. As edições do formulário vão para uma chave que nada consome.
   `Visitante` (opção do formulário, papel `DOCENTE_VISITANTE` no vocabulário) não está em `PAPEIS_DOCENTE`
   (`programasController.js`), então um visitante **nunca aparece** nas listas de docentes.
4. **`perfil_professor.programas` pode divergir dos vínculos na produção.** No dev é idêntico porque só o
   importador escreveu; mas o formulário grava o array sem criar vínculo (só `papelVinculo` cria), e
   `removeDocente` só o mantém quando há login. A regra "professor precisa de ≥1 programa" (400) valida o
   **array**, não os vínculos.
5. **`orientador_id` guarda `users.id`, não `pessoas.id`** (`alunosImporter.js:115-123` resolve o uid do
   Drupal para o `users.id` do professor). Resolve em 48/48 no dev, então dá para migrá-lo para uma pessoa
   (`users.pessoa_id`). *(A primeira versão desta análise dizia que eram órfãos — erro de medição: uma coluna sem
   qualificador numa subconsulta sobre `users` comparava o professor com ele mesmo. Corrigido pela pré-verificação da Task 0.)*
6. **`estrangeiro`/`nacionalidade`/`sexo` já têm coluna em `pessoas`, mas só são copiados na criação**
   (`criarPessoaDeUsuario`, migração A). `pessoaDoUsuario.CAMPOS` não os inclui: editar "Aluno estrangeiro" no
   formulário muda `perfil_aluno`, **não** `pessoas`. A proficiência lê `perfil_aluno.estrangeiro` — fonte que
   hoje é a do formulário. O formulário **não tem** campo de sexo.
7. **`qualificacao` = `2020-10-29` em 69 de 73 alunos**: valor suspeito de padrão da importação. Migrar como
   está pereniza lixo; preciso da sua palavra (§7, D3).
8. **Telefones têm formatos diferentes:** `users.perfil_telefones TEXT[]` (API: array) × `pessoas.telefones
   TEXT` (texto único, separado por `, `). O `/minha-conta` aceita até 5 telefones de até 30 caracteres.
   Lossy só se um telefone tiver vírgula (não há nenhum no dev).
9. **Privacidade está quebrada e ineficaz:**
   - `perfil_publico` e `mostrar_lattes` (formulário, `AdminUserForm.jsx:21,410`) **não têm coluna**: nunca
     são gravados; a coluna "Visibilidade" da lista (`AdminUsersList.jsx:72`) mostra "Privado" para todos.
   - `mostrar_email`/`mostrar_telefone` são gravados (`priv_*`), mas **nada os consulta** fora de
     `/minha-conta`: o site público não respeita a escolha da pessoa. (A nota B.6 do `PLANO.md` já prevê que a
     privacidade migre para `contatos.publico`.)
10. **Seria preciso decidir o destino de `uid_legado`/`origem_import`:** o `uid` é do Drupal **de cada site**
    (PROFIAP, outros programas), logo é chave da importação (origem + uid), não da pessoa — e a resolução de
    autor de tese (`tesesImporter.js:96`) é global, então com um segundo site colidiria. Confirma o destino em
    `vinculos.dados` da arquitetura, **com** a origem.
11. **Fora do escopo, mas sério:** 89 dos 91 usuários do dev têm a senha `Mudar123` com `senha_temporaria =
    false` (os importadores não marcam a flag; só o `createUser` marca). Se a produção foi povoada pelos mesmos
    importadores, há contas reais com senha conhecida que não força troca. Medido com `bcrypt.compare` contra o
    banco de dev, sem tocar nada.
12. **A migração A (b11a) referencia `users.perfil_*` e roda em banco novo.** O `migrateRunner` aplica **todas**
    as migrações em ordem, inclusive sobre um banco recém-criado do `schema.sql` (não há marca de baseline).
    Quando o `schema.sql` deixar de ter essas colunas, `db:migrate:apply` num banco novo falha na b11a — e ela
    não pode ser editada (checksum). O mesmo vale para `migracoesB11.test.js`.

## 5. O que quebra se fizer de uma vez

- **Dropar as colunas primeiro:** `usersRepo.create/update` falham no INSERT/UPDATE (`toRow` grava todas as colunas);
  as consultas do §3.2 quebram (inclusive a busca Ctrl+K, o "editado por" das telas e o índice dos importadores); `arquivosUsos.js` passa a
  listar fotos de usuário como "sem uso".
- **Trocar o formato da API de uma vez:** 10 arquivos do painel + o teste do front; o formulário de usuário e os 6
  seletores de pessoa ficam vazios/`undefined` sem erro visível.
- **Mover `perfil_aluno`/`perfil_professor` sem vínculo:** aluno sem vínculo (formulário do administrador sem
  `papelVinculo`) perderia a entrada/situação/defesa; `estrangeiro` deixaria de chegar à proficiência;
  professor novo sem vínculo deixaria de passar na regra "≥1 programa".
- **Tirar a cópia sem resolver a leitura:** páginas públicas de docentes/discentes (`membrosDoPrograma`), agenda
  e estrutura mostram nome/foto/Lattes só do que `pessoas` tiver — hoje idêntico no dev, **mas não garantido na
  produção**.
- **`DELETE`/`UPDATE` de usuário com a cópia removida e o sync mantido:** `pessoaDoUsuario` tenta ler campos
  que não existem e grava lixo.

## 6. Ordem segura (cada passo funciona com o dado antigo e o novo, como na B.11)

Princípio: **a API de usuários não muda de formato no início** (o `usersRepo` passa a montar `perfil_geral`,
`dados_academicos`, `perfil_aluno`, `perfil_professor` a partir de `pessoas` e dos vínculos). Assim o painel, os
seletores e quase todos os testes seguem como estão, e as colunas de `users` ficam inertes antes de serem
removidas.

1. **Pré-verificação na produção** (`docs/operations/g1-pre-verificacao.sql`, somente leitura): divergência
   `users` × `pessoas` por campo, chaves/valores dos JSONB, `programas` × vínculos, alunos sem vínculo, pessoas
   duplicadas por CPF, `orientador_id` que não resolve, contas com senha padrão. Sem isso, nenhum passo de dado.
2. **Migração C (aditiva) + código espelhado.** Cria o que falta: `vinculos.dados JSONB`, as colunas de
   privacidade e o que as decisões do §7 pedirem. Preenche a partir de `users.perfil_*` (mesmo estilo da
   migração A: o usuário vence, só preenche o vazio onde `pessoas` for mais nova). **Nada lê o novo ainda.**
   Teste: contagens iguais antes/depois; idempotente.
3. **Escritas em dupla:** `usersRepo.create/update` gravam em `pessoas` (incluindo sexo/nacionalidade/
   estrangeiro e privacidade) e em `vinculos.dados`, **além** de manter a cópia em `users`. Importadores
   passam a gravar `vinculos.dados`/`pessoas` direto. Regra "≥1 programa" passa a olhar os vínculos.
4. **Virada das leituras:** `usersRepo` (`getAll`, `getById`, `findByEmail`, `findByCpf`, `getScoped…`) passa a
   `SELECT u.*, p.* FROM users u JOIN pessoas p` e `userFromRow` lê de `pessoas`; `identidadeVinculo.campoPessoa`/
   `nomePessoa` perdem a reserva em `users`; os SQLs do §3.2 passam a `p.nome` etc.; proficiência lê `nivel`/
   `estrangeiro` do vínculo e da pessoa; `removeDocente` para de mexer em `perfil_professor.programas`; as duas
   buscas por `uid_legado` passam a `vinculos.dados` **com origem**. Teste decisivo: um teste de "retrato" de
   `GET /api/users`, `/api/users/:id`, `/api/minha-conta` e das páginas públicas antes × depois — idênticos.
   Escritas em dupla continuam (volta atrás seguro).
5. **Fim da cópia:** `usersRepo` para de gravar `perfil_*`/`acad_*`/`priv_*` em `users`;
   `pessoaDoUsuario.js` e a propagação somem; `criarPessoaDeUsuario`/`backfill-pessoas.mjs` são reescritos (a
   pessoa nasce primeiro; `users.pessoa_id` passa a `NOT NULL`); `arquivosUsos.js` perde a linha de `users`.
   Verificação: consulta "a cópia ainda é igual à fonte?" para provar que não havia nada só em `users`.
6. **Migração D (remoção):** `DROP COLUMN` das 13 colunas e dos 2 JSONB + `schema.sql` no estado final. Só
   depois de resolver o §4.12 (baseline do `migrateRunner` **ou** reescrever o teste e adiar a remoção).
7. **Arremates:** `user_linhas_pesquisa` por `pessoa_id` (se a D7 pedir), limpeza de código morto
   (`ProgramaComissoes`/`ProgramaSobre`), `CLAUDE.md`, `PLANO.md`, `arquitetura-dados.md`.

Cada passo é um commit verde (`npx vitest run` + `npm run test:front`); as mudanças de tela (AdminUserForm,
Visibilidade) são conferidas no navegador.

## 7. Decisões em aberto (com recomendação)

> **Respondidas em 30/09/2026:** **D1** manter o formato da API; **D2** remover as colunas, como último commit,
> com baseline no `migrateRunner`; **D3** mapeamento aprovado como proposto (refinado no plano: o 400 de "aluno sem
> vínculo" só vale para dado de vínculo de verdade, porque o formulário envia defaults); **D7** incluir
> `user_linhas_pesquisa`, antes da remoção das colunas. **D4, D5, D6** seguiram a recomendação (não foram
> perguntadas); **D8** e **D9** ficam fora. O achado §4.11 (senha padrão) virou tarefa separada.

**D1 — Formato da API de usuários.** (a) **manter** `perfil_geral`/`dados_academicos`/`perfil_aluno`/
`perfil_professor`, montados a partir de `pessoas`; (b) renomear já (`pessoa: {…}`, `vinculo.dados`).
*Recomendo (a).* Custo de (b): 10 arquivos do painel + testes, sem ganho funcional; o rename entra depois
junto de uma tela de pessoas. Em (a) o front e as ~70 linhas de teste não mudam.

**D2 — As colunas de `users`: remover ou só deixar de usar?** (a) remover (passo 6) e ensinar o
`migrateRunner` a **adotar o `schema.sql` como baseline** (num banco sem `schema_migrations` e com `users`,
marcar as migrações existentes como aplicadas sem rodá-las); (b) deixar de usar e manter as colunas por um
ciclo, removendo depois. *Recomendo (a)*, mas com a remoção como **último commit**, separado, para poder parar
no passo 5 se a pré-verificação da produção mostrar surpresa. (b) deixa a cópia "morta" mas ainda legível —
é o que a D-B11b chamou de "até o fim da G1", sem acabá-la.

**D3 — Destino de cada chave de `perfil_aluno`/`perfil_professor`** (confirmar ou corrigir a A.2a, à luz do
§4):

| Chave | Proposta |
|---|---|
| `sexo`, `estrangeiro`, `nacionalidade` | `pessoas` (já existem); passam a ser propagados |
| `nivel` | **duas partes:** matriculado → já é o papel do vínculo; **egresso → `vinculos.dados.nivel` (`MESTRADO`/`DOUTORADO`)**, porque o papel `EGRESSO` perde o nível (§4.2) |
| `tipo`/`tipo_professor` | papel do vínculo (`DOCENTE_*`); incluir `DOCENTE_VISITANTE` em `PAPEIS_DOCENTE` |
| `programas[]` | some: um vínculo por programa (já é a fonte de verdade) |
| `entrada`, `situacao`, `defesa`, `egresso` | `vinculos.dados` |
| `qualificacao` | `vinculos.dados`, **descartando o valor `2020-10-29` repetido** (perguntar se é placeholder) |
| `orientador_id` | **converter** para `vinculos.dados.orientador_pessoa_id` (via `users.pessoa_id` do professor); o texto cru só é guardado em `orientador_legado` quando **não** resolve |
| `uid_legado`, `origem_import` | `vinculos.dados` (par origem + uid), busca de autor/orientador por origem |
| aluno **sem vínculo** | exigir vínculo para gravar dados de vínculo (400 com mensagem), em vez de criar um "vínculo fantasma" |

**D4 — Privacidade.** (a) colunas `pessoas.priv_mostrar_email/telefone` (cópia literal, sem mudar
comportamento), (b) migrar para `contatos.publico` (caminho da nota B.6). *Recomendo (a) agora* e **remover do
formulário `perfil_publico` e `mostrar_lattes`** (nunca persistiram). Fazer o site público **respeitar** as
flags é item próprio (LGPD): decisão **D-R2** do encarregado de dados, fora desta sessão.

**D5 — Telefones.** Manter `pessoas.telefones` (texto, `, `) e a API em array (split/join); mover para
`contatos` fica com a B.6/Fase G. *Recomendo manter.*

**D6 — `users.programa_id`.** *Recomendo não mexer* nesta sessão: é o programa do GestorPrograma **e** a posse
que autoriza edição; separar os dois sentidos (derivar a posse dos vínculos) é decisão de permissão, item próprio.

**D7 — `user_linhas_pesquisa`.** (a) incluir no passo 7 (coluna `pessoa_id`, PK e FK para `pessoas`,
backfill, 4 pontos de código); (b) deixar pendurada em `users`. *Recomendo (a)* — sem isso `users` **não**
fica só credencial — como último passo, separável.

**D8 — Quem deveria ter login.** Os importadores criam `users` para todos (15 com e-mail sintético). *Recomendo
não tratar nesta sessão* (mudaria o que o importador produz e o fluxo de "Importar usuários"), mas registrar o
item e **antes** tratar o §4.11 (forçar troca de senha nas contas com senha padrão) — é segurança, independe
da G1.

**D9 — Tela para editar pessoa sem login.** Hoje só Estrutura (nome/foto dos membros) e planilhas. O formulário
de usuário continuará editando login + pessoa juntos. *Recomendo deixar a tela de pessoas para depois.*

## 8. Implantação (produção) e reversão

1. Rodar a pré-verificação do passo 1 numa **cópia** do banco de produção; guardar as contagens (campos
   divergentes, chaves dos JSONB, `programas` × vínculos).
2. Deploy dos passos 2–3 + `npm run db:migrate:apply` (migração C, aditiva). Conferir as páginas de programa e
   "Meus dados".
3. Deploy do passo 4 (virada de leitura). Conferir o retrato das rotas e, no navegador, AdminUserForm,
   lista de usuários, /minha-conta e uma página de programa.
4. Deploy do passo 5 (fim da cópia); rodar a consulta de igualdade.
5. Deploy do passo 6 (migração D) **só depois** de alguns dias sem achados.

**Reversão:** até o passo 5 a cópia em `users` continua válida (escritas em dupla), então voltar o código
basta. A migração D é *forward-only*: o backup (`docs/operations/backup-restore.md`) deve ser tirado antes.

## 9. Fora do escopo

- Senhas padrão (§4.11) e a política dos importadores (D8).
- Honrar a privacidade no site público (D4).
- Tela de pessoas, mesclagem de duplicadas, renomear a API (D1, D9).
- Migrar e-mails/telefones para `contatos` (B.6/Fase G).
