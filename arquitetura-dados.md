# Arquitetura de Dados — Revisão e Plano de Harmonização

> **Contexto**: antes de implementar o módulo de Pós-Doutorado (PNPD), foi levantada a
> pergunta certa: `camara_processos` deveria ser apenas `processos`? E `camara_eventos`,
> apenas `eventos`? Este documento responde a isso olhando o schema inteiro
> (35 tabelas, `server/db/schema.sql`), identifica os padrões que se repetem, propõe um
> modelo harmonizado e **substitui o §8 e o §14 de [`requisitos-pnpd.md`](requisitos-pnpd.md)**
> por um plano de implementação assentado sobre essa fundação.
>
> **Premissa autorizada**: o sistema está em desenvolvimento e tabelas podem ser refeitas.
> Isso muda a resposta certa. Com dados em produção, a recomendação seria conviver com a
> duplicação; sem eles, corrigir a fundação agora custa **uma vez** e barato.
>
> **Status**: planejamento. Data: 26/07/2026.
> Documentos irmãos: [`requisitos-camara.md`](requisitos-camara.md), [`requisitos-pnpd.md`](requisitos-pnpd.md),
> [`requisitos-expedientes.md`](requisitos-expedientes.md).
>
> ⚠️ **ATUALIZAÇÃO (26/07/2026)** — a análise da planilha `OFÍCIOS_EDITAIS_PORTARIAS_PRPG.xlsx`
> (ver [`requisitos-expedientes.md`](requisitos-expedientes.md)) **confirmou** as onze
> generalizações abaixo e **alterou uma**: a tabela `atos` do §5.6 ganha série, numeração
> sequencial e situação, e a coluna `revogado_por_id` dá lugar à tabela `ato_referencias`.
> O §5.6 e o §7 já incorporam a mudança. Nenhuma outra decisão precisou ser revista — a
> arquitetura absorveu um módulo inteiro ao custo de duas tabelas pequenas e uma coluna.

---

## Sumário

1. [Resposta curta](#1-resposta-curta)
2. [Diagnóstico: os padrões que se repetem](#2-diagnóstico-os-padrões-que-se-repetem)
3. [O modelo harmonizado](#3-o-modelo-harmonizado)
4. [O que NÃO generalizar](#4-o-que-não-generalizar)
5. [Schema proposto](#5-schema-proposto)
6. [Impacto no código existente](#6-impacto-no-código-existente)
7. [Plano de implementação revisado](#7-plano-de-implementação-revisado)
8. [Testes](#8-testes)
9. [Riscos e decisões pendentes](#9-riscos-e-decisões-pendentes)

---

## 1. Resposta curta

**Sim para `processos`. Sim, com mais convicção ainda, para `eventos`.** E a investigação
revelou **nove outros pontos** de igual ou maior valor — dois deles mais importantes que os
dois da pergunta original.

| # | Generalização | Valor | Custo | Veredito |
|---|---|---|---|---|
| **G1** | **Identidade única de pessoa** (`users` + `pessoas` → `pessoas` + credencial) | ⬛⬛⬛⬛⬛ | ⬛⬛⬛ | **fazer primeiro** |
| **G2** | `camara_eventos` → **`eventos`** (linha do tempo polimórfica) | ⬛⬛⬛⬛⬛ | ⬛ | **fazer** |
| **G3** | `camara_processos` → **`processos`** | ⬛⬛⬛⬛ | ⬛⬛ | **fazer** |
| **G4** | `portarias` + `camara_atos` + `resolucoes` → **`atos`** | ⬛⬛⬛⬛ | ⬛⬛ | **fazer** |
| **G5** | 15 colunas `*_url` espalhadas → **`arquivos` + `anexos`** | ⬛⬛⬛⬛ | ⬛⬛ | **fazer** |
| **G6** | Declaração verificável com QR → **`declaracoes`** | ⬛⬛⬛⬛ | ⬛ | **fazer** |
| **G7** | Datas `TEXT 'YYYY-MM-DD'` → **`DATE`** | ⬛⬛⬛ | ⬛⬛ | **fazer agora ou nunca** |
| **G8** | `camara_unidades` → **`unidades`** | ⬛⬛⬛ | ⬛ | **fazer** |
| **G9** | `vinculos` generalizado (período + ato + situação derivada) | ⬛⬛⬛ | ⬛⬛ | **fazer** |
| **G10** | `taxonomias` + enums *hardcoded* → **`vocabularios`** | ⬛⬛ | ⬛⬛ | fazer (Fase B) |
| **G11** | Legado Drupal `field_*` → nomes reais | ⬛⬛ | ⬛⬛⬛ | fazer por último |

E **cinco generalizações que seriam erro** — documentadas no §4, porque saber onde parar é
metade do trabalho de arquitetura.

---

## 2. Diagnóstico: os padrões que se repetem

Cada item abaixo foi verificado no código, não presumido.

### 2.1 A mesma pessoa mora em duas tabelas e ninguém sabe em qual

`users` (com login) e `pessoas` (sem login) descrevem a mesma coisa do mundo real. A
consequência aparece em quatro lugares, todos com FK impossível de declarar:

| Local | Coluna | Comentário no próprio código |
|---|---|---|
| `vinculos` | `pessoa_id` | *"polimórfico: aponta para users.id OU pessoas.id (legado), resolvido na aplicação. Por isso não há FK aqui."* |
| `camara_relatorias` | `relator_id` | *"polimórfico (users.id ou pessoas.id), como em vinculos.pessoa_id"* |
| `inscricoes_proficiencia` | `aluno_id` | *"users.id (resolvido na aplicação)"* |
| `pos_doutorados` (planejado) | `pessoa_id`, `supervisor_id` | herdaria o mesmo problema |

**O custo é mensurável.** `programasController.js:80` carrega **todos** os `users`, **todas**
as `pessoas` e **todas** as `portarias` na memória e faz `.find()` por vínculo (`buildCombined`),
porque o banco não consegue fazer esse `JOIN`. É uma junção em JavaScript que existe apenas
para contornar a ausência de uma FK.

Efeito colateral em cascata: como não há como referenciar uma pessoa com segurança, **todo
módulo carrega o nome desnormalizado ao lado** — `camara_relatorias.relator_nome`,
`bolsas.field_aluno`, `disciplinas.field_docente`, `teses_dissertacoes.field_autor`,
`grupos_pesquisa.field_lideres` (JSONB), e o `supervisor_nome` que o PNPD ia repetir. É
exatamente a mesma doença da coluna `ORIENTADOR` da planilha do PNPD: **pessoa como string**.

> Diagnosticamos na planilha o que o próprio schema faz.

`pessoas` hoje tem **dois usos reais no código inteiro**: uma leitura em
`programasController.js` e um seed de teste. O momento de unificar é agora.

### 2.2 Linha do tempo: uma por módulo, e já ia nascer a terceira

`camara_eventos` é *append-only*, tem `tipo`, `data`, `descricao`, `anexo_url` e `criado_por`.
O plano do PNPD (§8 de `requisitos-pnpd.md`) propunha `posdoc_eventos` — **a mesma tabela com
outro nome**, e justificava a duplicação por não querer mexer num módulo "em produção".

Com a premissa de que tabelas podem ser refeitas, essa justificativa cai. E a lista de quem
vai querer uma linha do tempo é longa e previsível: processo, pós-doutorado, vínculo (quando
o docente foi credenciado, recredenciado, descredenciado), inscrição de proficiência,
programa (credenciamento, mudança de nota CAPES), edital (erratas, resultado parcial, final —
que hoje são colunas!), usuário.

**Uma tabela `eventos` polimórfica atende a todos.** É a generalização de menor custo e maior
alcance do documento: ~15 linhas de SQL e um repositório de ~40 linhas resolvem a linha do
tempo de todo módulo futuro.

### 2.3 "Processo" é conceito da universidade, não da Câmara

O NUP `23082.XXXXXX/AAAA-DD` é a chave de negócio de **qualquer** matéria administrativa na
UFRPE. A Câmara foi só o primeiro módulo a precisar dele. O PNPD precisa (94 dos 95 registros
têm processo). E virão: credenciamento docente, revalidação de diploma, afastamento para
capacitação, convênios/MINTER-DINTER, cursos lato sensu, recursos discentes.

Chamar a tabela de `camara_processos` obriga cada módulo novo a uma de três saídas ruins:
(a) criar a sua própria tabela de processos; (b) referenciar uma tabela cujo nome mente sobre
seu escopo; (c) guardar o NUP como texto solto — que foi exatamente o que a planilha do PNPD
fez, e o motivo de o processo `23082.007791/2022-55` aparecer duas vezes sem que ninguém
percebesse.

**Ponto de atenção honesto**: o que é *específico da Câmara* dentro de `camara_processos` é
menos do que parece. Revisando coluna a coluna:

| Coluna | Genérica? |
|---|---|
| `numero`, `numero_valido`, `link_sipac`, `assunto`, `interessado` | genérica |
| `tipo_materia`, `programa_id`, `sigiloso`, `observacoes` | genérica |
| `unidade_responsavel_id`, `localizacao_id`, `localizacao_em` | genérica (tramitação é de todo processo) |
| `data_entrada`, `data_encerramento`, `processo_pai_id` (apensamento) | genérica |
| `status` (`APTO_PAUTA`, `RELATOR_DESIGNADO`, `PAUTADO`…) | **específica do rito do colegiado** |
| `status_motivo`, `obs_original` | genérica |

**Uma única coluna é específica.** E ela é `TEXT` com vocabulário validado no controller —
ou seja, já resolve por domínio. `camara_reunioes`, `camara_pauta_itens` e `camara_relatorias`
**continuam com o prefixo `camara_`, e corretamente**: pauta, relatoria e reunião são conceitos
de órgão colegiado, não de processo.

### 2.4 Três tabelas para "documento com número, ano, data e ementa"

| Tabela | Colunas | Referenciada por |
|---|---|---|
| `portarias` | `title`, `data_portaria`, `data_vencimento`, `download_link` | `vinculos.portaria_id` (**sem FK**) |
| `camara_atos` | `tipo`, `numero`, `ano`, `data`, `ementa`, `link`, `resolucao_id` | — |
| `resolucoes` | `section_id`, `section_title`, `category_title`, `title`, `descricao`, `link` | `camara_atos.resolucao_id` |

`camara_atos` já tem uma FK **para** `resolucoes`, o que é a confissão explícita de que são a
mesma coisa vista de dois ângulos: o ato como consequência do processo, e o ato como documento
publicado no site. O PNPD ia precisar de `portaria_id` — a quarta ponta do mesmo nó.

E `resolucoes` e `formularios` são **literalmente idênticas**. O próprio schema admite, na
linha 76: `-- Mesma estrutura (lista de documentos com link).`

### 2.5 Quinze colunas `*_url` e nenhum registro de arquivo

`resolucoes.link` · `formularios.link` · `portarias.download_link` · `editais.download_link` ·
`editais.details_link` · `calendarios.pdf_link` · `programas.regimento_url` ·
`programas.regulamento_url` · `programas.logo_url` · `programas.hero_imagem_url` ·
`camara_reunioes.pauta_pdf_url` · `camara_reunioes.ata_url` · `camara_relatorias.parecer_url` ·
`camara_atos.link` · `camara_eventos.anexo_url` · `inscricoes_proficiencia.comprovante_residencia_url` ·
`inscricoes_proficiencia.comprovante_vinculo_url` · `teses_dissertacoes.field_arquivo` ·
`news.image` — e o PNPD ia acrescentar mais quatro **mais** um `anexos JSONB`.

O que se perde por não haver registro de arquivos:

- não se sabe **quem** enviou, **quando**, **qual o tamanho** nem **o tipo real**;
- arquivos órfãos em `server/uploads/` acumulam sem forma de detectar;
- **LGPD**: `comprovante_residencia_url` é documento pessoal. Ao atender um pedido de exclusão,
  não há como listar todos os arquivos de uma pessoa — só varrendo 19 colunas de 12 tabelas;
- o mesmo PDF anexado em dois lugares vira dois uploads.

### 2.6 A declaração verificável já é padrão, mas está *hardcoded* num módulo

`inscricoes_proficiencia` tem `codigo_verificacao` (UUID) + `emitida_em` (congelada), a rota
pública `GET /api/proficiencia/declaracoes/:codigo` e a página
`src/pages/DeclaracaoProficiencia.jsx`. É um padrão bem resolvido — e **preso a uma tabela**.

Querem o mesmo mecanismo: declaração de vínculo do pós-doc, certificado de conclusão do
pós-doc (`requisitos-pnpd.md` §11), espelho do processo da Câmara (`requisitos-camara.md` §10,
Fase 4), declaração de vínculo de discente, certificado de participação em banca.

Sem generalizar, isso vira `codigo_verificacao` em cinco tabelas e cinco rotas públicas de
verificação quase iguais.

### 2.7 Datas como `TEXT` já estão cobrando juros

O projeto guarda datas como `TEXT 'YYYY-MM-DD'`. As consequências já apareceram:

- **`camaraController.js:132`** compara data com string:
  `r.prazo_devolucao < to_char(CURRENT_DATE, 'YYYY-MM-DD')`. Funciona por sorte do formato ISO,
  e obriga a converter `CURRENT_DATE` para texto em vez de usar o índice naturalmente.
- **`new Date().toISOString().slice(0, 10)` aparece 10 vezes** em `camaraController.js` e
  `proficienciaController.js` — cada uma é uma chance de fuso errado.
- **Datas impossíveis entram sem resistência.** A planilha do PNPD tem `31/04/2024` e
  `31/09/2024`. Em coluna `DATE`, o Postgres recusa; em `TEXT`, entram e ficam.
- Aritmética de intervalo (`dias_parado`, `diasRestantes`, `duracaoMeses` — todos previstos nos
  dois documentos de requisitos) exige *cast* em toda consulta.

O motivo original ("os dados existentes usam slugs/timestamps") vale para os **IDs**, não para
as datas. Datas nunca precisaram ser texto.

### 2.8 Quatro mecanismos para "lista de valores controlada"

| Mecanismo | Onde | Exemplo |
|---|---|---|
| `taxonomias` (chave → `TEXT[]`) | tabela | categorias de notícia |
| `taxonomia_refs` (campo, valor, target_id) | tabela | de-para de importação do Drupal |
| Tabela própria | `linhas_pesquisa`, `camara_unidades` | linhas, setores |
| *Array* `const` no controller | `STATUS_PROCESSO`, `PAPEIS_DISCENTE`, `TIPOS_COMISSAO` | status, papéis |

O quarto é o problemático: os vocabulários mais usados do sistema estão *hardcoded* e exigem
*deploy* para acrescentar um valor — enquanto o `requisitos-camara.md` §6 promete "tela de
administração e opção *outro (especificar)*" para todos eles. `taxonomia_refs` tem propósito
diferente (resolver ID legado na importação) e **deve continuar existindo**.

### 2.9 Achados menores, todos confirmados

- **`proficiencia_periodos` é uma tabela morta.** Tem repositório (`repositories.js:421`) e
  nenhum controller ou rota a usa. O período real vem de `editais` com `proficiencia = true`
  (a FK `inscricoes_proficiencia.periodo_id REFERENCES editais(id)` prova). Só aparece no
  `TRUNCATE` dos testes.
- **Oito `programa_id` sem FK.** As colunas de `news`, `editais`, `disciplinas`, `resolucoes`,
  `formularios`, `teses_dissertacoes`, `faq` e `grupos_pesquisa` foram criadas por
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS programa_id TEXT` (linhas 396-403), **sem
  `REFERENCES`**. Só `pages` e `users` receberam a FK. Apagar um programa deixa oito tabelas
  apontando para o vazio.
- **`vinculos.portaria_id`, `camara_eventos.reuniao_id` e `camara_eventos.relatoria_id`
  também não têm FK.**
- **As tabelas `camara_*` não estão no `TRUNCATE` dos testes** (`__tests__/helpers.js:7`) nem
  no do `migrate.mjs`. Quando o `camara.test.js` previsto for escrito, vai vazar estado entre
  testes.
- **`field_*` vazou para o contrato da API.** `repositories.js` devolve `field_ano`,
  `field_resposta`, `field_docente`, `field_aluno` ao frontend, e **10 telas consomem esses
  nomes**. Renomear no banco obriga a tocar no React — por isso esta é a última fase.
- **`editais.resultado_parcial` e `resultado_final` são colunas de linha do tempo** disfarçadas
  de campo, assim como `erratas JSONB`.

---

## 3. O modelo harmonizado

A ideia central é separar **três camadas** que hoje estão embaralhadas:

```
┌─ NÚCLEO (compartilhado por todos os módulos) ───────────────────────┐
│  pessoas · unidades · programas · arquivos · vocabularios           │
│  processos · atos · eventos · anexos · declaracoes                  │
└─────────────────────────────────────────────────────────────────────┘
             ▲                    ▲                    ▲
┌────────────┴──────┐  ┌──────────┴───────┐  ┌─────────┴──────────┐
│ MÓDULO Câmara     │  │ MÓDULO PNPD      │  │ MÓDULO Proficiência│
│ camara_reunioes   │  │ pos_doutorados   │  │ inscricoes_prof.   │
│ camara_pauta_itens│  │                  │  │                    │
│ camara_relatorias │  │                  │  │                    │
└───────────────────┘  └──────────────────┘  └────────────────────┘
┌─ CONTEÚDO DO SITE (independente) ───────────────────────────────────┐
│  news · editais · pages · programa_paginas · documentos · faq       │
│  disciplinas · bolsas · teses_dissertacoes · grupos_pesquisa        │
└─────────────────────────────────────────────────────────────────────┘
```

**Regra de corte**: vai para o núcleo o que **três ou mais módulos** precisariam recriar.
Fica no módulo o que expressa uma regra daquele domínio. `camara_relatorias` é da Câmara;
`processos` é de todo mundo.

### 3.1 O teste que cada generalização precisa passar

Antes de promover qualquer coisa ao núcleo, três perguntas:

1. **Já existe duplicado?** (`resolucoes`/`formularios`: sim, idênticas)
2. **O próximo módulo recriaria?** (`eventos`: sim, o PNPD já ia)
3. **Generalizar torna alguma consulta *mais difícil*?** Se sim, é abstração prematura.

`news` + `editais` + `pages` numa tabela `conteudos` falha na pergunta 3 — por isso não entra
(§4.1).

---

## 4. O que NÃO generalizar

Esta seção existe porque a resposta fácil a "harmonize a arquitetura" é generalizar tudo, e
isso produz um schema pior que o atual.

### 4.1 Não unificar `news` / `editais` / `pages` / `programa_paginas` numa tabela `conteudos`

São estruturalmente parecidas (título, corpo, data, `programa_id`) e semanticamente distintas.
`editais` tem `deadline`, `erratas`, `resultado_parcial`, `resultado_final`, `numero`,
`proficiencia`; `news` tem `category`, `tags`, `quote`, `author_role`, `image_caption`;
`pages` tem `slug` único. Unificar produziria uma tabela com 30 colunas em que 20 são sempre
nulas, `tipo` governando tudo, e cada consulta carregando um `WHERE tipo = ...`. **O ganho é
estético; o custo é real.** Ficam separadas — apenas com as convenções comuns padronizadas
(FK de `programa_id`, datas `DATE`, auditoria).

### 4.2 Não criar tabela `periodos`

`data_inicio`/`data_fim` aparecem em 6 tabelas com 4 nomes diferentes
(`periodo_data_inicio`, `data_inicio_mandato`, `field_periodo_inicio`, `data_credenciamento`).
Isso é problema de **nomenclatura**, não de modelagem. A correção é padronizar os nomes e ter
**um helper `vigencia(inicio, fim)`** na aplicação. Uma tabela `periodos` com FK polimórfica
transformaria `SELECT * FROM vinculos WHERE ativo` num `JOIN` sem ganhar nada.

### 4.3 Não fazer `eventos` substituir a auditoria `criado_por`/`atualizado_por`

São coisas diferentes: `eventos` registra **fatos do negócio** com data do fato ("parecer
recebido em 12/03"); `criado_por`/`atualizado_por` registram **procedência da linha**. Fundir
os dois obriga a percorrer o log para saber quem editou um registro. Ambos continuam.

### 4.4 Não fazer motor de *workflow* configurável

Tentação natural ao ver `processos` + `eventos` + `status`. O volume não justifica: ~10
processos/mês na Câmara, ~15 pós-docs/ano. `status TEXT` com vocabulário validado no
controller resolve, e é o que já funciona. (Já dito no §13 de `requisitos-camara.md`; repetido
aqui porque a generalização aumenta a tentação.)

### 4.5 Não unificar `disciplinas` / `bolsas` / `teses_dissertacoes` / `grupos_pesquisa`

São entidades de domínio distintas que por acaso têm poucas colunas. O problema real delas não
é existirem separadas — é terem **pessoa como texto** (`field_docente`, `field_aluno`,
`field_autor`) e nomes de coluna do Drupal. Corrigir isso (G1 + G11) resolve; unificá-las não.

---

## 5. Schema proposto

Convenções: IDs `TEXT` (mantém slugs existentes); datas simples `DATE`; *timestamps*
`TIMESTAMPTZ`; auditoria `criado_em`/`atualizado_em`/`criado_por`/`atualizado_por`;
`snake_case` no banco, `camelCase` na API (feito pelos `fromRow`/`toRow`).

### 5.1 Núcleo — identidade (G1)

```sql
-- Pessoa: UMA tabela para todo ser humano do sistema, com ou sem login.
CREATE TABLE pessoas (
  id                  TEXT PRIMARY KEY,
  nome                TEXT NOT NULL,
  cpf                 TEXT UNIQUE,            -- SEMPRE 11 dígitos, sem máscara
  cpf_valido          BOOLEAN DEFAULT TRUE,   -- FALSE = DV não confere (aviso, não bloqueio)
  siape               TEXT,
  email               TEXT,                   -- contato (≠ login)
  telefones           TEXT[] DEFAULT '{}',
  endereco            TEXT,
  foto_url            TEXT,
  nacionalidade       TEXT,
  estrangeiro         BOOLEAN DEFAULT FALSE,
  lattes              TEXT,
  orcid               TEXT,
  google_scholar      TEXT,
  publons             TEXT,
  priv_mostrar_email    BOOLEAN DEFAULT FALSE,
  priv_mostrar_telefone BOOLEAN DEFAULT FALSE,
  criado_em           TIMESTAMPTZ DEFAULT now(),
  atualizado_em       TIMESTAMPTZ DEFAULT now(),
  criado_por          TEXT,
  atualizado_por      TEXT
);

-- Credencial de acesso: 0..1 por pessoa. Quem não tem login simplesmente
-- não tem linha aqui — nada de e-mail falso ou senha fictícia.
CREATE TABLE users (
  id               TEXT PRIMARY KEY,
  pessoa_id        TEXT NOT NULL UNIQUE REFERENCES pessoas(id) ON DELETE CASCADE,
  email            TEXT UNIQUE NOT NULL,      -- login
  password_hash    TEXT NOT NULL,
  senha_temporaria BOOLEAN DEFAULT FALSE,
  roles            TEXT[] NOT NULL DEFAULT '{}',
  programa_id      TEXT REFERENCES programas(id) ON DELETE SET NULL, -- GestorPrograma
  ultimo_acesso_em TIMESTAMPTZ,
  criado_em        TIMESTAMPTZ DEFAULT now(),
  atualizado_em    TIMESTAMPTZ DEFAULT now()
);
```

Some `perfil_aluno`/`perfil_professor` JSONB? **Não.** O que ali é estruturado
(`situacao`, `entrada`, `nivel`) já é, na prática, atributo de **vínculo**, não de pessoa —
e migra para `vinculos.dados`. O que sobrar de genuinamente livre continua em
`vinculos.dados JSONB`.

> **Ganho imediato**: `buildCombined` (`programasController.js`) deixa de existir; vira um
> `JOIN`. `vinculos.pessoa_id`, `camara_relatorias.relator_id` e
> `inscricoes_proficiencia.aluno_id` ganham FK de verdade. Todo `*_nome` desnormalizado passa
> a ser opcional (mantido só onde existe registro histórico sem pessoa cadastrada).

### 5.2 Núcleo — unidades (G8)

```sql
-- Unidades organizacionais da UFRPE: setores, pró-reitorias, conselhos,
-- unidades acadêmicas. Era camara_unidades; nada nela é da Câmara.
CREATE TABLE unidades (
  id            TEXT PRIMARY KEY,
  sigla         TEXT NOT NULL,
  nome          TEXT NOT NULL,
  tipo          TEXT,                  -- PROREITORIA|SETOR|CONSELHO|UNIDADE_ACADEMICA|DEPARTAMENTO|EXTERNO
  unidade_pai_id TEXT REFERENCES unidades(id) ON DELETE SET NULL,
  aliases       TEXT[] DEFAULT '{}',   -- grafias históricas (absorve as da planilha)
  interna_prpg  BOOLEAN DEFAULT FALSE,
  ativo         BOOLEAN DEFAULT TRUE
);
```

### 5.3 Núcleo — arquivos e anexos (G5)

```sql
-- Registro de todo arquivo enviado por /api/upload. Uma linha por upload.
CREATE TABLE arquivos (
  id             TEXT PRIMARY KEY,
  url            TEXT NOT NULL,          -- '/uploads/xxx.pdf'
  nome_original  TEXT,
  mime           TEXT,
  tamanho_bytes  BIGINT,
  sha256         TEXT,                   -- dedupe e verificação de integridade
  sigiloso       BOOLEAN DEFAULT FALSE,  -- documento pessoal (LGPD)
  enviado_em     TIMESTAMPTZ DEFAULT now(),
  enviado_por    TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX arquivos_sha_idx ON arquivos(sha256);

-- Vínculo N:N entre um arquivo e qualquer entidade. Substitui as ~19 colunas
-- *_url espalhadas. entidade/entidade_id são polimórficos (ver §5.9).
CREATE TABLE anexos (
  id           TEXT PRIMARY KEY,
  entidade     TEXT NOT NULL,   -- 'processo'|'pos_doutorado'|'inscricao_proficiencia'|'programa'|...
  entidade_id  TEXT NOT NULL,
  arquivo_id   TEXT NOT NULL REFERENCES arquivos(id) ON DELETE CASCADE,
  tipo         TEXT,            -- PLANO_TRABALHO|RELATORIO_FINAL|PARECER|ATA|COMPROVANTE_RESIDENCIA|...
  descricao    TEXT,
  ordem        INTEGER DEFAULT 0,
  criado_em    TIMESTAMPTZ DEFAULT now(),
  criado_por   TEXT
);
CREATE INDEX anexos_entidade_idx ON anexos(entidade, entidade_id);
```

### 5.4 Núcleo — eventos (G2)

```sql
-- Linha do tempo append-only de QUALQUER entidade. NADA aqui é atualizado
-- ou apagado: cada linha é um fato datado e imutável.
CREATE TABLE eventos (
  id           TEXT PRIMARY KEY,
  entidade     TEXT NOT NULL,   -- 'processo'|'pos_doutorado'|'vinculo'|'inscricao_proficiencia'|'edital'|...
  entidade_id  TEXT NOT NULL,
  tipo         TEXT NOT NULL,   -- vocabulário por entidade (TRAMITACAO|STATUS|PARECER|RELATORIO|NOTA|...)
  data         DATE NOT NULL,   -- data DO FATO, não do registro
  descricao    TEXT,
  -- Referências opcionais, todas com FK real:
  pessoa_id    TEXT REFERENCES pessoas(id)  ON DELETE SET NULL,  -- de quem é o fato
  unidade_id   TEXT REFERENCES unidades(id) ON DELETE SET NULL,  -- tramitação
  arquivo_id   TEXT REFERENCES arquivos(id) ON DELETE SET NULL,
  ato_id       TEXT REFERENCES atos(id)     ON DELETE SET NULL,
  -- Ponteiro livre para o registro que originou o evento (pauta_item, relatoria…):
  origem_tipo  TEXT,
  origem_id    TEXT,
  dados        JSONB DEFAULT '{}',  -- payload específico do tipo (ex.: {de:'X', para:'Y'})
  criado_em    TIMESTAMPTZ DEFAULT now(),
  criado_por   TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX eventos_entidade_idx ON eventos(entidade, entidade_id, data DESC);
CREATE INDEX eventos_tipo_idx     ON eventos(entidade, tipo);
```

> A **linha do tempo unificada** que o `requisitos-pnpd.md` §10.3 descrevia como "fusão de duas
> tabelas na leitura" vira uma consulta:
> `WHERE (entidade='pos_doutorado' AND entidade_id=$1) OR (entidade='processo' AND entidade_id=$2)`.

### 5.5 Núcleo — processos (G3)

```sql
-- Processo administrativo da UFRPE. Chave de negócio = numero (NUP).
-- Era camara_processos; o NUP é conceito da universidade, não do colegiado.
CREATE TABLE processos (
  id                     TEXT PRIMARY KEY,
  -- NNNNN.NNNNNN/AAAA-DD. O prefixo NÃO é sempre 23082 (UFRPE): o acervo real
  -- tem 88881 (CAPES) e 23546 — a validação confere o formato, não o órgão.
  numero                 TEXT NOT NULL UNIQUE,
  numero_valido          BOOLEAN DEFAULT TRUE,   -- FALSE = fora do padrão (aviso, nunca bloqueio)
  link_sipac             TEXT,
  assunto                TEXT NOT NULL,
  tipo                   TEXT,                   -- vocabulário (era tipo_materia)
  -- Interessado: pessoa cadastrada quando houver; texto quando for unidade ou histórico.
  interessado_pessoa_id  TEXT REFERENCES pessoas(id) ON DELETE SET NULL,
  interessado_texto      TEXT,
  programa_id            TEXT REFERENCES programas(id) ON DELETE SET NULL,
  unidade_responsavel_id TEXT REFERENCES unidades(id) ON DELETE SET NULL,
  -- Situação: vocabulário definido pelo domínio dono do tipo (a Câmara mantém
  -- o seu: RECEBIDO|APTO_PAUTA|RELATOR_DESIGNADO|PAUTADO|…). Ver §5.10.
  situacao               TEXT NOT NULL DEFAULT 'RECEBIDO',
  situacao_motivo        TEXT,
  -- Cache de leitura do último evento tipo='TRAMITACAO' (§7.2 requisitos-camara).
  localizacao_id         TEXT REFERENCES unidades(id) ON DELETE SET NULL,
  localizacao_em         DATE,
  data_abertura          DATE,
  data_encerramento      DATE,      -- NULL = em andamento (encerrado é derivado)
  processo_pai_id        TEXT REFERENCES processos(id) ON DELETE SET NULL, -- apensamento
  sigiloso               BOOLEAN DEFAULT FALSE,
  observacoes            TEXT,
  obs_original           TEXT,      -- texto íntegro da planilha de origem
  criado_em              TIMESTAMPTZ DEFAULT now(),
  atualizado_em          TIMESTAMPTZ DEFAULT now(),
  criado_por             TEXT,
  atualizado_por         TEXT
);
CREATE INDEX processos_situacao_idx ON processos(situacao);
CREATE INDEX processos_programa_idx ON processos(programa_id);
CREATE INDEX processos_tipo_idx     ON processos(tipo);
```

**Permanecem com prefixo `camara_`, corretamente** (conceitos de órgão colegiado):

```sql
camara_reunioes      -- reunião da Câmara
camara_pauta_itens   -- N:N processo ↔ reunião  (processo_id → processos.id)
camara_relatorias    -- designação de relator   (processo_id → processos.id,
                     --                          relator_id  → pessoas.id, agora com FK)
```

### 5.6 Núcleo — atos (G4)

> ⚠️ **Revisado em 26/07/2026** pela análise da planilha de ofícios/editais/portarias. A
> tabela precisa não só *registrar* atos existentes, mas **emitir o número** — o que exige
> série, sequencial e situação. A definição completa e comentada está em
> [`requisitos-expedientes.md`](requisitos-expedientes.md) §5.2; abaixo, a forma resumida.

```sql
-- Série de numeração: um "livro" (Ofício, Portaria PRPG, Edital PRPG, Edital
-- PRINT, Edital Lato Sensu, Edital Proficiência...). Ver requisitos-expedientes §5.1.
CREATE TABLE ato_series (
  id                TEXT PRIMARY KEY,
  nome              TEXT NOT NULL,
  especie           TEXT NOT NULL,   -- OFICIO|PORTARIA|EDITAL|RESOLUCAO|DESPACHO|MEMORANDO|CIRCULAR
  sigla             TEXT,
  formato           TEXT DEFAULT '{sigla} Nº {sequencial}/{ano} - PRPG/UFRPE',
  unidade_id        TEXT REFERENCES unidades(id) ON DELETE SET NULL,
  reinicia_por_ano  BOOLEAN DEFAULT TRUE,
  exige_destinatario BOOLEAN DEFAULT FALSE,
  publica_no_site   BOOLEAN DEFAULT FALSE,
  ativo             BOOLEAN DEFAULT TRUE,
  ordem             INTEGER DEFAULT 0
);

-- Ato administrativo expedido pela PRPG: ofício, portaria, edital, resolução,
-- decisão, despacho. Unifica portarias + camara_atos + resolucoes + o livro de
-- numeração da planilha. Referenciado por vinculos, processos, pos_doutorados
-- e editais. (Ofício e edital SÃO atos administrativos — ver §4.3 de
-- requisitos-expedientes.md.)
CREATE TABLE atos (
  id             TEXT PRIMARY KEY,
  serie_id       TEXT NOT NULL REFERENCES ato_series(id),
  ano            INTEGER NOT NULL,
  sequencial     INTEGER NOT NULL,
  numero_exibicao TEXT,          -- cache: 'OFÍCIO Nº 49/2026 - PRPG/UFRPE'
  situacao       TEXT NOT NULL DEFAULT 'RESERVADO', -- RESERVADO|EMITIDO|PUBLICADO|CANCELADO|SEM_EFEITO|RETIFICADO
  situacao_motivo TEXT,
  data           DATE,           -- expedição (NULL enquanto RESERVADO)
  titulo         TEXT,
  assunto        TEXT NOT NULL,
  ementa         TEXT,
  solicitante_pessoa_id   TEXT REFERENCES pessoas(id)  ON DELETE SET NULL,
  unidade_origem_id       TEXT REFERENCES unidades(id) ON DELETE SET NULL,
  destinatario_unidade_id TEXT REFERENCES unidades(id) ON DELETE SET NULL,
  destinatario_texto      TEXT,
  interessado_pessoa_id   TEXT REFERENCES pessoas(id)  ON DELETE SET NULL,
  processo_id    TEXT REFERENCES processos(id) ON DELETE SET NULL,
  programa_id    TEXT REFERENCES programas(id) ON DELETE SET NULL,
  arquivo_id     TEXT REFERENCES arquivos(id) ON DELETE SET NULL,
  link_externo   TEXT,
  vigencia_inicio DATE,
  vigencia_fim    DATE,          -- era portarias.data_vencimento
  publicado      BOOLEAN DEFAULT FALSE,
  secao          TEXT,           -- era resolucoes.section_title
  categoria      TEXT,           -- era resolucoes.category_title
  observacoes    TEXT,
  obs_original   TEXT,
  criado_em      TIMESTAMPTZ DEFAULT now(),
  atualizado_em  TIMESTAMPTZ DEFAULT now(),
  criado_por     TEXT,
  atualizado_por TEXT,
  UNIQUE (serie_id, ano, sequencial)   -- impede número duplicado por construção
);
CREATE INDEX atos_serie_ano_idx ON atos(serie_id, ano, sequencial DESC);
CREATE INDEX atos_publicado_idx ON atos(publicado) WHERE publicado;

-- Referência entre atos: substitui a coluna revogado_por_id por algo que
-- cobre também retificação, publicação e encaminhamento (16 casos reais).
CREATE TABLE ato_referencias (
  id            TEXT PRIMARY KEY,
  ato_id        TEXT NOT NULL REFERENCES atos(id) ON DELETE CASCADE,
  ato_ref_id    TEXT REFERENCES atos(id) ON DELETE SET NULL,
  ato_ref_texto TEXT,            -- quando o referenciado não está cadastrado
  tipo          TEXT NOT NULL,   -- REVOGA|TORNA_SEM_EFEITO|RETIFICA|PUBLICA|ENCAMINHA|COMPLEMENTA|FUNDAMENTA
  criado_em     TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT
);

-- O edital publicado no site aponta para o ato que lhe deu número.
ALTER TABLE editais ADD COLUMN ato_id TEXT REFERENCES atos(id) ON DELETE SET NULL;

-- Documentos para download que NÃO são atos (não têm número, ano nem órgão
-- emissor): formulários, manuais, modelos, cartilhas. Era `formularios`.
CREATE TABLE documentos (
  id            TEXT PRIMARY KEY,
  tipo          TEXT NOT NULL DEFAULT 'FORMULARIO', -- FORMULARIO|MANUAL|MODELO|CARTILHA
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  secao         TEXT,
  categoria     TEXT,
  arquivo_id    TEXT REFERENCES arquivos(id) ON DELETE SET NULL,
  link_externo  TEXT,
  programa_id   TEXT REFERENCES programas(id) ON DELETE SET NULL,
  ordem         INTEGER DEFAULT 0,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT,
  atualizado_por TEXT
);
```

> **Por que `atos` e `documentos` separados, se `resolucoes` e `formularios` eram idênticas?**
> Porque a semelhança era acidental. Um ato é referenciado como **fundamento legal**
> (`vinculos.ato_id` = "esta pessoa é coordenadora por força da Portaria X") e tem número,
> ano, órgão, vigência e revogação. Um formulário é um PDF para baixar. Unificá-los criaria
> uma tabela em que metade das colunas nunca se aplica — o erro do §4.1 em escala menor.

### 5.7 Núcleo — declarações verificáveis (G6)

```sql
-- Documento emitido com código de verificação pública (padrão hoje existente
-- só na proficiência). O snapshot congela o que era verdade na emissão.
CREATE TABLE declaracoes (
  id            TEXT PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,   -- UUID (crypto.randomUUID()) no QR e no link
  tipo          TEXT NOT NULL,          -- PROFICIENCIA|VINCULO_POSDOC|CONCLUSAO_POSDOC|VINCULO_DISCENTE|ESPELHO_PROCESSO
  entidade      TEXT NOT NULL,
  entidade_id   TEXT NOT NULL,
  pessoa_id     TEXT REFERENCES pessoas(id) ON DELETE SET NULL,
  dados         JSONB NOT NULL,         -- snapshot: nome, CPF, período, resultado…
  emitida_em    TIMESTAMPTZ NOT NULL DEFAULT now(),  -- congelada na 1ª emissão
  emitida_por   TEXT REFERENCES users(id) ON DELETE SET NULL,
  valida_ate    DATE,                   -- ex.: proficiência vale 4 anos
  revogada_em   TIMESTAMPTZ,
  revogada_motivo TEXT
);
CREATE INDEX declaracoes_entidade_idx ON declaracoes(entidade, entidade_id);
```

Uma rota pública única — `GET /api/declaracoes/:codigo` — e uma página única
(`src/pages/VerificarDeclaracao.jsx`) substituem a rota e a página específicas da proficiência,
que continuam funcionando por **redirecionamento** da URL antiga (os QR codes já impressos
precisam continuar resolvendo — ver §9).

### 5.8 Núcleo — vínculos (G9)

```sql
-- Vínculo de uma pessoa a um programa ou unidade, com papel e período.
-- Cobre docente, discente, comissão, coordenação e pós-doutorando.
CREATE TABLE vinculos (
  id                  TEXT PRIMARY KEY,
  pessoa_id           TEXT NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE, -- FK REAL
  programa_id         TEXT REFERENCES programas(id) ON DELETE CASCADE,
  unidade_id          TEXT REFERENCES unidades(id)  ON DELETE SET NULL,
  papel               TEXT NOT NULL,  -- DOCENTE_PERMANENTE|DOCENTE_COLABORADOR|DISCENTE_MESTRADO|
                                      -- DISCENTE_DOUTORADO|DISCENTE_PROFISSIONAL|EGRESSO|
                                      -- POS_DOUTORANDO|COORDENADOR|VICE_COORDENADOR|COMISSAO_*
  data_inicio         DATE,
  data_fim            DATE,
  situacao_manual     TEXT,           -- só o que as datas não dizem: RENUNCIA|AFASTADO|...
  motivo_encerramento TEXT,
  ato_id              TEXT REFERENCES atos(id) ON DELETE SET NULL,  -- portaria de designação
  email_funcao        TEXT,
  dados               JSONB DEFAULT '{}',  -- atributos do papel (entrada, nível, orientador…)
  criado_em           TIMESTAMPTZ DEFAULT now(),
  atualizado_em       TIMESTAMPTZ DEFAULT now(),
  criado_por          TEXT,
  atualizado_por      TEXT
);
CREATE INDEX vinculos_pessoa_idx  ON vinculos(pessoa_id);
CREATE INDEX vinculos_programa_idx ON vinculos(programa_id, papel);
CREATE INDEX vinculos_fim_idx     ON vinculos(data_fim);
```

> **`ativo BOOLEAN` sai.** Era o mesmo defeito da coluna `Ativo?` da planilha do PNPD: estado
> armazenado que envelhece sozinho. `situacao` passa a ser **derivada** de `data_inicio`/
> `data_fim`, com `situacao_manual` como única exceção. A regra é uma só, escrita uma vez
> (`server/utils/vigencia.js`), e vale para vínculo, pós-doutorado, ato e programa.

### 5.9 Sobre o polimorfismo de `eventos`, `anexos` e `declaracoes`

As três tabelas do núcleo usam `(entidade, entidade_id)` sem FK. É uma concessão consciente,
e a alternativa foi avaliada:

| Alternativa | Por que não |
|---|---|
| Uma tabela de eventos por entidade | é exatamente o que se quer eliminar; N tabelas idênticas |
| FK opcional por entidade (`processo_id`, `posdoc_id`, `vinculo_id`… tudo *nullable*) | uma coluna nova por módulo novo — a tabela cresce para sempre; `CHECK` de "exatamente um não-nulo" fica ilegível |
| Herança do Postgres / *table inheritance* | não propaga FK nem unicidade; desaconselhada |

**Mitigações adotadas:**

1. `entidade` é validada contra uma lista fechada na aplicação (`ENTIDADES` em
   `server/db/core.js`), e há `CHECK (entidade IN (...))` no banco — barato de atualizar.
2. A limpeza em cascata é feita por **um `TRIGGER` genérico** aplicado a cada tabela dona,
   não espalhada pelos controllers:
   ```sql
   CREATE FUNCTION limpar_dependentes() RETURNS TRIGGER AS $$
   BEGIN
     DELETE FROM eventos     WHERE entidade = TG_ARGV[0] AND entidade_id = OLD.id;
     DELETE FROM anexos      WHERE entidade = TG_ARGV[0] AND entidade_id = OLD.id;
     DELETE FROM declaracoes WHERE entidade = TG_ARGV[0] AND entidade_id = OLD.id;
     RETURN OLD;
   END; $$ LANGUAGE plpgsql;

   CREATE TRIGGER processos_cleanup AFTER DELETE ON processos
     FOR EACH ROW EXECUTE FUNCTION limpar_dependentes('processo');
   ```
3. Um teste de integridade roda no CI: para cada `entidade` conhecida, nenhum
   `entidade_id` órfão.

O projeto **já convive** com polimorfismo em `vinculos.pessoa_id` e `camara_relatorias.relator_id`
— a diferença é que lá ele era acidental e não documentado, e aqui é deliberado, restrito a
três tabelas de anexação e coberto por *trigger* e teste.

### 5.10 Vocabulários (G10)

```sql
CREATE TABLE vocabularios (
  id          SERIAL PRIMARY KEY,
  dominio     TEXT NOT NULL,   -- 'processo.situacao'|'processo.tipo'|'vinculo.papel'|'ato.tipo'|'anexo.tipo'
  valor       TEXT NOT NULL,   -- chave estável (SCREAMING_SNAKE)
  rotulo      TEXT NOT NULL,   -- exibição ('Apto para pauta')
  cor         TEXT,            -- classe/badge, hoje em src/constants/camara.js
  ordem       INTEGER DEFAULT 0,
  ativo       BOOLEAN DEFAULT TRUE,
  programa_id TEXT REFERENCES programas(id) ON DELETE CASCADE, -- NULL = global
  meta        JSONB DEFAULT '{}',
  UNIQUE (dominio, valor, COALESCE(programa_id, ''))
);
```

Os `const` de hoje (`STATUS_PROCESSO`, `PAPEIS_DISCENTE`, `TIPOS_COMISSAO`,
`DELIBERACAO_OPTIONS`) viram **seed** desta tabela e um endpoint
`GET /api/vocabularios?dominio=...`. A validação no controller passa a consultar o vocabulário
(com cache em memória). `taxonomia_refs` **continua existindo** — resolve ID legado do Drupal
na importação, propósito diferente. `taxonomias` (chave → `TEXT[]`) é absorvida e removida.

### 5.11 Módulo PNPD, reescrito sobre o núcleo

Comparado ao §8 de `requisitos-pnpd.md`, a tabela **encolhe de 45 para 20 colunas**. Tudo o que
saiu não foi perdido: foi para onde já pertencia.

```sql
-- Estágio pós-doutoral. É a extensão de um vinculo(papel='POS_DOUTORANDO')
-- com o que só o pós-doutorado tem: projeto, supervisão e prestação de contas.
CREATE TABLE pos_doutorados (
  id                  TEXT PRIMARY KEY,
  vinculo_id          TEXT NOT NULL UNIQUE REFERENCES vinculos(id) ON DELETE CASCADE,
  -- pessoa, programa, período, ato de designação e situação vêm do vínculo.
  supervisor_id       TEXT REFERENCES pessoas(id) ON DELETE SET NULL,
  cossupervisor_id    TEXT REFERENCES pessoas(id) ON DELETE SET NULL,
  projeto_titulo      TEXT NOT NULL,
  projeto_resumo      TEXT,
  linha_pesquisa_id   INTEGER REFERENCES linhas_pesquisa(id) ON DELETE SET NULL,
  modalidade          TEXT NOT NULL DEFAULT 'VOLUNTARIO',
  agencia_fomento     TEXT,
  vinculo_origem      TEXT,
  instituicao_origem  TEXT,
  processo_id         TEXT REFERENCES processos(id) ON DELETE SET NULL,
  renovacao_de_id     TEXT REFERENCES pos_doutorados(id) ON DELETE SET NULL,
  relatorio_entregue_em DATE,
  data_aprovacao_colegiado DATE,
  -- Fidelidade à origem (§13 requisitos-pnpd): texto íntegro da planilha.
  periodo_original    TEXT,
  programa_original   TEXT,
  supervisor_original TEXT,
  data_inicio_aprox   BOOLEAN DEFAULT FALSE,
  data_fim_aprox      BOOLEAN DEFAULT FALSE,
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ DEFAULT now(),
  atualizado_em       TIMESTAMPTZ DEFAULT now(),
  criado_por          TEXT,
  atualizado_por      TEXT
);
```

| O que estava em `pos_doutorados` (plano antigo) | Para onde foi |
|---|---|
| `nome`, `cpf`, `email`, `telefone`, `estrangeiro`, `nacionalidade`, `lattes_url`, `orcid` | `pessoas` |
| `supervisor_nome`, `cossupervisor_nome` | `pessoas` (FK; o nome histórico fica em `supervisor_original`) |
| `programa_id`, `data_inicio`, `data_fim`, `situacao_manual`, `situacao_motivo`, `portaria_id` | `vinculos` |
| `processo_numero`, `processo_valido` | `processos` (via `processo_id`) |
| `relatorio_url`, `anexos JSONB` | `arquivos` + `anexos` |
| `certificado_codigo`, `certificado_emitido_em` | `declaracoes` |
| `posdoc_eventos` (tabela inteira) | `eventos` |

**A tabela `posdoc_eventos` deixa de existir.** Com ela, some a "fusão de duas linhas do tempo
na leitura" que o §10.3 do plano anterior precisava inventar.

---

## 6. Impacto no código existente

Levantamento honesto do que precisa ser tocado. O sistema tem ~23 controllers e ~50 telas;
o impacto é concentrado, não difuso.

| Área | Arquivos | Esforço | O que muda |
|---|---|---|---|
| **Schema** | `schema.sql` (reescrita como *baseline*), `migrations/` | ⬛⬛ | novo arquivo consolidado; migrações históricas viram `migrations/arquivo/` |
| **Núcleo novo** | `db/core.js`, `db/eventosRepo.js`, `db/anexosRepo.js`, `db/declaracoesRepo.js`, `utils/vigencia.js`, `utils/cpf.js`, `utils/datas.js` | ⬛⬛ | código novo, sem regressão possível |
| **Identidade (G1)** | `usersController.js`, `programasController.js`, `authController.js`, `authMiddleware.js`, `repositories.js` | ⬛⬛⬛⬛ | **maior impacto**; `buildCombined` é deletado, vira `JOIN` |
| **Câmara (G3, G2)** | `camaraController.js`, `camaraReunioesController.js`, `camaraRepo.js`, `camaraPdf.js` | ⬛⬛ | renomeações + `camaraEventosRepo` → `eventosRepo`; lógica intacta |
| **Proficiência (G6)** | `proficienciaController.js` | ⬛⬛ | emissão passa a usar `declaracoes`; rota antiga redireciona |
| **Atos (G4)** | `portariasController.js`, `resolucoesController.js`, `formulariosController.js` | ⬛⬛ | 3 controllers → 2 (`atosController`, `documentosController`) |
| **Uploads (G5)** | `adminRoutes.js` (multer), todos os formulários com `*_url` | ⬛⬛⬛ | `/api/upload` passa a gravar em `arquivos` e devolver `{id, url}` |
| **Datas (G7)** | `repositories.js` (`fromRow` formata `DATE` → `'YYYY-MM-DD'`) | ⬛ | **contrato da API não muda**; o frontend não percebe |
| **Frontend** | `AdminPortarias`, `AdminResolucoes`, `AdminFormularios`, `AdminProgramaPessoas`, `AdminUsersList/Form` | ⬛⬛ | telas de ato/documento/pessoa; o resto não é tocado |
| **Legado `field_*` (G11)** | 4 controllers + 10 telas | ⬛⬛⬛ | **última fase**, isolada, adiável sem prejuízo |

**O que NÃO muda**: `news`, `editais`, `pages`, `programa_paginas`, `calendarios`,
`disciplinas`, `bolsas`, `faq`, `grupos_pesquisa`, `teses_dissertacoes`, `metricas_anuais`,
`linhas_pesquisa`, `taxonomia_refs`, microsites, e todas as telas públicas do site — exceto
pela padronização de FK e datas, invisível para elas.

### 6.1 Dados em risco na reconstrução do schema

`npm run db:migrate` reconstrói do zero a partir de `server/data/*.json`. Cruzando com o que
o script realmente semeia:

| Tabela | Reproduzível pelo seed? | Ação |
|---|---|---|
| `news`, `editais`, `resolucoes`, `formularios`, `portarias`, `teses`, `faq`, `disciplinas`, `bolsas`, `pages`, `users`, `taxonomias`, `grupos`, `calendarios`, `programas`, `pessoas`, `modalidades`, `vinculos`, `metricas` | **sim** | nada a fazer |
| `linhas_pesquisa`, `programa_linhas_pesquisa`, `user_linhas_pesquisa` | não (vieram de migração *in-place*) | **exportar antes** |
| `taxonomia_refs` | parcial (seed global existe; edições manuais não) | **exportar antes** |
| `inscricoes_proficiencia` | **não** | **exportar antes** — pode ter inscrição real |
| `camara_*` | **não** | exportar antes (provavelmente vazio) |
| `programa_paginas` | não | **exportar antes** |

Script de resguardo antes de qualquer coisa (Ação A.0 do §7):

```bash
docker exec prpg-postgres pg_dump -U prpg -d prpg --data-only --column-inserts \
  -t linhas_pesquisa -t programa_linhas_pesquisa -t user_linhas_pesquisa \
  -t taxonomia_refs -t inscricoes_proficiencia -t programa_paginas \
  -t 'camara_*' > backup-dados-vivos.sql
```

---

## 7. Plano de implementação revisado

Substitui o §14 de `requisitos-pnpd.md`. Quatro fases; **o PNPD sai na Fase C** e, por causa
da fundação, sai menor do que sairia sozinho.

### Fase A — Núcleo (≈ 2 semanas)

O objetivo é ter a fundação de pé **com os módulos atuais funcionando sobre ela**, antes de
qualquer funcionalidade nova.

| # | Ação | Arquivo |
|---|---|---|
| A.0 | Backup dos dados não reproduzíveis (§6.1) | `backup-dados-vivos.sql` |
| A.1 | Reescrever `schema.sql` como *baseline* consolidado; arquivar as migrações históricas | `server/db/schema.sql`, `server/db/migrations/arquivo/` |
| A.2 | **G1**: `pessoas` como identidade; `users` vira credencial com `pessoa_id` | `schema.sql`, `repositories.js` |
| A.3 | **G7**: todas as datas simples viram `DATE`; `fromRow` formata para `'YYYY-MM-DD'` na saída | `repositories.js`, `utils/datas.js` |
| A.4 | **G8**: `camara_unidades` → `unidades` (+ `tipo`, `unidade_pai_id`) | `schema.sql` |
| A.5 | **G5**: `arquivos` + `anexos`; `/api/upload` passa a registrar | `adminRoutes.js`, `db/anexosRepo.js` |
| A.6 | **G2**: `eventos` polimórfica + `eventosRepo` + *trigger* de limpeza + lista `ENTIDADES` | `db/eventosRepo.js`, `db/core.js` |
| A.7 | **G3**: `camara_processos` → `processos` (+ `interessado_pessoa_id`) | `schema.sql` |
| A.8 | **G4**: `atos` + `ato_series` + `ato_referencias` + a função `proximo_sequencial()` (de `portarias` + `camara_atos` + `resolucoes` + o livro de numeração); `documentos` (de `formularios`) | `schema.sql`, `db/atosRepo.js` |
| A.9 | **G6**: `declaracoes` + serviço de emissão + rota pública única | `services/declaracoes.js` |
| A.10 | **G9**: `vinculos` com FK real, `data_inicio`/`data_fim` e situação derivada | `schema.sql`, `utils/vigencia.js` |
| A.11 | FKs faltantes: os 8 `programa_id`, `vinculos.ato_id`, `eventos.*` | `schema.sql` |
| A.12 | Remover `proficiencia_periodos` (tabela morta) | `schema.sql`, `repositories.js:421` |
| A.13 | Atualizar `migrate.mjs` e `__tests__/helpers.js` com a lista completa de tabelas | ambos |
| A.14 | Utilitários compartilhados: `cpf.js` (normaliza + valida DV), `vigencia.js`, `datas.js`, `nup.js` (movido de `camaraController`) | `server/utils/` |

**Pronto quando:** `npm test` passa inteiro, `npm run db:migrate` reconstrói do zero, e o
painel opera Câmara, Proficiência e Programas exatamente como antes — **sem nenhuma
funcionalidade nova**. Esse é o critério: a Fase A é invisível para o usuário final.

### Fase B — Refit dos módulos existentes (≈ 1 semana)

| # | Ação |
|---|---|
| B.1 | Câmara: `camaraEventosRepo` → `eventosRepo`; `camara_atos` → `atos`; `*_url` → `anexos` |
| B.2 | Proficiência: emissão via `declaracoes`; **redirect da URL antiga** de verificação |
| B.3 | Programas: `buildCombined` deletado; listagem de pessoas vira `JOIN` |
| B.4 | Portarias/Resoluções/Formulários: telas apontam para `atos` e `documentos` |
| B.5 | **G10**: `vocabularios` + endpoint + seed a partir dos `const` atuais |
| B.6 | `camara.test.js` (previsto no §14 de `requisitos-camara.md`, ainda não escrito) |

### Fase E — Módulo Expedientes (≈ 2 semanas) — **vem antes da Fase C**

Detalhada em [`requisitos-expedientes.md`](requisitos-expedientes.md) §12. Passa à frente do
PNPD por três motivos: volume (275 documentos/ano contra 15), risco (colisão de número em
livro oficial de expedição) e dependência — as portarias que ele registra são o
`vinculos.ato_id` que o PNPD usa.

### Fase C — Módulo PNPD (≈ 2 semanas)

O escopo funcional é o de `requisitos-pnpd.md` §10 — lista com filtros, ficha, formulário,
importação. O que muda é o **tamanho**: a maior parte da infraestrutura já existe.

| # | Ação | Arquivo |
|---|---|---|
| C.1 | Tabela `pos_doutorados` (20 colunas) + repositório | `schema.sql`, `repositories.js` |
| C.2 | Papel `POS_DOUTORANDO` no vocabulário de `vinculo.papel` | seed de `vocabularios` |
| C.3 | Controller: CRUD, filtros, prorrogação, relatório, vínculo com processo | `controllers/posDoutoradoController.js` |
| C.4 | Rotas + permissões | `routes/adminRoutes.js` |
| C.5 | Importador (parser de período, de-para, CPF) | `services/importers/posDoutoradoImporter.js` |
| C.6 | Lista, formulário, ficha, importação | `src/pages/admin/AdminPosDoutorado*.jsx` |
| C.7 | Declaração e certificado (usa o serviço da Fase A) | `services/declaracoes.js` — só o layout é novo |
| C.8 | Exportação XLSX, menu, constantes | — |

**O que a Fase A economiza da Fase C:** a tabela de eventos, o registro de anexos, o mecanismo
de declaração com QR, a validação de CPF, a validação de NUP, o cálculo de vigência, a
identidade de pessoa e a linha do tempo unificada. Sem a fundação, tudo isso seria escrito
dentro do módulo — e reescrito no módulo seguinte.

### Fase D — Limpeza do legado Drupal (≈ 1 semana, adiável)

| # | Ação |
|---|---|
| D.1 | `teses_dissertacoes`: `field_ano`→`ano`, `field_autor`→`autor_pessoa_id`, `field_arquivo`→`arquivo_id`, `field_tipo_td`→`tipo`; + `orientador_pessoa_id` |
| D.2 | `disciplinas`: `field_docente` → `docente_pessoa_id`; demais `field_*` renomeados |
| D.3 | `bolsas`: `field_aluno` → `pessoa_id`; período → `data_inicio`/`data_fim` |
| D.4 | `faq.field_resposta` → `resposta`; `grupos_pesquisa.field_lideres` JSONB → `vinculos`/`pessoas` |
| D.5 | Atualizar as 10 telas que consomem `field_*` |
| D.6 | `editais`: `resultado_parcial`/`resultado_final`/`erratas` → `eventos` |

**Fica por último de propósito**: é a única fase que muda o contrato da API consumido pelo
frontend, é puramente cosmética/higiênica, e pode ser adiada sem bloquear nada.

### Comparação de esforço

| Cenário | Esforço |
|---|---|
| PNPD sozinho, sobre o schema atual (plano anterior) | ~5 semanas |
| **A + B + E + C** (fundação + refit + Expedientes + PNPD) | **~7 semanas** |
| Fase D (opcional) | +1 semana |

A fundação **não custa tempo adicional líquido** — ela realoca trabalho que seria feito de
qualquer forma dentro de cada módulo, e o deixa disponível para os próximos. A prova apareceu
sozinha: o módulo de Expedientes chegou **depois** deste documento e coube na arquitetura ao
custo de duas tabelas pequenas e uma coluna, sem redesenho. O próximo mini-sistema
(credenciamento docente, lato sensu, revalidação de diploma) passa a custar ~2 semanas em vez
de ~5.

---

## 8. Testes

Além do que já existe (~41 testes) e do previsto nos dois documentos de requisitos:

**Fase A — o teste que autoriza seguir:**
- **suíte atual passa inteira, sem alteração de asserção** exceto onde o contrato mudou
  deliberadamente (pessoas/atos). Toda asserção alterada precisa de justificativa no PR;
- `utils/cpf.js`: normaliza `5252951438` → `05252951438`; DV inválido não bloqueia;
- `utils/vigencia.js`: tabela de casos (futuro/vigente/encerrado/override manual);
- `utils/datas.js`: `DATE` sai da API como `'YYYY-MM-DD'` sem deslocamento de fuso;
- `eventos`: *append-only* (não há rota de UPDATE/DELETE); *trigger* de limpeza remove
  eventos, anexos e declarações ao apagar a entidade dona;
- **integridade polimórfica**: para cada `entidade` conhecida, zero `entidade_id` órfão;
- `declaracoes`: código congelado na 1ª emissão; reemissão idêntica; revogada não verifica;
- `atos`: `vinculos.ato_id` referencia; revogação encadeia.

**Fase B:**
- redirect da URL antiga de verificação da proficiência resolve;
- `camara.test.js` completo (§14 de `requisitos-camara.md`);
- `programas`: listagem de pessoas por `JOIN` devolve o mesmo resultado que `buildCombined`
  devolvia — **teste de equivalência escrito antes da refatoração**.

**Fase C:** o previsto em `requisitos-pnpd.md` §15, menos os testes de `posdoc_eventos`
(a tabela não existe mais) e mais: um `pos_doutorado` sempre tem `vinculo_id`; apagar o
pós-doutorado não apaga a pessoa.

---

## 9. Riscos e decisões pendentes

| Risco | Mitigação |
|---|---|
| **QR codes já impressos** apontam para `/declaracoes/proficiencia/:codigo` | a rota antiga **permanece**, redirecionando para `/verificar/:codigo`; os códigos são migrados preservando `codigo_verificacao` e `emitida_em` |
| Fase A "invisível" ser difícil de justificar a quem espera o PNPD | o critério de pronto é a suíte de testes passar sem regressão; e a Fase C fica mais curta por causa dela |
| Refatoração de identidade (G1) quebrar login | `authController` e `authMiddleware` têm teste; a migração de `users` preserva `id`, então tokens JWT em circulação continuam válidos |
| Polimorfismo de `eventos` degenerar | lista fechada + `CHECK` + *trigger* + teste de órfãos (§5.9) |
| Escopo crescer durante a Fase A | as fases B, C e D são **entregas separadas**; A não inclui nenhuma funcionalidade nova |
| Perda de dado vivo na reconstrução | §6.1: dump nominal antes de tocar em qualquer coisa |

**Decisões pendentes (arquitetura):**

1. **`users.id` ou `pessoas.id` como identidade nos JWT?** Recomendação: manter `users.id` no
   token (não invalida sessões) e resolver `pessoa_id` no `authMiddleware`.
2. **`perfil_aluno`/`perfil_professor` JSONB**: migrar tudo para `vinculos.dados`, ou manter
   parte em `pessoas`? Recomendação: `vinculos.dados` — `situacao` e `entrada` são atributos do
   vínculo, não da pessoa. Precisa de inspeção do conteúdo real antes de decidir em definitivo.
3. **`resolucoes` no site**: passa a ler de `atos WHERE publicado` — a URL pública `/resolucoes`
   e o formato do JSON mudam? Recomendação: manter ambos, com o controller adaptando.
4. **`documentos` vs `atos`**: confirmar que nenhum item hoje em `formularios` é, na verdade,
   ato normativo (checar o conteúdo real de `server/data/formularios.json` antes da Fase A.8).
5. **Fase D**: entra no escopo ou fica como dívida registrada? Recomendação: registrar como
   dívida e reavaliar depois do PNPD em produção.

---

## Anexo — Verificações feitas neste levantamento

Tudo o que é afirmado acima foi conferido no código, não presumido:

- leitura integral de `server/db/schema.sql` (755 linhas, 35 tabelas);
- inventário das `REFERENCES` declaradas → confirmação dos 8 `programa_id` sem FK e das FKs
  ausentes em `vinculos.portaria_id`, `camara_eventos.reuniao_id`/`relatoria_id`;
- busca por `proficiencia_periodos` em `server/` e `src/` → só repositório e `TRUNCATE` de
  teste; nenhum controller ou rota (**tabela morta**);
- busca por `to_char(CURRENT_DATE` e `toISOString().slice(0, 10)` → 1 comparação de data como
  string e 10 gerações de data no aplicativo;
- busca por `field_` em `repositories.js` e `src/` → o prefixo do Drupal vaza para a API e é
  consumido por 10 telas;
- busca por `FROM pessoas` → 2 ocorrências no projeto inteiro (1 leitura + 1 seed de teste);
- leitura de `buildCombined` em `programasController.js` → junção em memória de `users` +
  `pessoas` + `portarias`;
- leitura das listas de `TRUNCATE` em `migrate.mjs` e `__tests__/helpers.js` → tabelas
  `camara_*` ausentes em ambas;
- inventário das colunas `*_url`/`link`/`download_link` → 19 ocorrências em 12 tabelas.
