# B.11 — FK real de `vinculos.pessoa_id` e `camara_relatorias.relator_id` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fazer `vinculos.pessoa_id` e `camara_relatorias.relator_id` apontarem sempre para `pessoas(id)`, com FK `ON DELETE RESTRICT`, sem que nenhuma tela ou notificação perca dado no caminho. Mudanças visíveis intencionais: docente/discente cadastrado só como `pessoas` passa a aparecer nas páginas públicas (Task 3); o CPF exibido no painel vem normalizado em 11 dígitos (Task 3); excluir usuário encerra os vínculos em vez de apagá-los (Task 9).

**Architecture:** um módulo único (`server/db/identidadeVinculo.js`) concentra como se acha a pessoa e o login por trás de um vínculo. Durante a transição ele aceita as duas formas gravadas (`users.id` legado ou `pessoas.id`); na Task 11 passa a aceitar só `pessoas.id`, sem mexer nos chamadores. A ordem é: sincronizar `users → pessoas` → leituras tolerantes → escritas gravando `pessoas.id` → migração de dado + FK → simplificação. Cada task funciona com o dado antigo e com o novo.

**Tech Stack:** Express, PostgreSQL 16 (`pg`), Vitest + supertest (servidor), Vitest + jsdom (front), React 19.

**Spec:** [`docs/analise-fk-vinculos-pessoa-id-b3.md`](../../analise-fk-vinculos-pessoa-id-b3.md) — inventário, decisões D-B11a/b/c. Item **B.11** do `PLANO.md`.

---

## Antes de começar

- Banco de pé (`docker ps` mostra `prpg-postgres` healthy). **Não** rodar `docker compose up` se ele já estiver saudável.
- Um teste isolado: `npx vitest run server/__tests__/<arquivo>.test.js`. Suíte do servidor: `npx vitest run` (~2 min; sem TTY o reporter só mostra falhas). Front: `npm run test:front`.
- `prpg_test` é **compartilhado**: o `globalSetup` recria o banco a cada execução. Não rodar vitest ao mesmo tempo que outra sessão/worktree.
- Commits direto na `main`, histórico linear, mensagem em português no padrão do repo (`feat`/`fix`/`test`/`refactor`/`docs`). Um commit por task.
- **Vocabulário da API depois deste plano** (toda resposta que traz uma pessoa de vínculo):
  - `pessoa_id` = o `pessoas.id` da pessoa (só é `users.id` no caso legado de usuário ainda sem `pessoas`, que some na Task 2).
  - `usuario_id` = o `users.id` do login dela, ou `null`. **Só nas respostas do painel**; as públicas não expõem.
  - Na entrada, o servidor aceita `users.id` **ou** `pessoas.id` em `pessoa_id`/`relatorId`/`liderIds` e converte.

## Mapa de arquivos

| Arquivo | Papel | Task |
|---|---|---|
| `docs/operations/b11-pre-verificacao.sql` (novo) | contagens só-leitura para rodar em cada banco antes da Task 10 | 0 |
| `server/db/identidadeVinculo.js` (novo) | joins/filtros da pessoa de um vínculo; `idsDaMesmaPessoa`; `pessoaCanonica` | 1, 9, 11 |
| `server/__tests__/helpers.js` | `seedUserComPessoa`; ordem de `RESET_TABLES` | 1, 10 |
| `server/__tests__/vinculosPessoa.test.js` (novo) | testes de todas as tasks, rodando com o vínculo gravado pelas duas formas | 1–11 |
| `server/db/pessoaDoUsuario.js` (novo) | sincronização `users → pessoas` (D-B11b) | 2 |
| `server/db/pessoasRepo.js` | exporta `criarPessoaDeUsuario` | 2, 11 |
| `server/db/repositories.js` | `usersRepo.create/update` sincronizam; escopo do gestor | 2, 5 |
| `server/db/migrations/2026-09-30_b11a_pessoas_de_usuarios.sql` (novo) | pessoa para todo usuário + reconciliação | 2 |
| `server/__tests__/migracoesB11.test.js` (novo) | testes das duas migrações | 2, 10 |
| `server/controllers/programasController.js` | leituras, duplicidade, coordenação, escritas | 3, 9 |
| `src/pages/admin/AdminProgramaPessoas.jsx`, `AdminProgramaComissoes.jsx`, `AdminProgramaForm.jsx` | usar `usuario_id` | 4 |
| `src/__tests__/vinculosUsuario.test.jsx` (novo) | teste de componente | 4 |
| `server/controllers/usersController.js` | lista de usuários, cadastro, exclusão | 5, 9 |
| `server/controllers/proficienciaController.js` | `verificarAluno` | 5 |
| `server/controllers/camaraController.js` | "Meus processos", `addRelatoria` | 6, 9 |
| `server/services/prazos.js` | `resolverPessoa` (e-mail das notificações) | 6 |
| `server/db/posDoutoradoRepo.js` | pessoa/e-mail do pós-doutorando | 6, 9 |
| `server/controllers/gruposPesquisaController.js`, `contatosController.js`, `painelController.js`, `programaPublicoController.js`, `qualidadeController.js`, `server/db/estruturaPrpg.js`, `server/services/planilhas/contatosImporter.js` | trocar o join duplo pelo do módulo | 7 (+9 grupos) |
| `server/services/importers/professoresImporter.js`, `alunosImporter.js` | duplicidade e escrita | 8, 9 |
| `server/db/migrations/2026-09-30_b11b_fk_vinculos_pessoa.sql` (novo) | reponta o dado e cria as FKs | 10 |
| `server/db/schema.sql` | FKs no baseline + comentários | 10 |
| `server/__tests__/acabamento.test.js`, `minhaConta.test.js`, `programas.test.js`, `gestor_programa.test.js` | ajustes | 3, 10 |
| `PLANO.md`, `CLAUDE.md`, `docs/analise-fk-vinculos-pessoa-id-b3.md` | registro | 12 |

---

## Task 0: Pré-verificação e linha de base

**Files:**
- Create: `docs/operations/b11-pre-verificacao.sql`

- [ ] **Step 1: Criar o script de contagem (só leitura)**

```sql
-- B.11 — pré-verificação (SOMENTE LEITURA). Rodar em cada banco antes de
-- aplicar a migração 2026-09-30_b11b_fk_vinculos_pessoa.sql:
--   docker exec -i prpg-postgres psql -U prpg -d prpg < docs/operations/b11-pre-verificacao.sql
-- "orfaos" e "colisoes" precisam dar 0; se não derem, a migração aborta.
SELECT 'vinculos: total' AS item, count(*) AS n FROM vinculos
UNION ALL SELECT 'vinculos: aponta para users.id', count(*) FROM vinculos v WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = v.pessoa_id)
UNION ALL SELECT 'vinculos: aponta para pessoas.id', count(*) FROM vinculos v WHERE EXISTS (SELECT 1 FROM pessoas p WHERE p.id = v.pessoa_id)
UNION ALL SELECT 'vinculos: orfaos', count(*) FROM vinculos v
  WHERE v.pessoa_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = v.pessoa_id)
    AND NOT EXISTS (SELECT 1 FROM pessoas p WHERE p.id = v.pessoa_id)
UNION ALL SELECT 'relatorias: total', count(*) FROM camara_relatorias
UNION ALL SELECT 'relatorias: aponta para users.id', count(*) FROM camara_relatorias r WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = r.relator_id)
UNION ALL SELECT 'relatorias: orfaos', count(*) FROM camara_relatorias r
  WHERE r.relator_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.relator_id)
    AND NOT EXISTS (SELECT 1 FROM pessoas p WHERE p.id = r.relator_id)
UNION ALL SELECT 'colisoes users.id = pessoas.id', count(*) FROM users u JOIN pessoas p ON p.id = u.id
UNION ALL SELECT 'usuarios sem pessoa', count(*) FROM users WHERE pessoa_id IS NULL
UNION ALL SELECT 'mesma pessoa com vinculo pelos dois ids', count(*) FROM users u
  WHERE EXISTS (SELECT 1 FROM vinculos WHERE pessoa_id = u.id) AND EXISTS (SELECT 1 FROM vinculos WHERE pessoa_id = u.pessoa_id);

-- Números que não podem mudar com a migração (comparar antes e depois da Task 10):
SELECT programa_id, papel, count(*) AS vinculos_ativos
  FROM vinculos WHERE ativo GROUP BY 1, 2 ORDER BY 1, 2;
```

- [ ] **Step 2: Rodar no banco de desenvolvimento e guardar a saída**

Run: `docker exec -i prpg-postgres psql -U prpg -d prpg < docs/operations/b11-pre-verificacao.sql > "$TEMP/b11-antes.txt"; cat "$TEMP/b11-antes.txt"`
Expected (dev em 29/09/2026): 105 vínculos, 91 → users.id, 14 → pessoas.id, órfãos 0, colisões 0, usuários sem pessoa 0.

- [ ] **Step 3: Linha de base verde**

Run: `npx vitest run` e depois `npm run test:front`
Expected: tudo PASS. Se algo já falha antes de começar, parar e resolver/registrar antes.

- [ ] **Step 4: Commit**

```bash
git add docs/operations/b11-pre-verificacao.sql
git commit -m "docs(B.11): script de pre-verificacao dos ids de vinculos e relatorias"
```

---

## Task 1: Módulo de identidade do vínculo

**Files:**
- Create: `server/db/identidadeVinculo.js`
- Modify: `server/__tests__/helpers.js` (acrescentar `seedUserComPessoa` no fim)
- Create: `server/__tests__/vinculosPessoa.test.js`

- [ ] **Step 1: Helper de teste**

Acrescentar ao fim de `server/__tests__/helpers.js`:

```js
// B.11: usuário com `pessoas` ligada (users.pessoa_id). Funciona antes e
// depois da sincronização da Task 2 (que já cria a pessoa no cadastro).
export async function seedUserComPessoa({ id, email, nome, roles = ['Professor'] }) {
  await seedUser({ id, email, roles, perfil_geral: { nome } });
  const { rows: [u] } = await pool.query('SELECT pessoa_id FROM users WHERE id = $1', [id]);
  if (u.pessoa_id) return { usuarioId: id, pessoaId: u.pessoa_id };
  const pessoaId = `pes-${id}`;
  await pool.query('INSERT INTO pessoas (id, nome) VALUES ($1, $2)', [pessoaId, nome]);
  await pool.query('UPDATE users SET pessoa_id = $1 WHERE id = $2', [pessoaId, id]);
  return { usuarioId: id, pessoaId };
}
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `server/__tests__/vinculosPessoa.test.js`:

```js
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser, seedUserComPessoa, loginAdmin, login } from './helpers.js';
import {
  joinPessoa, pessoaReal, doUsuario, idsDaMesmaPessoa, nomePessoa,
} from '../db/identidadeVinculo.js';

// B.11 (docs/analise-fk-vinculos-pessoa-id-b3.md). Durante a transição cada
// caso roda com o vínculo gravado pelo users.id (legado) e pelo pessoas.id; a
// Task 10 (FK) deixa só 'pessoa'.
const FORMAS = ['usuario', 'pessoa'];
const gravado = (forma, pessoa) => (forma === 'usuario' ? pessoa.usuarioId : pessoa.pessoaId);
const vincular = (id, pessoaIdGravado, papel, programaId = 'prog-1') => pool.query(
  `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em) VALUES ($1, $2, $3, $4, TRUE, now())`,
  [id, programaId, pessoaIdGravado, papel]
);

let token;
beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  await pool.query(`INSERT INTO programas (id, nome, sigla, slug) VALUES ('prog-1', 'Programa Um', 'PU', 'pu')`);
  token = await loginAdmin();
});
afterAll(async () => { await pool.end(); });
const asAdmin = (req) => req.set('Authorization', `Bearer ${token}`);

describe.each(FORMAS)('B.11 identidadeVinculo — vínculo gravado por %s', (forma) => {
  it('joinPessoa acha login e pessoa; pessoaReal devolve o pessoas.id', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await vincular('v1', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const { rows } = await pool.query(
      `SELECT u.id AS usuario_id, p.id AS pessoa_id, ${pessoaReal('v.pessoa_id')} AS real, ${nomePessoa()} AS nome
         FROM vinculos v ${joinPessoa('v.pessoa_id')}`
    );
    expect(rows).toEqual([{ usuario_id: 'u-ana', pessoa_id: ana.pessoaId, real: ana.pessoaId, nome: 'Ana' }]);
  });

  it('doUsuario casa o vínculo com o usuário', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await vincular('v1', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const { rows } = await pool.query(
      `SELECT v.id FROM vinculos v JOIN users u ON ${doUsuario('v.pessoa_id')} WHERE u.id = 'u-ana'`
    );
    expect(rows.map((r) => r.id)).toEqual(['v1']);
  });
});

describe('B.11 identidadeVinculo — casos fixos', () => {
  it('pessoa sem login: usuario nulo, nome da pessoa', async () => {
    await pool.query(`INSERT INTO pessoas (id, nome) VALUES ('pes-sem', 'Sem Login')`);
    await vincular('v1', 'pes-sem', 'SECRETARIO');
    const { rows } = await pool.query(
      `SELECT u.id AS usuario_id, ${nomePessoa()} AS nome FROM vinculos v ${joinPessoa('v.pessoa_id')}`
    );
    expect(rows).toEqual([{ usuario_id: null, nome: 'Sem Login' }]);
  });

  it('idsDaMesmaPessoa parte de qualquer um dos dois ids', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    const esperado = [ana.pessoaId, 'u-ana'].sort();
    expect((await idsDaMesmaPessoa('u-ana')).sort()).toEqual(esperado);
    expect((await idsDaMesmaPessoa(ana.pessoaId)).sort()).toEqual(esperado);
    expect(await idsDaMesmaPessoa('ninguem')).toEqual(['ninguem']);
    expect(await idsDaMesmaPessoa(null)).toEqual([]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js`
Expected: FAIL — `Failed to load url ../db/identidadeVinculo.js` (módulo não existe).

- [ ] **Step 4: Implementar o módulo**

Criar `server/db/identidadeVinculo.js`:

```js
// B.11 (docs/analise-fk-vinculos-pessoa-id-b3.md): a pessoa por trás de um
// vínculo (`vinculos.pessoa_id`, `camara_relatorias.relator_id`). Tudo que lê
// essas colunas passa por aqui. Durante a transição a coluna guarda um
// users.id (legado) OU um pessoas.id; depois da migração de dado (Task 10)
// só pessoas.id, e a Task 11 troca estes trechos pela forma final sem mexer
// em quem os usa.
import { query } from './pool.js';

// LEFT JOINs que resolvem o login (u) e a pessoa (p) por trás de `col`,
// qualquer que seja a forma gravada. users.id e pessoas.id não colidem
// (conferido em docs/operations/b11-pre-verificacao.sql), então casa no
// máximo um `users`.
export const joinPessoa = (col, { u = 'u', p = 'p' } = {}) => `
  LEFT JOIN users ${u} ON (${u}.id = ${col} OR ${u}.pessoa_id = ${col})
  LEFT JOIN pessoas ${p} ON ${p}.id = COALESCE(${u}.pessoa_id, ${col})`;

// O pessoas.id por trás de `col` (users.id só no caso legado de usuário
// ainda sem pessoa). Exige `u` no FROM (joinPessoa).
export const pessoaReal = (col, { u = 'u' } = {}) => `COALESCE(${u}.pessoa_id, ${col})`;

// Condição "o vínculo em `col` é do usuário `u`" (para JOIN ... ON / WHERE).
export const doUsuario = (col, { u = 'u' } = {}) => `${col} IN (${u}.id, ${u}.pessoa_id)`;

// Dados da pessoa: `pessoas` primeiro (D-B11b), o usuário como reserva.
export const campoPessoa = (colPessoa, colUsuario, { u = 'u', p = 'p' } = {}) =>
  `COALESCE(NULLIF(${p}.${colPessoa}, ''), NULLIF(${u}.${colUsuario}, ''))`;
export const nomePessoa = ({ u = 'u', p = 'p' } = {}) =>
  `COALESCE(NULLIF(${p}.nome, ''), NULLIF(${u}.perfil_nome, ''), ${u}.email)`;
// E-mail para falar com a pessoa: o institucional; sem ele, o de login.
export const emailPessoa = ({ u = 'u', p = 'p' } = {}) =>
  `COALESCE(NULLIF(${p}.email_institucional, ''), ${u}.email)`;

// Todos os ids que identificam o mesmo ser humano que `id` (users.id e/ou
// pessoas.id), para comparar/filtrar com `= ANY($n)` — o painel manda
// users.id; o banco pode ter qualquer um dos dois.
export async function idsDaMesmaPessoa(id) {
  if (!id) return [];
  const { rows } = await query('SELECT id, pessoa_id FROM users WHERE id = $1 OR pessoa_id = $1', [id]);
  const ids = new Set([id]);
  for (const r of rows) {
    ids.add(r.id);
    if (r.pessoa_id) ids.add(r.pessoa_id);
  }
  return [...ids];
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js`
Expected: PASS (6 testes).

- [ ] **Step 6: Commit**

```bash
git add server/db/identidadeVinculo.js server/__tests__/helpers.js server/__tests__/vinculosPessoa.test.js
git commit -m "feat(B.11): modulo identidadeVinculo resolve a pessoa por tras de um vinculo"
```

---

## Task 2: Sincronização `users → pessoas` (D-B11b) e migração A

Depois desta task todo usuário tem uma `pessoas` atualizada, e as leituras das tasks seguintes podem preferir `pessoas`.

**Files:**
- Modify: `server/db/pessoasRepo.js:12` (exportar `criarPessoaDeUsuario`)
- Create: `server/db/pessoaDoUsuario.js`
- Modify: `server/db/repositories.js:302-303` (`usersRepo`)
- Create: `server/db/migrations/2026-09-30_b11a_pessoas_de_usuarios.sql`
- Create: `server/__tests__/migracoesB11.test.js`
- Test: `server/__tests__/vinculosPessoa.test.js`

- [ ] **Step 1: Testes da sincronização (falham)**

Acrescentar ao fim de `server/__tests__/vinculosPessoa.test.js` (e `import { usersRepo } from '../db/repositories.js';` no topo):

```js
describe('B.11 D-B11b — usersRepo leva os dados da pessoa para `pessoas`', () => {
  const pessoaDe = async (usuarioId) => (await pool.query(
    'SELECT p.* FROM pessoas p JOIN users u ON u.pessoa_id = p.id WHERE u.id = $1', [usuarioId]
  )).rows[0];

  it('cadastrar cria e liga a pessoa, com CPF normalizado e sem copiar o e-mail de login', async () => {
    const u = await seedUser({ id: 'u-novo', email: 'novo@gmail.com', perfil_geral: { nome: 'Novo', cpf: '529.982.247-25' } });
    expect(u.pessoaId).toBeTruthy();
    expect(await pessoaDe('u-novo')).toMatchObject({
      id: u.pessoaId, nome: 'Novo', cpf: '52998224725', cpf_valido: true, email_institucional: null,
    });
  });

  it('cadastrar com o CPF de uma pessoa sem login liga a ela e só preenche o que falta', async () => {
    await pool.query(`INSERT INTO pessoas (id, nome, cpf) VALUES ('pes-imp', 'NOME DA PLANILHA', '52998224725')`);
    const u = await seedUser({
      id: 'u-imp', email: 'imp@t.br', perfil_geral: { nome: 'Nome do Painel', cpf: '529.982.247-25', foto_url: '/uploads/f.jpg' },
    });
    expect(u.pessoaId).toBe('pes-imp');
    expect(await pessoaDe('u-imp')).toMatchObject({ nome: 'NOME DA PLANILHA', foto_url: '/uploads/f.jpg' });
  });

  it('editar leva só o que mudou e nunca apaga valor preenchido em `pessoas`', async () => {
    const u = await seedUser({ id: 'u-ed', email: 'ed@t.br', perfil_geral: { nome: 'Antes' } });
    await pool.query(
      `UPDATE pessoas SET foto_url = '/uploads/estrutura.jpg', lattes = 'http://lattes/1' WHERE id = $1`, [u.pessoaId]
    );
    await usersRepo.update('u-ed', {
      perfil_geral: { ...u.perfil_geral, nome: 'Depois', foto_url: '' },
      dados_academicos: { lattes: '' },
    });
    expect(await pessoaDe('u-ed')).toMatchObject({
      nome: 'Depois', foto_url: '/uploads/estrutura.jpg', lattes: 'http://lattes/1',
    });
  });

  it('usuário antigo sem pessoa ganha uma na próxima gravação', async () => {
    await seedUser({ id: 'u-velho', email: 'velho@t.br', perfil_geral: { nome: 'Velho' } });
    await pool.query('UPDATE users SET pessoa_id = NULL WHERE id = $1', ['u-velho']);
    const atualizado = await usersRepo.update('u-velho', { roles: ['Aluno', 'Professor'] });
    expect(atualizado.pessoaId).toBeTruthy();
    expect(await pessoaDe('u-velho')).toMatchObject({ nome: 'Velho' });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js -t "D-B11b"`
Expected: FAIL — `expected undefined to be truthy` (`pessoaId` nulo: o cadastro não cria pessoa).

- [ ] **Step 3: Exportar `criarPessoaDeUsuario`**

Em `server/db/pessoasRepo.js`, trocar `const criarPessoaDeUsuario = async (userId) => {` por:

```js
export const criarPessoaDeUsuario = async (userId) => {
```

- [ ] **Step 4: Criar `server/db/pessoaDoUsuario.js`**

```js
// B.11 / D-B11b (docs/analise-fk-vinculos-pessoa-id-b3.md §6): `pessoas` é a
// fonte dos dados da pessoa; users.perfil_*/acad_* são cópia legada até o fim
// da G1. Toda gravação de usuário passa por usersRepo, que chama isto para
// levar à `pessoas` ligada o que mudou — nunca apagando valor preenchido lá com
// vazio (a foto posta pela tela de Estrutura, por exemplo, só existe em
// `pessoas`). O e-mail de login NÃO é copiado: não é e-mail institucional.
import { query } from './pool.js';
import { criarPessoaDeUsuario } from './pessoasRepo.js';
import { normalizarCpf, cpfValido } from '../utils/cpf.js';

const vazio = (v) => v == null || String(v).trim() === '';

// Coluna de `pessoas` <- valor do usuário no formato do app (userFromRow).
const CAMPOS = {
  nome: (u) => u.perfil_geral?.nome,
  cpf: (u) => normalizarCpf(u.perfil_geral?.cpf),
  siape: (u) => u.perfil_geral?.siape,
  foto_url: (u) => u.perfil_geral?.foto_url,
  telefones: (u) => {
    const t = u.perfil_geral?.telefones;
    return Array.isArray(t) ? t.filter((x) => !vazio(x)).join(', ') : t;
  },
  lattes: (u) => u.dados_academicos?.lattes,
  orcid: (u) => u.dados_academicos?.orcid,
  google_scholar: (u) => u.dados_academicos?.google_scholar,
  publons: (u) => u.dados_academicos?.publons,
};

// Sem `antes` (usuário novo): todo campo preenchido. Com `antes`: só o que
// mudou e não ficou vazio.
export function camposAPropagar(antes, depois) {
  const out = {};
  for (const [col, ler] of Object.entries(CAMPOS)) {
    const novo = ler(depois);
    if (vazio(novo)) continue;
    if (antes && ler(antes) === novo) continue;
    out[col] = typeof novo === 'string' ? novo.trim() : novo;
  }
  return out;
}

// `soVazios`: só preenche coluna vazia em `pessoas` (pessoa já existente que
// o cadastro encontrou pelo CPF — o que veio de planilha não é sobrescrito).
async function gravar(pessoaId, campos, { soVazios = false } = {}) {
  const cols = Object.keys(campos).filter((c) => !(soVazios && c === 'cpf'));
  if (!cols.length) return;
  const params = [pessoaId, ...cols.map((c) => campos[c])];
  const sets = cols.map((c, i) => (soVazios
    ? `${c} = COALESCE(NULLIF(${c}, ''), $${i + 2})`
    : `${c} = $${i + 2}`));
  if (cols.includes('cpf')) {
    params.push(cpfValido(campos.cpf));
    sets.push(`cpf_valido = $${params.length}`);
  }
  await query(`UPDATE pessoas SET ${sets.join(', ')}, atualizado_em = now() WHERE id = $1`, params);
}

// Uma pessoa sem login com este CPF (e só uma) — para não duplicar quem veio
// de planilha e depois ganhou login.
async function pessoaSemLoginPorCpf(cpf) {
  if (!cpf || !cpfValido(cpf)) return null;
  const { rows } = await query(
    `SELECT p.id FROM pessoas p
      WHERE lpad(regexp_replace(COALESCE(p.cpf, ''), '\\D', '', 'g'), 11, '0') = $1
        AND NOT EXISTS (SELECT 1 FROM users u WHERE u.pessoa_id = p.id)
      LIMIT 2`,
    [cpf]
  );
  return rows.length === 1 ? rows[0].id : null;
}

// Chamado por usersRepo depois de gravar o usuário. Devolve o usuário com
// `pessoaId` preenchido.
export async function sincronizarPessoaDoUsuario(antes, depois) {
  if (!depois) return depois;
  if (depois.pessoaId) {
    await gravar(depois.pessoaId, camposAPropagar(antes, depois));
    return depois;
  }
  const existente = await pessoaSemLoginPorCpf(normalizarCpf(depois.perfil_geral?.cpf));
  if (existente) {
    await query('UPDATE users SET pessoa_id = $1 WHERE id = $2', [existente, depois.id]);
    await gravar(existente, camposAPropagar(null, depois), { soVazios: true });
    return { ...depois, pessoaId: existente };
  }
  // criarPessoaDeUsuario copia também sexo/nacionalidade/estrangeiro; o
  // gravar seguinte normaliza o CPF e calcula cpf_valido.
  const pessoaId = await criarPessoaDeUsuario(depois.id);
  await gravar(pessoaId, camposAPropagar(null, depois));
  return { ...depois, pessoaId };
}
```

- [ ] **Step 5: `usersRepo` passa a sincronizar**

Em `server/db/repositories.js`, acrescentar aos imports do topo:

```js
import { sincronizarPessoaDoUsuario } from './pessoaDoUsuario.js';
```

e trocar

```js
export const usersRepo = {
  ...createRepository({ table: 'users', fromRow: userFromRow, toRow: userToRow, orderBy: 'criado_em ASC' }),
```

por

```js
const usersBase = createRepository({ table: 'users', fromRow: userFromRow, toRow: userToRow, orderBy: 'criado_em ASC' });
export const usersRepo = {
  ...usersBase,
  // B.11 / D-B11b: toda gravação de usuário leva o que mudou para a `pessoas`
  // ligada (e cria/liga uma se faltar) — ver server/db/pessoaDoUsuario.js.
  async create(obj, actor) {
    return sincronizarPessoaDoUsuario(null, await usersBase.create(obj, actor));
  },
  async update(id, partial, actor) {
    const antes = await usersBase.getById(id);
    return sincronizarPessoaDoUsuario(antes, await usersBase.update(id, partial, actor));
  },
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js`
Expected: PASS.

- [ ] **Step 7: Teste da migração A (falha)**

Criar `server/__tests__/migracoesB11.test.js`:

```js
import fs from 'fs/promises';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, seedUser } from './helpers.js';

// B.11: as migrações rodam como no migrateRunner — uma transação por arquivo.
const ler = (nome) => fs.readFile(new URL(`../db/migrations/${nome}`, import.meta.url), 'utf8');
const rodar = async (nome) => {
  const sql = await ler(nome);
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
};
const MIG_A = '2026-09-30_b11a_pessoas_de_usuarios.sql';

beforeEach(async () => { await resetDb(); await seedAdmin(); });
afterAll(async () => { await pool.end(); });

describe('B.11 migração A — pessoa para todo usuário e reconciliação', () => {
  it('cria pessoa para quem não tem; o usuário vence, menos na foto', async () => {
    await seedUser({ id: 'u-sem', email: 'sem@t.br', perfil_geral: { nome: 'Sem Pessoa' } });
    await pool.query(`UPDATE users SET pessoa_id = NULL WHERE id = 'u-sem'`);
    await seedUser({ id: 'u-com', email: 'com@t.br', perfil_geral: { nome: 'Nome Novo', foto_url: '/uploads/painel.jpg' } });
    // Simula a deriva de antes da Task 2: edições que ficaram só em `users`.
    await pool.query(`UPDATE users SET acad_lattes = 'http://lattes/novo' WHERE id = 'u-com'`);
    await pool.query(`UPDATE pessoas SET nome = 'Nome Antigo', foto_url = '/uploads/estrutura.jpg', lattes = 'http://lattes/velho'
                       WHERE id = (SELECT pessoa_id FROM users WHERE id = 'u-com')`);

    await rodar(MIG_A);

    const { rows } = await pool.query(
      `SELECT u.id, p.nome, p.foto_url, p.lattes FROM users u JOIN pessoas p ON p.id = u.pessoa_id
        WHERE u.id IN ('u-com', 'u-sem') ORDER BY u.id`
    );
    expect(rows).toEqual([
      { id: 'u-com', nome: 'Nome Novo', foto_url: '/uploads/estrutura.jpg', lattes: 'http://lattes/novo' },
      { id: 'u-sem', nome: 'Sem Pessoa', foto_url: null, lattes: null },
    ]);
  });

  it('é idempotente', async () => {
    await seedUser({ id: 'u-sem', email: 'sem@t.br', perfil_geral: { nome: 'Sem Pessoa' } });
    await pool.query(`UPDATE users SET pessoa_id = NULL WHERE id = 'u-sem'`);
    await rodar(MIG_A);
    const antes = (await pool.query('SELECT count(*)::int AS n FROM pessoas')).rows[0].n;
    await rodar(MIG_A);
    expect((await pool.query('SELECT count(*)::int AS n FROM pessoas')).rows[0].n).toBe(antes);
  });
});
```

Run: `npx vitest run server/__tests__/migracoesB11.test.js`
Expected: FAIL — `ENOENT ... 2026-09-30_b11a_pessoas_de_usuarios.sql`.

- [ ] **Step 8: Escrever a migração A**

Criar `server/db/migrations/2026-09-30_b11a_pessoas_de_usuarios.sql`:

```sql
-- =====================================================================
-- B.11 / D-B11b (docs/analise-fk-vinculos-pessoa-id-b3.md): `pessoas` passa a
-- ser a fonte dos dados da pessoa (usersRepo propaga as edições desde este
-- deploy — server/db/pessoaDoUsuario.js). Esta migração deixa o ponto de
-- partida certo:
--   1. todo usuário ganha uma `pessoas` (mesmo mapeamento de
--      server/db/backfill-pessoas.mjs);
--   2. reconciliação: até aqui só `users` era editável pelo painel e pelo
--      /minha-conta, então o valor do usuário vence — menos a foto, que a
--      tela de Estrutura grava só em `pessoas` (lá só se preenche o vazio).
-- CPF fica de fora: exige recalcular cpf_valido; a sincronização faz isso na
-- próxima edição. Idempotente.
-- =====================================================================
CREATE TEMP TABLE b11_novas ON COMMIT DROP AS
  SELECT id AS user_id, gen_random_uuid()::text AS pessoa_id FROM users WHERE pessoa_id IS NULL;

INSERT INTO pessoas (id, nome, cpf, siape, sexo, nacionalidade, estrangeiro, foto_url, telefones,
                     lattes, orcid, google_scholar, publons)
SELECT n.pessoa_id,
       NULLIF(u.perfil_nome, ''), NULLIF(u.perfil_cpf, ''), NULLIF(u.perfil_siape, ''),
       NULLIF(COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'sexo', ''),
       NULLIF(COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'nacionalidade', ''),
       COALESCE(COALESCE(u.perfil_aluno, u.perfil_professor) ->> 'estrangeiro', '') = 'true',
       NULLIF(u.perfil_foto_url, ''), NULLIF(array_to_string(u.perfil_telefones, ', '), ''),
       NULLIF(u.acad_lattes, ''), NULLIF(u.acad_orcid, ''),
       NULLIF(u.acad_google_scholar, ''), NULLIF(u.acad_publons, '')
  FROM b11_novas n JOIN users u ON u.id = n.user_id;

UPDATE users u SET pessoa_id = n.pessoa_id FROM b11_novas n WHERE u.id = n.user_id;

UPDATE pessoas p SET
  nome           = COALESCE(NULLIF(u.perfil_nome, ''), p.nome),
  siape          = COALESCE(NULLIF(u.perfil_siape, ''), p.siape),
  telefones      = COALESCE(NULLIF(array_to_string(u.perfil_telefones, ', '), ''), p.telefones),
  lattes         = COALESCE(NULLIF(u.acad_lattes, ''), p.lattes),
  orcid          = COALESCE(NULLIF(u.acad_orcid, ''), p.orcid),
  google_scholar = COALESCE(NULLIF(u.acad_google_scholar, ''), p.google_scholar),
  publons        = COALESCE(NULLIF(u.acad_publons, ''), p.publons),
  foto_url       = COALESCE(NULLIF(p.foto_url, ''), NULLIF(u.perfil_foto_url, ''))
  FROM users u
 WHERE u.pessoa_id = p.id;
```

- [ ] **Step 9: Rodar os dois arquivos e a suíte**

Run: `npx vitest run server/__tests__/migracoesB11.test.js server/__tests__/vinculosPessoa.test.js`
Expected: PASS.

Run: `npx vitest run`
Expected: PASS. Pontos de atenção se algo falhar: testes que contam linhas de `pessoas` (`planilhasImportadores.test.js:349` conta só `nome = 'PESSOA UM'`, não é afetado) e o painel de qualidade (usuários de teste com CPF inválido passam a gerar `pessoas` com `cpf_valido = false`). Qualquer outra falha: parar e investigar antes de seguir.

- [ ] **Step 10: Aplicar no banco de dev**

Run: `npm run db:migrate:apply`
Expected: `[DB] Migrações aplicadas: 1; ...`

- [ ] **Step 11: Commit**

```bash
git add server/db/pessoaDoUsuario.js server/db/pessoasRepo.js server/db/repositories.js server/db/migrations/2026-09-30_b11a_pessoas_de_usuarios.sql server/__tests__/migracoesB11.test.js server/__tests__/vinculosPessoa.test.js
git commit -m "feat(B.11): usersRepo sincroniza os dados da pessoa em pessoas (D-B11b) e migracao A"
```

---

## Task 3: Programas — leituras, duplicidade e coordenação

**Files:**
- Modify: `server/controllers/programasController.js` (imports; `:98-152` `VINCULOS_JOIN_SELECT`/`combinedFromRow`; `:88-94` `filterSensitivePessoa`; `:315-353` `handlePessoaVinculo`; `:591-906` listas, `add*`, `removeDocente`)
- Modify: `server/__tests__/programas.test.js:58,74,76,145,149`, `server/__tests__/gestor_programa.test.js:155,167,268`
- Test: `server/__tests__/vinculosPessoa.test.js`

- [ ] **Step 1: Testes (falham)**

Acrescentar a `vinculosPessoa.test.js`:

```js
describe.each(FORMAS)('B.11 programas — vínculo gravado por %s', (forma) => {
  let ana;
  beforeEach(async () => {
    ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana Docente' });
  });

  it('lista pública e do painel mostram o docente; usuario_id só no painel', async () => {
    await vincular('v-doc', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const pub = await request(app).get('/api/programas/slug/pu/pessoas');
    expect(pub.body).toEqual([expect.objectContaining({ id: 'v-doc', nome: 'Ana Docente', pessoa_id: ana.pessoaId })]);
    expect(pub.body[0].usuario_id).toBeUndefined();
    const adm = await asAdmin(request(app).get('/api/programas/prog-1/docentes'));
    expect(adm.body).toEqual([expect.objectContaining({ id: 'v-doc', nome: 'Ana Docente', pessoa_id: ana.pessoaId, usuario_id: 'u-ana' })]);
  });

  it('discentes e comissões idem', async () => {
    await vincular('v-disc', gravado(forma, ana), 'DISCENTE_DOUTORADO');
    await vincular('v-com', gravado(forma, ana), 'COMISSAO_CPG');
    const pub = await request(app).get('/api/programas/slug/pu/discentes');
    expect(pub.body).toEqual([expect.objectContaining({ id: 'v-disc', nome: 'Ana Docente' })]);
    const disc = await asAdmin(request(app).get('/api/programas/prog-1/discentes'));
    expect(disc.body).toEqual([expect.objectContaining({ id: 'v-disc', usuario_id: 'u-ana' })]);
    const com = await asAdmin(request(app).get('/api/programas/prog-1/comissoes'));
    expect(com.body).toEqual([expect.objectContaining({ id: 'v-com', usuario_id: 'u-ana', nome: 'Ana Docente' })]);
  });

  it('vincular de novo a mesma pessoa pelo id de login dá 409', async () => {
    await vincular('v-doc', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const r = await asAdmin(request(app).post('/api/programas/prog-1/docentes'))
      .send({ pessoa_id: 'u-ana', papel: 'DOCENTE_COLABORADOR' });
    expect(r.status).toBe(409);
  });

  it('salvar o programa com o mesmo coordenador não encerra o mandato', async () => {
    await vincular('v-coord', gravado(forma, ana), 'COORDENADOR_ATUAL');
    await asAdmin(request(app).put('/api/programas/prog-1')).send({ coordenador_atual: { pessoa_id: 'u-ana', portaria: 'P2' } });
    const r = await asAdmin(request(app).get('/api/programas/prog-1'));
    expect(r.body.coordenador_atual).toMatchObject({ usuario_id: 'u-ana', pessoa_id: ana.pessoaId, portaria: 'P2', nome: 'Ana Docente' });
    expect(r.body.historico_coordenadores).toEqual([]);
  });

  it('o público não recebe usuario_id do coordenador', async () => {
    await vincular('v-coord', gravado(forma, ana), 'COORDENADOR_ATUAL');
    const r = await request(app).get('/api/programas/prog-1');
    expect(r.body.coordenador_atual.nome).toBe('Ana Docente');
    expect(r.body.coordenador_atual.usuario_id).toBeUndefined();
  });

  it('remover o docente tira o programa do perfil_professor do usuário', async () => {
    await pool.query(`UPDATE users SET perfil_professor = '{"programas": ["prog-1"]}' WHERE id = 'u-ana'`);
    await vincular('v-doc', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const r = await asAdmin(request(app).delete('/api/programas/prog-1/docentes/v-doc'));
    expect(r.status).toBe(200);
    const { rows } = await pool.query(`SELECT perfil_professor FROM users WHERE id = 'u-ana'`);
    expect(rows[0].perfil_professor.programas).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js -t "programas"`
Expected: FAIL. Com o vínculo gravado por `pessoa`, a lista pública vem vazia e a do painel vem sem `usuario_id`. Também falham: o 409 (vira 201), o mandato (histórico com 1 item) e o `perfil_professor`, que continua `["prog-1"]`.

- [ ] **Step 3: Imports**

Em `server/controllers/programasController.js`, acrescentar após `import { query } from '../db/pool.js';`:

```js
import {
  joinPessoa, pessoaReal, nomePessoa, campoPessoa, idsDaMesmaPessoa,
} from '../db/identidadeVinculo.js';
```

- [ ] **Step 4: `filterSensitivePessoa` esconde `usuario_id` do público**

Trocar

```js
  const { cpf, siape, telefones, email_institucional, email_funcao, endereco, ...rest } = pessoa;
```

por

```js
  const { cpf, siape, telefones, email_institucional, email_funcao, endereco, usuario_id, ...rest } = pessoa;
```

- [ ] **Step 5: `VINCULOS_JOIN_SELECT` e `combinedFromRow`**

Substituir o bloco das linhas 98–152 (do comentário `// Fase B.3 (PLANO.md): substitui buildCombined` até o fim de `combinedFromRow`) por:

```js
// Fase B.3 (PLANO.md): um JOIN resolve pessoa e portaria por vínculo (antes
// era buildCombined, em JS). A pessoa vem de identidadeVinculo.js (B.11):
// `pessoas` é a fonte dos dados (D-B11b), o usuário completa o que faltar.
const VINCULOS_JOIN_SELECT = `
  SELECT v.*,
    u.id AS u_id, u.email AS u_email, u.perfil_nome AS u_perfil_nome,
    u.perfil_cpf AS u_perfil_cpf, u.perfil_siape AS u_perfil_siape,
    u.perfil_telefones AS u_perfil_telefones,
    row_to_json(p.*) AS p_json,
    ${pessoaReal('v.pessoa_id')} AS pessoa_real,
    po.title AS portaria_titulo, po.download_link AS portaria_download_link
  FROM vinculos v
  ${joinPessoa('v.pessoa_id')}
  LEFT JOIN portarias po ON po.id = v.portaria_id
`;

const VINCULO_ROW_KEYS = [
  'u_id', 'u_email', 'u_perfil_nome', 'u_perfil_cpf', 'u_perfil_siape', 'u_perfil_telefones',
  'p_json', 'pessoa_real', 'portaria_titulo', 'portaria_download_link',
];

const telefonesDoUsuario = (t) => (Array.isArray(t) ? t.join(', ') : (t || ''));

// Objeto "combinado" (pessoa + vínculo + portaria) de uma linha do JOIN acima.
// `pessoa_id` = pessoas.id; `usuario_id` = login (o painel usa para vincular
// e editar; filterSensitivePessoa o tira da resposta pública).
const combinedFromRow = (row) => {
  if (!row.u_id && !row.p_json) return null;
  const resolvedPortaria = row.portaria_titulo != null
    ? { portaria_id: row.portaria_id, portaria: row.portaria_titulo, portaria_download_link: row.portaria_download_link }
    : { portaria_id: '', portaria: row.portaria || '', portaria_download_link: '' };
  const vFields = { ...row };
  for (const k of VINCULO_ROW_KEYS) delete vFields[k];
  const p = row.p_json || {};
  return {
    ...p,
    ...vFields,
    ...resolvedPortaria,
    pessoa_id: p.id ?? row.pessoa_real,
    usuario_id: row.u_id ?? null,
    nome: p.nome || row.u_perfil_nome || row.u_email || '',
    cpf: p.cpf || row.u_perfil_cpf || '',
    siape: p.siape || row.u_perfil_siape || '',
    email_institucional: p.email_institucional || row.u_email || '',
    telefones: p.telefones || telefonesDoUsuario(row.u_perfil_telefones),
    endereco: vFields.endereco || '',
  };
};
```

- [ ] **Step 6: `handlePessoaVinculo` compara a pessoa, não o id**

Trocar

```js
  if (existing && papel === 'COORDENADOR_ATUAL' && existing.pessoa_id !== pessoaId) {
```

por

```js
  // O painel manda users.id; o vínculo pode estar gravado com o pessoas.id da
  // mesma pessoa (B.11) — isso não é troca de coordenador.
  const mesmaPessoa = !!existing && (await idsDaMesmaPessoa(pessoaId)).includes(existing.pessoa_id);
  if (existing && papel === 'COORDENADOR_ATUAL' && !mesmaPessoa) {
```

- [ ] **Step 7: Consulta única das listas do painel**

Acrescentar logo acima de `// Endpoint público: docentes do programa por slug (sem dados sensíveis).`:

```js
// Membros ativos de um programa em certos papéis, com a pessoa resolvida
// (identidadeVinculo.js) — base das listas públicas e do painel.
const membrosDoPrograma = async (programaId, papeis) => (await query(
  `SELECT v.id, v.papel, v.email_funcao, ${pessoaReal('v.pessoa_id')} AS pessoa_id, u.id AS usuario_id,
          COALESCE(${nomePessoa()}, v.pessoa_id) AS nome,
          ${campoPessoa('foto_url', 'perfil_foto_url')} AS foto_url, u.programa_id,
          ${campoPessoa('lattes', 'acad_lattes')} AS lattes,
          ${campoPessoa('orcid', 'acad_orcid')} AS orcid,
          ${campoPessoa('google_scholar', 'acad_google_scholar')} AS google_scholar,
          (u.id IS NOT NULL OR p.id IS NOT NULL) AS resolvido
     FROM vinculos v ${joinPessoa('v.pessoa_id')}
    WHERE v.programa_id = $1 AND v.ativo = TRUE AND v.papel = ANY($2::text[])
    ORDER BY v.papel, v.criado_em`,
  [programaId, papeis]
)).rows;
```

- [ ] **Step 8: Reescrever as cinco listas**

Substituir o corpo de `getProgramaDocentesPublic` por:

```js
export const getProgramaDocentesPublic = async (req, res) => {
  try {
    const prog = (await query('SELECT id FROM programas WHERE slug = $1', [req.params.slug])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });
    const membros = await membrosDoPrograma(prog.id, PAPEIS_DOCENTE);
    res.json(membros.filter((m) => m.resolvido).map((m) => ({
      id: m.id, pessoa_id: m.pessoa_id, papel: m.papel, nome: m.nome, foto_url: m.foto_url,
      lattes: m.lattes, orcid: m.orcid, google_scholar: m.google_scholar, email_funcao: m.email_funcao || null,
    })));
  } catch (error) {
    serverError(res, 'Erro ao buscar docentes', error);
  }
};
```

`getDocentesAdmin`:

```js
export const getDocentesAdmin = async (req, res) => {
  try {
    const membros = await membrosDoPrograma(req.params.id, PAPEIS_DOCENTE);
    res.json(membros.map((m) => ({
      id: m.id, pessoa_id: m.pessoa_id, usuario_id: m.usuario_id, papel: m.papel,
      email_funcao: m.email_funcao || '', nome: m.nome, foto_url: m.foto_url, programa_id: m.programa_id || null,
    })));
  } catch (error) {
    serverError(res, 'Erro ao listar docentes', error);
  }
};
```

`getProgramaDiscentesPublic`:

```js
export const getProgramaDiscentesPublic = async (req, res) => {
  try {
    const prog = (await query('SELECT id FROM programas WHERE slug=$1', [req.params.slug])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });
    const membros = await membrosDoPrograma(prog.id, PAPEIS_DISCENTE);
    res.json(membros.filter((m) => m.resolvido).map((m) => ({
      id: m.id, pessoa_id: m.pessoa_id, papel: m.papel, nome: m.nome, foto_url: m.foto_url,
      lattes: m.lattes, orcid: m.orcid, google_scholar: m.google_scholar,
    })));
  } catch (error) {
    serverError(res, 'Erro ao buscar discentes', error);
  }
};
```

`getDiscentesAdmin`:

```js
export const getDiscentesAdmin = async (req, res) => {
  try {
    const membros = await membrosDoPrograma(req.params.id, PAPEIS_DISCENTE);
    res.json(membros.map((m) => ({
      id: m.id, pessoa_id: m.pessoa_id, usuario_id: m.usuario_id, papel: m.papel,
      nome: m.nome, foto_url: m.foto_url, programa_id: m.programa_id || null,
    })));
  } catch (error) {
    serverError(res, 'Erro ao listar discentes', error);
  }
};
```

`getComissoesAdmin`:

```js
export const getComissoesAdmin = async (req, res) => {
  try {
    const membros = await membrosDoPrograma(req.params.id, PAPEIS_COMISSAO);
    res.json(membros.map((m) => ({
      id: m.id, pessoa_id: m.pessoa_id, usuario_id: m.usuario_id, papel: m.papel, nome: m.nome, foto_url: m.foto_url,
    })));
  } catch (error) {
    serverError(res, 'Erro ao listar comissões', error);
  }
};
```

Mudança de comportamento **intencional**: docente/discente gravado por `pessoas.id` sem login passa a aparecer na página pública. Antes era filtrado, porque a consulta só olhava `users`.

- [ ] **Step 9: Duplicidade em `addDocente`/`addDiscente`/`addComissaoMembro`**

Em cada uma das três, trocar a consulta de "já existe", mantendo o papel de cada uma. Em `addDocente`:

```js
    const ids = await idsDaMesmaPessoa(pessoa_id);
    const existing = (
      await query(
        'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id = ANY($2::text[]) AND papel=ANY($3::text[]) AND ativo=TRUE',
        [req.params.id, ids, PAPEIS_DOCENTE]
      )
    ).rows[0];
```

Em `addDiscente`:

```js
    const ids = await idsDaMesmaPessoa(pessoa_id);
    const existing = (await query(
      'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id = ANY($2::text[]) AND papel=ANY($3::text[]) AND ativo=TRUE',
      [req.params.id, ids, PAPEIS_DISCENTE]
    )).rows[0];
```

Em `addComissaoMembro`:

```js
    const ids = await idsDaMesmaPessoa(pessoa_id);
    const existing = (await query(
      'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id = ANY($2::text[]) AND papel=$3 AND ativo=TRUE',
      [req.params.id, ids, papel]
    )).rows[0];
```

- [ ] **Step 10: `removeDocente` acha o usuário pela pessoa**

Trocar

```js
    const { rows } = await query(
      `SELECT pessoa_id, programa_id FROM vinculos
       WHERE id=$1 AND programa_id=$2 AND papel=ANY($3::text[])`,
      [req.params.vinculoId, req.params.id, PAPEIS_DOCENTE]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Vínculo não encontrado' });
    const { pessoa_id, programa_id } = rows[0];
```

por

```js
    const { rows } = await query(
      `SELECT v.programa_id, u.id AS usuario_id FROM vinculos v ${joinPessoa('v.pessoa_id')}
       WHERE v.id=$1 AND v.programa_id=$2 AND v.papel=ANY($3::text[])`,
      [req.params.vinculoId, req.params.id, PAPEIS_DOCENTE]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Vínculo não encontrado' });
    const { usuario_id, programa_id } = rows[0];
```

e, mais abaixo, `usersRepo.getById(pessoa_id)` → `usuario_id ? await usersRepo.getById(usuario_id) : null` e `usersRepo.update(pessoa_id, {` → `usersRepo.update(usuario_id, {`.

- [ ] **Step 11: Ajustar os testes antigos ao novo vocabulário**

- `server/__tests__/programas.test.js`: nas linhas 74 e 145, `coordenador_atual.pessoa_id` passa a ser `coordenador_atual.usuario_id`. Nas linhas 76 e 149, `historico_coordenadores[0].pessoa_id` e `prev.pessoa_id` passam a ser `.usuario_id`. Na linha 58, `toBe('111')` passa a ser `toBe('00000000111')`: o CPF vem de `pessoas`, normalizado para 11 dígitos pela Task 2.
- `server/__tests__/gestor_programa.test.js`: nas linhas 155, 167 e 268, `d.pessoa_id ===` passa a ser `d.usuario_id ===`.

- [ ] **Step 12: Rodar e ver passar**

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js server/__tests__/programas.test.js server/__tests__/gestor_programa.test.js server/__tests__/programas_microsite.test.js server/__tests__/conexoes.test.js`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add server/controllers/programasController.js server/__tests__/vinculosPessoa.test.js server/__tests__/programas.test.js server/__tests__/gestor_programa.test.js
git commit -m "feat(B.11): programas leem a pessoa do vinculo pelos dois ids e expoem usuario_id"
```

---

## Task 4: Front — o painel usa `usuario_id` para o que é de login

**Files:**
- Modify: `src/pages/admin/AdminProgramaPessoas.jsx:49,349-351`
- Modify: `src/pages/admin/AdminProgramaComissoes.jsx:40`
- Modify: `src/pages/admin/AdminProgramaForm.jsx:95,221-245,715,962`
- Create: `src/__tests__/vinculosUsuario.test.jsx`

- [ ] **Step 1: Teste de componente (falha)**

Criar `src/__tests__/vinculosUsuario.test.jsx`:

```jsx
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminProgramaDocentes from '../pages/admin/AdminProgramaDocentes';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// B.11: pessoa_id (pessoas.id) e usuario_id (login) são diferentes.
const MEMBROS = [{ id: 'v1', pessoa_id: 'pes-ana', usuario_id: 'u-ana', papel: 'DOCENTE_PERMANENTE', nome: 'Ana Docente', programa_id: 'prog-1' }];
const USERS = [
  { id: 'u-ana', email: 'ana@t.br', roles: ['Professor'], perfil_geral: { nome: 'Ana Docente' } },
  { id: 'u-bia', email: 'bia@t.br', roles: ['Professor'], perfil_geral: { nome: 'Bia Docente' } },
];
const resposta = (url) => {
  if (url.includes('/api/programas/prog-1/docentes')) return MEMBROS;
  if (url.includes('/api/users')) return USERS;
  if (url.includes('/api/programas/prog-1')) return { id: 'prog-1', sigla: 'PU' };
  return [];
};

let root;
let container;
beforeEach(() => {
  localStorage.setItem('token', 'x.e30.y');
  localStorage.setItem('roles', JSON.stringify(['Administrator']));
  vi.stubGlobal('fetch', vi.fn(async (url) => ({ ok: true, status: 200, json: async () => resposta(String(url)) })));
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const montar = async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/admin/programas/prog-1/docentes']}>
        <Routes><Route path="/admin/programas/:id/docentes" element={<AdminProgramaDocentes />} /></Routes>
      </MemoryRouter>
    );
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
};
const setValor = (el, v) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('B.11 — o painel usa usuario_id (não pessoa_id) para o que é de login', () => {
  it('quem já está vinculado some dos candidatos', async () => {
    await montar();
    const busca = container.querySelector('input[placeholder="Nome ou e-mail..."]');
    await act(async () => { setValor(busca, 'docente'); });
    expect(container.textContent).toContain('Bia Docente');
    expect(container.textContent.match(/Ana Docente/g)).toHaveLength(1); // só na lista de membros
  });

  it('o lápis de edição aponta para o id de login', async () => {
    await montar();
    expect(container.querySelector('a[href="/admin/users/editar/u-ana"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run --config vitest.front.config.js src/__tests__/vinculosUsuario.test.jsx`
Expected: FAIL — "Ana Docente" aparece 2 vezes; o link aponta para `/admin/users/editar/pes-ana`.

- [ ] **Step 3: `AdminProgramaPessoas.jsx`**

Trocar

```jsx
  const vinculadosIds = new Set(membros.map((m) => m.pessoa_id));
```

por

```jsx
  // B.11: comparar pelo id de login — pessoa_id é o pessoas.id.
  const vinculadosIds = new Set(membros.map((m) => m.usuario_id).filter(Boolean));
```

e trocar

```jsx
                          {m.programa_id === id && (
                            <Link
                              to={`/admin/users/editar/${m.pessoa_id}`}
```

por

```jsx
                          {m.usuario_id && m.programa_id === id && (
                            <Link
                              to={`/admin/users/editar/${m.usuario_id}`}
```

- [ ] **Step 4: `AdminProgramaComissoes.jsx`**

Trocar

```jsx
  const vinculadosIds = new Set(membros.filter((m) => m.papel === papel).map((m) => m.pessoa_id));
```

por

```jsx
  const vinculadosIds = new Set(membros.filter((m) => m.papel === papel).map((m) => m.usuario_id).filter(Boolean));
```

- [ ] **Step 5: `AdminProgramaForm.jsx`**

1. `emptyPessoa`: acrescentar `usuario_id: '',` antes de `pessoa_id: '',`.
2. Em `handleUserSelect`, no ramo com usuário selecionado, acrescentar `usuario_id: selectedUser.id,` logo antes de `pessoa_id: selectedUser.id,`. No ramo `else`, acrescentar `usuario_id: '',` antes de `pessoa_id: '',`.
3. No `<select>` de usuários: `value={data.pessoa_id || ''}` passa a ser `value={data.usuario_id || ''}`.
4. Em `renderVinculoStep`: `const vinculadosIds = new Set(lista.map((m) => m.pessoa_id));` passa a ser `const vinculadosIds = new Set(lista.map((m) => m.usuario_id).filter(Boolean));`.

O envio continua mandando `pessoa_id`. Ele traz `users.id` quando o usuário foi escolhido agora, e o `pessoas.id` que veio do servidor quando o coordenador não foi mexido. O servidor aceita as duas formas (Tasks 3 e 9).

- [ ] **Step 6: Rodar e ver passar**

Run: `npm run test:front`
Expected: PASS (incluindo `formularios.test.jsx`, que monta o `AdminProgramaForm`).

- [ ] **Step 7: Conferir no navegador**

Com `npm run dev` rodando e logado como admin, abrir `/admin/programas/<id de um programa com coordenador e docentes>`. Conferir:

- o `<select>` "Vincular Usuário do Sistema" mostra o coordenador selecionado;
- em "Corpo Docente", a busca não oferece quem já está vinculado;
- o lápis de um docente abre o formulário do usuário certo.

Usar o preview do app (`preview_start`) e registrar um screenshot.

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin/AdminProgramaPessoas.jsx src/pages/admin/AdminProgramaComissoes.jsx src/pages/admin/AdminProgramaForm.jsx src/__tests__/vinculosUsuario.test.jsx
git commit -m "feat(B.11): painel de programas usa usuario_id para vincular e editar"
```

---

## Task 5: Usuários, escopo do Gestor de Programa e proficiência

**Files:**
- Modify: `server/controllers/usersController.js:36-53` (`anexarProgramasVinculo`)
- Modify: `server/db/repositories.js` (`getScopedToPrograma`, `isLinkedToPrograma`)
- Modify: `server/controllers/proficienciaController.js:121-125`
- Test: `server/__tests__/vinculosPessoa.test.js`

- [ ] **Step 1: Testes (falham)**

```js
describe.each(FORMAS)('B.11 usuários e escopo — vínculo gravado por %s', (forma) => {
  beforeEach(async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana Aluna', roles: ['Aluno'] });
    await vincular('v-disc', gravado(forma, ana), 'DISCENTE_MESTRADO');
  });

  it('a lista de usuários mostra o programa do vínculo', async () => {
    const r = await asAdmin(request(app).get('/api/users'));
    expect(r.body.find((u) => u.id === 'u-ana').programas_vinculo).toEqual([{ id: 'prog-1', sigla: 'PU', nome: 'Programa Um' }]);
  });

  it('o gestor do programa vê o aluno vinculado', async () => {
    await seedUser({ id: 'gp', email: 'gp@t.br', roles: ['GestorPrograma'] });
    await pool.query(`UPDATE users SET programa_id = 'prog-1' WHERE id = 'gp'`);
    const gp = await login('gp@t.br');
    const lista = await request(app).get('/api/users').set('Authorization', `Bearer ${gp}`);
    expect(lista.body.map((u) => u.id)).toContain('u-ana');
    const um = await request(app).get('/api/users/u-ana').set('Authorization', `Bearer ${gp}`);
    expect(um.status).toBe(200);
  });

  it('a proficiência reconhece o aluno matriculado', async () => {
    const r = await request(app).post('/api/proficiencia/verificar-aluno').send({ nome: 'Ana Aluna' });
    expect(r.body).toEqual({ encontrado: true });
  });
});
```

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js -t "usuários e escopo"`
Expected: FAIL na forma `pessoa`. A lista traz `programas_vinculo: []`, o gestor recebe 403 e a proficiência responde `encontrado: false`.

- [ ] **Step 2: `anexarProgramasVinculo`**

Em `usersController.js`, acrescentar `import { doUsuario } from '../db/identidadeVinculo.js';` e trocar a consulta e o laço:

```js
  const { rows } = await query(
    `SELECT u.id AS usuario_id, p.id AS programa_id, p.sigla, p.nome
       FROM vinculos v
       JOIN users u ON ${doUsuario('v.pessoa_id')}
       JOIN programas p ON p.id = v.programa_id
      WHERE v.ativo = TRUE AND v.papel = ANY($1::text[]) AND u.id = ANY($2::text[])`,
    [PAPEIS_VINCULO_PROGRAMA, ids]
  );
  const porPessoa = {};
  for (const r of rows) {
    (porPessoa[r.usuario_id] ||= []).push({ id: r.programa_id, sigla: r.sigla, nome: r.nome });
  }
```

- [ ] **Step 3: Escopo do gestor em `repositories.js`**

Acrescentar `import { doUsuario } from './identidadeVinculo.js';` e trocar as duas consultas:

```js
  async getScopedToPrograma(programaId) {
    const { rows } = await query(
      `SELECT DISTINCT u.* FROM users u
       LEFT JOIN vinculos v ON ${doUsuario('v.pessoa_id')} AND v.programa_id = $1
       WHERE u.programa_id = $1 OR v.id IS NOT NULL
       ORDER BY u.criado_em ASC`,
      [programaId]
    );
    return rows.map(userFromRow);
  },
  // True se o usuário tem algum vínculo (ativo ou não) com o programa.
  async isLinkedToPrograma(userId, programaId) {
    const { rows } = await query(
      `SELECT 1 FROM vinculos v JOIN users u ON ${doUsuario('v.pessoa_id')}
        WHERE u.id = $1 AND v.programa_id = $2 LIMIT 1`,
      [userId, programaId]
    );
    return rows.length > 0;
  },
```

- [ ] **Step 4: `verificarAluno`**

Em `proficienciaController.js`, acrescentar `import { doUsuario } from '../db/identidadeVinculo.js';` e trocar `JOIN vinculos v ON v.pessoa_id = u.id` por `` JOIN vinculos v ON ${doUsuario('v.pessoa_id')} ``, transformando a string SQL em template literal.

- [ ] **Step 5: Rodar**

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js server/__tests__/users.test.js server/__tests__/gestor_programa.test.js server/__tests__/authz.test.js server/__tests__/proficiencia.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/controllers/usersController.js server/db/repositories.js server/controllers/proficienciaController.js server/__tests__/vinculosPessoa.test.js
git commit -m "feat(B.11): lista de usuarios, escopo do gestor e proficiencia acham o vinculo pelos dois ids"
```

---

## Task 6: Câmara ("Meus processos"), notificações e pós-doutorado

**Files:**
- Modify: `server/controllers/camaraController.js:157-168`
- Modify: `server/services/prazos.js:23-38`
- Modify: `server/db/posDoutoradoRepo.js:17-22,43-47,73-91`
- Test: `server/__tests__/vinculosPessoa.test.js`

- [ ] **Step 1: Testes (falham)**

Acrescentar `import { resolverPessoa } from '../services/prazos.js';` no topo, e:

```js
describe.each(FORMAS)('B.11 Câmara e notificações — gravado por %s', (forma) => {
  let ana;
  beforeEach(async () => {
    ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana Relatora' });
  });

  it('"Meus processos" traz a relatoria de quem está logado', async () => {
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: '23082.000009/2026-11', assunto: 'Teste B.11' });
    await pool.query(
      `INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, ativa) VALUES ('rel-1', $1, $2, 'Ana Relatora', TRUE)`,
      [proc.body.id, gravado(forma, ana)]
    );
    const t = await login('ana@t.br');
    const r = await request(app).get('/api/camara/meus-processos').set('Authorization', `Bearer ${t}`);
    expect(r.body.map((p) => p.numero)).toEqual(['23082.000009/2026-11']);
  });

  it('resolverPessoa cai no e-mail de login quando não há institucional', async () => {
    expect(await resolverPessoa(gravado(forma, ana))).toEqual({ nome: 'Ana Relatora', email: 'ana@t.br' });
  });
});

describe('B.11 pós-doutorado — pessoa com login', () => {
  it('nome da pessoa e e-mail de login', async () => {
    await seedUserComPessoa({ id: 'u-pd', email: 'pd@t.br', nome: 'Pós Doc' });
    const r = await asAdmin(request(app).post('/api/pos-doutorado')).send({
      pessoaId: 'u-pd', supervisorNome: 'Supervisor', projetoTitulo: 'Projeto', programaId: 'prog-1',
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ nome: 'Pós Doc', email: 'pd@t.br' });
  });
});
```

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js -t "Câmara|pós-doutorado"`
Expected: FAIL. Na forma `pessoa`, "Meus processos" vem vazio e o e-mail vem `null`. No pós-doc o e-mail também vem `null`: esse bug já existe hoje, porque o cadastro de pós-doc grava `pessoas.id`.

- [ ] **Step 2: `getMeusProcessos`**

Acrescentar `import { idsDaMesmaPessoa } from '../db/identidadeVinculo.js';` e trocar a função:

```js
// "O que está comigo" — visão do relator autenticado (Fase 4). relator_id pode
// estar com o users.id ou com o pessoas.id de quem está logado (B.11).
export const getMeusProcessos = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: 'Não autenticado.' });
  const ids = await idsDaMesmaPessoa(req.user.id);
  const { rows } = await query(
    `SELECT p.*, r.prazo_devolucao AS relator_prazo_devolucao, r.relator_nome
       FROM camara_relatorias r
       JOIN processos p ON p.id = r.processo_id
      WHERE r.relator_id = ANY($1::text[]) AND r.ativa = TRUE
      ORDER BY r.prazo_devolucao ASC NULLS LAST`,
    [ids]
  );
  res.json(rows.map(fromRowProcesso));
};
```

- [ ] **Step 3: `resolverPessoa`**

Em `services/prazos.js`, acrescentar `import { joinPessoa, nomePessoa, emailPessoa } from '../db/identidadeVinculo.js';` e trocar o comentário e a função `resolverPessoa`:

```js
// Nome e e-mail de quem está por trás de um id de vínculo (users.id ou
// pessoas.id — identidadeVinculo.js): o e-mail institucional, e na falta
// dele o de login.
export const resolverPessoa = async (id) => {
  if (!id) return { nome: null, email: null };
  const { rows } = await query(
    `SELECT ${nomePessoa()} AS nome, ${emailPessoa()} AS email
       FROM (SELECT $1::text AS id) x ${joinPessoa('x.id')}
      WHERE u.id IS NOT NULL OR p.id IS NOT NULL`,
    [id]
  );
  return rows[0] ? { nome: rows[0].nome || null, email: rows[0].email || null } : { nome: null, email: null };
};
```

- [ ] **Step 4: Pós-doc**

Em `posDoutoradoRepo.js`, acrescentar `import { joinPessoa, pessoaReal } from './identidadeVinculo.js';`. Depois:

1. No `JOIN_SELECT`, trocar `v.pessoa_id AS vinculo_pessoa_id` por `${pessoaReal('v.pessoa_id')} AS vinculo_pessoa_id`. Trocar as duas linhas `LEFT JOIN users u ON u.id = v.pessoa_id` / `LEFT JOIN pessoas p ON p.id = v.pessoa_id` por `${joinPessoa('v.pessoa_id')}`. A constante já é template literal.
2. Em `fromRow`, trocar o comentário e o `const pessoa = ...` por:

```js
  // Pessoa do vínculo (identidadeVinculo.js): `pessoas` primeiro, o login
  // completa nome/e-mail/CPF/telefone que faltarem (D-B11b).
  const p = r.p_json || {};
  const pessoa = (r.u_id || r.p_json) ? {
    nome: p.nome || r.u_perfil_nome || null,
    email: p.email_institucional || r.u_email || null,
    cpf: p.cpf || r.u_perfil_cpf || null,
    telefones: p.telefones || (Array.isArray(r.u_perfil_telefones) ? r.u_perfil_telefones.join(', ') : r.u_perfil_telefones) || null,
    nacionalidade: p.nacionalidade, estrangeiro: p.estrangeiro, lattes: p.lattes, orcid: p.orcid,
  } : null;
```

3. No objeto devolvido, trocar `email: pessoa?.email || pessoa?.email_institucional || null,` por `email: pessoa?.email || null,`.

- [ ] **Step 5: Rodar**

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js server/__tests__/prazos.test.js server/__tests__/camara.test.js server/__tests__/acabamento.test.js server/__tests__/posDoutorado.test.js server/__tests__/notificacoes.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/controllers/camaraController.js server/services/prazos.js server/db/posDoutoradoRepo.js server/__tests__/vinculosPessoa.test.js
git commit -m "fix(B.11): meus processos, e-mail das notificacoes e do pos-doc acham a pessoa pelos dois ids"
```

---

## Task 7: Joins restantes pelo módulo

Troca mecânica do `LEFT JOIN users` + `LEFT JOIN pessoas` pelo mesmo id. A cobertura vem dos testes existentes. O único teste novo é o dos líderes de grupo, que tinha defeito real: o id do líder deixava de ser o id de login.

**Files:**
- Modify: `server/controllers/gruposPesquisaController.js:15-37`
- Modify: `server/controllers/contatosController.js:21-42`
- Modify: `server/db/estruturaPrpg.js:136-147`
- Modify: `server/controllers/painelController.js:86-95`
- Modify: `server/controllers/programaPublicoController.js:22-30`
- Modify: `server/controllers/qualidadeController.js` (consulta "Vínculos sem data")
- Modify: `server/services/planilhas/contatosImporter.js:264-272`
- Test: `server/__tests__/vinculosPessoa.test.js`

- [ ] **Step 1: Teste dos líderes (falha)**

```js
describe.each(FORMAS)('B.11 grupos de pesquisa — líder gravado por %s', (forma) => {
  it('o líder sai com o id de login (o formulário compara com a lista de professores)', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana Líder' });
    const g = await asAdmin(request(app).post('/api/grupos-pesquisa')).send({ title: 'Grupo B11', body: { value: '', summary: '' } });
    await pool.query(
      `INSERT INTO vinculos (id, grupo_pesquisa_id, pessoa_id, papel, ativo) VALUES ('v-lid', $1, $2, 'LIDER_GRUPO_PESQUISA', TRUE)`,
      [g.body.id, gravado(forma, ana)]
    );
    const r = await asAdmin(request(app).get('/api/grupos-pesquisa'));
    expect(r.body.find((x) => x.id === g.body.id).lideres).toEqual([expect.objectContaining({ id: 'u-ana', nome: 'Ana Líder' })]);
  });
});
```

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js -t "grupos de pesquisa"`
Expected: FAIL na forma `pessoa` — `id` vem `pes-u-ana` (ou o uuid da pessoa).

- [ ] **Step 2: `listarLideres`**

Acrescentar `import { joinPessoa } from '../db/identidadeVinculo.js';` e trocar

```js
     FROM vinculos v
     LEFT JOIN users u ON u.id = v.pessoa_id
     LEFT JOIN pessoas p ON p.id = v.pessoa_id
```

por

```js
     FROM vinculos v
     ${joinPessoa('v.pessoa_id')}
```

transformando a string em template literal. O restante (`r.u_id ? {...} : {...}`) fica como está: o líder com login sai com o id de login, como o formulário espera.

- [ ] **Step 3: Agenda de contatos (`contatosController.js`)**

Trocar o comentário e a constante `AGENDA_SELECT` por:

```js
// Para cada vínculo do papel pedido, a pessoa (pessoas.id) e o login por trás
// dele — identidadeVinculo.js (B.11).
const AGENDA_SELECT = `
  SELECT v.id AS vinculo_id, v.papel, v.programa_id, v.data_inicio_mandato,
    v.carater, v.ato_id,
    pr.sigla AS programa_sigla, pr.nome AS programa_nome, pr.campus,
    u.id AS user_id, u.email AS user_email, u.perfil_nome AS user_nome,
    u.perfil_foto_url AS user_foto_url,
    COALESCE(p.id, u.id) AS pessoa_id,
    ${nomePessoa()} AS nome,
    ${campoPessoa('foto_url', 'perfil_foto_url')} AS foto_url
  FROM vinculos v
  LEFT JOIN programas pr ON pr.id = v.programa_id
  ${joinPessoa('v.pessoa_id')}
  WHERE v.ativo = TRUE
`;
```

com `import { joinPessoa, nomePessoa, campoPessoa } from '../db/identidadeVinculo.js';`.

- [ ] **Step 4: Estrutura, painel, página pública, qualidade**

Cada arquivo importa `joinPessoa` de `identidadeVinculo.js` (caminho relativo ao arquivo), e o par de joins é trocado:

- `server/db/estruturaPrpg.js`: `LEFT JOIN pessoas p ON p.id = v.pessoa_id` + `LEFT JOIN users u ON u.id = v.pessoa_id` → `${joinPessoa('v.pessoa_id')}`. O `SELECT` já faz `coalesce(p.nome, u.perfil_nome)` e fica igual.
- `server/controllers/painelController.js` (mandatos vencendo): `LEFT JOIN pessoas pe ON pe.id = v.pessoa_id` + `LEFT JOIN users u ON u.id = v.pessoa_id` → `${joinPessoa('v.pessoa_id', { p: 'pe' })}`.
- `server/controllers/programaPublicoController.js`: no `PESSOA_SQL`, trocar o comentário `// Pessoa do vínculo: users OU pessoas (vinculos.pessoa_id é polimórfico).` por `// Pessoa do vínculo — identidadeVinculo.js (B.11).`. As duas linhas de join viram `${joinPessoa('v.pessoa_id')}`. E `coalesce(u.perfil_nome, p.nome) AS nome, coalesce(u.acad_lattes, p.lattes) AS lattes` passa a ser `${nomePessoa()} AS nome, ${campoPessoa('lattes', 'acad_lattes')} AS lattes`, com esses dois no import.
- `server/controllers/qualidadeController.js` ("Vínculos sem data"): `LEFT JOIN pessoas pe ON pe.id = v.pessoa_id` + `LEFT JOIN users u ON u.id = v.pessoa_id` → `${joinPessoa('v.pessoa_id', { p: 'pe' })}`.

- [ ] **Step 5: `contatosImporter.js` (vínculo atual do papel)**

Trocar a consulta `atuais` por:

```js
        const { rows: atuais } = await ctx.q(`
          SELECT v.id, v.pessoa_id, COALESCE(p.nome, u.perfil_nome) AS nome,
                 ${pessoaReal('v.pessoa_id')} AS pessoa_real
            FROM vinculos v
            ${joinPessoa('v.pessoa_id')}
           WHERE v.programa_id = $1 AND v.papel = ANY($2) AND v.ativo
             AND (v.data_fim_mandato IS NULL OR v.data_fim_mandato >= CURRENT_DATE)`,
          [programa.id, PAPEIS_EQUIVALENTES[p.papel]]);
```

com `import { joinPessoa, pessoaReal } from '../../db/identidadeVinculo.js';`. A variável de laço `p` desse trecho **não** colide: o alias `p` vive só dentro da string SQL.

- [ ] **Step 6: Nenhum join duplo sobrando**

Run: `git grep -n -E "u\.id = v\.pessoa_id|v\.pessoa_id = u\.id|p\.id = v\.pessoa_id|pe\.id = v\.pessoa_id" -- server ':!server/__tests__' ':!server/db/identidadeVinculo.js'`
Expected: nenhuma linha. Antes do plano eram 21, em 11 arquivos, todas cobertas pelas Tasks 3, 5, 6 e 7. Qualquer linha que aparecer é um join que ficou para trás.

- [ ] **Step 7: Rodar a suíte**

Run: `npx vitest run`
Expected: PASS (`contatos`, `estrutura`, `painel`, `conexoes`, `qualidade`, `planilhasImportadores`, `legado`, `entities` cobrem os trechos trocados).

- [ ] **Step 8: Commit**

```bash
git add server/controllers/gruposPesquisaController.js server/controllers/contatosController.js server/db/estruturaPrpg.js server/controllers/painelController.js server/controllers/programaPublicoController.js server/controllers/qualidadeController.js server/services/planilhas/contatosImporter.js server/__tests__/vinculosPessoa.test.js
git commit -m "refactor(B.11): demais leituras de vinculo usam identidadeVinculo"
```

---

## Task 8: Importadores legados — duplicidade

**Files:**
- Modify: `server/services/importers/professoresImporter.js:66-96`
- Modify: `server/services/importers/alunosImporter.js:137-153`
- Test: `server/__tests__/vinculosPessoa.test.js`

- [ ] **Step 1: Testes (falham)**

Acrescentar os imports `import professoresImporter from '../services/importers/professoresImporter.js';` e `import alunosImporter from '../services/importers/alunosImporter.js';` e:

```js
describe.each(FORMAS)('B.11 importadores legados — vínculo gravado por %s', (forma) => {
  const contar = async (like) => (await pool.query(
    'SELECT count(*)::int AS n FROM vinculos WHERE papel LIKE $1', [like]
  )).rows[0].n;

  it('professor já vinculado fica "inalterado", sem vínculo duplicado', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await vincular('v-doc', gravado(forma, ana), 'DOCENTE_PERMANENTE');
    const m = professoresImporter.map({ name: [{ value: 'Ana' }], mail: [{ value: 'ana@t.br' }] });
    const r = await professoresImporter.importOne(m, { programaId: 'prog-1', actor: 'admin-test', dryRun: false });
    expect(r.acao).toBe('inalterado');
    expect(await contar('DOCENTE%')).toBe(1);
  });

  it('aluno reimportado reaproveita o vínculo existente', async () => {
    const bia = await seedUserComPessoa({ id: 'u-bia', email: 'bia@t.br', nome: 'Bia', roles: ['Aluno'] });
    await vincular('v-disc', gravado(forma, bia), 'DISCENTE_MESTRADO');
    const m = alunosImporter.map({ name: [{ value: 'Bia' }], mail: [{ value: 'bia@t.br' }] });
    await alunosImporter.importOne(m, { programaId: 'prog-1', actor: 'admin-test', dryRun: false });
    expect(await contar('DISCENTE%')).toBe(1);
  });
});
```

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js -t "importadores legados"`
Expected: FAIL na forma `pessoa`: a ação sai `atualizado` e o vínculo fica duplicado (contagem 2).

- [ ] **Step 2: Professores**

Acrescentar `import { idsDaMesmaPessoa } from '../../db/identidadeVinculo.js';` e trocar as duas funções:

```js
// Indica se a pessoa tem vínculo docente ATIVO no programa — fonte de verdade
// para "já está neste programa" (imune a perfil_professor.programas desatualizado).
// O vínculo pode estar com o users.id ou o pessoas.id dela (B.11).
const temVinculoDocenteAtivo = async (programaId, usuarioId) => {
  const ids = await idsDaMesmaPessoa(usuarioId);
  const { rows } = await query(
    'SELECT 1 FROM vinculos WHERE programa_id=$1 AND pessoa_id = ANY($2::text[]) AND papel=ANY($3::text[]) AND ativo=TRUE',
    [programaId, ids, PAPEIS_DOCENTE]
  );
  return rows.length > 0;
};

// Garante o vínculo docente (papel permanente/colaborador) entre o usuário e o
// programa. Se já existir um vínculo inativo (professor removido antes), reativa
// em vez de criar uma linha duplicada.
const garantirVinculo = async (programaId, usuarioId, papel) => {
  const ids = await idsDaMesmaPessoa(usuarioId);
  const existente = (
    await query(
      'SELECT id, ativo FROM vinculos WHERE programa_id=$1 AND pessoa_id = ANY($2::text[]) AND papel=ANY($3::text[]) ORDER BY ativo DESC LIMIT 1',
      [programaId, ids, PAPEIS_DOCENTE]
    )
  ).rows[0];
  if (existente) {
    if (existente.ativo) return false;
    await query('UPDATE vinculos SET ativo=TRUE, papel=$2 WHERE id=$1', [existente.id, papel]);
    return true;
  }
  await query(
    `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em)
     VALUES ($1,$2,$3,$4,TRUE,$5)`,
    [crypto.randomUUID(), programaId, usuarioId, papel, new Date().toISOString()]
  );
  return true;
};
```

- [ ] **Step 3: Alunos**

Acrescentar o mesmo import e trocar `garantirVinculo`:

```js
// Garante o vínculo discente entre o usuário e o programa, no papel/estado dados.
// Reativa/ajusta um vínculo discente existente (users.id ou pessoas.id — B.11)
// em vez de duplicar.
const garantirVinculo = async (programaId, usuarioId, papel, ativo) => {
  const ids = await idsDaMesmaPessoa(usuarioId);
  const existente = (
    await query(
      'SELECT id FROM vinculos WHERE programa_id=$1 AND pessoa_id = ANY($2::text[]) AND papel=ANY($3::text[]) ORDER BY ativo DESC LIMIT 1',
      [programaId, ids, PAPEIS_DISCENTE]
    )
  ).rows[0];
  if (existente) {
    await query('UPDATE vinculos SET ativo=$2, papel=$3 WHERE id=$1', [existente.id, ativo, papel]);
    return;
  }
  await query(
    `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [crypto.randomUUID(), programaId, usuarioId, papel, ativo, new Date().toISOString()]
  );
};
```

- [ ] **Step 4: Rodar**

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/services/importers/professoresImporter.js server/services/importers/alunosImporter.js server/__tests__/vinculosPessoa.test.js
git commit -m "fix(B.11): importadores legados nao duplicam vinculo gravado por pessoas.id"
```

---

## Task 9: Escritas gravam `pessoas.id` e exclusão de usuário vira histórico (D-B11c)

**Files:**
- Modify: `server/db/identidadeVinculo.js` (acrescentar `PessoaNaoEncontrada`, `pessoaCanonica`)
- Modify: `server/controllers/programasController.js` (`createPrograma`, `updatePrograma`, `add*`)
- Modify: `server/controllers/usersController.js:234,331-341`
- Modify: `server/controllers/camaraController.js:294-309`
- Modify: `server/controllers/gruposPesquisaController.js:39-50,92-121`
- Modify: `server/db/posDoutoradoRepo.js` (`create`)
- Modify: `server/services/importers/professoresImporter.js`, `alunosImporter.js` (`garantirVinculo`)
- Test: `server/__tests__/vinculosPessoa.test.js`

- [ ] **Step 1: Testes (falham)**

Acrescentar `import { hojeISO } from '../utils/datas.js';` no topo, e:

```js
describe('B.11 escritas gravam pessoas.id', () => {
  let ana;
  beforeEach(async () => {
    ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
  });

  it('docente, discente e comissão', async () => {
    await asAdmin(request(app).post('/api/programas/prog-1/docentes')).send({ pessoa_id: 'u-ana', papel: 'DOCENTE_PERMANENTE' });
    await asAdmin(request(app).post('/api/programas/prog-1/discentes')).send({ pessoa_id: 'u-ana', papel: 'DISCENTE_DOUTORADO' });
    await asAdmin(request(app).post('/api/programas/prog-1/comissoes')).send({ pessoa_id: 'u-ana', papel: 'COMISSAO_CPG' });
    const { rows } = await pool.query(`SELECT DISTINCT pessoa_id FROM vinculos WHERE programa_id = 'prog-1'`);
    expect(rows).toEqual([{ pessoa_id: ana.pessoaId }]);
  });

  it('coordenação pelo formulário do programa', async () => {
    await asAdmin(request(app).put('/api/programas/prog-1')).send({ coordenador_atual: { pessoa_id: 'u-ana', portaria: 'P1' } });
    const { rows } = await pool.query(`SELECT pessoa_id FROM vinculos WHERE papel = 'COORDENADOR_ATUAL'`);
    expect(rows).toEqual([{ pessoa_id: ana.pessoaId }]);
  });

  it('cadastro de usuário já vinculado ao programa', async () => {
    const r = await asAdmin(request(app).post('/api/users')).send({
      email: 'novo@t.br', roles: ['Aluno'], programaId: 'prog-1', papelVinculo: 'DISCENTE_MESTRADO', perfil_geral: { nome: 'Novo' },
    });
    expect(r.status).toBe(201);
    const { rows } = await pool.query(
      `SELECT v.pessoa_id, u.pessoa_id AS esperado FROM vinculos v JOIN users u ON u.id = $1 WHERE v.papel = 'DISCENTE_MESTRADO'`,
      [r.body.id]
    );
    expect(rows[0].pessoa_id).toBe(rows[0].esperado);
  });

  it('relatoria da Câmara', async () => {
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: '23082.000010/2026-11', assunto: 'B.11' });
    const r = await asAdmin(request(app).post(`/api/camara/processos/${proc.body.id}/relatorias`)).send({ relatorId: 'u-ana', relatorNome: 'Ana' });
    expect(r.status).toBeLessThan(300);
    const { rows } = await pool.query('SELECT relator_id FROM camara_relatorias');
    expect(rows).toEqual([{ relator_id: ana.pessoaId }]);
  });

  it('líderes de grupo, sem mudar o id que o formulário recebe', async () => {
    const g = await asAdmin(request(app).post('/api/grupos-pesquisa')).send({ title: 'G', body: { value: '', summary: '' }, liderIds: ['u-ana'] });
    expect(g.body.lideres).toEqual([expect.objectContaining({ id: 'u-ana' })]);
    const { rows } = await pool.query(`SELECT pessoa_id FROM vinculos WHERE papel = 'LIDER_GRUPO_PESQUISA'`);
    expect(rows).toEqual([{ pessoa_id: ana.pessoaId }]);
  });

  it('id que não é de ninguém responde 400 e não grava nada', async () => {
    const a = await asAdmin(request(app).post('/api/programas/prog-1/docentes')).send({ pessoa_id: 'ninguem', papel: 'DOCENTE_PERMANENTE' });
    const b = await asAdmin(request(app).put('/api/programas/prog-1')).send({ coordenador_atual: { pessoa_id: 'ninguem' } });
    const c = await asAdmin(request(app).post('/api/grupos-pesquisa')).send({ title: 'G2', liderIds: ['ninguem'] });
    expect([a.status, b.status, c.status]).toEqual([400, 400, 400]);
    expect((await pool.query('SELECT count(*)::int AS n FROM vinculos')).rows[0].n).toBe(0);
    const grupos = await asAdmin(request(app).get('/api/grupos-pesquisa'));
    expect(grupos.body.some((x) => x.title === 'G2')).toBe(false);
  });
});

describe('B.11 D-B11c — excluir usuário mantém o histórico', () => {
  it('encerra os vínculos ativos, preserva egresso, pessoa e relatoria', async () => {
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await vincular('v-doc', ana.pessoaId, 'DOCENTE_PERMANENTE');
    await vincular('v-egr', ana.pessoaId, 'EGRESSO');
    const proc = await asAdmin(request(app).post('/api/camara/processos')).send({ numero: '23082.000011/2026-11', assunto: 'B.11' });
    await pool.query(
      `INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, ativa) VALUES ('rel-1', $1, $2, 'Ana', TRUE)`,
      [proc.body.id, ana.pessoaId]
    );

    const del = await asAdmin(request(app).delete('/api/users/u-ana'));
    expect(del.status).toBe(200);

    const { rows } = await pool.query('SELECT id, ativo, data_fim_mandato FROM vinculos ORDER BY id');
    expect(rows).toEqual([
      { id: 'v-doc', ativo: false, data_fim_mandato: hojeISO() },
      { id: 'v-egr', ativo: true, data_fim_mandato: null },
    ]);
    expect((await pool.query('SELECT count(*)::int AS n FROM pessoas WHERE id = $1', [ana.pessoaId])).rows[0].n).toBe(1);
    expect((await pool.query('SELECT relator_id, ativa FROM camara_relatorias')).rows).toEqual([{ relator_id: ana.pessoaId, ativa: true }]);
    expect((await request(app).get('/api/programas/slug/pu/pessoas')).body).toEqual([]);
  });
});
```

Run: `npx vitest run server/__tests__/vinculosPessoa.test.js -t "escritas|D-B11c"`
Expected: FAIL. Os ids gravados continuam sendo `u-ana`, o id `ninguem` é aceito (201) e a exclusão apaga os vínculos.

- [ ] **Step 2: `pessoaCanonica` no módulo**

Acrescentar a `server/db/identidadeVinculo.js`:

```js
import { resolverOuCriarPessoa } from './pessoasRepo.js';

export class PessoaNaoEncontrada extends Error {
  constructor() {
    super('Pessoa não encontrada: selecione um usuário ou uma pessoa já cadastrada.');
    this.status = 400;
    this.expose = true;
  }
}

// Escrita (B.11): o id que chega (users.id do painel ou pessoas.id) vira o
// pessoas.id a gravar — criando a pessoa de um usuário que ainda não tinha
// uma. Vazio -> null; id que não é de ninguém -> PessoaNaoEncontrada (400).
export async function pessoaCanonica(id) {
  if (!id) return null;
  const pessoaId = await resolverOuCriarPessoa({ pessoaId: id });
  if (!pessoaId) throw new PessoaNaoEncontrada();
  return pessoaId;
}
```

- [ ] **Step 3: Programas**

Acrescentar `pessoaCanonica` ao import de `identidadeVinculo.js`. Criar, logo acima de `handlePessoaVinculo`:

```js
// B.11: resolve (e valida) a pessoa de coordenador/substituto/secretaria antes
// de gravar qualquer coisa — id desconhecido vira 400 sem deixar o programa
// pela metade.
const canonizarDirigentes = async (data) => {
  for (const campo of ['coordenador_atual', 'substituto', 'secretaria']) {
    if (data[campo]?.pessoa_id) {
      data[campo] = { ...data[campo], pessoa_id: await pessoaCanonica(data[campo].pessoa_id) };
    }
  }
};
```

Chamar `await canonizarDirigentes(data);` em `createPrograma`, logo após `if (erroCores) return res.status(400).json({ message: erroCores, campo: 'cores' });`. Em `updatePrograma`, fazer o mesmo depois da linha equivalente (`:436`).

Em `addDocente`, `addDiscente` e `addComissaoMembro`, trocar `const ids = await idsDaMesmaPessoa(pessoa_id);` (Task 3) por:

```js
    const pessoaId = await pessoaCanonica(pessoa_id);
    const ids = await idsDaMesmaPessoa(pessoaId);
```

e, no `INSERT` de cada uma, o parâmetro `pessoa_id` passa a ser `pessoaId`. Os três estão dentro de `try/catch` com `serverError`, que responde 400 para `expose`.

- [ ] **Step 4: Cadastro e exclusão de usuário**

Em `usersController.js`:

1. Na criação, `await vincularAoPrograma(ownerProgramaId, created.id, papelVinculo);` passa a ser `await vincularAoPrograma(ownerProgramaId, created.pessoaId, papelVinculo);`. Desde a Task 2, `usersRepo.create` devolve `pessoaId` preenchido.
2. Acrescentar `idsDaMesmaPessoa` ao import de `identidadeVinculo.js` e `import { hojeISO } from '../utils/datas.js';`. Trocar `deleteUser`:

```js
// D-B11c: excluir o login não apaga a pessoa nem o histórico — os vínculos
// ativos são encerrados hoje (egresso já é histórico e fica como está);
// relatorias da Câmara ficam intactas. Para só tirar o acesso de quem continua
// no programa, desative o login em vez de excluir.
export const deleteUser = async (req, res) => {
  try {
    const ids = await idsDaMesmaPessoa(req.params.id);
    await query(
      `UPDATE vinculos SET ativo = FALSE, data_fim_mandato = COALESCE(data_fim_mandato, $2::date)
        WHERE pessoa_id = ANY($1::text[]) AND ativo IS NOT FALSE AND papel <> 'EGRESSO'`,
      [ids, hojeISO()]
    );
    const ok = await usersRepo.remove(req.params.id);
    if (ok) res.json({ message: 'Usuário removido com sucesso' });
    else res.status(404).json({ message: 'Usuário não encontrado' });
  } catch (error) {
    serverError(res, 'Erro ao remover usuário', error);
  }
};
```

- [ ] **Step 5: Relatoria da Câmara**

Em `camaraController.js`, acrescentar `pessoaCanonica` ao import e, em `addRelatoria`, logo depois de `if (!processo) return res.status(404)...` e **antes** de `getAtiva`/`substituir`:

```js
  const relatorId = await pessoaCanonica(req.body.relatorId);
```

No `create`, `relatorId: req.body.relatorId || null` passa a ser `relatorId`.

- [ ] **Step 6: Líderes de grupo**

Em `gruposPesquisaController.js`, acrescentar `pessoaCanonica` ao import e trocar `substituirLideres` por:

```js
// Os ids recebidos (users.id do formulário ou pessoas.id) viram pessoas.id
// antes de qualquer gravação — id desconhecido responde 400 sem criar nada (B.11).
const canonizarLideres = async (liderIds) => {
  const pessoas = [];
  for (const id of liderIds ?? []) if (id) pessoas.push(await pessoaCanonica(id));
  return pessoas;
};

// Substitui todos os líderes de um grupo pelas pessoas dadas (pessoas.id).
const substituirLideres = async (grupoId, pessoaIds) => {
  await query('DELETE FROM vinculos WHERE grupo_pesquisa_id = $1 AND papel = $2', [grupoId, LIDER_PAPEL]);
  for (const pessoaId of pessoaIds) {
    await query(
      `INSERT INTO vinculos (id, grupo_pesquisa_id, pessoa_id, papel, ativo, criado_em)
       VALUES ($1,$2,$3,$4,TRUE,now())`,
      [`vinc-${crypto.randomUUID()}`, grupoId, pessoaId, LIDER_PAPEL]
    );
  }
};
```

Em `createGrupoPesquisa`, dentro do `try` e antes de `gruposRepo.create`, colocar `const lideres = await canonizarLideres(liderIds);`. Depois, `await substituirLideres(criado.id, liderIds);` passa a ser `await substituirLideres(criado.id, lideres);`.

Em `updateGrupoPesquisa`, antes de `gruposRepo.update`, colocar `const lideres = liderIds !== undefined ? await canonizarLideres(liderIds) : undefined;`. Depois, `if (liderIds !== undefined) await substituirLideres(req.params.id, liderIds);` passa a ser `if (lideres !== undefined) await substituirLideres(req.params.id, lideres);`. Aqui o erro sobe para o tratador global de `server/app.js`, que responde 400 para `expose`.

- [ ] **Step 7: Pós-doc e importadores**

- `posDoutoradoRepo.js` `create`: importar `pessoaCanonica` e trocar `data.pessoaId` no `INSERT INTO vinculos` por `await pessoaCanonica(data.pessoaId)`. Com isso o `prorrogar` fica protegido mesmo se o original ainda tiver `users.id`.
- `professoresImporter.js` e `alunosImporter.js` `garantirVinculo`: importar `pessoaCanonica` e, no `INSERT`, trocar `usuarioId` por `await pessoaCanonica(usuarioId)`.

- [ ] **Step 8: Rodar a suíte**

Run: `npx vitest run`
Expected: PASS. `users.test.js` ("admin remove usuário") continua passando: o usuário de teste não tem vínculos.

- [ ] **Step 9: Nenhuma escrita crua sobrando**

Run: `git grep -n "INSERT INTO vinculos\|INSERT INTO camara_relatorias" -- server ':!server/__tests__'`
Expected: cada ocorrência grava um valor que veio de `pessoaCanonica`, de `pessoas.criar`/`porNome` (importadores da Fase O), de `estruturaPrpg.pessoaPorNome` ou de `migrate.mjs` (seed com `pessoas.json`). Conferir uma a uma.

- [ ] **Step 10: Commit**

```bash
git add server/db/identidadeVinculo.js server/controllers/programasController.js server/controllers/usersController.js server/controllers/camaraController.js server/controllers/gruposPesquisaController.js server/db/posDoutoradoRepo.js server/services/importers/professoresImporter.js server/services/importers/alunosImporter.js server/__tests__/vinculosPessoa.test.js
git commit -m "feat(B.11): escritas de vinculo e relatoria gravam pessoas.id; excluir usuario encerra vinculos (D-B11c)"
```

---

## Task 10: Migração B — repontar o dado e criar as FKs (D-B11a)

**Files:**
- Create: `server/db/migrations/2026-09-30_b11b_fk_vinculos_pessoa.sql`
- Modify: `server/db/schema.sql:8-14,344-347,403-409,1040-1041` e depois de `:1054`
- Modify: `server/__tests__/helpers.js` (`RESET_TABLES`)
- Modify: `server/__tests__/acabamento.test.js:57-58`, `server/__tests__/minhaConta.test.js:90-91`
- Modify: `server/__tests__/vinculosPessoa.test.js` (`FORMAS`)
- Test: `server/__tests__/migracoesB11.test.js`

- [ ] **Step 1: Testes da migração B (falham)**

Acrescentar a `migracoesB11.test.js` (e `afterEach` ao import do vitest; `request`, `app`, `seedUserComPessoa`, `loginAdmin` aos imports):

```js
const MIG_B = '2026-09-30_b11b_fk_vinculos_pessoa.sql';
const semFks = () => pool.query(`
  ALTER TABLE vinculos DROP CONSTRAINT IF EXISTS vinculos_pessoa_id_fkey;
  ALTER TABLE camara_relatorias DROP CONSTRAINT IF EXISTS camara_relatorias_relator_id_fkey`);
// Os outros arquivos de teste contam com as FKs: devolve-as sempre.
afterEach(async () => { await resetDb(); await rodar(MIG_B); });

describe('B.11 migração B — pessoas.id e FKs', () => {
  it('troca users.id por pessoas.id e cria as FKs com RESTRICT', async () => {
    await semFks();
    const ana = await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await pool.query(`INSERT INTO pessoas (id, nome) VALUES ('pes-sem', 'Sem Login')`);
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel) VALUES ('v-u', 'u-ana', 'DOCENTE_PERMANENTE'), ('v-p', 'pes-sem', 'SECRETARIO')`);
    const token = await loginAdmin();
    const proc = await request(app).post('/api/camara/processos').set('Authorization', `Bearer ${token}`)
      .send({ numero: '23082.000012/2026-11', assunto: 'B.11' });
    await pool.query(`INSERT INTO camara_relatorias (id, processo_id, relator_id, relator_nome, ativa) VALUES ('rel-1', $1, 'u-ana', 'Ana', TRUE)`, [proc.body.id]);

    await rodar(MIG_B);

    expect((await pool.query('SELECT id, pessoa_id FROM vinculos ORDER BY id')).rows).toEqual([
      { id: 'v-p', pessoa_id: 'pes-sem' }, { id: 'v-u', pessoa_id: ana.pessoaId },
    ]);
    expect((await pool.query('SELECT relator_id FROM camara_relatorias')).rows).toEqual([{ relator_id: ana.pessoaId }]);
    const { rows: fks } = await pool.query(`SELECT conname, confdeltype FROM pg_constraint
      WHERE conname IN ('vinculos_pessoa_id_fkey', 'camara_relatorias_relator_id_fkey') ORDER BY conname`);
    expect(fks).toEqual([
      { conname: 'camara_relatorias_relator_id_fkey', confdeltype: 'r' },
      { conname: 'vinculos_pessoa_id_fkey', confdeltype: 'r' },
    ]);
    await expect(pool.query(`DELETE FROM pessoas WHERE id = 'pes-sem'`)).rejects.toThrow(/vinculos_pessoa_id_fkey/);
  });

  it('aborta inteira, sem mudar nada, se sobrar id que não é de ninguém', async () => {
    await semFks();
    await seedUserComPessoa({ id: 'u-ana', email: 'ana@t.br', nome: 'Ana' });
    await pool.query(`INSERT INTO vinculos (id, pessoa_id, papel) VALUES ('v-u', 'u-ana', 'DOCENTE_PERMANENTE'), ('v-x', 'fantasma', 'SECRETARIO')`);
    await expect(rodar(MIG_B)).rejects.toThrow(/vinculos v-x -> fantasma/);
    expect((await pool.query('SELECT id, pessoa_id FROM vinculos ORDER BY id')).rows).toEqual([
      { id: 'v-u', pessoa_id: 'u-ana' }, { id: 'v-x', pessoa_id: 'fantasma' },
    ]);
  });
});
```

Run: `npx vitest run server/__tests__/migracoesB11.test.js`
Expected: FAIL — `ENOENT ... 2026-09-30_b11b_fk_vinculos_pessoa.sql`.

- [ ] **Step 2: Escrever a migração B**

Criar `server/db/migrations/2026-09-30_b11b_fk_vinculos_pessoa.sql`:

```sql
-- =====================================================================
-- B.11 (docs/analise-fk-vinculos-pessoa-id-b3.md): vinculos.pessoa_id e
-- camara_relatorias.relator_id passam a apontar só para pessoas(id), com FK
-- ON DELETE RESTRICT (D-B11a: nada apaga `pessoas`; uma futura mescla de
-- duplicadas terá de repontar os vínculos antes). Pré-requisito: migração
-- 2026-09-30_b11a (todo usuário tem pessoa) e o código da Task 9 no ar.
-- Uma transação (migrateRunner): se sobrar id que não é de ninguém, aborta
-- inteira e nada muda — a mensagem lista os ids (até 50).
-- Pré-verificação: docs/operations/b11-pre-verificacao.sql.
-- =====================================================================
UPDATE vinculos v SET pessoa_id = u.pessoa_id
  FROM users u WHERE u.id = v.pessoa_id AND u.pessoa_id IS NOT NULL;
UPDATE camara_relatorias r SET relator_id = u.pessoa_id
  FROM users u WHERE u.id = r.relator_id AND u.pessoa_id IS NOT NULL;

DO $$
DECLARE orfaos TEXT;
BEGIN
  SELECT string_agg(x.descr, '; ') INTO orfaos FROM (
    SELECT format('vinculos %s -> %s', v.id, v.pessoa_id) AS descr FROM vinculos v
     WHERE v.pessoa_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pessoas p WHERE p.id = v.pessoa_id)
    UNION ALL
    SELECT format('camara_relatorias %s -> %s', r.id, r.relator_id) FROM camara_relatorias r
     WHERE r.relator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pessoas p WHERE p.id = r.relator_id)
    LIMIT 50
  ) x;
  IF orfaos IS NOT NULL THEN
    RAISE EXCEPTION 'B.11: ids que não são pessoa nem usuário (corrija ou apague antes): %', orfaos;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vinculos_pessoa_id_fkey') THEN
    ALTER TABLE vinculos ADD CONSTRAINT vinculos_pessoa_id_fkey
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'camara_relatorias_relator_id_fkey') THEN
    ALTER TABLE camara_relatorias ADD CONSTRAINT camara_relatorias_relator_id_fkey
      FOREIGN KEY (relator_id) REFERENCES pessoas(id) ON DELETE RESTRICT;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS vinculos_pessoa_idx ON vinculos(pessoa_id);
CREATE INDEX IF NOT EXISTS camara_rel_relator_idx ON camara_relatorias(relator_id);
```

- [ ] **Step 3: As FKs no baseline (`schema.sql`)**

1. Depois de `CREATE INDEX IF NOT EXISTS camara_rel_proc_idx ON camara_relatorias(processo_id);` (`:1054`), acrescentar:

```sql
-- B.11 (D-B11a): vinculos.pessoa_id e camara_relatorias.relator_id apontam
-- só para pessoas(id). RESTRICT: nada apaga `pessoas`; mesclar duplicadas
-- exige repontar os vínculos antes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vinculos_pessoa_id_fkey') THEN
    ALTER TABLE vinculos ADD CONSTRAINT vinculos_pessoa_id_fkey
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'camara_relatorias_relator_id_fkey') THEN
    ALTER TABLE camara_relatorias ADD CONSTRAINT camara_relatorias_relator_id_fkey
      FOREIGN KEY (relator_id) REFERENCES pessoas(id) ON DELETE RESTRICT;
  END IF;
END$$;
CREATE INDEX IF NOT EXISTS vinculos_pessoa_idx ON vinculos(pessoa_id);
CREATE INDEX IF NOT EXISTS camara_rel_relator_idx ON camara_relatorias(relator_id);
```

2. Comentários que ficam falsos:
   - Cabeçalho (`:8-14`): trocar o parágrafo "As FKs polimorficas ... fica para a Fase B.3." por `-- As FKs dos 8 \`programa_id\` (Fase A.11) e de vinculos.pessoa_id /` e `-- camara_relatorias.relator_id -> pessoas (B.11) ja foram aplicadas.`
   - Bloco de `pessoas` (`:344-347`): `(vinculos.pessoa_id legado, camara_relatorias.relator_id)` passa a ser `(vinculos.pessoa_id, camara_relatorias.relator_id — FK desde a B.11)`.
   - `vinculos` (`:403-408`): trocar as 6 linhas de comentário sobre polimorfismo por `-- pessoas.id (FK logo após camara_relatorias — B.11). O login, quando há, é users.pessoa_id = pessoa_id.`
   - `camara_relatorias` (`:1040`): trocar por `-- pessoas.id (FK abaixo — B.11); relator_nome guarda o nome histórico.`

- [ ] **Step 4: Ordem do `resetDb`**

Em `server/__tests__/helpers.js`, `RESET_TABLES`: tirar `'pessoas',` da 3ª linha (depois de `'programas',`) e colocá-la logo depois de `'camara_relatorias', 'camara_atos',`. No comentário `// ORDEM:`, acrescentar: `` `pessoas` vem depois de `vinculos` e `camara_relatorias` (FKs RESTRICT da B.11). ``

- [ ] **Step 5: Testes que ainda gravam `users.id` direto**

- `acabamento.test.js:57-58`: no `VALUES`, `'admin-test'` passa a ser `(SELECT pessoa_id FROM users WHERE id = 'admin-test')`.
- `minhaConta.test.js:90-91`: `'prof-1'` passa a ser `(SELECT pessoa_id FROM users WHERE id = 'prof-1')`.
- `vinculosPessoa.test.js`: `const FORMAS = ['usuario', 'pessoa'];` passa a ser `const FORMAS = ['pessoa'];`, e o comentário acima vira `// Desde a Task 10 (FK) só existe a forma pessoas.id.`

- [ ] **Step 6: Rodar tudo**

Run: `npx vitest run`
Expected: PASS, inclusive `resetDb.test.js` ("a ordem de RESET_TABLES respeita as FKs NO ACTION/RESTRICT"). Uma falha `violates foreign key constraint "vinculos_pessoa_id_fkey"` aponta um teste que insere um id que não está em `pessoas`: corrigir o teste, semeando a pessoa. Nunca afrouxar a FK.

- [ ] **Step 7: Aplicar no banco de dev e comparar**

Run: `docker exec -i prpg-postgres psql -U prpg -d prpg < docs/operations/b11-pre-verificacao.sql` (guardar), depois `npm run db:migrate:apply`, depois o script de novo.
Expected: migração aplicada. "aponta para users.id" = 0 nos dois. A tabela `programa_id, papel, vinculos_ativos` fica **idêntica** à de antes.

- [ ] **Step 8: Conferir o site**

Com `npm run dev`, abrir a página pública de um programa com docentes (`/programas/<slug>`) e `/admin/programas/<id>/docentes`. Os mesmos nomes de antes precisam aparecer. Registrar um screenshot.

- [ ] **Step 9: Commit**

```bash
git add server/db/migrations/2026-09-30_b11b_fk_vinculos_pessoa.sql server/db/schema.sql server/__tests__/helpers.js server/__tests__/acabamento.test.js server/__tests__/minhaConta.test.js server/__tests__/vinculosPessoa.test.js server/__tests__/migracoesB11.test.js
git commit -m "feat(B.11): FK de vinculos.pessoa_id e camara_relatorias.relator_id para pessoas (RESTRICT)"
```

---

## Task 11: Simplificação — o módulo assume a forma final

**Files:**
- Modify: `server/db/identidadeVinculo.js`
- Modify: `server/db/pessoasRepo.js:49` (comentário)

- [ ] **Step 1: Forma final dos trechos**

Em `server/db/identidadeVinculo.js`, trocar o comentário do topo e as três funções:

```js
// B.11 (docs/analise-fk-vinculos-pessoa-id-b3.md): a pessoa por trás de um
// vínculo (`vinculos.pessoa_id`, `camara_relatorias.relator_id`, ambos com FK
// para pessoas desde a migração 2026-09-30_b11b). O login, quando existe, é o
// `users` com users.pessoa_id = pessoa. A entrada do painel ainda chega como
// users.id: `idsDaMesmaPessoa` e `pessoaCanonica` convertem.
import { query } from './pool.js';

export const joinPessoa = (col, { u = 'u', p = 'p' } = {}) => `
  LEFT JOIN pessoas ${p} ON ${p}.id = ${col}
  LEFT JOIN users ${u} ON ${u}.pessoa_id = ${col}`;

export const pessoaReal = (col) => col;

export const doUsuario = (col, { u = 'u' } = {}) => `${col} = ${u}.pessoa_id`;
```

(`campoPessoa`, `nomePessoa`, `emailPessoa`, `idsDaMesmaPessoa`, `PessoaNaoEncontrada` e `pessoaCanonica` ficam como estão.)

- [ ] **Step 2: Comentário do `resolverOuCriarPessoa`**

Em `pessoasRepo.js:49`, trocar `// pessoaId pode ser, na verdade, users.id (identidade polimórfica, como em vinculos.pessoa_id).` por `// O painel manda users.id: resolve para a pessoa ligada ao login.`

- [ ] **Step 3: Nada polimórfico sobrando**

Run: `git grep -n -i "polim" -- server src`
Expected: só as ocorrências que falam de `eventos`/`anexos`/`declaracoes`/`contatos` (polimorfismo por `entidade`, outro assunto). Nenhuma sobre `vinculos.pessoa_id` ou `relator_id`. Reescrever as que sobrarem no mesmo tom de §Step 1.

- [ ] **Step 4: Rodar tudo**

Run: `npx vitest run` e `npm run test:front`
Expected: PASS. Os testes com `FORMAS = ['pessoa']` provam a forma final.

- [ ] **Step 5: Commit**

```bash
git add server/db/identidadeVinculo.js server/db/pessoasRepo.js
git commit -m "refactor(B.11): identidadeVinculo na forma final (so pessoas.id)"
```

---

## Task 12: Registro e implantação

**Files:**
- Modify: `PLANO.md` (linha B.11 → `[x]`; registro da Fase B)
- Modify: `CLAUDE.md` (Database layer, Testing)
- Modify: `docs/analise-fk-vinculos-pessoa-id-b3.md` (status e §9 "Implantação")

- [ ] **Step 1: `PLANO.md`**

Linha B.11: `[ ]` passa a ser `[x]`, e no fim da coluna Bloqueio entra `— implementado em <data> (plano docs/superpowers/plans/2026-09-29-b11-fk-vinculos-pessoa.md)`. No registro da Fase B, `7/11 feitos` passa a ser `8/11 feitos` e "B.11 ... não iniciada" vira "B.11 aplicada".

- [ ] **Step 2: `CLAUDE.md`**

No item 1 de "Important Implementation Notes" (lista de `server/db/`), acrescentar:

```markdown
   - `identidadeVinculo.js` (B.11): **the** way to read the person behind `vinculos.pessoa_id` /
     `camara_relatorias.relator_id` (both FK → `pessoas`, RESTRICT). `joinPessoa(col)` gives `p` (pessoa) and `u`
     (login, `users.pessoa_id`); `pessoaCanonica(id)` turns a panel `users.id` into the `pessoas.id` to write (400
     if unknown). API responses carry `pessoa_id` (pessoas.id) and, panel-only, `usuario_id` (login).
   - `pessoaDoUsuario.js` (D-B11b): `usersRepo.create/update` copy changed profile fields to the linked `pessoas`
     (never erasing a filled value; login e-mail is not copied). `pessoas` is the source for person data.
```

Em "Testing", acrescentar à lista de cobertura: `the person behind a vínculo and the users→pessoas sync (vinculosPessoa, migracoesB11)`.

- [ ] **Step 3: Análise — status e implantação**

Em `docs/analise-fk-vinculos-pessoa-id-b3.md`, trocar a linha `**Status:**` por `**Status:** implementado em <data> — plano em docs/superpowers/plans/2026-09-29-b11-fk-vinculos-pessoa.md.` e acrescentar ao fim:

```markdown
## 9. Implantação (produção)

1. Rodar `docs/operations/b11-pre-verificacao.sql` numa **cópia** do banco de produção; órfãos e colisões = 0.
2. Deploy do código até a Task 9 + `npm run db:migrate:apply` (aplica a migração A). Conferir as páginas de programa,
   "Meus processos" e o painel de Pendências.
3. Rodar a pré-verificação na produção; guardar a tabela por programa/papel.
4. Deploy das Tasks 10–11 + `npm run db:migrate:apply` (migração B). Se abortar, a mensagem lista os ids órfãos:
   corrigir (apagar o vínculo ou cadastrar a pessoa) e repetir. Nada muda enquanto isso.
5. Rodar a pré-verificação de novo: "aponta para users.id" = 0; tabela por programa/papel idêntica.

**Reversão:** as migrações são forward-only. O código das Tasks 1–9 lê as duas formas, então voltar para qualquer
versão a partir da Task 9 é seguro depois da migração B. Voltar para antes da Task 3 **não** é: as listas de
docentes/discentes voltariam a consultar só `users` e ficariam vazias.
```

- [ ] **Step 4: Commit**

```bash
git add PLANO.md CLAUDE.md docs/analise-fk-vinculos-pessoa-id-b3.md
git commit -m "docs(B.11): registra a implementacao e o roteiro de implantacao"
```
