# B.13 — Fechar a G1: `users` só credencial — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** todos os dados de pessoa (`perfil_*`, `acad_*`, `priv_*`) e os perfis de aluno/professor saem de `users` — para `pessoas` e `vinculos.dados` — sem mudar o formato da API de usuários; a cópia legada e a sincronização `users → pessoas` deixam de existir e as 13 colunas + 2 JSONB são removidas.

**Architecture:** o formato da API (`perfil_geral`, `dados_academicos`, `perfil_aluno`, `perfil_professor`, `privacidade`) é mantido e passa a ser **montado** pelo `usersRepo` a partir de `pessoas` e dos vínculos. A migração é em passos que funcionam com o dado antigo e o novo: estrutura aditiva → escritas em dupla → virada das leituras → fim da cópia → remoção das colunas (último commit). Um módulo novo, `server/db/perfilVinculo.js`, é o único lugar que converte entre o perfil de aluno/professor e `vinculos.dados`/`pessoas`.

**Tech Stack:** Express, PostgreSQL 16 (`pg`), Vitest + supertest (servidor), Vitest + jsdom (front), React 19.

**Spec:** [`docs/analise-g1-users-credencial.md`](../../analise-g1-users-credencial.md) — inventário, achados e decisões. Item **B.13** do `PLANO.md`.

---

## Decisões que valem para este plano (30/09/2026)

| | Decisão | Origem |
|---|---|---|
| D1 | **Manter** o formato da API de usuários (montado a partir de `pessoas`/vínculos) | resposta do usuário |
| D2 | **Remover** as colunas, como **último commit**; `migrateRunner` passa a adotar o `schema.sql` como baseline | resposta do usuário |
| D3 | Mapeamento do §7 da análise aprovado como proposto (ver tabela abaixo) | resposta do usuário |
| D7 | `user_linhas_pesquisa` vai para `pessoa_id`, **antes** da remoção das colunas (Task 9 → Task 10) | resposta do usuário |
| D4 | `pessoas.priv_mostrar_email/telefone` (cópia literal); `perfil_publico` e `mostrar_lattes` saem do formulário (nunca persistiram); honrar as flags no site público fica **fora** | recomendação adotada |
| D5 | `pessoas.telefones` continua texto (`", "`); a API segue em array (split/join) | recomendação adotada |
| D6 | `users.programa_id` **não** muda | recomendação adotada |

**Mapeamento das chaves (D3)** — `perfil_aluno` / `perfil_professor` → destino:

| Chave | Destino |
|---|---|
| `sexo`, `estrangeiro`, `nacionalidade` | `pessoas.sexo/estrangeiro/nacionalidade` |
| `nivel` | matriculado: é o **papel** do vínculo (`DISCENTE_MESTRADO`/`DISCENTE_DOUTORADO`); egresso: `vinculos.dados.nivel` = `MESTRADO`/`DOUTORADO` |
| `tipo` / `tipo_professor` | papel do vínculo (`DOCENTE_PERMANENTE`/`COLABORADOR`/`VISITANTE`) |
| `programas[]` | some: um vínculo por programa; a API o deriva dos vínculos ativos |
| `entrada`, `situacao`, `defesa`, `egresso` | `vinculos.dados` |
| `qualificacao` | `vinculos.dados`, **descartando `2020-10-29`** (placeholder: 69/73 no dev) |
| `orientador_id` | guarda `users.id` de um professor (resolve em 48/48 no dev): vira `vinculos.dados.orientador_pessoa_id` (via `users.pessoa_id`); o texto cru só fica em `orientador_legado` quando **não** resolve |
| `uid_legado`, `origem_import` | `vinculos.dados` (`uid_legado` **com** `origem_import`) |

**Refinamento do "aluno sem vínculo recebe 400" (D3):** o formulário envia defaults (`nivel: 'Mestrando'`, `situacao: 'Matriculado'`) para todo aluno novo, então 400 incondicional impediria cadastrar aluno sem programa. O 400 vale só quando o payload traz **dado de vínculo de fato** (`entrada`, `qualificacao` ou `defesa` preenchidos, ou `situacao` diferente de `Matriculado`) e a pessoa **não tem** vínculo de aluno. `sexo`/`estrangeiro`/`nacionalidade` vão para `pessoas` sempre.

## Antes de começar

- Banco de pé (`docker ps` mostra `prpg-postgres` healthy). **NUNCA** `docker compose up`/`npm run db:up` nem `npm run db:migrate` (seed destrutivo). Migração é arquivo novo em `server/db/migrations/` aplicado com `npm run db:migrate:apply`; o `schema.sql` é o baseline e também reflete o estado final.
- Um teste: `npx vitest run server/__tests__/<arquivo>.test.js`. Suíte do servidor: `npx vitest run` (~6–7 min; sem TTY só mostra falhas). Front: `npm run test:front`. "Test timed out"/"Hook timed out" isolados costumam ser lentidão do Docker: rode o arquivo de novo antes de concluir que é defeito.
- `prpg_test` é **compartilhado**: o `globalSetup` recria o banco a cada execução. **Nunca dois vitest ao mesmo tempo.** O banco de teste é criado só do `schema.sql` (não roda as migrações).
- Commits em português no padrão do repo (`feat`/`fix`/`test`/`refactor`/`docs`), um por task, na branch da worktree; sem push. Não incluir `.claude/`, `analises-sites-pos-graduacao/`, `deep-research-report.md`. Preservar CRLF/LF de cada arquivo (`file <arquivo>` antes de editar; `PLANO.md`, `CLAUDE.md` e `docs/` são CRLF).
- **Antes de aplicar qualquer migração no banco `prpg` de desenvolvimento**, tirar backup: `docker exec prpg-postgres pg_dump -U prpg prpg > "$TEMP/prpg-antes-<task>.sql"`.
- Mudança visível na interface é conferida no navegador (preview do app) antes de dar a task por pronta.

## Mapa de arquivos

| Arquivo | Papel | Task |
|---|---|---|
| `docs/operations/g1-pre-verificacao.sql` (novo) | contagens só-leitura para rodar em cada banco antes da Task 1 | 0 |
| `server/db/migrations/2026-09-30_g1a_pessoa_e_vinculo_dados.sql` (novo) | colunas novas + backfill a partir de `users` | 1 |
| `server/__tests__/migracoesG1.test.js` (novo) | testes das migrações g1a e g1b | 1, 9 |
| `server/db/schema.sql` | colunas novas; depois o estado final | 1, 9, 10 |
| `server/db/perfilVinculo.js` (novo) | **conversões** perfil de aluno/professor ↔ `pessoas` + `vinculos.dados` | 2 |
| `server/__tests__/perfilVinculo.test.js` (novo) | testes do módulo | 2 |
| `server/db/pessoaDoUsuario.js` | propaga também sexo/nacionalidade/estrangeiro/privacidade; na Task 8 é reescrito | 3, 8 |
| `server/controllers/usersController.js` | grava o perfil nos vínculos | 3 |
| `server/controllers/programasController.js` | `DOCENTE_VISITANTE`; consultas sem `perfil_*`; `removeDocente` | 3, 6 |
| `server/services/importers/{alunos,professores,teses}Importer.js` | gravam `vinculos.dados`; busca por `uid_legado` + origem | 3, 6 |
| `server/__tests__/retratoUsuarios.test.js` (novo) | contrato da API de usuários, escrito **antes** da virada | 4 |
| `server/db/repositories.js` | `usersRepo` independente da fábrica, lendo de `pessoas` | 5, 8 |
| `server/db/identidadeVinculo.js`, `server/controllers/{contatos,gruposPesquisa,painel,qualidade,importacoes,busca,programaPublico,proficiencia}Controller.js`, `server/db/{estruturaPrpg,posDoutoradoRepo,revisoesRepo}.js`, `server/services/planilhas/{cadastro,contatosImporter}.js` | trocam `u.perfil_*` por `p.*` | 6 |
| `src/pages/admin/AdminUserForm.jsx`, `AdminUsersList.jsx`, `src/pages/programa/ProgramaComissoes.jsx`, `ProgramaSobre.jsx` | flags falsas, `tipo_professor`, código morto | 7 |
| `server/db/pessoasRepo.js`, `server/db/backfill-pessoas.mjs` | `criarPessoaDeUsuario`/backfill removidos | 8 |
| `server/db/migrations/2026-09-30_g1b_linhas_pesquisa_pessoa.sql` (novo) | `user_linhas_pesquisa` por `pessoa_id` | 9 |
| `server/db/migrations/2026-09-30_g1c_remove_colunas_users.sql` (novo) | `DROP COLUMN` + `users.pessoa_id NOT NULL` | 10 |
| `server/db/migrateRunner.mjs` | adoção do baseline | 10 |
| `server/__tests__/migracoesB11.test.js`, `migrateRunner.test.js`, `helpers.js` | ajustes | 1, 10 |
| `server/db/arquivosUsos.js` | sai a linha de `users.perfil_foto_url` | 10 |
| `PLANO.md`, `CLAUDE.md`, `arquitetura-dados.md`, `docs/analise-g1-users-credencial.md` | registro | 11 |

## Vocabulário depois deste plano

- **Fonte de verdade:** `pessoas` (nome, CPF, SIAPE, foto, telefones, Lattes/ORCID/Scholar/Publons, sexo, nacionalidade, estrangeiro, privacidade) e `vinculos.dados` (entrada, situação, defesa, qualificação, egresso, nível do egresso, orientador, `uid_legado` + `origem_import`).
- **`vinculos.dados` (JSONB), chaves:** `nivel` (`MESTRADO`|`DOUTORADO`, só egresso), `entrada`, `situacao`, `qualificacao`, `defesa`, `egresso` (boolean), `orientador_legado` (texto cru), `orientador_pessoa_id`, `uid_legado`, `origem_import`.
- **Papéis de aluno:** `DISCENTE_MESTRADO`, `DISCENTE_DOUTORADO`, `DISCENTE_PROFISSIONAL`, `EGRESSO`. **Papéis de docente:** `DOCENTE_PERMANENTE`, `DOCENTE_COLABORADOR`, `DOCENTE_VISITANTE`.

---

## Task 0: Pré-verificação (Sonnet)

**Files:**
- Create: `docs/operations/g1-pre-verificacao.sql`

Script só-leitura, para rodar numa **cópia** da produção antes da Task 1 e guardar a saída. Mesmo estilo de `docs/operations/b11-pre-verificacao.sql` (leia-o primeiro).

- [ ] **Step 1: Escrever o script**

Um único arquivo com `\pset pager off` e as consultas abaixo, cada uma com `\echo` de título. Use `docker exec -i prpg-postgres psql -U prpg -d prpg < docs/operations/g1-pre-verificacao.sql` para rodar no dev.

```sql
\pset pager off
\echo == 1. usuarios, pessoas e usuarios sem pessoa
SELECT (SELECT count(*) FROM users) usuarios, (SELECT count(*) FROM pessoas) pessoas,
       (SELECT count(*) FROM users WHERE pessoa_id IS NULL) usuarios_sem_pessoa;

\echo == 2. divergencia users x pessoas por campo (nao-vazio em users e diferente em pessoas)
WITH d AS (
  SELECT u.perfil_nome un, p.nome pn, regexp_replace(coalesce(u.perfil_cpf,''),'\D','','g') uc, regexp_replace(coalesce(p.cpf,''),'\D','','g') pc,
         u.perfil_siape us, p.siape ps, u.perfil_foto_url uf, p.foto_url pf,
         array_to_string(u.perfil_telefones, ', ') ut, p.telefones pt,
         u.acad_lattes ul, p.lattes pl, u.acad_orcid uo, p.orcid po,
         u.acad_google_scholar ug, p.google_scholar pg, u.acad_publons ub, p.publons pb
    FROM users u JOIN pessoas p ON p.id = u.pessoa_id)
SELECT count(*) FILTER (WHERE coalesce(un,'')<>'' AND un IS DISTINCT FROM pn) nome,
       count(*) FILTER (WHERE uc<>'' AND uc<>pc) cpf,
       count(*) FILTER (WHERE coalesce(us,'')<>'' AND us IS DISTINCT FROM ps) siape,
       count(*) FILTER (WHERE coalesce(uf,'')<>'' AND uf IS DISTINCT FROM pf) foto,
       count(*) FILTER (WHERE coalesce(ut,'')<>'' AND ut IS DISTINCT FROM pt) telefones,
       count(*) FILTER (WHERE coalesce(ul,'')<>'' AND ul IS DISTINCT FROM pl) lattes,
       count(*) FILTER (WHERE coalesce(uo,'')<>'' AND uo IS DISTINCT FROM po) orcid,
       count(*) FILTER (WHERE coalesce(ug,'')<>'' AND ug IS DISTINCT FROM pg) scholar,
       count(*) FILTER (WHERE coalesce(ub,'')<>'' AND ub IS DISTINCT FROM pb) publons
  FROM d;

\echo == 3. chaves de perfil_aluno (total / nao vazias)
SELECT k, count(*) total, count(*) FILTER (WHERE v::text NOT IN ('null','""','[]')) nao_vazias
  FROM users, jsonb_each(perfil_aluno) e(k, v) GROUP BY k ORDER BY k;
\echo == 4. chaves de perfil_professor
SELECT k, count(*) total, count(*) FILTER (WHERE v::text NOT IN ('null','""','[]')) nao_vazias
  FROM users, jsonb_each(perfil_professor) e(k, v) GROUP BY k ORDER BY k;

\echo == 5. qualificacao: valores repetidos (placeholder?)
SELECT perfil_aluno->>'qualificacao' valor, count(*) FROM users WHERE perfil_aluno->>'qualificacao' <> ''
  GROUP BY 1 HAVING count(*) > 3 ORDER BY 2 DESC;

\echo == 6. aluno sem vinculo de aluno
SELECT count(*) FROM users u WHERE u.perfil_aluno IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM vinculos v WHERE v.pessoa_id = u.pessoa_id
                     AND v.papel IN ('DISCENTE_MESTRADO','DISCENTE_DOUTORADO','DISCENTE_PROFISSIONAL','EGRESSO'));

\echo == 7. nivel x papel (aluno)
SELECT u.perfil_aluno->>'nivel' nivel, v.papel, v.ativo, count(*)
  FROM users u JOIN vinculos v ON v.pessoa_id = u.pessoa_id
 WHERE u.perfil_aluno IS NOT NULL AND v.papel IN ('DISCENTE_MESTRADO','DISCENTE_DOUTORADO','DISCENTE_PROFISSIONAL','EGRESSO')
 GROUP BY 1,2,3 ORDER BY 1,2;

\echo == 8. professor: tipo x papel do vinculo
SELECT coalesce(u.perfil_professor->>'tipo', u.perfil_professor->>'tipo_professor') tipo, v.papel, v.ativo, count(*)
  FROM users u JOIN vinculos v ON v.pessoa_id = u.pessoa_id
 WHERE u.perfil_professor IS NOT NULL AND v.papel LIKE 'DOCENTE%' GROUP BY 1,2,3 ORDER BY 1,2;

\echo == 9. professor: programas do array sem vinculo docente ativo (A) e vinculo docente ativo fora do array (B)
SELECT (SELECT count(*) FROM users u, jsonb_array_elements_text(u.perfil_professor->'programas') g(pid)
         WHERE NOT EXISTS (SELECT 1 FROM vinculos v WHERE v.pessoa_id = u.pessoa_id AND v.programa_id = g.pid
                             AND v.ativo AND v.papel LIKE 'DOCENTE%')) a_array_sem_vinculo,
       (SELECT count(*) FROM users u JOIN vinculos v ON v.pessoa_id = u.pessoa_id AND v.ativo AND v.papel LIKE 'DOCENTE%'
         WHERE u.perfil_professor IS NOT NULL AND NOT coalesce(u.perfil_professor->'programas', '[]'::jsonb) ? v.programa_id) b_vinculo_fora_do_array;

\echo == 10. orientador_id: a quem aponta
SELECT CASE WHEN coalesce(a.perfil_aluno->>'orientador_id','') = '' THEN 'vazio'
            WHEN EXISTS (SELECT 1 FROM users o WHERE o.id = a.perfil_aluno->>'orientador_id') THEN 'users.id'
            WHEN EXISTS (SELECT 1 FROM pessoas o WHERE o.id = a.perfil_aluno->>'orientador_id') THEN 'pessoas.id'
            ELSE 'orfao' END alvo, count(*)
  FROM users a WHERE a.perfil_aluno IS NOT NULL GROUP BY 1;

\echo == 11. uid_legado repetido entre usuarios (colisao de origem)
SELECT count(*) total, count(DISTINCT coalesce(perfil_aluno->>'uid_legado', perfil_professor->>'uid_legado')) distintos
  FROM users WHERE perfil_aluno IS NOT NULL OR perfil_professor IS NOT NULL;

\echo == 12. pessoas duplicadas por CPF
SELECT count(*) FROM (SELECT cpf FROM pessoas WHERE coalesce(cpf,'') <> '' GROUP BY cpf HAVING count(*) > 1) x;
```

- [ ] **Step 2: Rodar no dev e conferir que não dá erro**

Run: `docker exec -i prpg-postgres psql -U prpg -d prpg < docs/operations/g1-pre-verificacao.sql`
Expected: as 12 seções imprimem; no dev, seção 2 zerada, seção 6 = 0, seção 9 = `0 | 0`, seção 10 = `users.id 48 / vazio 25` (o orientador aponta para o `users.id` de um professor).

- [ ] **Step 3: Commit**

```bash
git add docs/operations/g1-pre-verificacao.sql
git commit -m "docs(B.13): pre-verificacao da G1 (somente leitura) para rodar em cada banco"
```

---

## Task 1: Migração g1a — estrutura aditiva e backfill (Opus)

**Files:**
- Create: `server/db/migrations/2026-09-30_g1a_pessoa_e_vinculo_dados.sql`
- Create: `server/__tests__/migracoesG1.test.js`
- Modify: `server/db/schema.sql` (`vinculos` ~:396-425, `pessoas` ~:344-365)
- Modify: `server/__tests__/helpers.js` (exporta `rodarMigracao`)

Nada lê o que é novo ainda. Só cria e preenche, idempotente.

- [ ] **Step 1: `rodarMigracao` em `helpers.js`**

`migracoesB11.test.js:8-22` tem um helper local que executa um arquivo de migração numa transação. Copie-o para `helpers.js` como export (não altere o teste antigo):

```js
// Executa um arquivo de server/db/migrations/ como o migrateRunner: uma transação.
export async function rodarMigracao(nome) {
  const sql = await fs.readFile(new URL(`../db/migrations/${nome}`, import.meta.url), 'utf8');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(sql);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
```
(adicione `import fs from 'fs/promises';` se o arquivo ainda não o tiver; `pool` já é importado lá.)

- [ ] **Step 2: Escrever o teste que falha**

`server/__tests__/migracoesG1.test.js`:

```js
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUserComPessoa, rodarMigracao } from './helpers.js';

const MIG = '2026-09-30_g1a_pessoa_e_vinculo_dados.sql';

beforeEach(async () => { await resetDb(); await seedAdmin(); });
afterAll(async () => { await pool.end(); });

const dadosDoVinculo = async (id) => (await pool.query('SELECT dados FROM vinculos WHERE id = $1', [id])).rows[0].dados;

describe('G1 migração g1a', () => {
  it('copia privacidade, sexo, nacionalidade e estrangeiro de users para pessoas (o usuário vence)', async () => {
    const { usuarioId, pessoaId } = await seedUserComPessoa({ id: 'u-a', email: 'a@t.br', nome: 'Ana', roles: ['Aluno'] });
    await pool.query(`UPDATE users SET priv_mostrar_email = TRUE,
        perfil_aluno = '{"sexo":"Feminino","estrangeiro":true,"nacionalidade":"chilena"}' WHERE id = $1`, [usuarioId]);
    await pool.query(`UPDATE pessoas SET sexo = 'Masculino' WHERE id = $1`, [pessoaId]);
    await rodarMigracao(MIG);
    const { rows: [p] } = await pool.query('SELECT sexo, nacionalidade, estrangeiro, priv_mostrar_email, priv_mostrar_telefone FROM pessoas WHERE id = $1', [pessoaId]);
    expect(p).toEqual({ sexo: 'Feminino', nacionalidade: 'chilena', estrangeiro: true, priv_mostrar_email: true, priv_mostrar_telefone: false });
  });

  it('aluno: monta vinculos.dados (egresso guarda o nivel; placeholder de qualificacao e orientador)', async () => {
    const { usuarioId, pessoaId } = await seedUserComPessoa({ id: 'u-e', email: 'e@t.br', nome: 'Egr', roles: ['Aluno'] });
    const { pessoaId: orientadorPessoaId } = await seedUserComPessoa({ id: 'u-orient', email: 'o@t.br', nome: 'Orientador' });
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('v-e', $1, 'EGRESSO', TRUE), ('v-m', $1, 'DISCENTE_MESTRADO', TRUE)`, [pessoaId]);
    await pool.query(`UPDATE users SET perfil_aluno = $2 WHERE id = $1`, [usuarioId, JSON.stringify({
      nivel: 'Doutor', entrada: '2019.1', situacao: 'Egresso', qualificacao: '2020-10-29', defesa: '2023-03-03',
      egresso: true, orientador_id: 'u-orient', uid_legado: '158', origem_import: 'profiap' })]);
    await rodarMigracao(MIG);
    expect(await dadosDoVinculo('v-e')).toEqual({
      nivel: 'DOUTORADO', entrada: '2019.1', situacao: 'Egresso', defesa: '2023-03-03', egresso: true,
      orientador_pessoa_id: orientadorPessoaId, uid_legado: '158', origem_import: 'profiap' });
    // vínculo de aluno matriculado: o nível é o papel, então `nivel` não entra
    expect((await dadosDoVinculo('v-m')).nivel).toBeUndefined();
  });

  it('professor: só uid_legado e origem_import entram em vinculos.dados', async () => {
    const { usuarioId, pessoaId } = await seedUserComPessoa({ id: 'u-p', email: 'p@t.br', nome: 'Prof' });
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('v-p', $1, 'DOCENTE_PERMANENTE', TRUE)`, [pessoaId]);
    await pool.query(`UPDATE users SET perfil_professor = '{"tipo":"Permanente","programas":["x"],"uid_legado":"103","origem_import":"profiap"}' WHERE id = $1`, [usuarioId]);
    await rodarMigracao(MIG);
    expect(await dadosDoVinculo('v-p')).toEqual({ uid_legado: '103', origem_import: 'profiap' });
  });

  it('é idempotente e não toca em quem não tem perfil', async () => {
    const { pessoaId } = await seedUserComPessoa({ id: 'u-x', email: 'x@t.br', nome: 'Sem perfil', roles: ['Gestor'] });
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('v-x', $1, 'SECRETARIO', TRUE)`, [pessoaId]);
    await rodarMigracao(MIG);
    await rodarMigracao(MIG);
    expect(await dadosDoVinculo('v-x')).toBeNull();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run server/__tests__/migracoesG1.test.js`
Expected: FAIL — arquivo de migração inexistente / coluna `dados` inexistente.

- [ ] **Step 4: `schema.sql`**

Em `vinculos` (logo depois de `grupo_pesquisa_id TEXT`, antes do `);`) acrescente, com vírgula na linha anterior:

```sql
  -- G1 (B.13): o que era users.perfil_aluno/perfil_professor e é do vínculo.
  -- Chaves: nivel (só egresso: MESTRADO|DOUTORADO), entrada, situacao, qualificacao, defesa, egresso,
  -- orientador_legado, orientador_pessoa_id, uid_legado + origem_import (chave da importação).
  dados JSONB
```
Em `pessoas` (depois de `publons TEXT,`):

```sql
  -- G1 (B.13): escolhas de privacidade (vinham de users.priv_*). O site público ainda não as consulta.
  priv_mostrar_email    BOOLEAN DEFAULT FALSE,
  priv_mostrar_telefone BOOLEAN DEFAULT FALSE,
```

- [ ] **Step 5: A migração**

`server/db/migrations/2026-09-30_g1a_pessoa_e_vinculo_dados.sql`:

```sql
-- =====================================================================
-- B.13 / G1 (docs/analise-g1-users-credencial.md): estrutura que recebe o que hoje
-- mora em users.perfil_*. Aditiva e idempotente; nada lê o novo ainda.
-- Até aqui só users era editável pelo painel e pelo /minha-conta: o valor do
-- usuário vence quando está preenchido.
-- =====================================================================
ALTER TABLE vinculos ADD COLUMN IF NOT EXISTS dados JSONB;
ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS priv_mostrar_email BOOLEAN DEFAULT FALSE;
ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS priv_mostrar_telefone BOOLEAN DEFAULT FALSE;

UPDATE pessoas p SET
  priv_mostrar_email    = COALESCE(u.priv_mostrar_email, FALSE),
  priv_mostrar_telefone = COALESCE(u.priv_mostrar_telefone, FALSE)
  FROM users u WHERE u.pessoa_id = p.id;

UPDATE pessoas p SET
  sexo          = COALESCE(NULLIF(COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'sexo', ''), p.sexo),
  nacionalidade = COALESCE(NULLIF(COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'nacionalidade', ''), p.nacionalidade),
  estrangeiro   = CASE WHEN COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'estrangeiro' IS NULL THEN p.estrangeiro
                       ELSE COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'estrangeiro' = 'true' END
  FROM users u
 WHERE u.pessoa_id = p.id AND (u.perfil_aluno IS NOT NULL OR u.perfil_professor IS NOT NULL);

-- Aluno: todo vínculo de aluno da pessoa ganha os dados do perfil. `nivel` só para
-- egresso (o papel EGRESSO não diz se foi mestrado ou doutorado). A data de
-- qualificação 2020-10-29 é placeholder da importação (69 de 73 no dev): não entra.
UPDATE vinculos v SET dados = COALESCE(v.dados, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'nivel', CASE WHEN v.papel = 'EGRESSO' THEN
               CASE WHEN lower(u.perfil_aluno ->> 'nivel') LIKE 'dout%' THEN 'DOUTORADO'
                    WHEN lower(u.perfil_aluno ->> 'nivel') LIKE 'mestr%' THEN 'MESTRADO' END END,
    'entrada', NULLIF(u.perfil_aluno ->> 'entrada', ''),
    'situacao', NULLIF(u.perfil_aluno ->> 'situacao', ''),
    'qualificacao', NULLIF(NULLIF(u.perfil_aluno ->> 'qualificacao', ''), '2020-10-29'),
    'defesa', NULLIF(u.perfil_aluno ->> 'defesa', ''),
    'egresso', CASE WHEN u.perfil_aluno ? 'egresso' THEN (u.perfil_aluno ->> 'egresso') = 'true' END,
    'orientador_pessoa_id', o.pessoa_id,
    'orientador_legado', CASE WHEN o.id IS NULL THEN NULLIF(u.perfil_aluno ->> 'orientador_id', '') END,
    'uid_legado', NULLIF(u.perfil_aluno ->> 'uid_legado', ''),
    'origem_import', NULLIF(u.perfil_aluno ->> 'origem_import', '')))
  FROM users u LEFT JOIN users o ON o.id = u.perfil_aluno ->> 'orientador_id'
 WHERE u.pessoa_id = v.pessoa_id AND u.perfil_aluno IS NOT NULL
   AND v.papel IN ('DISCENTE_MESTRADO', 'DISCENTE_DOUTORADO', 'DISCENTE_PROFISSIONAL', 'EGRESSO');

-- Docente: o tipo já é o papel; o array de programas já é o conjunto de vínculos.
UPDATE vinculos v SET dados = COALESCE(v.dados, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'uid_legado', NULLIF(u.perfil_professor ->> 'uid_legado', ''),
    'origem_import', NULLIF(u.perfil_professor ->> 'origem_import', '')))
  FROM users u
 WHERE u.pessoa_id = v.pessoa_id AND u.perfil_professor IS NOT NULL
   AND v.papel IN ('DOCENTE_PERMANENTE', 'DOCENTE_COLABORADOR', 'DOCENTE_VISITANTE');

-- Só avisa (não corrige): divergência entre o array de programas e os vínculos.
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM users u, jsonb_array_elements_text(u.perfil_professor -> 'programas') g(pid)
   WHERE NOT EXISTS (SELECT 1 FROM vinculos v WHERE v.pessoa_id = u.pessoa_id AND v.programa_id = g.pid
                       AND v.ativo AND v.papel LIKE 'DOCENTE%');
  IF n > 0 THEN RAISE NOTICE 'G1: % programa(s) em perfil_professor.programas sem vínculo docente ativo (a API passa a mostrar só os vínculos)', n; END IF;
END$$;
```

- [ ] **Step 6: Rodar os testes**

Run: `npx vitest run server/__tests__/migracoesG1.test.js server/__tests__/resetDb.test.js`
Expected: PASS (o `resetDb.test.js` confere que o schema/`RESET_TABLES` seguem coerentes).

- [ ] **Step 7: Aplicar no dev e conferir**

```bash
docker exec prpg-postgres pg_dump -U prpg prpg > "$TEMP/prpg-antes-g1a.sql"
npm run db:migrate:apply
docker exec -i prpg-postgres psql -U prpg -d prpg -c "SELECT papel, count(*), count(dados) FROM vinculos GROUP BY papel ORDER BY 1"
docker exec -i prpg-postgres psql -U prpg -d prpg -c "SELECT count(*) FILTER (WHERE priv_mostrar_email) FROM pessoas"
```
Expected: `EGRESSO 36 | 36` e `DISCENTE_MESTRADO 37 | 37`, `DOCENTE_PERMANENTE 14 | 14`, `DOCENTE_COLABORADOR 2 | 2`; os demais papéis com `count(dados) = 0`; `priv_mostrar_email` = 1.

- [ ] **Step 8: Commit**

```bash
git add server/db/migrations/2026-09-30_g1a_pessoa_e_vinculo_dados.sql server/__tests__/migracoesG1.test.js server/__tests__/helpers.js server/db/schema.sql
git commit -m "feat(B.13): migracao g1a cria vinculos.dados e pessoas.priv_* e preenche a partir de users"
```

---

## Task 2: Módulo `perfilVinculo.js` (Opus)

**Files:**
- Create: `server/db/perfilVinculo.js`
- Create: `server/__tests__/perfilVinculo.test.js`

O único lugar que converte entre o formato antigo (`perfil_aluno`/`perfil_professor`) e `pessoas` + `vinculos.dados`. Duas partes: **funções puras** de montagem (testáveis sem banco) e **`gravarPerfilNosVinculos`** (grava).

- [ ] **Step 1: Testes das funções puras (falham)**

`server/__tests__/perfilVinculo.test.js` (parte pura; a parte com banco vem no Step 4):

```js
import { describe, it, expect } from 'vitest';
import { montarPerfilAluno, montarPerfilProfessor, nivelDeRotulo, temDadoDeVinculo } from '../db/perfilVinculo.js';

const pessoa = { sexo: 'Feminino', nacionalidade: 'brasileiro(a)', estrangeiro: false };

describe('montarPerfilAluno', () => {
  it('matriculado: o nível vem do papel', () => {
    const p = montarPerfilAluno(pessoa, [{ programa_id: 'p1', papel: 'DISCENTE_DOUTORADO', ativo: true,
      dados: { entrada: '2023.1', situacao: 'Matriculado', uid_legado: '7', origem_import: 'profiap' } }]);
    expect(p).toMatchObject({ nivel: 'Doutorando', entrada: '2023.1', situacao: 'Matriculado', egresso: false,
      sexo: 'Feminino', estrangeiro: false, uid_legado: '7', origem_import: 'profiap', qualificacao: '', defesa: '', orientador_id: '' });
  });
  it('egresso: o nível vem de dados.nivel', () => {
    const p = montarPerfilAluno(pessoa, [{ programa_id: 'p1', papel: 'EGRESSO', ativo: true, dados: { nivel: 'MESTRADO', egresso: true } }]);
    expect(p.nivel).toBe('Mestre');
    expect(p.egresso).toBe(true);
  });
  it('sem vínculo: defaults do formulário', () => {
    expect(montarPerfilAluno(pessoa, [])).toMatchObject({ nivel: 'Mestrando', situacao: 'Matriculado', entrada: '', egresso: false });
  });
  it('prefere o vínculo ativo de discente ao de egresso', () => {
    const p = montarPerfilAluno(pessoa, [
      { programa_id: 'a', papel: 'EGRESSO', ativo: true, dados: { nivel: 'MESTRADO' } },
      { programa_id: 'b', papel: 'DISCENTE_DOUTORADO', ativo: true, dados: {} }]);
    expect(p.nivel).toBe('Doutorando');
  });
  it('orientador: a pessoa resolvida vence o texto legado', () => {
    expect(montarPerfilAluno(pessoa, [{ papel: 'EGRESSO', ativo: true, dados: { orientador_legado: 'x', orientador_pessoa_id: 'pes-1' } }]).orientador_id).toBe('pes-1');
    expect(montarPerfilAluno(pessoa, [{ papel: 'EGRESSO', ativo: true, dados: { orientador_legado: 'x' } }]).orientador_id).toBe('x');
  });
});

describe('montarPerfilProfessor', () => {
  it('programas = vínculos docentes ativos; tipo = papel', () => {
    const p = montarPerfilProfessor(pessoa, [
      { programa_id: 'p1', papel: 'DOCENTE_PERMANENTE', ativo: true, dados: { uid_legado: '3', origem_import: 'profiap' } },
      { programa_id: 'p2', papel: 'DOCENTE_COLABORADOR', ativo: false, dados: {} }]);
    expect(p).toMatchObject({ programas: ['p1'], tipo: 'Permanente', tipo_professor: 'Permanente', uid_legado: '3', origem_import: 'profiap', sexo: 'Feminino' });
  });
  it('sem vínculo: programas vazio e tipo Permanente (default do formulário)', () => {
    expect(montarPerfilProfessor(pessoa, [])).toMatchObject({ programas: [], tipo: 'Permanente' });
  });
});

describe('helpers', () => {
  it('nivelDeRotulo', () => {
    expect(nivelDeRotulo('Mestrando')).toBe('MESTRADO');
    expect(nivelDeRotulo('Doutor')).toBe('DOUTORADO');
    expect(nivelDeRotulo('')).toBeNull();
  });
  it('temDadoDeVinculo ignora os defaults do formulário', () => {
    expect(temDadoDeVinculo({ nivel: 'Mestrando', situacao: 'Matriculado', entrada: '', qualificacao: '', defesa: '' })).toBe(false);
    expect(temDadoDeVinculo({ entrada: '2023.1' })).toBe(true);
    expect(temDadoDeVinculo({ situacao: 'Trancado' })).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run server/__tests__/perfilVinculo.test.js`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `server/db/perfilVinculo.js`**

```js
// B.13 / G1 (docs/analise-g1-users-credencial.md): o que era users.perfil_aluno /
// perfil_professor. Sexo, nacionalidade e estrangeiro são da pessoa (`pessoas`);
// o resto é do vínculo (`vinculos.dados`, papel). Este módulo é o único que
// converte entre o formato antigo da API e esse modelo.
import crypto from 'crypto';
import { query } from './pool.js';
import { hojeISO } from '../utils/datas.js';

export const PAPEIS_ALUNO = ['DISCENTE_MESTRADO', 'DISCENTE_DOUTORADO', 'DISCENTE_PROFISSIONAL', 'EGRESSO'];
export const PAPEIS_DOCENTE_TODOS = ['DOCENTE_PERMANENTE', 'DOCENTE_COLABORADOR', 'DOCENTE_VISITANTE'];

const PAPEL_DE_NIVEL = { MESTRADO: 'DISCENTE_MESTRADO', DOUTORADO: 'DISCENTE_DOUTORADO' };
const NIVEL_DE_PAPEL = { DISCENTE_MESTRADO: 'MESTRADO', DISCENTE_DOUTORADO: 'DOUTORADO' };
const ROTULO_NIVEL = { MESTRADO: { matriculado: 'Mestrando', egresso: 'Mestre' }, DOUTORADO: { matriculado: 'Doutorando', egresso: 'Doutor' } };
const TIPO_DE_PAPEL = { DOCENTE_PERMANENTE: 'Permanente', DOCENTE_COLABORADOR: 'Colaborador', DOCENTE_VISITANTE: 'Visitante' };
const PAPEL_DE_TIPO = Object.fromEntries(Object.entries(TIPO_DE_PAPEL).map(([papel, tipo]) => [tipo, papel]));

const texto = (v) => (v == null ? '' : String(v));
const vazio = (v) => v == null || String(v).trim() === '';

// 'Mestrando' | 'Mestre' | 'Doutorando' | 'Doutor' -> 'MESTRADO' | 'DOUTORADO' | null
export const nivelDeRotulo = (rotulo) => {
  const s = texto(rotulo).toLowerCase();
  if (s.startsWith('mestr')) return 'MESTRADO';
  if (s.startsWith('doutor')) return 'DOUTORADO';
  return null;
};

// O payload do formulário traz dado de vínculo "de verdade"? (os defaults do
// formulário — nível Mestrando, situação Matriculado — não contam.)
export const temDadoDeVinculo = (perfil = {}) =>
  !vazio(perfil.entrada) || !vazio(perfil.qualificacao) || !vazio(perfil.defesa)
  || (!vazio(perfil.situacao) && perfil.situacao !== 'Matriculado');

// Vínculo "principal" do aluno: discente ativo; senão o primeiro vínculo de aluno.
const vinculoPrincipalAluno = (vinculos) => {
  const alunos = vinculos.filter((v) => PAPEIS_ALUNO.includes(v.papel));
  return alunos.find((v) => v.ativo !== false && v.papel !== 'EGRESSO') || alunos[0] || null;
};

// `pessoa`: { sexo, nacionalidade, estrangeiro }. `vinculos`: [{ programa_id, papel, ativo, dados }].
export function montarPerfilAluno(pessoa, vinculos) {
  const v = vinculoPrincipalAluno(vinculos);
  const dados = v?.dados || {};
  let nivel = 'Mestrando';
  if (v?.papel === 'EGRESSO') nivel = ROTULO_NIVEL[dados.nivel]?.egresso || 'Mestre';
  else if (v) nivel = ROTULO_NIVEL[NIVEL_DE_PAPEL[v.papel] || 'MESTRADO'].matriculado;
  return {
    nivel,
    entrada: texto(dados.entrada),
    orientador_id: texto(dados.orientador_pessoa_id || dados.orientador_legado),
    qualificacao: texto(dados.qualificacao),
    defesa: texto(dados.defesa),
    situacao: dados.situacao || 'Matriculado',
    egresso: v?.papel === 'EGRESSO' || dados.egresso === true,
    estrangeiro: !!pessoa?.estrangeiro,
    nacionalidade: texto(pessoa?.nacionalidade),
    sexo: texto(pessoa?.sexo),
    uid_legado: dados.uid_legado ?? null,
    origem_import: dados.origem_import ?? null,
  };
}

export function montarPerfilProfessor(pessoa, vinculos) {
  const docentes = vinculos.filter((v) => PAPEIS_DOCENTE_TODOS.includes(v.papel) && v.ativo !== false);
  const primeiro = docentes[0];
  const tipo = TIPO_DE_PAPEL[primeiro?.papel] || 'Permanente';
  const dados = primeiro?.dados || {};
  return {
    programas: [...new Set(docentes.map((v) => v.programa_id).filter(Boolean))],
    tipo,
    tipo_professor: tipo,
    estrangeiro: !!pessoa?.estrangeiro,
    nacionalidade: texto(pessoa?.nacionalidade),
    sexo: texto(pessoa?.sexo),
    uid_legado: dados.uid_legado ?? null,
    origem_import: dados.origem_import ?? null,
  };
}

export class PerfilSemVinculo extends Error {
  constructor() {
    super('Este aluno ainda não tem vínculo com um programa: vincule-o a um programa antes de informar entrada, situação, qualificação ou defesa.');
    this.status = 400;
    this.expose = true;
  }
}

// Resolve o orientador informado (pessoas.id, ou users.id -> pessoa) sem criar nada.
async function pessoaDoOrientador(id) {
  if (vazio(id)) return null;
  const { rows } = await query(
    `SELECT id FROM pessoas WHERE id = $1 UNION ALL SELECT pessoa_id FROM users WHERE id = $1 AND pessoa_id IS NOT NULL LIMIT 1`, [id]);
  return rows[0]?.id || null;
}

const CHAVES_TEXTO = ['entrada', 'situacao', 'qualificacao', 'defesa', 'uid_legado', 'origem_import'];

// Grava em `vinculos` o que veio em perfil_aluno / perfil_professor. Chamado DEPOIS
// de o vínculo existir (cadastro, edição, importadores). `pessoas` (sexo,
// nacionalidade, estrangeiro) é gravado por pessoaDoUsuario.js, não aqui.
//   programaId: restringe aos vínculos daquele programa (importadores)
//   reconciliarProgramas: o array `perfil_professor.programas` cria/encerra vínculos docentes
//   podeRemover: só com reconciliarProgramas; false = só acrescenta (Gestor de Programa)
export async function gravarPerfilNosVinculos(pessoaId, { perfil_aluno, perfil_professor } = {},
  { programaId = null, reconciliarProgramas = false, podeRemover = true } = {}) {
  if (!pessoaId) return;
  if (perfil_aluno) await gravarAluno(pessoaId, perfil_aluno, programaId);
  if (perfil_professor) await gravarProfessor(pessoaId, perfil_professor, { programaId, reconciliarProgramas, podeRemover });
}

async function vinculosDa(pessoaId, papeis, programaId) {
  const { rows } = await query(
    `SELECT id, papel, dados, programa_id FROM vinculos
      WHERE pessoa_id = $1 AND papel = ANY($2::text[]) ${programaId ? 'AND programa_id = $3' : ''}`,
    programaId ? [pessoaId, papeis, programaId] : [pessoaId, papeis]);
  return rows;
}

async function gravarAluno(pessoaId, perfil, programaId) {
  const vinculos = await vinculosDa(pessoaId, PAPEIS_ALUNO, programaId);
  if (!vinculos.length) {
    if (temDadoDeVinculo(perfil)) throw new PerfilSemVinculo();
    return;
  }
  const orientador = await pessoaDoOrientador(perfil.orientador_id);
  const nivel = nivelDeRotulo(perfil.nivel);
  const rotuloEgresso = /^(mestre|doutor)$/i.test(texto(perfil.nivel).trim());
  for (const v of vinculos) {
    const dados = { ...(v.dados || {}) };
    for (const k of CHAVES_TEXTO) {
      if (perfil[k] === undefined) continue;
      if (vazio(perfil[k])) delete dados[k]; else dados[k] = texto(perfil[k]);
    }
    if (dados.qualificacao === '2020-10-29') delete dados.qualificacao;
    if (perfil.egresso !== undefined) dados.egresso = !!perfil.egresso;
    if (orientador) { dados.orientador_pessoa_id = orientador; }
    let papel = v.papel;
    if (nivel) {
      if (v.papel === 'EGRESSO') dados.nivel = nivel;
      else if (PAPEL_DE_NIVEL[nivel] && NIVEL_DE_PAPEL[v.papel] && !rotuloEgresso) papel = PAPEL_DE_NIVEL[nivel];
    }
    await query('UPDATE vinculos SET dados = $2::jsonb, papel = $3 WHERE id = $1',
      [v.id, JSON.stringify(dados), papel]);
  }
}

async function gravarProfessor(pessoaId, perfil, { programaId, reconciliarProgramas, podeRemover }) {
  const tipo = perfil.tipo_professor || perfil.tipo;
  const papelTipo = PAPEL_DE_TIPO[tipo] || null;
  const vinculos = await vinculosDa(pessoaId, PAPEIS_DOCENTE_TODOS, programaId);
  for (const v of vinculos) {
    const dados = { ...(v.dados || {}) };
    for (const k of ['uid_legado', 'origem_import']) {
      if (perfil[k] === undefined) continue;
      if (vazio(perfil[k])) delete dados[k]; else dados[k] = texto(perfil[k]);
    }
    await query('UPDATE vinculos SET dados = $2::jsonb, papel = $3 WHERE id = $1',
      [v.id, JSON.stringify(dados), papelTipo || v.papel]);
  }
  if (!reconciliarProgramas || !Array.isArray(perfil.programas)) return;

  const todos = await vinculosDa(pessoaId, PAPEIS_DOCENTE_TODOS, null);
  const { rows: ativos } = await query(
    `SELECT id, programa_id FROM vinculos WHERE pessoa_id = $1 AND papel = ANY($2::text[]) AND ativo IS NOT FALSE`,
    [pessoaId, PAPEIS_DOCENTE_TODOS]);
  const ativosPorPrograma = new Map(ativos.map((a) => [a.programa_id, a.id]));
  for (const pid of perfil.programas) {
    if (ativosPorPrograma.has(pid)) continue;
    const inativo = todos.find((t) => t.programa_id === pid);
    if (inativo) {
      await query('UPDATE vinculos SET ativo = TRUE, data_fim_mandato = NULL WHERE id = $1', [inativo.id]);
    } else {
      await query(
        `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em) VALUES ($1,$2,$3,$4,TRUE,now())`,
        [crypto.randomUUID(), pid, pessoaId, papelTipo || 'DOCENTE_PERMANENTE']);
    }
  }
  if (podeRemover) {
    for (const [pid, vid] of ativosPorPrograma) {
      if (!perfil.programas.includes(pid)) {
        await query('UPDATE vinculos SET ativo = FALSE, data_fim_mandato = COALESCE(data_fim_mandato, $2::date) WHERE id = $1', [vid, hojeISO()]);
      }
    }
  }
}
```

- [ ] **Step 4: Testes com banco (gravação)**

Acrescente a `perfilVinculo.test.js` (mantendo os `import`s do topo e adicionando os do banco: `pool`, `resetDb`, `seedAdmin`, `seedUserComPessoa`, `gravarPerfilNosVinculos`, `PerfilSemVinculo`; `beforeEach(resetDb+seedAdmin)`, `afterAll(pool.end)`):

```js
describe('gravarPerfilNosVinculos', () => {
  const vinc = async (id) => (await pool.query('SELECT papel, ativo, dados FROM vinculos WHERE id = $1', [id])).rows[0];

  it('aluno: grava entrada/situação em vinculos.dados; nível de discente troca o papel; Mestre/Doutor não', async () => {
    const { pessoaId } = await seedUserComPessoa({ id: 'u1', email: 'u1@t.br', nome: 'Aluno', roles: ['Aluno'] });
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel, ativo) VALUES ('v1', $1, 'DISCENTE_MESTRADO', TRUE)`, [pessoaId]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { nivel: 'Doutorando', entrada: '2024.1', situacao: 'Trancado' } });
    expect(await vinc('v1')).toMatchObject({ papel: 'DISCENTE_DOUTORADO', dados: { entrada: '2024.1', situacao: 'Trancado' } });
    await gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { nivel: 'Mestre' } });
    expect((await vinc('v1')).papel).toBe('DISCENTE_DOUTORADO'); // "Mestre" não converte matriculado em egresso
  });

  it('aluno sem vínculo: 400 só com dado de vínculo de verdade', async () => {
    const { pessoaId } = await seedUserComPessoa({ id: 'u2', email: 'u2@t.br', nome: 'Sem vínculo', roles: ['Aluno'] });
    await expect(gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { nivel: 'Mestrando', situacao: 'Matriculado', entrada: '' } })).resolves.toBeUndefined();
    await expect(gravarPerfilNosVinculos(pessoaId, { perfil_aluno: { entrada: '2024.1' } })).rejects.toBeInstanceOf(PerfilSemVinculo);
  });

  it('professor: tipo vira papel; programas cria/encerra vínculos (Gestor de Programa só acrescenta)', async () => {
    const { pessoaId } = await seedUserComPessoa({ id: 'u3', email: 'u3@t.br', nome: 'Doc' });
    await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES ('pa','A','PA'), ('pb','B','PB')`);
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, programa_id, papel, ativo) VALUES ('va', $1, 'pa', 'DOCENTE_PERMANENTE', TRUE)`, [pessoaId]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_professor: { tipo_professor: 'Colaborador', programas: ['pa', 'pb'] } }, { reconciliarProgramas: true });
    const { rows } = await pool.query(`SELECT programa_id, papel, ativo FROM vinculos WHERE pessoa_id = $1 ORDER BY programa_id`, [pessoaId]);
    expect(rows).toEqual([
      { programa_id: 'pa', papel: 'DOCENTE_COLABORADOR', ativo: true },
      { programa_id: 'pb', papel: 'DOCENTE_COLABORADOR', ativo: true }]);
    await gravarPerfilNosVinculos(pessoaId, { perfil_professor: { programas: ['pb'] } }, { reconciliarProgramas: true, podeRemover: false });
    expect((await vinc('va')).ativo).toBe(true);
    await gravarPerfilNosVinculos(pessoaId, { perfil_professor: { programas: ['pb'] } }, { reconciliarProgramas: true });
    expect((await vinc('va')).ativo).toBe(false);
  });
});
```
(Confira as colunas obrigatórias de `programas` em `schema.sql`; se `INSERT INTO programas` exigir mais campos, acrescente-os.)

- [ ] **Step 5: Rodar**

Run: `npx vitest run server/__tests__/perfilVinculo.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/db/perfilVinculo.js server/__tests__/perfilVinculo.test.js
git commit -m "feat(B.13): modulo perfilVinculo converte perfil de aluno/professor em pessoas + vinculos.dados"
```

---

## Task 3: Escritas em dupla (Opus)

**Files:**
- Modify: `server/db/pessoaDoUsuario.js` (CAMPOS e `gravar`)
- Modify: `server/controllers/usersController.js` (`createUser` ~:233-240, `updateUser` ~:320)
- Modify: `server/controllers/programasController.js` (`PAPEIS_DOCENTE`)
- Modify: `server/services/importers/{alunos,professores}Importer.js`
- Modify: `server/services/importers/tesesImporter.js` (busca do autor)
- Test: `server/__tests__/vinculosPessoa.test.js`, `server/__tests__/legado.test.js`, `server/__tests__/users.test.js`

Continua gravando a cópia em `users` (nada é lido de `pessoas`/`dados` ainda); acrescenta a gravação nova.

- [ ] **Step 1: Testes que falham**

Em `users.test.js` (use o estilo dos testes existentes: `request(app)`, `loginAdmin`, `seedUserComPessoa`), adicione:

```js
describe('G1: escritas em dupla', () => {
  it('PUT /users grava sexo, estrangeiro, nacionalidade e privacidade em pessoas', async () => {
    const token = await loginAdmin();
    const { usuarioId, pessoaId } = await seedUserComPessoa({ id: 'u-g1', email: 'g1@t.br', nome: 'G1', roles: ['Aluno'] });
    await request(app).put(`/api/users/${usuarioId}`).set('Authorization', `Bearer ${token}`)
      .send({ privacidade: { mostrar_email: true, mostrar_telefone: true },
              perfil_aluno: { nivel: 'Mestrando', estrangeiro: true, nacionalidade: 'chilena', sexo: 'Feminino' } })
      .expect(200);
    const { rows: [p] } = await pool.query('SELECT sexo, estrangeiro, nacionalidade, priv_mostrar_email, priv_mostrar_telefone FROM pessoas WHERE id = $1', [pessoaId]);
    expect(p).toEqual({ sexo: 'Feminino', estrangeiro: true, nacionalidade: 'chilena', priv_mostrar_email: true, priv_mostrar_telefone: true });
  });

  it('POST /users de professor com programas cria os vínculos docentes e grava dados', async () => {
    const token = await loginAdmin();
    await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES ('ppg-1','P1','P1')`);
    await request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
      .send({ email: 'novo@t.br', roles: ['Professor'], perfil_geral: { nome: 'Novo Prof' },
              perfil_professor: { tipo_professor: 'Colaborador', programas: ['ppg-1'] } })
      .expect(201);
    const { rows } = await pool.query(`SELECT v.papel, v.ativo FROM vinculos v JOIN users u ON u.pessoa_id = v.pessoa_id WHERE u.email = 'novo@t.br'`);
    expect(rows).toEqual([{ papel: 'DOCENTE_COLABORADOR', ativo: true }]);
  });

  it('PUT com dado de vínculo em aluno sem vínculo responde 400', async () => {
    const token = await loginAdmin();
    const { usuarioId } = await seedUserComPessoa({ id: 'u-sv', email: 'sv@t.br', nome: 'SV', roles: ['Aluno'] });
    await request(app).put(`/api/users/${usuarioId}`).set('Authorization', `Bearer ${token}`)
      .send({ perfil_aluno: { nivel: 'Mestrando', entrada: '2024.1' } }).expect(400);
  });
});
```

Em `legado.test.js`, nos testes dos importadores de alunos e professores existentes, acrescente expectativas sobre `vinculos.dados` (p.ex. depois de importar um aluno com `uid_legado`/`field_sexo`: `SELECT dados FROM vinculos ...` contém `{ uid_legado, origem_import: 'profiap' }` e `pessoas.sexo` preenchido). Leia o teste existente para reaproveitar o arquivo de importação de exemplo.

Run: `npx vitest run server/__tests__/users.test.js server/__tests__/legado.test.js` → Expected: FAIL nos novos.

- [ ] **Step 2: `pessoaDoUsuario.js` propaga o que faltava**

Em `CAMPOS`, acrescente (o perfil do aluno ou do professor é a fonte de sexo/nacionalidade/estrangeiro):

```js
const perfilDe = (u) => u.perfil_aluno || u.perfil_professor || {};
// ...dentro de CAMPOS:
  sexo: (u) => perfilDe(u).sexo,
  nacionalidade: (u) => perfilDe(u).nacionalidade,
  estrangeiro: (u) => { const v = perfilDe(u).estrangeiro; return v == null ? undefined : !!v; },
  priv_mostrar_email: (u) => (u.privacidade?.mostrar_email == null ? undefined : !!u.privacidade.mostrar_email),
  priv_mostrar_telefone: (u) => (u.privacidade?.mostrar_telefone == null ? undefined : !!u.privacidade.mostrar_telefone),
```
Em `camposAPropagar`, `vazio(undefined)` já pula; mas **booleanos `false` precisam propagar** (`vazio(false)` é falso, então passa) — confira que `ler(antes) === novo` continua correto para booleanos. Em `gravar`, no modo `soVazios`, ignore colunas booleanas (`COALESCE(NULLIF(col,''), $n)` dá erro em boolean):

```js
const BOOLEANAS = ['estrangeiro', 'priv_mostrar_email', 'priv_mostrar_telefone'];
const cols = Object.keys(campos).filter((c) => !(soVazios && (c === 'cpf' || BOOLEANAS.includes(c))));
```

- [ ] **Step 3: Controller de usuários grava o perfil nos vínculos**

Em `usersController.js`: `import { gravarPerfilNosVinculos } from '../db/perfilVinculo.js';`.

`createUser`, logo **depois** do bloco `vincularAoPrograma` (o vínculo já existe) e antes de `linhas_pesquisa_ids`:

```js
    await gravarPerfilNosVinculos(
      created.pessoaId,
      { perfil_aluno: newUser.perfil_aluno, perfil_professor: newUser.perfil_professor },
      { programaId: null, reconciliarProgramas: !scoped, podeRemover: false }
    );
```
`updateUser`, logo depois de `const updated = await usersRepo.update(...)`:

```js
    await gravarPerfilNosVinculos(
      updated.pessoaId,
      { perfil_aluno: merged.perfil_aluno, perfil_professor: merged.perfil_professor },
      { reconciliarProgramas: isAdmin, podeRemover: isAdmin }
    );
```
(`isAdmin` já existe em `updateUser`; Gestor de Programa e auto-edição não criam nem encerram vínculos.) `PerfilSemVinculo` tem `status`/`expose`, então o tratador global responde 400 — confira em `server/utils/httpError.js`/`app.js` que erros com `expose` saem com a mensagem; se o controller usa `try/catch` + `serverError`, acrescente antes: `if (error.status === 400 && error.expose) return res.status(400).json({ message: error.message });`.

- [ ] **Step 4: `DOCENTE_VISITANTE` entra em `PAPEIS_DOCENTE`**

`programasController.js`: `export const PAPEIS_DOCENTE = ['DOCENTE_PERMANENTE', 'DOCENTE_COLABORADOR', 'DOCENTE_VISITANTE'];`. Rode `npx vitest run server/__tests__/programas.test.js server/__tests__/programas_microsite.test.js` para ver se algum teste contava só dois papéis.

- [ ] **Step 5: Importadores gravam `vinculos.dados`**

`alunosImporter.js`: `import { gravarPerfilNosVinculos } from '../../db/perfilVinculo.js';`. Em `importOne`, depois de **cada** `await garantirVinculo(programaId, X.id, papel, ativo)` (há duas: usuário existente e criado):

```js
    await gravarPerfilNosVinculos(existente.pessoaId, { perfil_aluno: perfilAluno }, { programaId });   // no ramo `existente`
    await gravarPerfilNosVinculos(created.pessoaId, { perfil_aluno: perfilAluno }, { programaId });     // no ramo criado
```
Como `perfilAluno.orientador_id` é o id resolvido por `resolverOrientadorId`, troque essa função (`:115-123`) para devolver a **pessoa** do professor, por `uid_legado` + origem:

```js
const resolverOrientadorId = async (orientadorUid) => {
  if (!orientadorUid) return null;
  const { rows } = await query(
    `SELECT pessoa_id FROM vinculos
      WHERE dados ->> 'uid_legado' = $1 AND dados ->> 'origem_import' = 'profiap'
        AND papel = ANY($2::text[]) LIMIT 1`,
    [String(orientadorUid), PAPEIS_DOCENTE_TODOS]);
  return rows[0]?.pessoa_id ?? null;
};
```
(importe `PAPEIS_DOCENTE_TODOS` de `perfilVinculo.js`.) Note que `uid_legado` de professor só existe em `vinculos.dados` depois de `gravarPerfilNosVinculos` no importador de professores.

`professoresImporter.js`: depois de cada `garantirVinculo(...)`:

```js
    await gravarPerfilNosVinculos(existente.pessoaId, { perfil_professor: { uid_legado: m.uid_legado, origem_import: 'profiap' } }, { programaId });  // existente
    await gravarPerfilNosVinculos(created.pessoaId, { perfil_professor: { uid_legado: m.uid_legado, origem_import: 'profiap' } }, { programaId });    // criado
```
(no ramo `existente`, só se `m.uid_legado` existir, para não apagar o de outro site; `gravarProfessor` apaga a chave quando o valor é vazio — passe o objeto somente com `uid_legado` definido.)

`tesesImporter.js`: `resolverAutorUserId` (`:90-101`) vira `resolverAutorPessoaId`, sem passar por `users`:

```js
const resolverAutorPessoaId = async (autorUid) => {
  if (!autorUid) return null;
  const { rows } = await query(
    `SELECT pessoa_id FROM vinculos WHERE dados ->> 'uid_legado' = $1 AND dados ->> 'origem_import' = 'profiap' LIMIT 1`,
    [String(autorUid)]);
  return rows[0]?.pessoa_id ?? null;
};
```
e em `importOne` (`:124-130`): `autorPessoaId = await resolverAutorPessoaId(m.autor_uid)`; se vier `null`, `autorPessoaId = dryRun ? null : await resolverOuCriarPessoa({ nome: m.autor_nome })`. (Remova as consultas a `users`.)

- [ ] **Step 6: Rodar**

Run: `npx vitest run server/__tests__/users.test.js server/__tests__/legado.test.js server/__tests__/vinculosPessoa.test.js server/__tests__/gestor_programa.test.js server/__tests__/programas.test.js`
Expected: PASS. (Se um teste do `legado.test.js` resolvia orientador/autor por `perfil_*->>'uid_legado'` cru, ajuste o seed do teste para gravar `vinculos.dados`.)

- [ ] **Step 7: Commit**

```bash
git add server/db/pessoaDoUsuario.js server/controllers/usersController.js server/controllers/programasController.js server/services/importers server/__tests__
git commit -m "feat(B.13): escritas em dupla — perfil de aluno/professor tambem em pessoas e vinculos.dados"
```

---

## Task 4: Contrato da API de usuários, antes da virada (Sonnet)

**Files:**
- Create: `server/__tests__/retratoUsuarios.test.js`

Teste de **contrato**: roda contra o código atual (leitura ainda de `users`) **e** precisa continuar verde depois da Task 5. Não muda código de produção.

- [ ] **Step 1: Escrever o teste**

Monte um mundo: um programa, um aluno matriculado (vínculo `DISCENTE_DOUTORADO` com `dados`), um egresso, um professor (vínculo `DOCENTE_COLABORADOR`) — **criados pela API** (`POST /api/users` como admin, depois `PUT` com os perfis), para que passem pela escrita em dupla da Task 3 — e verifique, para cada um, `GET /api/users/:id` e a entrada correspondente em `GET /api/users`:

```js
// formato que a Task 5 precisa preservar (chaves e tipos), por usuário
expect(aluno).toMatchObject({
  roles: ['Aluno'],
  perfil_geral: { nome: 'Aluno Doutorando', cpf: '', siape: '', foto_url: '', telefones: ['8199999-0000'] },
  dados_academicos: { lattes: 'http://lattes/1', orcid: '', google_scholar: '', publons: '' },
  privacidade: { mostrar_email: true, mostrar_telefone: false },
  perfil_aluno: { nivel: 'Doutorando', entrada: '2024.1', situacao: 'Matriculado', estrangeiro: true, nacionalidade: 'chilena', sexo: 'Feminino' },
  perfil_professor: null,
  programaId: 'ppg-1',
});
expect(egresso.perfil_aluno).toMatchObject({ nivel: 'Mestre', egresso: true });
expect(prof.perfil_professor).toMatchObject({ tipo: 'Colaborador', programas: ['ppg-1'] });
expect(prof.perfil_aluno).toBeNull();
expect(Object.keys(aluno)).not.toContain('password_hash');
```
Cubra também: `GET /api/minha-conta` do aluno (`conta.nome`, `telefones`, `lattes`, `privacidade.mostrarEmail`), o retorno de `POST /api/login` (`nome`) e `GET /api/users/resumo`. Para o egresso, crie o vínculo `EGRESSO` direto por SQL e grave `perfil_aluno: { nivel: 'Mestre', egresso: true }` por `PUT`.

- [ ] **Step 2: Rodar contra o código atual**

Run: `npx vitest run server/__tests__/retratoUsuarios.test.js`
Expected: PASS. Se falhar por diferença de formato **hoje**, ajuste a expectativa ao formato real (este teste documenta o contrato atual; não "corrija" o código).

- [ ] **Step 3: Commit**

```bash
git add server/__tests__/retratoUsuarios.test.js
git commit -m "test(B.13): contrato da API de usuarios (perfil_geral, perfil_aluno, perfil_professor, minha-conta) antes da virada"
```

---

## Task 5: Virada da leitura de `usersRepo` (Opus)

**Files:**
- Modify: `server/db/repositories.js:268-353` (`userFromRow`, `userToRow`, `usersRepo`)
- Test: `server/__tests__/retratoUsuarios.test.js` (verde sem alteração), `users.test.js`, `gestor_programa.test.js`, `minhaConta.test.js`, `authz.test.js`

O `usersRepo` deixa de usar `createRepository` para ler: lê `users` + `pessoas` + vínculos e **monta** o formato antigo. A cópia em `users` ainda é escrita (volta atrás seguro).

- [ ] **Step 1: Reescrever `userFromRow` e a leitura**

```js
import { PAPEIS_ALUNO, PAPEIS_DOCENTE_TODOS, montarPerfilAluno, montarPerfilProfessor } from './perfilVinculo.js';

const sqlLista = (arr) => `ARRAY[${arr.map((p) => `'${p}'`).join(',')}]::text[]`;   // só constantes do código

// Usuário + a pessoa por trás + os vínculos de aluno/docente dela.
const USER_SELECT = `
  SELECT u.*,
    p.nome AS p_nome, p.cpf AS p_cpf, p.siape AS p_siape, p.foto_url AS p_foto_url, p.telefones AS p_telefones,
    p.lattes AS p_lattes, p.orcid AS p_orcid, p.google_scholar AS p_google_scholar, p.publons AS p_publons,
    p.sexo AS p_sexo, p.nacionalidade AS p_nacionalidade, p.estrangeiro AS p_estrangeiro,
    p.priv_mostrar_email AS p_priv_email, p.priv_mostrar_telefone AS p_priv_telefone,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('programa_id', v.programa_id, 'papel', v.papel, 'ativo', v.ativo,
                                                   'dados', COALESCE(v.dados, '{}'::jsonb)) ORDER BY v.criado_em)
                FROM vinculos v WHERE v.pessoa_id = u.pessoa_id
                 AND v.papel = ANY(${sqlLista([...PAPEIS_ALUNO, ...PAPEIS_DOCENTE_TODOS])})), '[]'::jsonb) AS p_vinculos
  FROM users u LEFT JOIN pessoas p ON p.id = u.pessoa_id`;

const telefonesEmArray = (t) => String(t || '').split(',').map((x) => x.trim()).filter(Boolean);

const userFromRow = (r) => {
  const pessoa = { sexo: r.p_sexo, nacionalidade: r.p_nacionalidade, estrangeiro: r.p_estrangeiro };
  const vinculos = r.p_vinculos || [];
  const roles = r.roles ?? [];
  return {
    id: r.id, email: r.email, password_hash: r.password_hash, roles,
    senhaTemporaria: r.senha_temporaria ?? false,
    privacidade: { mostrar_email: r.p_priv_email ?? false, mostrar_telefone: r.p_priv_telefone ?? false },
    perfil_geral: { nome: r.p_nome, cpf: r.p_cpf, siape: r.p_siape, foto_url: r.p_foto_url, telefones: telefonesEmArray(r.p_telefones) },
    dados_academicos: { lattes: r.p_lattes, orcid: r.p_orcid, google_scholar: r.p_google_scholar, publons: r.p_publons },
    perfil_aluno: roles.includes('Aluno') ? montarPerfilAluno(pessoa, vinculos) : null,
    perfil_professor: roles.includes('Professor') ? montarPerfilProfessor(pessoa, vinculos) : null,
    programaId: r.programa_id ?? null,
    pessoaId: r.pessoa_id ?? null,
    criado_em: r.criado_em, atualizado_em: r.atualizado_em,
    criado_por: r.criado_por ?? null, atualizado_por: r.atualizado_por ?? null,
  };
};
```
`userToRow` **não muda** nesta task (ainda grava a cópia). Antes, compare o que o `userFromRow` antigo devolvia para `perfil_geral.nome` quando a pessoa tinha nome `NULL`: `p_nome` também é `NULL` — igual.

- [ ] **Step 2: `usersRepo` independente da fábrica**

Substitua `usersBase`/`usersRepo` por (mantendo `sincronizarPessoaDoUsuario` como está):

```js
const lerUsuarios = async (where = 'TRUE', params = []) =>
  (await query(`${USER_SELECT} WHERE ${where} ORDER BY u.criado_em ASC`, params)).rows.map(userFromRow);

export const usersRepo = {
  getAll: () => lerUsuarios(),
  async getById(id) { return (await lerUsuarios('u.id = $1', [id]))[0] || null; },
  async findByEmail(email) { return (await lerUsuarios('u.email = $1', [email]))[0] || null; },
  // Compara só os dígitos do CPF (ignora a pontuação). Vazio -> null.
  async findByCpf(cpf) {
    const digits = String(cpf || '').replace(/\D/g, '');
    if (!digits) return null;
    return (await lerUsuarios("regexp_replace(COALESCE(p.cpf, ''), '\\D', '', 'g') = $1", [digits]))[0] || null;
  },
  async create(obj, actor) {
    const row = userToRow(obj);
    if (actor) { row.criado_por = actor; row.atualizado_por = actor; }
    const keys = Object.keys(row);
    await query(`INSERT INTO users (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, keys.map((k) => row[k]));
    const criado = await usersRepo.getById(obj.id);
    await sincronizarPessoaDoUsuario(null, { ...obj, pessoaId: criado.pessoaId, id: obj.id });
    return usersRepo.getById(obj.id);
  },
  async update(id, partial, actor) {
    const antes = await usersRepo.getById(id);
    if (!antes) return null;
    const { _versao, ...dados } = partial;
    const merged = { ...antes, ...dados };
    const row = userToRow(merged);
    delete row.id;
    if (actor) row.atualizado_por = actor;
    const keys = Object.keys(row);
    await query(`UPDATE users SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE id = $${keys.length + 1}`,
      [...keys.map((k) => row[k]), id]);
    await sincronizarPessoaDoUsuario(antes, merged);
    return usersRepo.getById(id);
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount > 0;
  },
  // Usuários visíveis a um Gestor de Programa: os do programa (users.programa_id) ou com vínculo a ele.
  async getScopedToPrograma(programaId) {
    const { rows } = await query(
      `SELECT DISTINCT u.id FROM users u
         LEFT JOIN vinculos v ON ${doUsuario('v.pessoa_id')} AND v.programa_id = $1
        WHERE u.programa_id = $1 OR v.id IS NOT NULL`, [programaId]);
    return rows.length ? lerUsuarios('u.id = ANY($1::text[])', [rows.map((r) => r.id)]) : [];
  },
  async isLinkedToPrograma(userId, programaId) { /* inalterado */ },
};
```
Pontos de atenção (cada um já causou bug nesta base):
- **`sincronizarPessoaDoUsuario` precisa do objeto no formato do app** (`perfil_geral` etc.) — em `create` passe `obj` (não o usuário lido); o que ele devolve (`pessoaId`) já é resolvido pelo `getById` seguinte. Em `create`, o usuário foi inserido **sem** `pessoa_id` e a sincronização o liga (comportamento atual de `sincronizarPessoaDoUsuario`); por isso o `getById` de retorno vem **depois** dela.
- `update` recebe `partial` com `perfil_geral` **completo** nos controllers; em `minhaContaController` e `removeDocente` o spread `...user` vem do `getById` derivado, então a cópia em `users` continua coerente.
- Quem chama `usersRepo.getById` agora recebe `perfil_aluno`/`perfil_professor` **derivados**; o `merged` que `updateUser` monta parte deles — é isso que o `userToRow` (cópia) grava, e é aceitável: a cópia vai ser apagada na Task 8.
- `password_hash` continua no objeto (o `stripHash` dos controllers remove).

- [ ] **Step 3: Rodar os testes de contrato e os de usuário**

Run: `npx vitest run server/__tests__/retratoUsuarios.test.js server/__tests__/users.test.js server/__tests__/gestor_programa.test.js server/__tests__/minhaConta.test.js server/__tests__/authz.test.js server/__tests__/vinculosPessoa.test.js`
Expected: PASS. Diferença esperada e legítima: `removeDocente` ainda mexe em `perfil_professor.programas` (será removido na Task 6); se `vinculosPessoa.test.js:167` falhar por isso, deixe para a Task 6.

- [ ] **Step 4: Suíte completa**

Run: `npx vitest run`
Expected: verde (≈520 testes). Investigue qualquer falha de formato antes de seguir.

- [ ] **Step 5: Conferir no dev (somente leitura) que o retrato não mudou**

Suba o servidor (`npm run dev:server` em background) e compare um usuário real antes/depois: `git stash` **não** — use o commit anterior numa segunda worktree só se precisar; basta conferir `GET /api/users/:id` de um aluno e um professor do dev e ver que `perfil_aluno.nivel`/`situacao`/`entrada`, `perfil_professor.programas` e `dados_academicos` batem com o banco (`SELECT perfil_aluno FROM users WHERE id = …`).

- [ ] **Step 6: Commit**

```bash
git add server/db/repositories.js
git commit -m "refactor(B.13): usersRepo le de pessoas e dos vinculos e monta perfil_geral/perfil_aluno/perfil_professor"
```

---

## Task 6: Demais leituras deixam de olhar `users.perfil_*` (Sonnet)

**Files (todos em `server/`):** `db/identidadeVinculo.js`, `controllers/{programas,programaPublico,contatos,gruposPesquisa,painel,qualidade,importacoes,busca,proficiencia,users}Controller.js`, `db/{estruturaPrpg,posDoutoradoRepo,revisoesRepo}.js`, `services/planilhas/{cadastro,contatosImporter}.js`, `services/importers/{alunos,professores}Importer.js`

Só troca SQL de leitura; nenhuma regra muda. Antes de editar cada arquivo, leia o trecho (números de linha da análise §3.2).

- [ ] **Step 1: `identidadeVinculo.js`**

```js
// Dados da pessoa: só `pessoas` (G1). O 2º parâmetro legado some.
export const campoPessoa = (colPessoa, { p = 'p' } = {}) => `NULLIF(${p}.${colPessoa}, '')`;
export const nomePessoa = ({ u = 'u', p = 'p' } = {}) => `COALESCE(NULLIF(${p}.nome, ''), ${u}.email)`;
```
Atualize **todos** os chamadores de `campoPessoa(x, 'legado')` para `campoPessoa(x)`: `programasController.js:607-610`, `programaPublicoController.js:25`, `contatosController.js:32`. `grep -rn "campoPessoa(" server` deve só mostrar chamadas de um argumento (ou com `{ p }`).

- [ ] **Step 2: Trocas mecânicas**

| Arquivo:linha | Antes | Depois |
|---|---|---|
| `programasController.js:106-118,141-145` (`VINCULOS_JOIN_SELECT`, `VINCULO_ROW_KEYS`, `combinedFromRow`) | seleciona `u.perfil_nome/cpf/siape/telefones` e usa como reserva | tire as 4 colunas `u_perfil_*` do SELECT e de `VINCULO_ROW_KEYS`; `nome: p.nome \|\| row.u_email \|\| ''`, `cpf: p.cpf \|\| ''`, `siape: p.siape \|\| ''`, `telefones: p.telefones \|\| ''`; apague `telefonesDoUsuario` |
| `contatosController.js:28-29` | `u.perfil_nome AS user_nome, u.perfil_foto_url AS user_foto_url` | remova (confirme com `grep user_nome\|user_foto_url` que ninguém mais usa; se usar, troque por `p.nome`/`p.foto_url`) |
| `gruposPesquisaController.js:20,30` | `u.perfil_nome AS u_nome` e `nome: r.u_nome \|\| r.u_email` | `nome: r.p_nome \|\| r.u_email` e tire `u_nome` do SELECT |
| `painelController.js:90`, `qualidadeController.js:63` | `COALESCE(pe.nome, u.perfil_nome)` | `pe.nome` |
| `services/planilhas/contatosImporter.js:267` | `COALESCE(p.nome, u.perfil_nome) AS nome` | `p.nome AS nome` |
| `services/planilhas/cadastro.js:199-200` | `SELECT u.pessoa_id, COALESCE(p.nome, u.perfil_nome), COALESCE(p.cpf, u.perfil_cpf), lower(u.email) FROM users u LEFT JOIN pessoas p …` | `SELECT u.pessoa_id, p.nome, p.cpf, lower(u.email) FROM users u JOIN pessoas p ON p.id = u.pessoa_id` |
| `db/estruturaPrpg.js:70` | `UNION ALL SELECT pessoa_id FROM users WHERE lower(perfil_nome) = …` | apague essa linha (toda pessoa com login está em `pessoas`) |
| `db/estruturaPrpg.js:140` | `coalesce(p.nome, u.perfil_nome) AS nome, coalesce(p.foto_url, u.perfil_foto_url) AS foto` | `p.nome AS nome, p.foto_url AS foto` |
| `db/posDoutoradoRepo.js:23-26,82-83` | reserva `r.u_perfil_*` | `nome: p.nome \|\| null`, `cpf: p.cpf \|\| null`, `telefones: p.telefones \|\| null`; tire `u.perfil_*` do `JOIN_SELECT` |
| `usersController.js:105` (`getUsersResumo`) | `SELECT id, COALESCE(NULLIF(btrim(perfil_nome),''), email) AS nome FROM users WHERE roles && $1 ORDER BY nome` | `SELECT u.id, COALESCE(NULLIF(btrim(p.nome),''), u.email) AS nome FROM users u LEFT JOIN pessoas p ON p.id = u.pessoa_id WHERE u.roles && $1::text[] ORDER BY nome` |
| `importacoesController.js:173` | `u.perfil_nome AS executado_por_nome` com `LEFT JOIN users u ON u.id = i.executado_por` | acrescente `LEFT JOIN pessoas pu ON pu.id = u.pessoa_id` e use `pu.nome AS executado_por_nome` |
| `db/revisoesRepo.js:52` | `COALESCE(NULLIF(u.perfil_nome,''), u.email)` | acrescente `LEFT JOIN pessoas pu ON pu.id = u.pessoa_id` e `COALESCE(NULLIF(pu.nome,''), u.email)` |
| `proficienciaController.js:121-131` (`verificarAluno`) | `FROM users u JOIN vinculos v ON ${doUsuario('v.pessoa_id')} … lower(regexp_replace(btrim(u.perfil_nome)…` | `FROM vinculos v JOIN pessoas p ON p.id = v.pessoa_id WHERE v.ativo = TRUE AND v.papel = ANY($1::text[]) AND lower(regexp_replace(btrim(p.nome), '\\s+', ' ', 'g')) = $2 LIMIT 1` (passa a reconhecer aluno sem login, o que é o certo) |
| `buscaController.js:29` (tipo `usuarios`) | `tabela: 'users', titulo: "COALESCE(NULLIF(btrim(perfil_nome),''), email)", detalhe: 'email', colunas: ['perfil_nome','email'], ordem: 'perfil_nome'` | `tabela: 'users u LEFT JOIN pessoas p ON p.id = u.pessoa_id', id: 'u.id', titulo: "COALESCE(NULLIF(btrim(p.nome),''), u.email)", detalhe: 'u.email', colunas: ['p.nome','u.email'], ordem: 'p.nome'`; em `buscarConteudo` use `${tipo.id \|\| 'id'} AS id` no SELECT |

- [ ] **Step 3: Sem mais `perfil_*` de leitura nos importadores e em `removeDocente`**

- `programasController.js:676-700` (`removeDocente`): apague o bloco que lê `usersRepo.getById(usuario_id)` e atualiza `perfil_professor.programas` (a API agora deriva `programas` dos vínculos); mantenha só o `UPDATE vinculos SET ativo=FALSE`. Atualize o comentário da função. Em `vinculosPessoa.test.js:167-173` troque a asserção para: depois do `DELETE`, `GET /api/users/u-ana` devolve `perfil_professor.programas` sem `prog-1` (o `UPDATE users SET perfil_professor` do arranjo some).
- `professoresImporter.js:129-150`: `programas`/`jaProfessor` — troque `existente.perfil_professor?.programas` por nada (a variável `programas` some); `merged` deixa de montar `perfil_professor` (a fonte é o vínculo). `alunosImporter.js:214` (`perfil_aluno: { ...(existente.perfil_aluno \|\| {}), ...perfilAluno }`) fica (vai para a cópia e para `gravarPerfilNosVinculos`); será limpo na Task 8.

- [ ] **Step 4: Não sobrou leitura**

Run: `grep -rn -E "u\.(perfil_|acad_)|\bperfil_(nome|cpf|siape|foto_url|telefones)\b|acad_(lattes|orcid|google_scholar|publons)" server --include=*.js --include=*.mjs | grep -v __tests__ | grep -v "server/db/migrations"`
Expected: só restam `repositories.js` (`userToRow`), `pessoaDoUsuario.js`, `pessoasRepo.js`, `backfill-pessoas.mjs`, `arquivosUsos.js:35` (tratados nas Tasks 8 e 10).

- [ ] **Step 5: Suíte completa**

Run: `npx vitest run` → Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add server
git commit -m "refactor(B.13): consultas deixam de ler users.perfil_*; pessoas e a unica fonte do nome, foto e links"
```

---

## Task 7: Front-end — flags falsas e código morto (Sonnet)

**Files:**
- Modify: `src/pages/admin/AdminUserForm.jsx`, `src/pages/admin/AdminUsersList.jsx`
- Modify: `src/pages/programa/ProgramaComissoes.jsx:16-17`, `ProgramaSobre.jsx:58`
- Test: `src/__tests__/` (novo `usuarioForm.test.jsx`, se couber no padrão de `formularios.test.jsx`)

O formato da API não mudou, então o painel continua funcionando; aqui se tira o que nunca funcionou.

- [ ] **Step 1: Formulário**
  - `AdminUserForm.jsx:21`: `defaultPrivacidade = { mostrar_email: true, mostrar_telefone: false }`; remova os checkboxes `perfil_publico` (`:410-413`) e `mostrar_lattes`, e o `opacity-50 pointer-events-none` dependente de `perfil_publico`: os dois checkboxes restantes ficam sempre ativos. Texto do título: "Controles de Privacidade" permanece; acrescente abaixo dos checkboxes `<p className="text-xs text-gray-500">Escolhas registradas; a exibição pública ainda não as consulta.</p>` (é a verdade hoje — D4).
  - `tipo_professor` já é o nome que a API devolve (`perfil_professor.tipo_professor`, junto de `tipo`); mantenha `TIPOS_PROFESSOR` (inclui Visitante).
- [ ] **Step 2: Lista** — `AdminUsersList.jsx:70-75`: remova a coluna "Visibilidade" (lia `perfil_publico`, nunca persistido).
- [ ] **Step 3: Código morto público** — `ProgramaComissoes.jsx:16-17` → `const nome = pessoa?.nome || '—'; const foto = pessoa?.foto_url;`; `ProgramaSobre.jsx:58` → `{c.nome || '—'}`.
- [ ] **Step 4: Testes** — `npm run test:front` (os existentes) → PASS. Se criar `usuarioForm.test.jsx`, teste que o formulário não renderiza "Perfil Visível no Site Público".
- [ ] **Step 5: Conferir no navegador** — com `npm run dev` (ou o preview do app): abrir `/admin/users`, `/admin/users/editar/<id de um aluno>` e `/admin/users/editar/<id de um professor>`; conferir que os campos (nome, telefones, Lattes, entrada, situação, programas do professor) aparecem preenchidos como antes, salvar uma alteração de telefone e ver que volta; abrir `/programas/profiap` (ou outro programa publicado) e a aba de docentes.
- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "fix(B.13): tira do painel as flags de privacidade que nunca persistiram e o codigo morto de perfil_nome"
```

---

## Task 8: Fim da cópia em `users` (Opus)

**Files:**
- Modify: `server/db/repositories.js` (`userToRow`, `usersRepo.create/update`)
- Modify: `server/db/pessoaDoUsuario.js` (reescrito), `server/db/pessoasRepo.js` (remove `criarPessoaDeUsuario`, ajusta `resolverOuCriarPessoa`)
- Delete: `server/db/backfill-pessoas.mjs`
- Modify: importadores (tiram `perfil_aluno`/`perfil_professor`/`perfil_geral` do `novo`/`merged` que só serviam à cópia), `server/scripts/seedAdmin.js` (mantém `perfil_geral`: o `usersRepo.create` ainda aceita esse formato de entrada)
- Test: `server/__tests__/migracoesB11.test.js` (ajuste), `vinculosPessoa.test.js`, suíte

A partir daqui `users` não recebe mais dado de pessoa. A pessoa nasce **antes** do login.

- [ ] **Step 1: Teste da regra nova (falha)**

Em `users.test.js`:

```js
it('G1: o cadastro não grava dado de pessoa em users (só em pessoas)', async () => {
  const token = await loginAdmin();
  await request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
    .send({ email: 'sp@t.br', roles: ['Gestor'], perfil_geral: { nome: 'Só Pessoa', telefones: ['81 9'] },
            dados_academicos: { lattes: 'http://l' } }).expect(201);
  const { rows: [u] } = await pool.query(`SELECT perfil_nome, perfil_telefones, acad_lattes, pessoa_id FROM users WHERE email = 'sp@t.br'`);
  expect(u.perfil_nome).toBeNull();
  expect(u.acad_lattes).toBeNull();
  expect(u.pessoa_id).not.toBeNull();
  const { rows: [p] } = await pool.query('SELECT nome, telefones, lattes FROM pessoas WHERE id = $1', [u.pessoa_id]);
  expect(p).toEqual({ nome: 'Só Pessoa', telefones: '81 9', lattes: 'http://l' });
});
```
Run → FAIL (a cópia ainda é gravada).

- [ ] **Step 2: `pessoaDoUsuario.js` reescrito**

Mantenha `CAMPOS`, `camposAPropagar`, `gravar` e `pessoaSemLoginPorCpf` (com as mudanças da Task 3). Troque `sincronizarPessoaDoUsuario` por duas funções:

```js
// Antes do INSERT do login: a pessoa que o novo usuário vai ter — uma sem login com o mesmo
// CPF (não duplica quem veio de planilha) ou uma nova. Devolve { pessoaId, reaproveitada }.
export async function pessoaParaNovoUsuario(obj) {
  const existente = await pessoaSemLoginPorCpf(normalizarCpf(obj.perfil_geral?.cpf));
  if (existente) return { pessoaId: existente, reaproveitada: true };
  const pessoaId = crypto.randomUUID();
  await query('INSERT INTO pessoas (id) VALUES ($1)', [pessoaId]);
  return { pessoaId, reaproveitada: false };
}

// Depois de gravar o login: leva à pessoa o que o app mandou (`antes` = estado anterior, ou null).
export async function gravarPessoaDoUsuario(pessoaId, antes, depois, { soVazios = false } = {}) {
  await gravar(pessoaId, camposAPropagar(antes, depois), { soVazios });
}
```
(importe `crypto`; remova o import de `criarPessoaDeUsuario`.)

- [ ] **Step 3: `usersRepo.create/update` e `userToRow`**

`userToRow` fica só com a credencial:

```js
const userToRow = (o) => ({
  id: o.id, email: o.email, password_hash: o.password_hash, roles: toArr(o.roles),
  senha_temporaria: o.senhaTemporaria != null ? !!o.senhaTemporaria : false,
  programa_id: o.programaId || null,
  pessoa_id: o.pessoaId || null,
  criado_em: o.criado_em || new Date().toISOString(),
  atualizado_em: o.atualizado_em || new Date().toISOString(),
});
```
`create`:

```js
  async create(obj, actor) {
    const { pessoaId, reaproveitada } = obj.pessoaId ? { pessoaId: obj.pessoaId, reaproveitada: true } : await pessoaParaNovoUsuario(obj);
    const row = userToRow({ ...obj, pessoaId });
    if (actor) { row.criado_por = actor; row.atualizado_por = actor; }
    const keys = Object.keys(row);
    await query(`INSERT INTO users (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, keys.map((k) => row[k]));
    await gravarPessoaDoUsuario(pessoaId, null, obj, { soVazios: reaproveitada });
    return usersRepo.getById(obj.id);
  },
```
`update`: troque `sincronizarPessoaDoUsuario(antes, merged)` por `await gravarPessoaDoUsuario(antes.pessoaId, antes, merged)`. Ajuste o comentário do topo do bloco. Remova `userFromRow` colunas antigas se ainda houver referência.

- [ ] **Step 4: Limpar o que só existia para a cópia**

- `pessoasRepo.js`: apague `criarPessoaDeUsuario` (`:12-40`) e, em `resolverOuCriarPessoa`, o ramo `if (viaUser[0]) return criarPessoaDeUsuario(...)` (todo usuário agora tem pessoa). Apague `server/db/backfill-pessoas.mjs` e confira `package.json`/docs por referências (`grep -rn backfill-pessoas .`).
- Importadores: em `alunosImporter.js` e `professoresImporter.js`, remova as chaves `perfil_aluno`/`perfil_professor` do `novo` (e do `merged`), mantendo `perfil_geral`/`dados_academicos` (o `usersRepo.create` os lê). O `perfilAluno` continua só para `gravarPerfilNosVinculos`.
- `server/__tests__/helpers.js` `seedUserComPessoa`: o ramo "sem pessoa" vira código morto; simplifique para devolver `{ usuarioId: id, pessoaId }` lendo `users.pessoa_id`.
- `migracoesB11.test.js`: os testes da migração A inserem `users` sem pessoa e leem `perfil_*`; eles continuam válidos **enquanto** as colunas existem (caem na Task 10). Rode-os; se quebrarem por `usersRepo` agora criar pessoa sozinho, ajuste o arranjo (`UPDATE users SET pessoa_id = NULL` já está lá).

- [ ] **Step 5: Igualdade "a cópia não tinha nada só nela"**

Rode no dev (somente leitura) e guarde a saída: a consulta 2 de `docs/operations/g1-pre-verificacao.sql` (divergência `users` × `pessoas`). Expected no dev: zeros. Se a produção mostrar diferença, **pare** e trate antes da Task 10.

- [ ] **Step 6: Rodar**

Run: `npx vitest run server/__tests__/users.test.js server/__tests__/retratoUsuarios.test.js server/__tests__/vinculosPessoa.test.js server/__tests__/migracoesB11.test.js server/__tests__/legado.test.js` e depois `npx vitest run`.
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A server
git commit -m "refactor(B.13): users deixa de receber dado de pessoa; a pessoa nasce antes do login e pessoaDoUsuario vira escrita direta"
```

---

## Task 9: `user_linhas_pesquisa` por pessoa (Sonnet, revisão do Opus)

**Files:**
- Create: `server/db/migrations/2026-09-30_g1b_linhas_pesquisa_pessoa.sql`
- Modify: `server/db/schema.sql:826-830`, `server/db/repositories.js:632-650` (`linhasPesquisaRepo.getByUser/setForUser`)
- Modify: `server/controllers/usersController.js:130,242,325`, `server/services/importers/{alunos,professores}Importer.js` (`vincularLinhas`)
- Test: `server/__tests__/migracoesG1.test.js`, `users.test.js`

- [ ] **Step 1: Testes (falham)**

Em `migracoesG1.test.js` (novo `describe` com `const MIG_B = '2026-09-30_g1b_linhas_pesquisa_pessoa.sql'`): criar a tabela **no formato antigo** dentro do teste não é possível (o schema já terá o novo); teste então só o que importa em banco novo: `rodarMigracao(MIG_B)` é idempotente (roda duas vezes sem erro) e a tabela tem `pessoa_id` e não tem `user_id`. Em `users.test.js`: `PUT /api/users/:id` com `linhas_pesquisa_ids` grava por pessoa (`SELECT pessoa_id FROM user_linhas_pesquisa`) e `GET /api/users/:id` devolve `linhas_pesquisa`; e dois usuários não se misturam.

- [ ] **Step 2: Migração**

```sql
-- B.13 / G1: linhas de pesquisa são da pessoa, não do login. Idempotente.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'user_linhas_pesquisa' AND column_name = 'user_id') THEN
    ALTER TABLE user_linhas_pesquisa ADD COLUMN IF NOT EXISTS pessoa_id TEXT;
    UPDATE user_linhas_pesquisa ul SET pessoa_id = u.pessoa_id FROM users u WHERE u.id = ul.user_id;
    DELETE FROM user_linhas_pesquisa WHERE pessoa_id IS NULL;
    ALTER TABLE user_linhas_pesquisa DROP CONSTRAINT IF EXISTS user_linhas_pesquisa_pkey;
    ALTER TABLE user_linhas_pesquisa DROP COLUMN user_id;
    ALTER TABLE user_linhas_pesquisa ALTER COLUMN pessoa_id SET NOT NULL;
    ALTER TABLE user_linhas_pesquisa ADD PRIMARY KEY (pessoa_id, linha_id);
    ALTER TABLE user_linhas_pesquisa ADD CONSTRAINT user_linhas_pesquisa_pessoa_id_fkey
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE;
  END IF;
END$$;
```
(`DROP COLUMN user_id` já derruba a FK para `users`. Se `DELETE … WHERE pessoa_id IS NULL` apagar algo, é linha de usuário sem pessoa — não existe depois da migração A da B.11.)

- [ ] **Step 3: `schema.sql`**

```sql
-- Pessoas (professores e alunos) referenciam suas linhas de pesquisa (N:M). B.13: por pessoa, não por login.
CREATE TABLE IF NOT EXISTS user_linhas_pesquisa (
  pessoa_id TEXT    NOT NULL REFERENCES pessoas(id)           ON DELETE CASCADE,
  linha_id  INTEGER NOT NULL REFERENCES linhas_pesquisa(id)   ON DELETE CASCADE,
  PRIMARY KEY (pessoa_id, linha_id)
);
```
(A tabela `pessoas` vem antes no arquivo — confirme a posição; o nome `user_linhas_pesquisa` fica para não tocar `RESET_TABLES`.)

- [ ] **Step 4: Código**

`repositories.js`: `getByUser(userId)` → `getByPessoa(pessoaId)` (`WHERE ulp.pessoa_id = $1`), `setForUser` → `setForPessoa(pessoaId, linhaIds)` (`DELETE … WHERE pessoa_id = $1`; `INSERT (pessoa_id, linha_id)`). `usersController.js:130` `linhasPesquisaRepo.getByPessoa(user.pessoaId)`, `:242` `setForPessoa(created.pessoaId, ids)`, `:325` `setForPessoa(updated.pessoaId, ids)`. Os dois `vincularLinhas(userId, …)` dos importadores viram `vincularLinhas(pessoaId, …)` e recebem `existente.pessoaId`/`created.pessoaId`. `grep -rn "user_linhas_pesquisa\|getByUser\|setForUser" server` deve ficar só com o schema, a migração, o repo e os testes.

- [ ] **Step 5: Aplicar no dev e rodar**

```bash
docker exec prpg-postgres pg_dump -U prpg prpg > "$TEMP/prpg-antes-g1b.sql"
npm run db:migrate:apply
docker exec -i prpg-postgres psql -U prpg -d prpg -c "SELECT count(*), count(DISTINCT pessoa_id) FROM user_linhas_pesquisa"
```
Expected: `76 | 76`. Depois `npx vitest run server/__tests__/migracoesG1.test.js server/__tests__/users.test.js server/__tests__/legado.test.js server/__tests__/resetDb.test.js`.

- [ ] **Step 6: Commit**

```bash
git add server
git commit -m "refactor(B.13): linhas de pesquisa passam a pertencer a pessoa (user_linhas_pesquisa.pessoa_id)"
```

---

## Task 10: Remoção das colunas e baseline do `migrateRunner` (Opus) — **último commit de código**

**Pré-requisito de parada:** a consulta de igualdade da Task 8 na **produção** sem divergência, e backup feito. Se não houver produção a conferir ainda, prossiga só com o dev e deixe registrado na Task 11.

**Files:**
- Create: `server/db/migrations/2026-09-30_g1c_remove_colunas_users.sql`
- Modify: `server/db/schema.sql` (`users`, comentários), `server/db/migrateRunner.mjs`, `server/db/arquivosUsos.js:35`
- Modify: `server/__tests__/migrateRunner.test.js`, `migracoesB11.test.js`, `migracoesG1.test.js`
- Modify: `server/__tests__/robustez.test.js:83`, `users.test.js:64`, `vinculosPessoa.test.js` (SQL cru em colunas removidas)

- [ ] **Step 1: Testes do baseline (falham)**

Em `migrateRunner.test.js`, novo `describe('adoção do baseline')`: use uma tabela `schema_migrations` **vazia** (o `beforeEach` já a cria; apague as linhas reais só dentro de uma transação de teste **não**: use um `pool` isolado? Mais simples: teste a função pura). Exporte de `migrateRunner.mjs` a função `versoesDoBaseline(migrations, baselineAte)` e teste-a:

```js
import { versoesDoBaseline } from '../db/migrateRunner.mjs';
it('marca só as migrações até o baseline', () => {
  const ms = ['2026-09-30_b11a_x.sql', '2026-09-30_g1c_remove_colunas_users.sql', '2026-10-01_depois.sql'].map((version) => ({ version }));
  expect(versoesDoBaseline(ms, '2026-09-30_g1c_remove_colunas_users.sql')).toEqual(['2026-09-30_b11a_x.sql', '2026-09-30_g1c_remove_colunas_users.sql']);
});
```
e um teste de integração do `bancoEstaNoBaseline(client)` (exportado): contra o `prpg_test` (criado do `schema.sql` final) deve devolver `true`.

- [ ] **Step 2: Runner**

```js
export const BASELINE_ATE = '2026-09-30_g1c_remove_colunas_users.sql';

// Migrações já refletidas no schema.sql (até o baseline).
export const versoesDoBaseline = (migrations, baselineAte = BASELINE_ATE) =>
  migrations.map((m) => m.version).filter((v) => v.localeCompare(baselineAte) <= 0);

// O banco foi criado do schema.sql final (tem o que a G1 acrescentou e não tem o que removeu).
export async function bancoEstaNoBaseline(client) {
  const { rows: [r] } = await client.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pessoas' AND column_name = 'priv_mostrar_email') AS tem_novo,
           NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'perfil_nome') AS sem_antigo`);
  return r.tem_novo && r.sem_antigo;
}
```
Em `applyMigrations`, logo depois de ler `applied`:

```js
    // Banco novo criado do schema.sql final: as migrações até o baseline já estão nele
    // (algumas, como a b11a, nem rodariam — leem colunas que não existem mais).
    if (applied.size === 0 && await bancoEstaNoBaseline(client)) {
      for (const m of migrations.filter((x) => versoesDoBaseline([x]).length)) {
        await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2) ON CONFLICT DO NOTHING', [m.version, m.checksum]);
        applied.set(m.version, m.checksum);
      }
    }
```
(`justApplied` não inclui as adotadas; o `skipped` do retorno as conta porque `migrations.length - justApplied.length`.) Os testes de `migrateRunner.test.js` usam versões `900x` que ordenam **depois** do baseline — seguem rodando normalmente.

- [ ] **Step 3: Migração g1c**

```sql
-- =====================================================================
-- B.13 / G1 (docs/analise-g1-users-credencial.md): remove de users a cópia legada dos dados da
-- pessoa (a fonte é `pessoas` e `vinculos.dados` desde as migrações g1a/g1b e o código da G1).
-- FORWARD-ONLY: tire backup antes. users.pessoa_id passa a NOT NULL.
-- =====================================================================
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM users WHERE pessoa_id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'G1: % usuário(s) sem pessoa_id — rode a migração b11a antes', n; END IF;
END$$;

ALTER TABLE users ALTER COLUMN pessoa_id SET NOT NULL;
ALTER TABLE users
  DROP COLUMN IF EXISTS priv_mostrar_email,
  DROP COLUMN IF EXISTS priv_mostrar_telefone,
  DROP COLUMN IF EXISTS perfil_nome,
  DROP COLUMN IF EXISTS perfil_cpf,
  DROP COLUMN IF EXISTS perfil_siape,
  DROP COLUMN IF EXISTS perfil_foto_url,
  DROP COLUMN IF EXISTS perfil_telefones,
  DROP COLUMN IF EXISTS acad_lattes,
  DROP COLUMN IF EXISTS acad_orcid,
  DROP COLUMN IF EXISTS acad_google_scholar,
  DROP COLUMN IF EXISTS acad_publons,
  DROP COLUMN IF EXISTS perfil_aluno,
  DROP COLUMN IF EXISTS perfil_professor;
```

- [ ] **Step 4: `schema.sql` no estado final**

`users` (`:13-42`) fica:

```sql
-- Credencial de acesso (G1/B.13): 0..1 por pessoa. Dados da pessoa vivem em `pessoas`;
-- o que é de vínculo, em `vinculos.dados`.
CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  -- TRUE quando a senha é provisória (padrão 'Mudar123' ou reset pelo admin): ...(mantenha o comentário atual)
  senha_temporaria      BOOLEAN DEFAULT FALSE,
  roles                 TEXT[] NOT NULL DEFAULT '{}',
  -- Gestor de Programa: ... (mantenha o comentário atual)
  programa_id           TEXT,
  -- FK+UNIQUE adicionadas mais abaixo, depois que `pessoas` existe.
  pessoa_id             TEXT NOT NULL,
  criado_em             TIMESTAMPTZ DEFAULT now(),
  atualizado_em         TIMESTAMPTZ DEFAULT now(),
  criado_por            TEXT,
  atualizado_por        TEXT
);
```
Atualize os comentários que citam `perfil_aluno/perfil_professor` (`schema.sql:350` — `sexo` — e o comentário do topo sobre a B.11/G1).

- [ ] **Step 5: Demais ajustes**
  - `arquivosUsos.js:35`: apague a linha de `users.perfil_foto_url` (a de `pessoas.foto_url`, `:36`, já cobre).
  - Testes: `migracoesB11.test.js` — apague o `describe` da migração A (ela lê colunas que não existem no `schema.sql` final; o baseline a cobre) e mantenha os da migração B; `migracoesG1.test.js` — apague os testes da g1a (mesmo motivo) e mantenha os da g1b. `robustez.test.js:83`: `INSERT INTO users` sem `perfil_nome/perfil_cpf` (crie a pessoa antes, ou use `seedUser`). `users.test.js:64` e `vinculosPessoa.test.js:168-173`: troque o arranjo por `perfil_professor` via API/vínculos. `grep -rn -E "perfil_(nome|cpf|siape|foto|telefones)|acad_|perfil_aluno|perfil_professor" server/__tests__` só pode achar o **formato da API** (`perfil_aluno:`/`perfil_professor:` em corpos de requisição), nunca SQL em coluna.
  - Aplicar no dev: `pg_dump` de backup; `npm run db:migrate:apply`; conferir `\d users`.

- [ ] **Step 6: Rodar tudo**

Run: `npx vitest run` e `npm run test:front`
Expected: verde. Confirme também um banco **novo**: `npx vitest run server/__tests__/resetDb.test.js server/__tests__/migrateRunner.test.js` (o `prpg_test` nasce do `schema.sql` final).

- [ ] **Step 7: Commit**

```bash
git add -A server
git commit -m "feat(B.13): remove de users as colunas de dados da pessoa; migrateRunner adota o schema.sql como baseline"
```

---

## Task 11: Registro e fechamento (Sonnet)

**Files (CRLF):** `PLANO.md`, `CLAUDE.md`, `arquitetura-dados.md`, `docs/analise-g1-users-credencial.md`, `docs/operations/g1-pre-verificacao.sql` (nada), memória

- [ ] **Step 1: `PLANO.md`** — B.13 vira `[x]` com a data, a linha do plano executado e as decisões D1–D7; linha da Fase B no §17 (contagem `…; B.11/B.12/B.13 aplicadas em 30/09/2026`). Acrescente no registro de execução um parágrafo curto "30/09/2026 — G1 fechada" com: formato da API mantido; `users` só credencial; `vinculos.dados`; achados fora do escopo (senha padrão, flags de privacidade sem efeito no site, `orientador_id` órfão).
- [ ] **Step 2: `CLAUDE.md`** — atualizar: "Users" na tabela de controllers; a descrição de `pessoaDoUsuario.js` (some) e de `repositories.js`/`usersRepo` ("monta o formato `perfil_geral` a partir de `pessoas`"); `identidadeVinculo.js` (`campoPessoa` de um argumento); nota de que `users` é só credencial, `vinculos.dados`, `perfilVinculo.js`, `user_linhas_pesquisa` por `pessoa_id`; "Testing": a contagem de testes e que `migrateRunner` adota o baseline; "Checking User Roles"/seed se citar `perfil_*`.
- [ ] **Step 3: `arquitetura-dados.md`** — §5.1: nota de conclusão da G1 (30/09/2026) com o que divergiu da A.2a (`nivel` do egresso em `dados.nivel`; `qualificacao` placeholder; `orientador_legado`); `priv_*` em `pessoas`.
- [ ] **Step 4: `docs/analise-g1-users-credencial.md`** — cabeçalho: `Status: implementado em 30/09/2026 — plano em docs/superpowers/plans/2026-09-30-b13-g1-users-credencial.md`; §7: as decisões tomadas; §8: como foi no dev (contagens reais da Task 1 e da Task 9).
- [ ] **Step 5: Verificação final** — `npx vitest run`, `npm run test:front`, `npm run lint`, e no navegador: login, `/admin/users` (lista, busca), edição de um aluno e de um professor, `/minha-conta` (salvar telefone), uma página pública de programa (docentes/discentes), Ctrl+K "usuários".
- [ ] **Step 6: Commit**

```bash
git add PLANO.md CLAUDE.md arquitetura-dados.md docs
git commit -m "docs(B.13): registra a G1 fechada — users so credencial"
```

---

## Autoavaliação do plano

- **Cobertura da análise:** §3.1 → Tasks 5/8/10; §3.2 → Task 6; §3.3 (formato da API) → Tasks 4/5; §3.4 (JSONB) → Tasks 1/2/3; §3.5 (importadores) → Tasks 3/6/8; §3.6 (front) → Task 7; §3.7 (testes) → Tasks 1/4/10; §3.8 (`user_linhas_pesquisa`; `programa_id` fica) → Task 9/D6; achados §4.1–4.10 → Tasks 1–3/7; §4.12 (baseline) → Task 10. Fora do escopo declarado: senha padrão (§4.11, tarefa em separado), privacidade no site público, tela de pessoas.
- **Ordem segura:** até a Task 8 a cópia em `users` segue sendo gravada; a Task 10 (forward-only) é o último commit de código e só roda depois da igualdade conferida.
- **Pontos de maior risco para o revisor:** Task 5 (o `sincronizarPessoaDoUsuario`/`create` ainda ligam o usuário à pessoa; ordem do `getById` de retorno), Task 3 (`reconciliarProgramas` cria/encerra vínculos a partir do array do formulário — só para Administrator/Gestor), Task 8 (pessoa antes do login; `gravar` em modo `soVazios` não pode tocar booleanos), Task 10 (baseline só adota banco sem `schema_migrations` **e** já no formato novo).
