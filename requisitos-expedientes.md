# Requisitos — Módulo Expedientes (Ofícios, Editais e Portarias da PRPG)

> **Objetivo**: substituir a planilha `OFÍCIOS_EDITAIS_PORTARIAS_PRPG.xlsx` — o **livro de
> numeração** dos documentos que a PRPG expede — por um módulo no painel administrativo.
>
> **Achado central**: esta planilha não é um cadastro; é um **controle de numeração
> sequencial compartilhado por 12 pessoas**. Isso muda tudo. O requisito dominante não é
> filtrar nem relatar: é **alocar o próximo número sem colisão**. Nenhum dos dois módulos
> anteriores (Câmara, PNPD) tinha esse requisito.
>
> **Status**: planejamento. Data: 26/07/2026.
> Documentos irmãos: [`arquitetura-dados.md`](arquitetura-dados.md) (fundação),
> [`requisitos-camara.md`](requisitos-camara.md), [`requisitos-pnpd.md`](requisitos-pnpd.md).
>
> Este documento **altera** o §5.6 de `arquitetura-dados.md` (tabela `atos`) — ver §6.

---

## Sumário

1. [Diagnóstico da planilha atual](#1-diagnóstico-da-planilha-atual)
2. [Problemas identificados](#2-problemas-identificados)
3. [A mudança conceitual central](#3-a-mudança-conceitual-central)
4. [O que a planilha revela sobre o resto do sistema](#4-o-que-a-planilha-revela-sobre-o-resto-do-sistema)
5. [Modelo de dados](#5-modelo-de-dados)
6. [Impacto na arquitetura já planejada](#6-impacto-na-arquitetura-já-planejada)
7. [A máquina de numeração](#7-a-máquina-de-numeração)
8. [API — rotas e permissões](#8-api--rotas-e-permissões)
9. [Telas](#9-telas)
10. [Migração do acervo](#10-migração-do-acervo)
11. [Indicadores](#11-indicadores)
12. [Plano de implementação consolidado](#12-plano-de-implementação-consolidado)
13. [Testes](#13-testes)
14. [Decisões pendentes](#14-decisões-pendentes)

---

## 1. Diagnóstico da planilha atual

Arquivo: `OFÍCIOS_EDITAIS_PORTARIAS_PRPG.xlsx` (11 abas, **593 documentos registrados** e
**306 números reservados em branco**).

### 1.1 Uma aba por (tipo × ano) — e o modelo já quebrou sozinho

| Aba | Preenchidos | Reservados vazios | Colunas |
|---|---|---|---|
| `2026 ofícios` | 71 | **124** | Nº · Data · Usuário · Assunto · Destinatário · Obs. |
| `2025 - Ofícios` | 198 | 0 | idem (+1 coluna extra vazia) |
| `OFÍCIOS - 2024` | 194 | 2 | idem |
| `2026 - Portarias` | 60 | 1 | Nº · Data · Usuário · Assunto |
| `Portarias - 2025` | **16** | **179** | idem |
| `2026 Editais` | 8 | 0 | Nº · Data · **Coordenação** · Assunto · **Link publicação** |
| ` EDITAIS PRPG 2025` | 26 | 0 | Nº · **Ano** · Data · Coordenação · Assunto · Link |
| `EDITAIS PRPG` | 11 | 0 | Nº · Data · Usuário · Assunto |
| `EDITAIS PRINT` | 6 | 0 | idem |
| `EDITAIS LATO SENSU` | 1 | 0 | idem |
| `EDITAIS PROFICIÊNCIA` | 2 | 0 | idem |

Três observações estruturais:

1. **A aba ` EDITAIS PRPG 2025` contém editais de 2022, 2023, 2024 e 2025**, com uma coluna
   `Ano` que nenhuma outra aba tem. O modelo "uma aba por ano" já foi abandonado no meio do
   caminho, e o resultado é que a mesma série tem duas estruturas de coluna diferentes.
2. **O nome da aba não identifica a série de forma estável**: `EDITAIS PRPG` (2024),
   ` EDITAIS PRPG 2025` (2022-2025, com espaço inicial no nome), `2026 Editais`.
3. **Quatro séries paralelas de edital** — PRPG, PRINT, LATO SENSU, PROFICIÊNCIA — cada uma
   com sua numeração começando em 1. Isso é correto do ponto de vista administrativo, e a
   planilha o expressa como abas separadas sem nenhuma marcação da série dentro dos dados.

### 1.2 Os 306 números em branco são o mecanismo de reserva

As abas vêm pré-numeradas de 1 a ~195 com todas as outras colunas vazias. Isso não é lixo:
é **como a equipe evita colisão**. Quem vai expedir um ofício "pega" a próxima linha
numerada e a preenche. É um sistema de senha manual.

Funciona mal por dois motivos: nada impede duas pessoas de pegarem a mesma linha ao mesmo
tempo (o arquivo é editado por **12 pessoas**), e um número pego e não usado fica
indistinguível de um número nunca usado.

### 1.3 Volume e ritmo

| Série | 2024 | 2025 | 2026 (até 26/07) |
|---|---|---|---|
| Ofícios | 194 | 198 | 71 |
| Portarias | — | 16 | 60 |
| Editais (todas as séries) | 20 | 15 | 8 |

**~275 documentos/ano** — quatro vezes o volume da Câmara e vinte vezes o do PNPD. É o módulo
de maior uso diário dos três, e o único com **múltiplos usuários simultâneos**.

> A queda de portarias em 2025 (16) contra 2026 (60 até julho) é grande demais para ser real.
> Ou 2025 foi sub-registrado, ou as portarias daquele ano foram controladas em outro lugar.
> **Decisão pendente §14.2.**

### 1.4 Quem expede: 12 pessoas, 40 grafias

| Pessoa | Registros |
|---|---|
| Mari | 111 (+ `Mari ` 10) |
| Laura | 94 (+ `Laura `, `   Laura`, `laura` 6) |
| Isabel | 66 (+ `Isabel ` 16) |
| Nathan | 44 |
| Rachide | 28 |
| João Ferreira | 26 (+ `João` 16, `João ferreira` 4) |
| Anete | 18 (+ `anete` 2) |
| Raquelle | 17 (+ `   Raquelle` 17, `Rquelle` 1 — erro de digitação) |
| Edivan, Tatiana, Rinaldo, Diego | ~20 somados, com variações de caixa |

E há valores que **não são pessoas**: `CPPG`, `Lato Sensu`, `CIPPG` — setores usados no lugar
do servidor. Mesma inconsistência da coluna "Responsável" da planilha da Câmara
(`requisitos-camara.md` §1.3).

Na aba ` EDITAIS PRPG 2025` a coluna de usuário **não existe** e as datas caíram na posição
onde as outras abas têm o usuário — desalinhamento de coluna que quebra qualquer leitura
automática ingênua.

### 1.5 Destinatários: 88 grafias para ~25 entidades

| Grafias que são a mesma coisa | Total |
|---|---|
| `PROTOCOLO` | 87 |
| `PROGEPE` + `progepe` + `Progepe` + `DAP/PROGEPE` + `SAMP/PROGEPE` | 59 |
| `Reitoria` + `REITORIA` + `reitoria` | 42 |
| `PROPLAD` + `DIRETORIA DE CONTABILIDADE E FINANÇAS-PROPLAD` + `Diretoria de Administração e Compras/PROPLAD` | 20 |
| `CAPES` + `Capes` + `CAPES/PDSE` + `Demanda Social- CAPES` + `Demanda Social - CAPES` + `À Coordenação da CAPES…` | 22 |

E **destinatários externos** que não são unidades da UFRPE: `CNPq`, `FACEPE`,
`WES University Canada`, `FULBRIGHT`, `Prefeitura de Olinda`, `Secretaria de Educação/PB`,
`PROFMAT-SBM`. Um deles tem quebra de linha dentro da célula
(`"Diretor de Avaliação da CAPES\nProfessor Antônio Gomes"`).

### 1.6 Um quarto dos ofícios é o mesmo ofício

**106 dos 425 ofícios (25%)** têm o assunto `"Envio de documentação de conclusão por correios"`,
destinatário `PROTOCOLO`, e uma observação no formato
`"Concluinte NOME COMPLETO - Livro 3.20"`. **86 linhas citam "Livro"** (o livro de registro de
diplomas).

Isso não é correspondência variada: é **um processo repetitivo de expedição de diplomas**
sendo registrado uma linha por vez, por uma pessoa (Mari, 111 registros). É o maior bolso de
trabalho manual da planilha e merece tratamento próprio (§9.4).

Os demais 267 assuntos distintos em 425 ofícios mostram que o resto é, de fato, correspondência
variada — mas com padrões recorrentes: `alteração de natureza de despesa` (7),
`veracidade de certificado lato sensu` (6), `incorporação e tombamento de bens` (6),
`substituição de férias` (5), `cancelamento de empenho` (5), `reforço de empenho` (3).

### 1.7 Referências cruzadas entre documentos, em texto livre

**16 referências de documento para documento** foram encontradas dentro dos campos de texto:

| Origem | Referência | Natureza |
|---|---|---|
| Portarias 2026 #51, #52, #53, #54 | `"Tornar sem efeito a Portaria 44/2026"` (e 45, 46, 47) | **revogação** |
| Portarias 2025 #3 | `"Portaria Retificaddora"` | **retificação** (com erro de digitação) |
| Ofício 2026 #49 | `"Solicitando publicação da portaria nº48/2026"` | **ofício publica portaria** |
| Ofício 2025 #55 | `"Solicita publicação das Portarias nº05/2025, 06/2025…"` | idem, em lote |
| Ofício 2025 #174 | `"Solicita publicação da PORTARIA PRPG/UFRPE Nº 15/2025"` | idem |
| Ofício 2025 #184 | `"Encaminhamento de Minuta de Resolução CEPE… (Resolução 298/2008)"` | referência normativa |
| Ofício 2024 #131 | `"…ofício 118/2024"` | ofício referencia ofício |
| Ofício 2025 #44, Portaria 2025 #4 | `"Edital 15/2018"` | ato referencia edital |

**O ofício é o veículo que publica a portaria.** Essa relação existe, é sistemática, e hoje só
existe como frase.

### 1.8 Vínculo com processo, também em texto livre

**23 NUPs completos + 10 números em formato curto** aparecem embutidos nos campos de assunto e
observação:

- `"juntado ao processo 23082.024509/2024-66"` — e esse NUP **é o mesmo** que aparece na
  planilha da Câmara como o processo da reestruturação da PRPG (`requisitos-camara.md` §1.5,
  campeão de repetição com 5 abas). **Os três controles falam do mesmo processo sem saber.**
- `"Processo: 26671/2024"`, `"processo: 701/2024"`, `"processo: 2065/2024"` — formato curto.
- `88881.263354/2026-01` e `23546.087016/2025-13` — **processos de outros órgãos** (CAPES e
  outro). O prefixo `23082` não é universal; a validação do NUP não pode presumi-lo.

### 1.9 Situação escondida em texto livre

- `"CANCELADO"` na coluna Observações (ofício 2025 #5) — o único registro de cancelamento em
  593 documentos, provavelmente porque não há onde registrar.
- `"Tornar sem efeito"` (4 portarias), `"Retificaddora"` (1).
- `"A Definir"` no campo Data (`EDITAIS PRPG` #9) — documento planejado, número já reservado.

### 1.10 Datas

**6 datas não são datas**: `'1º/10/2025'`, `'1º/11/2024'` (ordinal por extenso),
`'02/02//2024'` e `'07/02//2024'` (barra dupla), `'--'`, `'A Definir'`.

**11 documentos estão fora de ordem cronológica** em relação ao número — o que é normal (um
número reservado é usado dias depois), mas hoje é indistinguível de erro de digitação. E há
**datas do ano errado dentro da aba do ano**: um documento de **2016** na aba `2026 ofícios`,
um de 2025 na mesma aba, um de 2024 na aba `2026 Editais`.

---

## 2. Problemas identificados

| # | Problema | Consequência |
|---|---|---|
| E1 | Numeração alocada manualmente por 12 pessoas num arquivo compartilhado | **risco de dois documentos com o mesmo número** — o defeito mais grave possível num livro de numeração |
| E2 | 306 linhas pré-numeradas em branco como mecanismo de reserva | reserva e "nunca usado" são indistinguíveis; ninguém sabe qual número está livre |
| E3 | Uma aba por (tipo × ano), com o modelo já quebrado numa delas | a mesma série tem duas estruturas; consultas de vários anos exigem abrir 11 abas |
| E4 | Série do edital codificada no nome da aba | não existe dentro do dado; impossível filtrar |
| E5 | Referência documento→documento em texto livre (16 casos) | não se sabe qual portaria está revogada nem qual ofício a publicou |
| E6 | Processo citado em texto livre (33 casos) | o mesmo processo existe nos três controles sem se ligarem |
| E7 | Situação (`CANCELADO`, `sem efeito`) em texto livre | não se filtra, não se conta, não se audita |
| E8 | Destinatário livre: 88 grafias para ~25 entidades | impossível responder "quantos ofícios para a PROGEPE" |
| E9 | Usuário livre: 40 grafias para 12 pessoas | idem por servidor |
| E10 | 6 datas inválidas; 3 documentos com data de ano diferente da aba | ordenação e relatórios anuais errados |
| E11 | Nenhum vínculo com o PDF do documento expedido | o número existe; o documento não está no sistema |
| E12 | Editais aqui e editais no site são registros paralelos | 46 editais numerados na planilha; 12 no site, só 1 com número |
| E13 | Portarias aqui e `portarias` no sistema são registros paralelos | `vinculos.portaria_id` aponta para uma tabela que este livro não conhece |
| E14 | 25% dos ofícios são um mesmo processo repetitivo (envio de diploma) | ~106 registros/ano de digitação quase idêntica |
| E15 | Sem autoria de alteração e sem histórico | não se sabe quem cancelou o quê |

**Esforço manual recuperável estimado: 4 a 6 h/mês** — mais que os dois módulos anteriores,
porque o volume é maior e a operação é diária. Mas o ganho principal é **eliminar E1**: a
duplicidade de número num livro oficial de expedição é falha que compromete a validade
do documento.

---

## 3. A mudança conceitual central

> Hoje **a linha da aba é o documento**, e o número é a posição da linha.
>
> No sistema, **o número é alocado pelo banco, atomicamente, dentro de uma série** — e o
> documento é o registro que ocupa aquele número, com situação própria
> (`RESERVADO → EMITIDO → PUBLICADO`, ou `CANCELADO`/`SEM_EFEITO`).

Consequências diretas:

- **A colisão de número deixa de ser possível** — restrição `UNIQUE (serie, ano, sequencial)`
  no banco, com alocação sob *lock*. E1 e E2 morrem aqui.
- **A aba desaparece.** Série e ano viram colunas; o "livro de 2026" vira um filtro. E3 e E4
  morrem aqui.
- **As referências entre documentos viram uma tabela** (`ato_referencias`), e "Tornar sem
  efeito a Portaria 44/2026" vira um vínculo clicável nos dois sentidos. E5 morre aqui.
- **O processo citado vira FK** para `processos` — a mesma tabela da Câmara e do PNPD. E6
  morre aqui, e os três controles passam a se enxergar.
- **O edital numerado e o edital publicado no site viram o mesmo objeto**, visto de dois
  lados. E12 e E13 morrem aqui.

---

## 4. O que a planilha revela sobre o resto do sistema

Esta planilha chegou depois do documento de arquitetura, e por isso funciona como **teste**
daquele desenho. O resultado é bom: ela **confirma** as decisões e **corrige** uma.

### 4.1 Confirmações

| Decisão de `arquitetura-dados.md` | Como esta planilha confirma |
|---|---|
| **G1 — identidade única de pessoa** | quarta confirmação: 12 servidores em 40 grafias na coluna "Usuário", com um erro de digitação (`Rquelle`) que vira uma pessoa nova |
| **G4 — `atos` unificando portarias/resoluções** | as portarias daqui são exatamente as de `vinculos.portaria_id`; e "Tornar sem efeito a Portaria 44/2026" é a `revogado_por_id` que já estava prevista |
| **G8 — `unidades` genérica com `tipo`** | 88 destinatários, incluindo **externos** (CAPES, CNPq, FACEPE, Fulbright, WES Canada, prefeituras) — o `tipo = EXTERNO` já previsto era necessário mesmo |
| **G3 — `processos`** | 33 NUPs em texto livre, um deles o **mesmo** processo campeão de repetição da planilha da Câmara |
| **G5 — `arquivos` + `anexos`** | E11: 593 documentos e nenhum PDF vinculado |
| **G2 — `eventos`** | o ciclo reservado→emitido→publicado→cancelado é linha do tempo, não coluna |
| **G7 — datas como `DATE`** | `'02/02//2024'` e `'1º/10/2025'` não entrariam numa coluna `DATE` |
| **G10 — `vocabularios`** | séries, tipos de referência e situações precisam de tela de administração: a PRPG cria séries novas (PRINT surgiu em 2024) |

### 4.2 A correção: `atos` precisa de série e numeração

O §5.6 de `arquitetura-dados.md` desenhou `atos` com `numero TEXT` e `ano INTEGER` livres,
suficiente para *registrar* um ato já existente. Esta planilha mostra que o sistema também
precisa **emitir** o número — o que exige `serie_id`, `sequencial INTEGER`, `situacao` e uma
restrição de unicidade. É acréscimo, não contradição, e está no §5 abaixo.

### 4.3 O nome `atos` continua correto — inclusive para ofício e edital

Objeção previsível: *"ofício não é ato normativo, por que fica na tabela `atos`?"*

Na doutrina de direito administrativo brasileiro (classificação clássica de Hely Lopes
Meirelles), **ato administrativo** é gênero, e os documentos aqui tratados são espécies dele:

- **portaria, resolução, instrução normativa** → atos normativos e ordinatórios;
- **edital** → ato de convocação (enunciativo/ordinatório);
- **ofício, memorando, circular** → atos ordinatórios de comunicação.

O que os une operacionalmente também é real: todos consomem número de uma série, têm data,
assunto, autoria, situação, podem referenciar-se e podem ser anexados a um processo.
**`atos` é a tabela certa; a espécie mora em `serie_id`.**

---

## 5. Modelo de dados

Assenta sobre o núcleo de [`arquitetura-dados.md`](arquitetura-dados.md) §5. Três tabelas
novas — duas delas pequenas — e a `atos` revisada.

### 5.1 Séries de numeração

```sql
-- Uma série = um livro de numeração. A PRPG mantém pelo menos 6.
CREATE TABLE ato_series (
  id                TEXT PRIMARY KEY,   -- 'OFICIO'|'PORTARIA_PRPG'|'EDITAL_PRPG'|'EDITAL_PRINT'|'EDITAL_LATO_SENSU'|'EDITAL_PROFICIENCIA'
  nome              TEXT NOT NULL,      -- 'Ofícios da PRPG'
  especie           TEXT NOT NULL,      -- OFICIO|PORTARIA|EDITAL|RESOLUCAO|DESPACHO|MEMORANDO|CIRCULAR
  sigla             TEXT,               -- 'OFÍCIO' — compõe o número por extenso
  formato           TEXT DEFAULT '{sigla} Nº {sequencial}/{ano} - PRPG/UFRPE',
  unidade_id        TEXT REFERENCES unidades(id) ON DELETE SET NULL, -- quem expede
  reinicia_por_ano  BOOLEAN DEFAULT TRUE,
  exige_destinatario BOOLEAN DEFAULT FALSE,  -- TRUE para ofício
  publica_no_site   BOOLEAN DEFAULT FALSE,   -- TRUE para edital e resolução
  ativo             BOOLEAN DEFAULT TRUE,
  ordem             INTEGER DEFAULT 0
);
```

### 5.2 `atos` — revisada

```sql
CREATE TABLE atos (
  id             TEXT PRIMARY KEY,
  -- ---------- Numeração (novo; ver §7) ----------
  serie_id       TEXT NOT NULL REFERENCES ato_series(id),
  ano            INTEGER NOT NULL,
  sequencial     INTEGER NOT NULL,
  numero_exibicao TEXT,          -- cache: 'OFÍCIO Nº 49/2026 - PRPG/UFRPE'
  situacao       TEXT NOT NULL DEFAULT 'RESERVADO', -- RESERVADO|EMITIDO|PUBLICADO|CANCELADO|SEM_EFEITO|RETIFICADO
  situacao_motivo TEXT,

  -- ---------- Conteúdo ----------
  data           DATE,           -- data de expedição (NULL enquanto RESERVADO)
  titulo         TEXT,
  assunto        TEXT NOT NULL,
  ementa         TEXT,

  -- ---------- Partes ----------
  solicitante_pessoa_id TEXT REFERENCES pessoas(id) ON DELETE SET NULL, -- a coluna "Usuário"
  unidade_origem_id     TEXT REFERENCES unidades(id) ON DELETE SET NULL, -- a "Coordenação"
  destinatario_unidade_id TEXT REFERENCES unidades(id) ON DELETE SET NULL,
  destinatario_texto    TEXT,    -- fallback: pessoa nominal, órgão sem cadastro
  interessado_pessoa_id TEXT REFERENCES pessoas(id) ON DELETE SET NULL, -- quem é objeto da portaria

  -- ---------- Vínculos ----------
  processo_id    TEXT REFERENCES processos(id) ON DELETE SET NULL,
  programa_id    TEXT REFERENCES programas(id) ON DELETE SET NULL,
  arquivo_id     TEXT REFERENCES arquivos(id) ON DELETE SET NULL, -- o PDF assinado
  link_externo   TEXT,           -- publicação no Boletim/DOU

  -- ---------- Vigência (portarias de designação) ----------
  vigencia_inicio DATE,
  vigencia_fim    DATE,

  -- ---------- Publicação no site ----------
  publicado      BOOLEAN DEFAULT FALSE,
  secao          TEXT,
  categoria      TEXT,

  observacoes    TEXT,
  obs_original   TEXT,           -- texto íntegro da planilha de origem
  criado_em      TIMESTAMPTZ DEFAULT now(),
  atualizado_em  TIMESTAMPTZ DEFAULT now(),
  criado_por     TEXT,
  atualizado_por TEXT,

  UNIQUE (serie_id, ano, sequencial)   -- ← a restrição que resolve E1
);
CREATE INDEX atos_serie_ano_idx  ON atos(serie_id, ano, sequencial DESC);
CREATE INDEX atos_situacao_idx   ON atos(situacao);
CREATE INDEX atos_processo_idx   ON atos(processo_id);
CREATE INDEX atos_destinatario_idx ON atos(destinatario_unidade_id);
```

> `revogado_por_id`, que estava em `arquitetura-dados.md` §5.6, **sai** — vira um caso de
> `ato_referencias` (abaixo), que cobre revogação, retificação, publicação e encaminhamento
> com a mesma estrutura.

### 5.3 Referências entre documentos

```sql
-- "Tornar sem efeito a Portaria 44/2026" · "Solicita publicação da Portaria 48/2026"
CREATE TABLE ato_referencias (
  id            TEXT PRIMARY KEY,
  ato_id        TEXT NOT NULL REFERENCES atos(id) ON DELETE CASCADE, -- o que referencia
  ato_ref_id    TEXT REFERENCES atos(id) ON DELETE SET NULL,         -- o referenciado
  ato_ref_texto TEXT,        -- quando o referenciado não está cadastrado ('Resolução 298/2008')
  tipo          TEXT NOT NULL, -- REVOGA|TORNA_SEM_EFEITO|RETIFICA|PUBLICA|ENCAMINHA|COMPLEMENTA|FUNDAMENTA
  criado_em     TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT
);
CREATE INDEX ato_ref_idx     ON ato_referencias(ato_id);
CREATE INDEX ato_ref_alvo_idx ON ato_referencias(ato_ref_id);
```

Efeito colateral valioso: a ficha da Portaria 44/2026 mostra **"tornada sem efeito pela
Portaria 51/2026"** sem que ninguém tenha digitado isso lá — é a mesma linha, lida no sentido
inverso.

### 5.4 Ligação com o conteúdo do site

Nenhuma tabela nova: uma coluna.

```sql
ALTER TABLE editais ADD COLUMN ato_id TEXT REFERENCES atos(id) ON DELETE SET NULL;
```

- **`atos`** responde "o Edital nº 3/2026 existe, foi expedido em 03/03/2026 pela CPPG,
  consta do livro".
- **`editais`** responde "está publicado no site, com inscrições até X, estas erratas e este
  resultado".

São perguntas diferentes sobre o mesmo objeto, e o vínculo permite ir de uma à outra. A
tabela `portarias` **deixa de existir** (absorvida por `atos`, conforme G4), e
`vinculos.ato_id` aponta para a série `PORTARIA_PRPG`.

### 5.5 O que **não** entra

- **Não** criar tabela `oficios` separada — o corte é por `serie_id`, não por tabela (§4.3).
- **Não** modelar o corpo/texto do ofício. O sistema é o **livro de numeração**, não editor de
  documentos; o texto vem no PDF anexado. Modelar o corpo seria recriar um editor de textos.
- **Não** integrar com o SIPAC/SIGEPE para expedir. Fora de escopo, como nos outros módulos.

---

## 6. Impacto na arquitetura já planejada

| Documento/seção | Alteração |
|---|---|
| `arquitetura-dados.md` §5.6 (`atos`) | **substituída** pelo §5.2 acima: acrescenta `serie_id`, `ano`, `sequencial`, `situacao`, destinatário, solicitante e a `UNIQUE`; remove `revogado_por_id` |
| `arquitetura-dados.md` §5.6 (`documentos`) | **inalterada** — formulários/manuais continuam separados dos atos |
| `arquitetura-dados.md` §5.2 (`unidades`) | **inalterada** — `tipo = EXTERNO` já previsto, agora com uso comprovado |
| `arquitetura-dados.md` §5.5 (`processos`) | pequeno ajuste: comentar que o prefixo do NUP **não** é sempre `23082` (há `88881` da CAPES e `23546`) |
| `arquitetura-dados.md` §7 (plano) | Fase A.8 passa a criar `ato_series` e `ato_referencias`; entra uma **Fase E** para as telas |
| `requisitos-camara.md` | `camara_atos` é absorvida por `atos` — já previsto em G4; nada mais muda |
| `requisitos-pnpd.md` | a portaria de designação do pós-doc vira `vinculos.ato_id` — já previsto; nada muda |

**Custo adicional no núcleo: duas tabelas pequenas e uma coluna.** A arquitetura absorveu um
módulo inteiro sem redesenho — que é exatamente o teste que ela precisava passar.

---

## 7. A máquina de numeração

O requisito que diferencia este módulo. Precisa ser **correto sob concorrência** — 12 pessoas,
uso diário.

### 7.1 Alocação atômica

```sql
-- Aloca o próximo sequencial de (serie, ano) sem corrida.
-- O advisory lock transacional serializa apenas os pedidos da MESMA série/ano.
CREATE FUNCTION proximo_sequencial(p_serie TEXT, p_ano INTEGER)
RETURNS INTEGER AS $$
DECLARE prox INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_serie || ':' || p_ano));
  SELECT COALESCE(MAX(sequencial), 0) + 1 INTO prox
    FROM atos WHERE serie_id = p_serie AND ano = p_ano;
  RETURN prox;
END; $$ LANGUAGE plpgsql;
```

O `INSERT` acontece na **mesma transação** do `SELECT`, e a `UNIQUE (serie_id, ano, sequencial)`
é a rede de segurança: se algo escapar, o banco recusa em vez de gravar número duplicado.
**Sequência do Postgres não serve** aqui — `SEQUENCE` não reinicia por ano, não é por série e
deixa buracos ao reverter transação, e o livro precisa ser denso e auditável.

### 7.2 Reserva

O botão **"Reservar número"** cria o ato com `situacao = 'RESERVADO'`, só com série, ano,
sequencial e solicitante. É o equivalente digital de "pegar a linha em branco" — a diferença é
que a reserva tem dono, data e motivo, e aparece na lista como pendência de quem a fez.

Um reservado não usado é **cancelado**, nunca apagado: o número fica no livro com
`situacao = 'CANCELADO'` e motivo. A densidade da numeração é preservada e a auditoria também.

### 7.3 Numeração retroativa e fora de ordem

Os dados reais exigem tolerância:

- **Data anterior ao número seguinte** é normal (número reservado, documento assinado dias
  depois) — o sistema **não bloqueia**, apenas ordena por número e mostra a data.
- **Documento de ano anterior no livro do ano corrente** (o caso de 2016 na aba de 2026): o ano
  é campo próprio, então isso deixa de ser possível por construção.
- **Importação do acervo** precisa inserir sequenciais explícitos, não alocados — o importador
  usa uma rota própria que respeita o número da planilha (§10).

---

## 8. API — rotas e permissões

Prefixo `/api/atos`. Papéis: `Administrator`, `Gestor`; leitura para `GestorPrograma`
(escopado) nos atos do seu programa.

| Método | Rota | Papéis | Descrição |
|---|---|---|---|
| GET | `/series` | leitura | séries e o próximo número de cada uma |
| POST/PUT/DELETE | `/series[/:id]` | Admin | manutenção das séries |
| GET | `/` | leitura | lista com filtros (`serie`, `ano`, `situacao`, `destinatario`, `solicitante`, `processo`, `q`) |
| **POST** | **`/reservar`** | Admin, Gestor | **aloca o próximo número** (§7.1) e devolve o ato `RESERVADO` |
| GET | `/:id` | leitura | ficha (com referências nos dois sentidos, processo, arquivo, linha do tempo) |
| POST | `/` | Admin, Gestor | cria já emitido (reserva + preenchimento num passo) |
| PUT | `/:id` | Admin, Gestor | edição |
| PATCH | `/:id/situacao` | Admin, Gestor | emitir/publicar/cancelar/tornar sem efeito (gera evento) |
| POST | `/:id/referencias` | Admin, Gestor | vincula a outro ato |
| DELETE | `/referencias/:refId` | Admin, Gestor | remove vínculo |
| POST | `/:id/arquivo` | Admin, Gestor | anexa o PDF assinado |
| POST | `/:id/processo` | Admin, Gestor | vincula/cria processo pelo NUP |
| DELETE | `/:id` | Admin | exclusão (só de `RESERVADO`; emitido se cancela, não se apaga) |
| GET | `/exportar.xlsx` | Admin, Gestor | exportação com filtros |
| POST | `/importar` | Admin | importação da planilha |
| GET | `/publico` | **público** | atos com `publicado = TRUE` (alimenta `/resolucoes` do site) |

**Regra de negócio explícita**: `DELETE` só é permitido em `RESERVADO`. Um ato emitido nunca
é apagado — é `CANCELADO` ou `SEM_EFEITO`, com motivo. Isso é requisito de livro oficial, não
preferência de implementação.

---

## 9. Telas

| Rota | Tela | Fase |
|---|---|---|
| `/admin/atos` | **Livro de expedientes** — tela-mãe | E |
| `/admin/atos/novo` | emissão (com reserva embutida) | E |
| `/admin/atos/:id` | ficha com referências e linha do tempo | E |
| `/admin/atos/series` | administração das séries | E |
| `/admin/atos/importar` | importação da planilha | E (uso único) |
| `/admin/atos/diplomas` | expedição de diplomas em lote (§9.4) | F (avaliar) |

### 9.1 Livro de expedientes

**Barra superior fixa** com um botão por série ativa, cada um mostrando o **próximo número**:

```
[ Ofício → nº 72 ]  [ Portaria → nº 61 ]  [ Edital PRPG → nº 9 ]  [ + série ]
```

Clicar reserva o número e abre o formulário já preenchido com série, ano, número, data de hoje
e solicitante = usuário logado. **Este é o fluxo principal do módulo** e precisa custar um
clique — é o que a planilha faz em um clique (clicar na linha em branco).

**Colunas**: Número (mono, com a sigla) · Situação (badge editável) · Data · Assunto (elástico,
2 linhas) · Destinatário · Solicitante · Processo (link) · Anexo (ícone de PDF) · ⋯

**Filtros**: chips de série com contador · seletor de ano (padrão: ano corrente) · situação ·
destinatário · solicitante · busca livre · chip `Reservados` (os números pendentes de uso).

**Ordenação padrão**: número decrescente dentro da série e ano — o livro é lido do fim.

**Sem paginação por ano** (~275 registros/ano); com paginação quando o filtro abrange todos os
anos.

### 9.2 Ficha do ato

- **Cabeçalho** — número por extenso, badge de situação, data, botão de download do PDF.
- **Bloco Partes** — solicitante, unidade de origem, destinatário, interessado.
- **Bloco Vínculos** — processo (com link para a ficha na Câmara), programa, edital publicado
  no site (quando houver).
- **Referências** — duas listas: *"Este documento referencia"* e **"É referenciado por"**
  (derivada, ninguém digita).
- **Linha do tempo** (`eventos`) — reservado por Fulana em 12/03 · emitido em 14/03 ·
  publicado no Boletim em 16/03 · tornado sem efeito pela Portaria 51/2026.

### 9.3 Entrada sem atrito

- **Assuntos recorrentes viram modelos.** Os 18 assuntos que se repetem (§1.6) ficam num
  seletor de "assunto frequente" que preenche assunto + destinatário + série de uma vez.
- **Destinatário e solicitante** — *combobox* com autocomplete e "criar novo" inline.
- **NUP** — colar preenche o vínculo com `processos`, criando o processo se não existir.
- **Campos obrigatórios: apenas assunto.** Série, ano e número vêm do botão; data assume hoje.

### 9.4 Expedição de diplomas (E14) — avaliar antes de construir

106 ofícios idênticos ao PROTOCOLO, com `Concluinte NOME - Livro X.YY`. Três caminhos:

1. **Um ofício por concluinte, com formulário dedicado** (nome + livro), reduzindo a digitação
   a dois campos — ganho pequeno, custo baixo.
2. **Um ofício em lote** cobrindo N concluintes, com uma tabela de nomes e livros anexa —
   reduz de 106 registros/ano para ~12, mas **muda o procedimento administrativo**, o que não
   é decisão de quem escreve o software.
3. **Não fazer nada** neste módulo e tratar a expedição de diplomas como processo próprio,
   futuro.

> **Recomendação**: implementar (1) na Fase E e levar (2) à secretaria como pergunta.
> Ver §14.4.

---

## 10. Migração do acervo

Importador `server/services/importers/atosImporter.js`. A biblioteca `xlsx` já instalada
basta — não há informação em cor de célula.

**Regras:**

1. **Uma aba → (série, ano)**, mapeados na tela de importação, **nunca inferidos do nome da
   aba** — `EDITAIS PRPG`, ` EDITAIS PRPG 2025` e `2026 Editais` são a mesma série com três
   nomes, e uma delas contém quatro anos.
2. **Detecção de layout por cabeçalho, não por posição** — a aba ` EDITAIS PRPG 2025` tem uma
   coluna `Ano` a mais, deslocando todas as demais.
3. **Ano**: da coluna `Ano` quando existir; senão da série/aba; **conferido contra a data**, e
   as 3 divergências (2016, 2025 e 2024 em abas de outro ano) entram na lista de saneamento.
4. **Números**: importados **explicitamente**, não realocados. Os 306 números em branco são
   importados como `situacao = 'CANCELADO'` com motivo `"reservado e não utilizado (planilha)"` —
   preservando a densidade do livro. *(Alternativa a confirmar: não importá-los. §14.3.)*
5. **Datas**: parser tolerante para `1º/10/2025`, `02/02//2024`, `--` e `A Definir`; o texto
   original vai para `obs_original`, e o registro entra sem data quando não houver.
6. **Usuário → `pessoas`**: normalizar espaços e caixa; casar com servidores já cadastrados;
   as 40 grafias reduzem a ~12 pessoas. `CPPG`/`Lato Sensu`/`CIPPG` **não** viram pessoa: vão
   para `unidade_origem_id`.
7. **Destinatário → `unidades`**: de-para das 88 grafias, com `aliases` absorvendo as
   históricas (o mesmo recurso já usado no seed de `camara_unidades`). Externos entram com
   `tipo = 'EXTERNO'`.
8. **Referências cruzadas**: expressão regular sobre assunto e observações extrai
   `(espécie, número/ano)`; casando com um ato importado, cria `ato_referencias` com o tipo
   inferido do verbo (`tornar sem efeito` → `TORNA_SEM_EFEITO`; `solicita publicação` →
   `PUBLICA`; `retificadora` → `RETIFICA`). **Sem correspondência, grava `ato_ref_texto`** —
   nada se perde.
9. **NUPs**: extraídos por regex; vinculam a `processos` quando o número já existir (inclusive
   os vindos da planilha da Câmara); senão criam o processo com `numero_valido` conforme o
   formato.
10. **`CANCELADO` no texto** → `situacao`, com o texto preservado em `obs_original`.
11. **Editais**: casar com `editais` do site por (ano, número) e por URL do
    `Link publicação`; onde casar, gravar `editais.ato_id`. **Os 46 editais numerados da
    planilha × 12 do site** devem produzir um relatório de conciliação na tela de importação.
12. **Toda linha preserva o texto íntegro em `obs_original`.** Importação idempotente e
    reversível por 24 h; o XLSX original é anexado como arquivo imutável.

**Tela de importação em 5 passos:** (1) upload e detecção das 11 abas → (2) mapa aba → série +
ano, com o layout detectado → (3) de-para de pessoas e destinatários → (4) saneamento
(6 datas inválidas, 3 anos divergentes, 306 reservas em branco, referências não resolvidas) →
(5) pré-visualização com contadores e conciliação de editais.

---

## 11. Indicadores

| Indicador | Cálculo | Marco zero |
|---|---|---|
| **Números com colisão** | `COUNT` de (série, ano, sequencial) repetidos | 0 hoje **por sorte**; passa a ser 0 por construção |
| Reservas pendentes | `situacao = 'RESERVADO'` há mais de 15 dias | hoje: 306 indistinguíveis de "não usado" |
| Documentos por série/ano | contagem | ofícios ~200/ano, portarias 16→60, editais ~15/ano |
| **Atos sem PDF anexado** | `arquivo_id IS NULL` e `situacao = 'EMITIDO'` | **593 de 593** |
| Atos sem processo vinculado | `processo_id IS NULL` | ~560 de 593 |
| Ofícios por destinatário | agrupado por `destinatario_unidade_id` | PROTOCOLO 87, PROGEPE 59, Reitoria 42 |
| Carga por servidor | agrupado por `solicitante_pessoa_id` | Mari 121, Laura 100, Isabel 82 |
| Cancelados / sem efeito | por situação | 1 `CANCELADO` + 4 `sem efeito` registrados em texto |
| Tempo entre reserva e emissão | média(`data − criado_em`) | não mensurável hoje |

---

## 12. Plano de implementação consolidado

Integra este módulo ao plano de `arquitetura-dados.md` §7. **A ordem muda**: os expedientes
passam à frente do PNPD, por três razões — volume (275/ano contra 15/ano), risco (colisão de
número em documento oficial) e porque as portarias que ele registra são pré-requisito de
`vinculos.ato_id`, usado pelo PNPD.

| Fase | Conteúdo | Duração |
|---|---|---|
| **A** | **Núcleo** (§7 de `arquitetura-dados.md`), com A.8 ampliada: `atos` revisada + `ato_series` + `ato_referencias` + `proximo_sequencial()` | ~2 sem |
| **B** | **Refit** dos módulos atuais sobre o núcleo | ~1 sem |
| **E** | **Expedientes**: controller, telas, importador das 11 abas, conciliação com `editais` | ~2 sem |
| **C** | **PNPD** (§7 Fase C de `arquitetura-dados.md`) | ~2 sem |
| **D** | Legado Drupal (`field_*`) — adiável | ~1 sem |
| **F** | Expedição de diplomas em lote, se a secretaria confirmar | a definir |

**Total A+B+E+C ≈ 7 semanas** para os três mini-sistemas mais a fundação.

Detalhamento da Fase E:

| # | Ação | Arquivo |
|---|---|---|
| E.1 | Controller: CRUD, filtros, `reservar`, situação, referências | `server/controllers/atosController.js` |
| E.2 | Repositório + alocação atômica | `server/db/atosRepo.js` |
| E.3 | Rotas e permissões | `server/routes/adminRoutes.js` |
| E.4 | Seed das 6 séries + de-para de unidades (aliases dos 88 destinatários) | `server/db/schema.sql` |
| E.5 | Importador das 11 abas | `server/services/importers/atosImporter.js` |
| E.6 | Livro de expedientes (lista + barra de séries) | `src/pages/admin/AdminAtos.jsx` |
| E.7 | Formulário de emissão | `src/pages/admin/AdminAtoForm.jsx` |
| E.8 | Ficha com referências bidirecionais | `src/pages/admin/AdminAto.jsx` |
| E.9 | Administração de séries | `src/pages/admin/AdminAtoSeries.jsx` |
| E.10 | Importação em 5 passos | `src/pages/admin/AdminAtosImportar.jsx` |
| E.11 | Migração de `portarias` → `atos`; `AdminPortarias` aposentada | vários |
| E.12 | `editais.ato_id` no formulário de edital | `AdminEditalForm.jsx` |
| E.13 | Exportação XLSX, menu, constantes | — |

---

## 13. Testes

`server/__tests__/atos.test.js`:

- **Concorrência**: 20 `POST /reservar` simultâneos na mesma série/ano produzem
  sequenciais 1..20 sem repetição e sem buraco — **o teste que justifica o módulo**;
- `UNIQUE (serie, ano, sequencial)` rejeita inserção duplicada explícita;
- série com `reinicia_por_ano = FALSE` continua a numeração através dos anos;
- `DELETE` recusa ato `EMITIDO` (409) e aceita `RESERVADO`;
- cancelar mantém o número no livro com motivo, e o número **não** é reaproveitado;
- `ato_referencias`: criar `TORNA_SEM_EFEITO` de A para B faz a ficha de B listar A em
  "referenciado por";
- referência a ato não cadastrado grava `ato_ref_texto` e não quebra;
- `PATCH /situacao` grava evento em `eventos` com `entidade = 'ato'`;
- escopo: `GestorPrograma` só enxerga atos do seu programa;
- **importador**: 11 abas → 593 atos emitidos + 306 cancelados, 6 datas inválidas
  isoladas, 16 referências cruzadas resolvidas, 33 NUPs vinculados, `obs_original` íntegra
  em 100% das linhas.

---

## 14. Decisões pendentes

1. **Séries**: as 6 identificadas (Ofício, Portaria, Edital PRPG, Edital PRINT, Edital Lato
   Sensu, Edital Proficiência) são todas? A PRPG expede memorando, circular ou instrução
   normativa com numeração própria?
2. **Portarias de 2025**: 16 registradas contra 60 em 2026 (até julho). Foi sub-registro, ou
   as portarias de 2025 foram controladas em outro lugar? Se houver outra fonte, ela entra na
   importação.
3. **Os 306 números reservados em branco**: importar como `CANCELADO` (preservando a densidade
   do livro) ou não importar (o livro passa a ter buracos, mas só contém documentos reais)?
   Recomendação: importar como cancelados — um livro de numeração não deve ter buraco
   inexplicado.
4. **Expedição de diplomas** (§9.4): manter um ofício por concluinte, ou passar a um ofício em
   lote? É decisão administrativa, não técnica.
5. **Editais**: os 46 editais numerados da planilha devem **todos** virar registros publicados
   no site, ou o livro contém editais que não vão ao site (internos, cancelados)?
6. **Quem reserva**: qualquer servidor da PRPG com login, ou só a secretaria? Hoje 12 pessoas
   escrevem na planilha; se todas terão login, é preciso criar os usuários.
7. **Numeração de resolução**: a PRPG numera resoluções próprias, ou apenas encaminha minutas
   ao CEPE/CONSU (que numeram)? Os dados sugerem o segundo — o ofício 2025 #184 encaminha
   *minuta* de Resolução CEPE. Se for só encaminhamento, `RESOLUCAO` não é série da PRPG.
8. **Boletim Oficial / DOU**: há campo de data de publicação a controlar, além do
   `link_externo`?

---

## Anexo — Verificações feitas neste levantamento

- Leitura programática das 11 abas: 593 linhas preenchidas, 306 pré-numeradas em branco,
  contagem por aba e por série.
- Conferência de numeração: duplicidades e lacunas por aba — 0 duplicados reais, 1 lacuna
  (`OFÍCIOS - 2024` nº 4); as "duplicidades" de ` EDITAIS PRPG 2025` são anos diferentes.
- Tipagem das datas: 6 valores não-data identificados nominalmente; 11 documentos fora de
  ordem cronológica; 3 com ano divergente da aba.
- Contagem de grafias: 40 variações na coluna Usuário (~12 pessoas), 88 destinatários
  distintos (~25 entidades).
- Extração por expressão regular de NUPs (23 completos + 10 curtos) e de referências
  documento→documento (16), com os trechos de origem.
- Agrupamento de assuntos: 425 ofícios em 267 assuntos distintos, com o principal (106
  ocorrências) identificado; 86 linhas citando "Livro".
- Cruzamento com `server/data/editais.json`: 12 editais no site, 1 com número preenchido,
  contra ~46 numerados na planilha.
