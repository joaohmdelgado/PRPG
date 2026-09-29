# Análise — B.3: fechar a FK real de `vinculos.pessoa_id`

**Preparado em:** 29/09/2026, a partir de leitura de código (`server/db/schema.sql`,
`server/controllers/`, `server/services/`, `server/__tests__/`) na worktree
`fk-vinculos-pessoa-b3`. Não implementa nada — é o levantamento para decidir *se* e *como*
fazer B.3.

## 1. O que é o problema, em uma frase

`vinculos.pessoa_id` (e `camara_relatorias.relator_id`, mesmo padrão) é uma coluna `TEXT` sem
FK, porque hoje ela guarda **ora um `users.id`, ora um `pessoas.id`**, e o código decide qual é
qual só na hora de ler — nunca há uma constraint garantindo que o valor gravado aponta pra algo
que existe.

Isso não é um acidente: é uma dívida técnica assumida conscientemente na Fase A (o comentário no
schema já avisa) porque `pessoas` como identidade única ainda não existia quando a maior parte do
código de vínculos foi escrita. A Fase A.2 criou `pessoas` e ligou `users.pessoa_id` a ela, mas
não migrou os consumidores de `vinculos`.

## 2. Estado atual — como o polimorfismo se manifesta

```sql
-- schema.sql:400-409
CREATE TABLE IF NOT EXISTS vinculos (
  id              TEXT PRIMARY KEY,
  programa_id     TEXT REFERENCES programas(id) ON DELETE CASCADE,
  -- pessoa_id é polimórfico: aponta para users.id OU pessoas.id (legado),
  -- resolvido na aplicação. FK real fica para a Fase B.3 ...
  pessoa_id       TEXT,
  ...
```

O mesmo vale para `camara_relatorias.relator_id` (schema.sql:1040-1041, comentário idêntico).

Hoje **nenhuma das duas colunas tem qualquer FK** — um `pessoa_id`/`relator_id` pode apontar para
nada (string arbitrária) sem o banco reclamar. `usersController.deleteUser` até comenta isso
explicitamente ao limpar manualmente (ver §5).

### Por que existem duas convenções

- **`users.id`** — quando quem ocupa o vínculo tem login no sistema (coordenador, docente,
  membro de comissão cadastrado via formulário admin). O padrão desde a Fase A original.
- **`pessoas.id`** — quando quem ocupa o vínculo *não* tem login (relator externo, contato
  importado da planilha, membro de estrutura só histórico) ou quando o código foi escrito depois
  da Fase A.2 e já nasceu "do jeito certo".

## 3. Inventário completo

### 3.1 Onde se escreve `users.id` em `pessoa_id`/`relator_id` (o problema)

| Local | Função | Chamado por |
|---|---|---|
| `server/controllers/usersController.js:27-33` | `vincularAoPrograma()` | `createUser` (linha 234) |
| `server/controllers/programasController.js:355-361` | `insertVinculo()` | `handlePessoaVinculo` (315-353) — coordenador/substituto/TAE |
| `server/controllers/programasController.js:684-689, 819-823, 889-893` | `addDocente`, `addDiscente`, `addComissaoMembro` | `req.body.pessoa_id` direto do cliente |
| `server/services/importers/professoresImporter.js:79-96` (`garantirVinculo`) | chamada em 151/186 com `existente.id`/`created.id` | importador de professores (legado, pré-Fase O) |
| `server/services/importers/alunosImporter.js:137-153` (`garantirVinculo`) | chamada em 216/240 | importador de alunos (legado, pré-Fase O) |
| `server/controllers/camaraController.js:294-309` (`addRelatoria`) | — | `req.body.relatorId` direto do cliente, **sem nenhuma resolução** |
| `server/controllers/gruposPesquisaController.js:41-50` (`substituirLideres`) | — | `req.body.liderIds` direto do cliente; o próprio comentário na linha 40 admite a ambiguidade |

`addRelatoria` e `substituirLideres` são os dois piores casos: nem sequer decidem entre
`users.id`/`pessoas.id` — só gravam o que o formulário mandar, cru.

### 3.2 Onde já se escreve `pessoas.id` (o caminho certo, já em produção)

Tudo que passa por `pessoas.porNome`/`porEmail`/`criar` (`server/services/planilhas/cadastro.js`)
ou por `resolverOuCriarPessoa` (`server/db/pessoasRepo.js:45-65`, que cria uma `pessoas` sob
demanda a partir de um `users.id` se precisar):

- `server/services/planilhas/contatosImporter.js:257-284` (G.4)
- `server/services/planilhas/camaraImporter.js:160-167`
- `server/services/planilhas/pnpdImporter.js:108-130`
- `server/db/estruturaPrpg.js:66-91` (`pessoaPorNome`/`adicionarMembro`)
- `server/db/posDoutoradoRepo.js:119-125` (via `resolverOuCriarPessoa`)

Ou seja: **todo o código escrito na Fase O (os 4 importadores de planilha) já segue a convenção
correta.** Só o código mais antigo (Fase A/D, os dois importadores legados de julho e os
controllers de programas/câmara/grupos) grava `users.id` ou aceita qualquer coisa do cliente.

### 3.3 Onde se lê e resolve (o polimorfismo se paga na leitura)

Todos seguem a forma `LEFT JOIN users u ON u.id = v.pessoa_id` + `LEFT JOIN pessoas p ON p.id =
v.pessoa_id`, mas **a ordem de prioridade não é consistente entre módulos** — achado
independente, relevante por si só:

| Local | Quem "ganha" quando os dois casam (não deveria acontecer, mas o código previne) |
|---|---|
| `programasController.js` `combinedFromRow` (98-152) | `users` |
| `contatosController.js` `AGENDA_SELECT` (21-42) | `users`, com fallback em cadeia (`up.id, p.id, u.id`) |
| `gruposPesquisaController.js` `listarLideres` (15-37) | `users` |
| `posDoutoradoRepo.js` `fromRow`/`JOIN_SELECT` (17-22, 73-91) | `users` |
| `estruturaPrpg.js` `carregarEstrutura` (135-147) | `pessoas` |
| `server/services/prazos.js` `resolverPessoa`/`resolverEmail` (23-38) | `pessoas` |

Dois pontos leem sem resolver nada, assumindo direto `pessoa_id = users.id`:

- `camaraController.js` `getMeusProcessos` (157-168) — `WHERE r.relator_id = $1` contra
  `req.user.id`.
- `proficienciaController.js` `verificarAluno` (121-130) — `JOIN vinculos v ON v.pessoa_id = u.id`.

E um ponto lê os **dois IDs em paralelo**, sem tentar decidir: `minhaContaController.js` (34-73)
monta `ids = [user.id, user.pessoaId]` e busca `v.pessoa_id = ANY($1)` / `r.relator_id = ANY($1)`
— a solução mais defensiva já existente no código, mas que só funciona porque não depende de FK.

O próprio `programasController.js` (comentário nas linhas 98-106) já documenta que apertar a FK
exige migrar `handlePessoaVinculo`/`insertVinculo` e o `JOIN` de `proficienciaController.js` — ou
seja, **o time já sabia o escopo mínimo antes deste levantamento**; este documento amplia essa
lista para o resto da base.

### 3.4 Limpeza ao excluir usuário

```js
// server/controllers/usersController.js:333-334
// Limpa órfãos: vinculos não têm FK em pessoa_id (polimórfico), então remove manually.
await query('DELETE FROM vinculos WHERE pessoa_id = $1', [req.params.id]);
```

Isso só apaga vínculos que guardam `users.id` — os que já apontam para `pessoas.id` (importados
pela Fase O, por exemplo) **não são tocados**, o que é provavelmente correto (a pessoa continua
existindo mesmo sem login), mas não está documentado como intencional, só acontece por
consequência do WHERE.

`camara_relatorias.relator_id` **não tem limpeza nenhuma** — excluir um usuário que foi relator
de algum processo deixa `relator_id` apontando para um id que não existe mais em lugar nenhum.
Hoje isso não quebra nada porque não há FK; com FK, esse dado morto já teria impedido o DELETE ou
precisaria de um `ON DELETE` explícito.

Efeito colateral relevante: `users.pessoa_id` tem `ON DELETE CASCADE` (schema.sql:375-376) — ou
seja, excluir um `users` que já tem `pessoas` vinculada **já apaga a `pessoas` em cascata hoje**,
antes mesmo de qualquer mudança em `vinculos`. B.3 não cria esse comportamento, mas qualquer
migração de `vinculos.pessoa_id` para `pessoas(id)` herda esse cascade — apagar um usuário pode
passar a apagar (ou órfão, dependendo do `ON DELETE` escolhido) os vínculos dele também,
diferente do comportamento manual atual.

### 3.5 `backfill-pessoas.mjs` — nem todo usuário tem `pessoas` hoje

`server/db/migrate.mjs:14,163` chama `backfillPessoas()` ao final da carga inicial — então todo
usuário que existia **na última vez que alguém rodou `npm run db:migrate`** tem uma `pessoas`
correspondente.

Mas `usersController.createUser` **não chama** `resolverOuCriarPessoa` nem nada equivalente
(confirmado por leitura direta do arquivo — só grava em `users` e chama `vincularAoPrograma` com
o `users.id` cru). Ou seja: **todo usuário criado pelo painel depois do último `db:migrate` fica
sem `pessoas` até alguém rodar o backfill manualmente de novo.** Isso é consistente com o
comentário em `contatosController.js` ("nem sempre presente, ex. em testes") e com o próprio
`resolverOuCriarPessoa` existir — o código já convive com essa lacuna, criando a `pessoas` sob
demanda onde precisa.

**Implicação direta para B.3:** não dá para simplesmente rodar o backfill uma vez e apertar a FK.
Qualquer caminho de escrita que hoje grava `users.id` (§3.1) precisa passar a resolver/criar a
`pessoas` correspondente **no momento da escrita**, senão o problema volta a aparecer a cada
usuário novo.

### 3.6 Precedente já aplicado no próprio código

`teses_dissertacoes.autor_pessoa_id` é literalmente a mesma migração, já feita:

```sql
-- schema.sql:662-665
-- Fase D (Legado Drupal, PLANO.md): field_* renomeados; field_autor (que já
-- guardava um users.id) virou autor_pessoa_id de verdade, com orientador_pessoa_id
-- novo (não existia no Drupal)...
```

Outras colunas já limpas, sem polimorfismo, todas via `resolverOuCriarPessoa`/`pessoas.porNome`:
`eventos.pessoa_id` (383-390, `ON DELETE SET NULL`), `atos.solicitante_pessoa_id`/
`interessado_pessoa_id` (506, 512), `processos.interessado_pessoa_id` (966),
`disciplinas.docente_pessoa_id` (691-704), `pos_doutorados.supervisor_id`/`cossupervisor_id`
(1080-1081), `declaracoes.pessoa_id` (618-624, com `emitida_por` como FK **separada** para
`users(id)` — um precedente de "duas colunas, uma por identidade" em vez de uma coluna
polimórfica).

Conclusão: **B.3 não é um problema novo a resolver do zero — é aplicar, nos lugares que
sobraram, o mesmo padrão que o resto da base já usa.**

## 4. O que quebra mecanicamente se só apertar a FK (sem migrar o código)

Não é hipotético — os testes atuais já inserem valores que violariam a constraint:

- **`server/__tests__/minhaConta.test.js:90-91`** — `INSERT INTO camara_relatorias (..., relator_id, ...) VALUES (..., 'prof-1', ...)`, onde `'prof-1'` é um `users.id` seedado, não uma `pessoas.id`. Uma `FOREIGN KEY (relator_id) REFERENCES pessoas(id)` faria esse INSERT falhar na hora.
- **`server/__tests__/acabamento.test.js:54-64`** (teste "L.4 meus processos") — mesmo padrão, `relator_id = 'admin-test'` (o `users.id` do admin seedado), testando exatamente o caminho `getMeusProcessos` que hoje compara direto com `req.user.id`.
- Qualquer chamada real a `POST /api/users` (cria vínculo com `users.id` cru), `POST
  /api/camara/processos/:id/relatorias` (`addRelatoria`, client-controlled) ou
  `PUT /api/grupos-pesquisa/:id/lideres` (`substituirLideres`) em produção.

Ou seja: **apertar a FK amanhã, sem tocar em código, derruba a suíte de testes e quebra `POST
/api/users` na primeira chamada.** Não é uma migração segura de se fazer isolada.

## 5. Plano de migração proposto (ordem sugerida, não implementado)

1. **Backfill de segurança** — rodar `backfillPessoas()` de novo antes de qualquer mudança de
   schema, para reduzir a superfície de usuários sem `pessoas`.
2. **Cobrir os pontos de escrita que faltam** (§3.1) — trocar cada um para resolver via
   `resolverOuCriarPessoa(usersId)` antes de gravar em `vinculos.pessoa_id`/
   `camara_relatorias.relator_id`. Isso já resolve o problema **sem** mudar schema — é o passo
   que reduz risco antes de travar a constraint.
   - `usersController.vincularAoPrograma`
   - `programasController.insertVinculo`/`addDocente`/`addDiscente`/`addComissaoMembro`
   - `camaraController.addRelatoria`
   - `gruposPesquisaController.substituirLideres`
   - `professoresImporter.js`/`alunosImporter.js` (avaliar se ainda estão em uso — são anteriores
     à Fase O; se os importadores de planilha os substituíram de fato, considerar aposentá-los em
     vez de migrar)
3. **Unificar os pontos de leitura** (§3.3) — trocar o `LEFT JOIN` duplo + prioridade
   inconsistente por um `JOIN pessoas` simples em cada um dos 8 locais listados. Isso é
   simplificação pura depois do passo 2 (não deveria mais existir `pessoa_id` que só bate com
   `users`).
4. **Migração de dado** — um script (nos moldes de `backfill-pessoas.mjs`) que percorre
   `vinculos`/`camara_relatorias` existentes, resolve cada `pessoa_id`/`relator_id` que hoje é um
   `users.id` para a `pessoas.id` correspondente (criando se faltar) e faz o `UPDATE`. Roda uma
   vez, antes da constraint entrar.
5. **Adicionar a FK** — `ALTER TABLE vinculos ADD CONSTRAINT ... FOREIGN KEY (pessoa_id)
   REFERENCES pessoas(id)`. Decidir `ON DELETE` (provavelmente `SET NULL`, não `CASCADE` —
   excluir uma pessoa não deveria apagar o histórico de vínculo silenciosamente; ver o precedente
   de `eventos.pessoa_id`). Mesmo tratamento para `camara_relatorias.relator_id`.
6. **Corrigir a limpeza de `usersController.deleteUser`** — hoje é um `DELETE FROM vinculos WHERE
   pessoa_id = $1` manual pensado para `users.id`; com a FK apontando sempre para `pessoas`, esse
   comportamento muda de lugar (a limpeza acontece via `pessoas`, não mais via `users.id` direto)
   — decidir se vínculos devem sumir (`CASCADE`) ou só perder a referência (`SET NULL`) quando a
   pessoa por trás do usuário é removida.
7. **Atualizar os testes que seedam `users.id` direto** (`minhaConta.test.js`,
   `acabamento.test.js`, possivelmente `indicadores.test.js` — conferir) para seedar/linkar uma
   `pessoas` primeiro.

## 6. Decisões em aberto (não são "D-xx" da oficina — são técnicas, mas envolvem escolha)

- **`ON DELETE` da nova FK**: `SET NULL` (preserva o vínculo histórico sem dono) vs. `CASCADE`
  (remove o vínculo junto). Recomendo `SET NULL`, consistente com `eventos.pessoa_id` e
  `declaracoes.pessoa_id`.
- **`professoresImporter.js`/`alunosImporter.js` seguem em uso?** Se os 4 importadores da Fase O
  já cobrem o que esses dois cobriam, migrar pode ser trabalho desperdiçado — melhor confirmar se
  ainda há alguma rota/tela que os chama antes de decidir migrar vs. aposentar.
- **Prioridade de resolução quando os dois IDs coexistem** (users vs. pessoas) hoje é
  inconsistente entre módulos (§3.3) — depois da migração isso deixa de importar (só existirá
  `pessoas.id`), mas vale registrar que essa inconsistência existe *hoje* independente de B.3
  acontecer ou não.

## 7. Estimativa de escopo

- **~11 pontos de escrita** a migrar (2 já são "client-controlled cru", os mais arriscados).
- **~9 pontos de leitura** a simplificar (deixam de precisar do duplo JOIN).
- **1 ponto de limpeza** (`deleteUser`) a redesenhar.
- **1 script de migração de dado** novo.
- **~3 arquivos de teste** com ajuste certo (mais os que a suíte completa acusar depois de rodar
  com a constraint aplicada em `prpg_test`).
- Nenhuma tabela nova; a mudança é só na coluna existente + um `ALTER TABLE ... ADD CONSTRAINT`.

Não é um trabalho de um commit só — dá pra quebrar nos passos 2 → 3 → 4 → 5/6 → 7 da seção 5,
cada um committável e testável isoladamente, com a FK real só entrando no penúltimo passo
(quando o dado já estiver limpo e o código já resolver certo).
