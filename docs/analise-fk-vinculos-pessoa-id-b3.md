# Análise — B.11: FK real de `vinculos.pessoa_id` e `camara_relatorias.relator_id`

**Preparado em:** 29/09/2026, a partir de leitura de código (`server/db/schema.sql`,
`server/controllers/`, `server/services/`, `server/__tests__/`) na worktree
`fk-vinculos-pessoa-b3`.
**Revisado em:** 29/09/2026 — reanálise contra o código em `main` e contra o banco de
desenvolvimento (só consultas de leitura). A revisão corrigiu erros da primeira versão (§8),
ampliou o inventário (a primeira versão cobria cerca de metade das leituras e não olhava o
front-end) e registra as três decisões tomadas pelo usuário (§6).
**Status:** decidido, **não implementado**.

> Nome do item: a primeira versão chamava isto de "B.3", mas a B.3 do `PLANO.md` (apagar
> `buildCombined`) está concluída — a FK ficou como resíduo sem item. Registrado agora como
> **B.11** no `PLANO.md`.

## 1. O problema, em uma frase

`vinculos.pessoa_id` e `camara_relatorias.relator_id` são `TEXT` sem FK porque guardam **ora um
`users.id`, ora um `pessoas.id`**; o código decide qual é qual na hora de ler, e nada garante que o
valor aponte para algo que existe. É dívida assumida na Fase A (comentários em `schema.sql:8-14`,
`:403-409` e `:1040`): `pessoas` virou a identidade na A.2, mas os consumidores de `vinculos` não
foram migrados.

O alvo já está decidido desde a arquitetura (`arquitetura-dados.md` §5.1): **`pessoas` é a pessoa,
`users` é só a credencial** (0..1 por pessoa, `users.pessoa_id UNIQUE`).

## 2. O dado hoje (banco de desenvolvimento, 29/09/2026)

| | aponta para `users.id` | aponta para `pessoas.id` | órfão / nulo |
|---|---|---|---|
| `vinculos` (105 linhas) | **91** — discentes, egressos, docentes, 1 coordenador | 14 — estrutura da PRPG e coordenações | 0 |
| `camara_relatorias` | 0 linhas (a planilha da Câmara ainda não foi importada neste banco) | | |

- Todos os 91 usuários já têm `pessoas` (`users.pessoa_id` preenchido).
- Nenhum `users.id` coincide com um `pessoas.id`; nenhuma pessoa tem vínculo pelos dois ids.
- `pessoas` × `users` do mesmo humano: nomes e fotos batem (1 caso de nome `NULL` × `''`);
  `pessoas.email_institucional` está vazio nos 91 (esperado: o e-mail de login não é e-mail
  institucional, ver §3.5).
- Os 91 vínculos por `users.id` vieram dos importadores legados (§3.1), que **estão ativos**.

**Antes de migrar qualquer ambiente, repetir essas contagens nele** — o banco de produção não
foi consultado.

## 3. Inventário

### 3.1 Escritas que gravam `users.id` (ou o que o cliente mandar)

| Local | O que grava |
|---|---|
| `usersController.js:27` `vincularAoPrograma` ← `createUser` (:234) | `users.id` recém-criado, quando há `papelVinculo` + programa (cadastro por Gestor de Programa ou pelas telas de Docentes/Discentes). `createUser` não cria `pessoas`. |
| `programasController.js:315` `handlePessoaVinculo` / `:355` `insertVinculo` | coordenador, substituto, TAE — `pessoa_id` vindo do formulário (`users.id`) |
| `programasController.js:670` `addDocente`, `:809` `addDiscente`, `:879` `addComissaoMembro` | `req.body.pessoa_id` (o front manda `user.id`) |
| `services/importers/professoresImporter.js:79` e `alunosImporter.js:137` (`garantirVinculo`) | `users.id`. **Ativos**: registrados em `services/importers/index.js`, expostos em "Importar usuários". |
| `camaraController.js:294` `addRelatoria` | `req.body.relatorId` cru, sem resolver |
| `gruposPesquisaController.js:41` `substituirLideres` | `req.body.liderIds` cru, sem resolver |

### 3.2 Escritas que já gravam `pessoas.id`

Os importadores da Fase O (`services/planilhas/contatosImporter.js`, `camaraImporter.js:163`,
`pnpdImporter.js`), `db/estruturaPrpg.js` e `db/posDoutoradoRepo.js` (via
`resolverOuCriarPessoa`). A seed `server/data/vinculos.json` também já usa `pessoas.id` (42/42
casam com `pessoas.json`), então `npm run db:migrate` não é afetado pela FK.

### 3.3 Leituras

**(a) Só consultam `users` — zeram em silêncio quando o id vira `pessoas.id`** (as mais perigosas):

| Local | Efeito se o id mudar sem ajustar a leitura |
|---|---|
| `programasController.js:591` `getProgramaDocentesPublic`, `:742` `getProgramaDiscentesPublic` | páginas públicas de docentes/discentes ficam vazias (`.filter(Boolean)`) |
| `programasController.js:638` `getDocentesAdmin`, `:784` `getDiscentesAdmin`, `:857` `getComissoesAdmin` | nomes viram o id cru |
| `programasController.js:712` `removeDocente` (`usersRepo.getById(pessoa_id)`) | para de sincronizar `perfil_professor.programas` — volta o "programa fantasma" |
| `usersController.js:39` `anexarProgramasVinculo` | todos aparecem como "Sem vínculo" na lista de usuários |
| `repositories.js:324` `getScopedToPrograma`, `:335` `isLinkedToPrograma` | **escopo de acesso do Gestor de Programa** encolhe (falha fechada, mas é regressão de permissão) |
| checagens de duplicidade: `addDocente`/`addDiscente`/`addComissaoMembro`, `garantirVinculo` e `temVinculoDocenteAtivo` dos importadores | deixam de ver o vínculo existente e **criam duplicatas** durante a transição |
| `proficienciaController.js:124` `verificarAluno` | aluno matriculado deixa de ser reconhecido |
| `camaraController.js:157` `getMeusProcessos` (`relator_id = req.user.id`) | ver §3.6 — já está quebrado hoje para relatorias importadas |

**(b) `LEFT JOIN users` + `LEFT JOIN pessoas` pelo mesmo id**, com prioridade inconsistente
(uns preferem `users`, outros `pessoas`): `programasController.js:107` (`VINCULOS_JOIN_SELECT`),
`programaPublicoController.js:23`, `contatosController.js:24`, `gruposPesquisaController.js:15`,
`posDoutoradoRepo.js:73`, `estruturaPrpg.js:139`, `painelController.js:86`,
`services/prazos.js:25` (`resolverPessoa`).

**(c) Já tolerantes às duas chaves** — os modelos para a transição:
- `minhaContaController.js:36`: `ids = [user.id, user.pessoaId]` e `pessoa_id = ANY($1)`.
- `planilhas/contatosImporter.js:266`: `COALESCE(u.pessoa_id, v.pessoa_id) AS pessoa_real`.

**(d) Agregados** que contam `DISTINCT pessoa_id` (contariam a mesma pessoa duas vezes se ela
tivesse vínculo pelos dois ids — no dev, 0 casos): `portalController.js:245`, a view
`indicadores_programa_ano` (`schema.sql:1833`), `micrositeRepo.js:33`. `qualidadeController.js:22-26`
conta vínculos só por `pessoas.id` e hoje **subconta** quem tem login.

### 3.4 Front-end

O painel trata `pessoa_id` como se fosse `users.id`:
- envia `pessoa_id: user.id` (`AdminProgramaForm.jsx:227/458/489/508`, `AdminProgramaPessoas.jsx:60/116`,
  `AdminProgramaComissoes.jsx:50`) e `liderIds` de professores (`AdminGrupoPesquisaForm.jsx`);
- monta "já vinculados" comparando `m.pessoa_id` com `user.id` (`AdminProgramaPessoas.jsx:49`,
  `AdminProgramaComissoes.jsx:40`, `AdminProgramaForm.jsx:962`);
- linka `/admin/users/editar/${m.pessoa_id}` (`AdminProgramaPessoas.jsx:351`);
- usa `pessoa_id` como `value` do `<select>` de usuários do coordenador (`AdminProgramaForm.jsx:715`).

A API precisa devolver também **`usuario_id`** (o id de login, quando houver), e o front migra
para ele nesses pontos. O servidor continua aceitando `users.id` na entrada e resolve para
`pessoas.id` — o front não precisa saber `pessoas.id` para vincular.

### 3.5 Duas cópias dos dados da pessoa

`users` ainda tem `perfil_nome`, `perfil_cpf`, `perfil_siape`, `perfil_foto_url`,
`perfil_telefones`, `acad_lattes/orcid/google_scholar/publons`; `pessoas` tem as mesmas colunas.
**Nenhum código propaga uma edição de `users` para `pessoas`** (`usersRepo.update` é chamado por
`updateUser`, `minhaContaController` — telefones e Lattes/ORCID/Scholar —, `removeDocente` e os
importadores legados); no sentido contrário, `estruturaController.js:136` e `contatosImporter.js:260`
escrevem só em `pessoas`.

Hoje isso quase não aparece porque os 91 vínculos apontam para `users` e a leitura pega de
`users`. No dia em que apontarem para `pessoas`, qualquer edição posterior feita pelo painel ou
pelo `/minha-conta` sumiria do site. E `prazos.resolverPessoa` devolveria
`pessoas.email_institucional` (vazio) em vez do e-mail de login — **as notificações de relatoria e
de mandato parariam de sair sem erro nenhum**. Resolvido pela decisão D-B11b (§6).

O casamento de identidade dos importadores da Fase O (`planilhas/cadastro.js:189`
`carregarPessoas`) usa `COALESCE(p.nome, u.perfil_nome)` — prefere `pessoas`, então também
depende de `pessoas` estar atualizada.

### 3.6 Bug que já existe hoje

`getMeusProcessos` compara `relator_id` com `req.user.id`, mas o importador da Câmara grava
`pessoas.id` (`camaraImporter.js:163`). **Relatorias importadas nunca aparecem em "Meus
processos"**. O `/minha-conta` não tem o problema porque usa `ANY([user.id, user.pessoaId])`.
Corrigido já no passo 1 do plano.

### 3.7 Testes

- 15 arquivos gravam vínculos/relatorias com `users.id` ou chamam as rotas acima:
  `acabamento`, `conexoes`, `contatos`, `entities`, `gestor_programa`, `indicadores`, `legado`,
  `minhaConta`, `painel`, `planilhasImportadores`, `prazos`, `programas`, `programas_microsite`,
  `qualidade` (e `authz`, indiretamente). Exemplos de INSERT direto: `minhaConta.test.js:90`
  (`relator_id = 'prof-1'`), `acabamento.test.js:57` (`'admin-test'`).
- **`resetDb` quebra com a FK**: `RESET_TABLES` (`__tests__/helpers.js:22-29`) apaga `pessoas`
  antes de `vinculos` e `camara_relatorias`. Com `ON DELETE RESTRICT`, todo `beforeEach` falharia.
  A ordem precisa mudar junto com a FK (vínculos e relatorias antes de `pessoas`).
- O admin semeado nos testes precisa ganhar `pessoas`.

### 3.8 Precedentes na base

`teses_dissertacoes.autor_pessoa_id` fez exatamente esta migração na Fase D (`schema.sql:662`).
Outras colunas já com FK para `pessoas`: `eventos.pessoa_id`, `atos.*_pessoa_id`,
`processos.interessado_pessoa_id`, `disciplinas.docente_pessoa_id`, `declaracoes.pessoa_id`,
`pos_doutorados.supervisor_id`.

### 3.9 Relacionado, fora deste item

`inscricoes_proficiencia.aluno_id` (`schema.sql:790`) guarda `users.id` sem FK — a arquitetura
(§2.1) prevê FK para ela também. Não é polimórfica, então não entra aqui; fica como item à parte.

## 4. Por que não dá para "só apertar a FK"

Sem migrar código e dado, a FK derruba a suíte (§3.7), recusa o cadastro de usuário com vínculo,
`addRelatoria` e `substituirLideres`. E migrar o dado sem ajustar as leituras (§3.3a) esvazia as
páginas de docentes/discentes e o escopo do gestor. A ordem do plano (§7) existe para que **cada
passo funcione tanto com o dado antigo quanto com o novo**.

## 5. `ON DELETE` e cascata — como o schema realmente se comporta

`users.pessoa_id REFERENCES pessoas(id) ON DELETE CASCADE` significa: **apagar a pessoa apaga o
usuário**. Apagar o usuário **não** apaga a pessoa. (A primeira versão desta análise dizia o
contrário.) Nenhum código apaga `pessoas` hoje.

## 6. Decisões (29/09/2026)

**D-B11a — `ON DELETE RESTRICT`** nas duas FKs (`vinculos.pessoa_id` e
`camara_relatorias.relator_id` → `pessoas(id)`). Decidido pelo usuário, conforme a recomendação.
Motivo: nada apaga `pessoas` hoje; vínculo ativo sem pessoa não tem sentido (diferente de
`eventos`, que é log e por isso usa `SET NULL`); uma futura ferramenta de mesclar pessoas
duplicadas fica obrigada a repontar os vínculos antes de apagar a duplicata, em vez de perdê-los
em silêncio. Como apagar a pessoa apagaria o usuário em cascata, o `RESTRICT` também protege o
login.

**D-B11b — `pessoas` é a fonte dos dados da pessoa; `users` é cópia legada até o fim da G1.**
O usuário delegou a decisão; esta é a escolha, com o raciocínio:
- É o que `arquitetura-dados.md` §5.1 já decidiu (`users` = credencial). Qualquer outra escolha
  contradiz o alvo e teria de ser desfeita depois.
- Remover agora as colunas `perfil_*`/`acad_*` de `users` seria terminar a G1 inteira (todas as
  telas de usuário, `/minha-conta`, importadores, JWT) — fora do escopo deste item.
- Então, na transição:
  1. **`usersRepo.create`/`update` propagam para a `pessoas` ligada**, na mesma operação — ponto
     único por onde passam todas as edições (painel, `/minha-conta`, importadores legados,
     `removeDocente`). `create` passa a criar a `pessoas` se faltar, o que fecha a lacuna do
     `createUser`.
  2. **Só propaga o campo que mudou no update, e nunca sobrescreve valor preenchido com
     vazio** — assim uma foto posta pela tela de Estrutura (que só grava em `pessoas`) não é
     apagada por uma edição de telefone no `/minha-conta`.
  3. **O e-mail de login fica só em `users.email`** — não é copiado para
     `pessoas.email_institucional` (pode ser pessoal; o institucional vem da planilha de
     contatos). Quem precisa de "um e-mail para falar com essa pessoa" (notificações, agenda) lê
     `COALESCE(p.email_institucional, u.email)` com `users u ON u.pessoa_id = p.id`, que é o
     comportamento de hoje.
  4. **Sem propagação `pessoas → users`.** As leituras de vínculo passam a ler de `pessoas`; as
     telas que ainda leem `users.perfil_*` (lista e formulário de usuário, `/minha-conta`) podem
     ficar desatualizadas quando a edição vier pela Estrutura ou por importação — aceito e
     registrado, some quando a G1 terminar.
  5. **Reconciliação única** dentro do script de migração de dado: preenche em `pessoas` o que
     está vazio lá e preenchido em `users`. No dev a divergência real é nula.

**D-B11c — Excluir usuário mantém os vínculos como histórico.** Decidido pelo usuário.
`deleteUser` deixa de apagar vínculos. A pessoa continua existindo sem login; os vínculos ativos
dela são **encerrados** (`ativo = FALSE`, `data_fim_mandato = COALESCE(data_fim_mandato,
hoje)`, mesmo padrão de `estruturaController.js:147`) para ela não seguir listada como docente
ou discente atual; os encerrados ficam como estão. Relatorias da Câmara ficam intactas (o
`relator_id` aponta para a pessoa, que sobrevive; `relator_nome` já é desnormalizado) — trocar o
relator de um processo em andamento continua sendo ato da secretaria.
Interpretação a confirmar: "histórico" foi lido como *encerrar* os vínculos ativos, não como
mantê-los ativos. Se a exclusão for só "tirar o acesso" de alguém que continua no programa, o
caminho é desativar o login, não excluir o usuário.

## 7. Plano (cada passo committável e com a suíte verde)

1. **Leituras tolerantes às duas chaves.** Todas as leituras de §3.3a/b passam a resolver a
   pessoa real (`COALESCE(u.pessoa_id, v.pessoa_id)`, ou `ANY([users.id, pessoa_id])`), inclusive
   as checagens de duplicidade e o escopo do gestor. Atributos vêm de `pessoas` com fallback em
   `users` via `users.pessoa_id`. A API passa a devolver `usuario_id` e o front (§3.4) migra para
   ele. Corrige "Meus processos" (§3.6). Funciona com o dado de hoje, sem mudar nenhuma linha.
2. **Sincronização `users → pessoas`** em `usersRepo` (D-B11b), com testes.
3. **Escritas gravam `pessoas.id`.** Todos os pontos de §3.1 resolvem a entrada com
   `resolverOuCriarPessoa({ pessoaId })` (a assinatura recebe objeto). `deleteUser` passa a
   encerrar em vez de apagar (D-B11c).
4. **Migração de dado.** Script único, em transação, idempotente: backfill de `pessoas` para
   usuários sem ela, reconciliação (D-B11b.5), `UPDATE` de `users.id → pessoas.id` em `vinculos` e
   `camara_relatorias`, relatório antes/depois e **aborta se sobrar id órfão**. Rodar primeiro numa
   cópia do banco de produção.
5. **FK.** Bloco `DO $$` no `schema.sql` (mesmo padrão de `users_pessoa_id_fkey`), `ON DELETE
   RESTRICT` (D-B11a), mais a reordenação de `RESET_TABLES` e o ajuste dos testes (§3.7).
6. **Simplificação.** Só aqui a tolerância às duas chaves sai: o join vira
   `JOIN pessoas p ON p.id = v.pessoa_id LEFT JOIN users u ON u.pessoa_id = p.id` — continua
   havendo dois joins, mas por uma chave determinística; os comentários "polimórfico" do schema e
   do código saem.

**Critério de pronto:** as duas FKs existem; nenhum `LEFT JOIN users u ON u.id = v.pessoa_id`
(ou `relator_id`) no código; o front usa `usuario_id` para tudo que é de login; suíte verde;
contagem de docentes/discentes por programa igual antes e depois da migração de dado.

## 8. O que a primeira versão errava

1. Dizia que apagar o usuário apagava a pessoa em cascata — é o contrário (§5).
2. Tratava `professoresImporter`/`alunosImporter` como "talvez obsoletos" — estão ativos e geraram
   quase todos os vínculos por `users.id`.
3. Dizia que todas as leituras usam o `LEFT JOIN` duplo — as mais arriscadas só consultam `users`
   (§3.3a); ficaram de fora ~15 pontos, entre eles o escopo de acesso do gestor.
4. Não olhava o front-end (§3.4) nem a divergência de dados `users` × `pessoas` (§3.5).
5. Propunha simplificar as leituras (passo 3) **antes** de migrar o dado (passo 4) — isso
   esvaziaria as páginas de docentes/discentes entre um passo e outro.
6. Propunha trocar o join duplo por um `JOIN pessoas` simples — perderia e-mail de login e as
   edições feitas em `users`.
7. "`POST /api/users` quebra na primeira chamada" — só quebra quando há vínculo a criar.
8. "~3 testes" — são 15 arquivos, mais a ordem do `resetDb`.
9. Recomendava `ON DELETE SET NULL` — trocado por `RESTRICT` (D-B11a).
