# Requisitos e Plano de Implementação — Módulo Câmara de Pós-Graduação (PRPG/UFRPE)

> **Objetivo**: substituir a planilha `Processos - Câmara de Pós Graduação.xlsx`, hoje
> usada pela secretaria da PRPG para controlar os processos que vão à pauta das reuniões
> mensais da Câmara de Pós-Graduação, por um mini-sistema dentro do painel administrativo
> já existente (React + Express + PostgreSQL).
>
> **Status deste documento**: planejamento. Nenhuma linha de código foi escrita.
> Documento elaborado em 26/07/2026 a partir da análise do arquivo real e de contribuições
> de especialistas em administração pública/órgãos colegiados, eficiência operacional (BPM)
> e desenho de sistemas internos.

---

## Sumário

1. [Diagnóstico da planilha atual](#1-diagnóstico-da-planilha-atual)
2. [Problemas identificados](#2-problemas-identificados)
3. [Riscos de conformidade e continuidade](#3-riscos-de-conformidade-e-continuidade)
4. [A mudança conceitual central](#4-a-mudança-conceitual-central)
5. [Ciclo de vida do processo](#5-ciclo-de-vida-do-processo)
6. [Vocabulários controlados](#6-vocabulários-controlados)
7. [Modelo de dados proposto](#7-modelo-de-dados-proposto)
8. [API — rotas e permissões](#8-api--rotas-e-permissões)
9. [Telas do painel administrativo](#9-telas-do-painel-administrativo)
10. [Artefatos gerados (PDF/XLSX)](#10-artefatos-gerados-pdfxlsx)
11. [Indicadores](#11-indicadores)
12. [Migração do acervo](#12-migração-do-acervo)
13. [Plano de implementação em fases](#13-plano-de-implementação-em-fases)
14. [Testes](#14-testes)
15. [Gestão da mudança e riscos do projeto](#15-gestão-da-mudança-e-riscos-do-projeto)
16. [Decisões pendentes](#16-decisões-pendentes)

---

## 1. Diagnóstico da planilha atual

Arquivo analisado: `Processos - Câmara de Pós Graduação.xlsx` (94 KB, 11 abas).

### 1.1 Estrutura das abas

| Aba | Reunião (célula A1) | Linhas | Papel |
|---|---|---|---|
| `Reunião da Câmara de Pós-Gradua` | 11/08/2026 | 2 | pauta em preparação |
| `Página20` | 09/07/2026 | 3 | pauta passada |
| `Página21` | 18/06/2026 | 3 | pauta passada |
| `Página22` | 12/05/2026 | 7 | pauta passada |
| `Página23` | 10/04/2026 | 9 | pauta passada |
| `Processos para Reunião em 10032` | 10/03/2026 | 7 | pauta passada |
| `Processos reunião em 10022026` | 10/02/2026 | 11 | pauta passada |
| `Processos pendentes` | 10/12/2025 | 6 | pauta passada (nome enganoso) |
| `Processos finalizados` | — | 54 | acervo histórico |
| `Relatores` | — | 44 | cadastro de programas e coordenadores |
| `Página13` | — | 0 | vazia |

**Uma aba nova é criada a cada reunião.** Metade das abas herdou o nome automático do
Google Sheets (`Página20`, `Página21`…), de modo que o nome não identifica a reunião — a
data só existe dentro da célula A1, como texto ("Prováveis processos para reunião da
Câmara de Pós-Graduação em 10/04/2026").

### 1.2 Colunas

O conjunto de colunas **muda entre abas**:

- Abas mais recentes: `Número de processo | Link direto | Responsável | Assunto | Localização | Obs.`
- Abas mais antigas: `Número de processo | Responsável | Assunto | Destino | Obs.` (sem "Link direto"; a 5ª coluna se chama "Destino")

### 1.3 Conteúdo real de cada coluna

- **Número de processo** — NUP do SIPAC no formato `23082.XXXXXX/AAAA-DD`. Ocorre 1 registro
  fora do padrão (`23082.09963/2024-97`, com 5 dígitos em vez de 6) e 1 com texto colado no
  número (`23082.031101/2024-41 (Vai para o CEPE)`).
- **Link direto** — URL do SIPAC (`https://sigs.ufrpe.br/public/jsp/processos/processo_detalhado.jsf?id=418241`).
  Preenchida só em parte das linhas.
- **Responsável** — setor da PRPG que instrui o processo: `Secretaria`, `Internacionalização`,
  `Lato Sensu`, `DADM` — **ou o nome de uma pessoa** (`Gabriel Chagas Quintiliano`), inconsistente.
- **Assunto** — texto livre longo, com quebras de linha, transcrevendo o objeto do processo.
- **Localização/Destino** — texto livre misturando setor + data:
  `"Recebido na Secretaria Geral dos Conselhos, em 07/04/2026"`, `"Enviado a SEG em 16/06"`,
  `"arquivado"`, `"Apensado ao processo 23082.020578/2024-09"`. Datas ora com ano, ora sem.
  O mesmo setor aparece como `SEG`, `Secretaria Geral dos Conselhos` e
  `SECRETARIA GERAL DOS CONSELHOS DA ADMINISTRAÇÃO SUPERIOR-SEG`.
- **Obs.** — campo-lixo que acumula **seis** tipos distintos de informação:
  1. relator designado — `"Relatora: Ana Virgínia Marinho Silveira"`
  2. resultado do parecer — `"PARECER FAVORÁVEL - PROCESSO DEFERIDO - AGUARDANDO DECISÃO"`
  3. tramitação/decisão — `"RETIRADO DE PAUTA APÓS DISCUSSÃO"`, `"vai ser encaminhado para o CONSU"`
  4. cobrança informal ao relator — `"cobrei devolução em 05/05"`, `"enviado lembrete"`
  5. situação SIPAC — `"Situação: ARQUIVADO (Em 12/09/2024 17:59)"`
  6. ato resultante — `"RESOLUÇÃO CEPE/UFRPE Nº 961, de 25 de novembro de 2025"`, `"DECISÃO Nº 121/2025 - SEG-UFRPE"`

### 1.4 O status é a cor da linha

Não existe coluna de status. A situação do processo é a **cor de fundo da linha**, sem
nenhuma legenda no arquivo:

| Cor (hex) | Uso aparente |
|---|---|
| `#B6D7A8` / `#D9EAD3` (verdes) | resolvido / em ordem |
| `#F4CCCC` / `#EA9999` (rosa/vermelho) | pendente / atenção |
| `#FFF2CC` (amarelo) | intermediário |
| `#CFE2F3` / `#C9DAF8` (azuis) | outra marcação |

> O significado exato de cada cor é **conhecimento tácito de uma única servidora** e precisa
> ser confirmado com ela antes da migração — este documento não presume o mapeamento.

Na aba `Relatores` há um segundo esquema de cores: laranja (`#FCE5CD`) = programas
acadêmicos, rosa (`#D5A6BD`) = programas profissionais (a única legenda explícita do
arquivo, na coluna G).

### 1.5 Duplicação medida

| Métrica | Valor |
|---|---|
| Linhas de processo em todas as abas | 102 |
| Processos distintos (por NUP) | 80 |
| Linhas que são recópia de um processo já existente | 22 (21,6%) |

Campeões de repetição:

- `23082.026060/2025-51` (PRONERA) — **5 abas**
- `23082.029407/2025-18`, `23082.036574/2025-15`, `23082.024509/2024-66`, `23082.025239/2025-91` — **3 abas cada**
- `23082.023005/2025-18` e `23082.006071/2024-34` aparecem **duas vezes dentro da mesma aba** `Processos finalizados`

Cada recópia atualiza a coluna "Localização", **sobrescrevendo a tramitação anterior**: o
histórico de para onde o processo foi e quando é perdido a cada mês.

### 1.6 Aba `Relatores`

44 linhas com `Programa | Sigla | Coordenador | Contatos | Substituto Eventual | Contatos`.
Contém **telefones celulares pessoais** de 44 coordenadores. Esses dados já existem, em boa
parte, nas tabelas `programas`, `pessoas`, `users` e `vinculos` do sistema atual — este
cadastro é uma duplicação paralela.

### 1.7 Volume

7 a 13 processos por pauta; 54 no acervo histórico. **Volume baixíssimo, criticidade
documental alta.** Isso define o dimensionamento: não é caso para motor de workflow
configurável, fila de mensageria ou BI. É caso para um CRUD bem desenhado com histórico
append-only.

---

## 2. Problemas identificados

| # | Problema | Consequência |
|---|---|---|
| P1 | Uma aba por reunião, com cópia manual dos processos | 21,6% do trabalho de digitação é retrabalho puro |
| P2 | "Localização" sobrescrita a cada cópia | histórico de tramitação destruído |
| P3 | Status codificado por cor, sem legenda | conhecimento tácito, *bus factor* = 1; some em qualquer exportação |
| P4 | Coluna "Obs." com 6 tipos de informação | impossível filtrar, contar ou cobrar |
| P5 | Texto livre em "Localização" e "Responsável" | mesmo setor com 3 grafias; impossível agrupar |
| P6 | Sem validação do NUP | `23082.09963/2024-97` quebra conciliação com o SIPAC |
| P7 | Sem filtros (exceto 1 aba) e sem busca | achar um processo exige varrer 8 abas |
| P8 | Sem registro de autoria/alteração | não se sabe quem mudou o quê e quando |
| P9 | Prazo do relator só existe na cabeça da servidora | cobrança manual por telefone; gargalo invisível |
| P10 | Nenhum indicador | não se sabe tempo médio, atraso por relator, carga de relatoria |
| P11 | Dados pessoais (celulares, nomes de discentes, licenças médicas) em arquivo compartilhado | exposição LGPD |
| P12 | Vínculo processo↔reunião↔relator↔resolução inexistente | não se responde "quantas vezes esse processo foi à pauta e por quê saiu" |

**Esforço manual recuperável estimado: 6 a 8 h/mês**, sendo ~4-5 h líquidas (montagem da
pauta 30-45 min; reconstrução de histórico 1-2 h; cobrança de relatores ~2 h; busca de
informação 2-3 h; conferência ~1 h). O ganho maior, porém, não é hora: é eliminar o risco
de pessoa única e recuperar rastreabilidade.

---

## 3. Riscos de conformidade e continuidade

Levantados pela análise de administração pública:

- **Rastreabilidade e motivação do ato** — a Lei 9.784/1999 exige forma, data e autoria dos
  atos (art. 22, §1º) e motivação explícita, clara e congruente (art. 50). Hoje a motivação
  de uma decisão existe como texto numa célula colorida. Isso não instrui recurso
  (arts. 56-59) nem sustenta controle externo.
- **Memória institucional** — sobrescrever a localização impede responder quantas vezes um
  processo foi à pauta, quem foi relator em cada rodada e por que saiu. Inviabiliza resposta
  a pedido de LAI (Lei 12.527/2011).
- **LGPD (Lei 13.709/2018)** — (a) 44 celulares pessoais num arquivo compartilhado sem
  controle de acesso ferem minimização e segurança (art. 6º, III e VII; art. 46);
  (b) a coluna "Assunto" carrega nome, situação acadêmica e por vezes motivo de saúde de
  discentes — potencial dado sensível (art. 5º, II) sem base legal registrada.
  O tratamento pelo poder público é lícito (art. 23), mas exige finalidade e controle de acesso.
- **Continuidade** — o significado das cores não está documentado. Férias ou saída da
  servidora paralisam o controle.

> **Delimitação obrigatória**: o SIPAC é o sistema oficial dos autos. Este módulo é o
> **controle interno da secretaria do colegiado**. Isso precisa estar escrito na interface e
> no rodapé de todo PDF gerado ("controle interno — autos: SIPAC nº …"), sob pena de o
> projeto ser lido pela STI/SEG como sistema paralelo.

---

## 4. A mudança conceitual central

> Hoje a **aba/reunião** é a entidade principal e o processo é uma linha copiada dentro dela.
>
> No sistema, inverte-se: **o processo é o registro permanente e único (chave = NUP);
> a reunião é um evento; "estar na pauta" é uma relação N:N entre os dois.**

Consequências diretas:

- Repautar deixa de ser copiar-e-colar: vira criar um vínculo (`pauta_itens`) — um clique.
- A tramitação vira uma tabela **append-only** (`processo_eventos`): nada é sobrescrito.
- O status deixa de ser cor e vira campo (`enum`), com cor derivada na exibição.
- A coluna "Obs." se decompõe em campos estruturados **mais** um campo livre que continua
  existindo ao lado (nunca no lugar).

Sozinha, essa inversão resolve P1, P2, P3 e P12.

---

## 5. Ciclo de vida do processo

### 5.1 Fluxo principal

```
Recebido na secretaria da Câmara
  → Em instrução (setor responsável da PRPG)
  → Apto para pauta
  → Relator designado            [prazo de devolução começa a contar]
  → Parecer recebido
  → Pautado (reunião X)
  → Deliberado
  → Ato lavrado (resolução/decisão)
  → Publicado / comunicado ao interessado
  → Arquivado
```

### 5.2 Desvios que precisam ser status de primeira classe

Todos ocorrem nos dados reais e hoje vivem em texto livre:

`RETIRADO DE PAUTA` (com motivo) · `EM DILIGÊNCIA` (baixa à origem com prazo) ·
`PEDIDO DE VISTA` · `SOBRESTADO` · `ADIADO` · `AD REFERENDUM` (aguardando homologação) ·
`APENSADO` (aponta para o NUP principal) · `ENCAMINHADO A INSTÂNCIA SUPERIOR` (CEPE/CONSU) ·
`EM MANIFESTAÇÃO JURÍDICA` (Procuradoria) · `EM RECURSO`

### 5.3 Parecer ≠ deliberação

Dois campos distintos, hoje fundidos em `"PARECER FAVORÁVEL - PROCESSO DEFERIDO - AGUARDANDO DECISÃO"`:

- **Resultado do parecer** (do relator): favorável · favorável com ressalvas · desfavorável ·
  pela diligência · pelo encaminhamento a instância superior
- **Deliberação** (da Câmara): aprovado · aprovado com ressalvas · indeferido · convertido em
  diligência · retirado · sobrestado · encaminhado ao CEPE/CONSU · homologado

---

## 6. Vocabulários controlados

Cada lista abaixo vira tabela ou `enum`, com tela de administração e opção
"outro (especificar)" — sem essa válvula, tudo volta para o campo livre.

**Unidades/setores** (`sigla`, `nome_oficial`, `aliases[]` para absorver as grafias históricas):
PRPG-Secretaria da Câmara · PRPG-Lato Sensu · PRPG-Internacionalização · PRPG-DADM ·
Coordenadoria de Programas Stricto Sensu de Excelência · SEG · CEPE · CONSU · Reitoria ·
PROGEPE · PREG · Procuradoria Federal · DRCA · Departamentos e Unidades Acadêmicas
(Sede, UAG, UACSA, UAST, UAEADTec) · Arquivo · as 44 coordenações de PPG.

> As coordenações de PPG **devem reaproveitar a tabela `programas` já existente** — a aba
> `Relatores` vira relacionamento, não cadastro paralelo.

**Tipos de matéria**: criação/credenciamento de curso (stricto/lato) · alteração de regimento ·
projeto pedagógico · relatório final de curso · reconhecimento/revalidação de diploma
estrangeiro · credenciamento/recredenciamento docente · recurso discente · reintegração ·
prorrogação de prazo/afastamento · bolsas · calendário acadêmico · minuta de resolução/normas ·
título de Doutor Honoris Causa · professor sênior · convênio/MINTER-DINTER · outros.

**Motivos de saída de pauta**: falta de instrução · ausência do relator · pedido de vista ·
pedido do interessado · falta de quórum · sessão encerrada · necessidade de parecer jurídico ·
retirado após discussão.

**Tipos de ato resultante**: Resolução CEPE/UFRPE · Resolução CONSU/UFRPE · Decisão SEG-UFRPE ·
Portaria · Despacho · Certidão — com `numero`, `ano`, `data`, `link/pdf`.

---

## 7. Modelo de dados proposto

Segue as convenções já usadas no projeto (`server/db/schema.sql`, `repositories.js`):
IDs `TEXT`, datas simples como `TEXT 'YYYY-MM-DD'`, timestamps `TIMESTAMPTZ`, campos de
auditoria `criado_por`/`atualizado_por`.

```sql
-- ===================== Câmara de Pós-Graduação =====================

-- Setores/unidades da UFRPE por onde os processos tramitam.
CREATE TABLE IF NOT EXISTS camara_unidades (
  id            TEXT PRIMARY KEY,
  sigla         TEXT NOT NULL,
  nome          TEXT NOT NULL,
  aliases       TEXT[] DEFAULT '{}',   -- grafias históricas da planilha
  interna_prpg  BOOLEAN DEFAULT FALSE, -- TRUE para Secretaria, Lato Sensu, Internacionalização, DADM
  ativo         BOOLEAN DEFAULT TRUE
);

-- Processo: o registro permanente. Chave de negócio = numero (NUP).
CREATE TABLE IF NOT EXISTS camara_processos (
  id                  TEXT PRIMARY KEY,
  numero              TEXT NOT NULL UNIQUE,     -- 23082.XXXXXX/AAAA-DD
  numero_valido       BOOLEAN DEFAULT TRUE,     -- FALSE = fora do padrão (não bloqueia)
  link_sipac          TEXT,
  assunto             TEXT NOT NULL,
  tipo_materia        TEXT,                     -- vocabulário controlado
  interessado         TEXT,                     -- pessoa/unidade requerente
  programa_id         TEXT REFERENCES programas(id) ON DELETE SET NULL,
  unidade_responsavel_id TEXT REFERENCES camara_unidades(id), -- setor da PRPG que instrui
  status              TEXT NOT NULL DEFAULT 'RECEBIDO',
  status_motivo       TEXT,                     -- motivo de retirada/diligência/etc.
  localizacao_id      TEXT REFERENCES camara_unidades(id),    -- derivado do último evento
  localizacao_em      TEXT,                     -- data do último evento
  data_entrada        TEXT,                     -- chegada à secretaria da Câmara
  data_encerramento   TEXT,
  processo_pai_id     TEXT REFERENCES camara_processos(id) ON DELETE SET NULL, -- apensamento
  sigiloso            BOOLEAN DEFAULT FALSE,    -- restringe visualização (dado sensível)
  observacoes         TEXT,                     -- campo livre que continua existindo
  obs_original        TEXT,                     -- coluna "Obs." da planilha, preservada na íntegra
  criado_em           TIMESTAMPTZ DEFAULT now(),
  atualizado_em       TIMESTAMPTZ DEFAULT now(),
  criado_por          TEXT,
  atualizado_por      TEXT
);
CREATE INDEX IF NOT EXISTS camara_proc_status_idx  ON camara_processos(status);
CREATE INDEX IF NOT EXISTS camara_proc_prog_idx    ON camara_processos(programa_id);

-- Histórico append-only. NADA aqui é atualizado ou apagado.
CREATE TABLE IF NOT EXISTS camara_eventos (
  id            TEXT PRIMARY KEY,
  processo_id   TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,  -- TRAMITACAO|STATUS|RELATORIA|PAUTA|PARECER|DELIBERACAO|ATO|NOTA|COBRANCA
  data          TEXT NOT NULL,  -- data do fato (não do registro)
  unidade_id    TEXT REFERENCES camara_unidades(id),
  descricao     TEXT,
  reuniao_id    TEXT,
  relatoria_id  TEXT,
  anexo_url     TEXT,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT
);
CREATE INDEX IF NOT EXISTS camara_ev_proc_idx ON camara_eventos(processo_id, data);

-- Reuniões da Câmara.
CREATE TABLE IF NOT EXISTS camara_reunioes (
  id            TEXT PRIMARY KEY,
  data          TEXT NOT NULL,       -- 'YYYY-MM-DD'
  numero        TEXT,                -- "VIII Reunião Ordinária"
  tipo          TEXT DEFAULT 'ORDINARIA', -- ORDINARIA|EXTRAORDINARIA
  local         TEXT,
  hora          TEXT,
  status        TEXT NOT NULL DEFAULT 'RASCUNHO', -- RASCUNHO|CONVOCADA|REALIZADA|CANCELADA
  pauta_pdf_url TEXT,
  ata_url       TEXT,
  observacoes   TEXT,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT,
  atualizado_por TEXT
);

-- Relação N:N processo ↔ reunião. Substitui a cópia entre abas.
CREATE TABLE IF NOT EXISTS camara_pauta_itens (
  id             TEXT PRIMARY KEY,
  reuniao_id     TEXT NOT NULL REFERENCES camara_reunioes(id) ON DELETE CASCADE,
  processo_id    TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
  ordem          INTEGER DEFAULT 0,
  bloco          TEXT,               -- agrupamento na pauta (ex.: por setor responsável)
  deliberacao    TEXT,               -- APROVADO|APROVADO_RESSALVAS|INDEFERIDO|DILIGENCIA|RETIRADO|SOBRESTADO|ENCAMINHADO|HOMOLOGADO
  motivo_saida   TEXT,               -- vocabulário controlado, quando retirado/adiado
  registro       TEXT,               -- síntese da discussão para a ata
  criado_em      TIMESTAMPTZ DEFAULT now(),
  criado_por     TEXT,
  UNIQUE (reuniao_id, processo_id)
);

-- Designação de relatoria, com prazo e devolução. Histórico: um processo pode
-- ter várias relatorias (troca de relator ocorre nos dados reais).
CREATE TABLE IF NOT EXISTS camara_relatorias (
  id                TEXT PRIMARY KEY,
  processo_id       TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
  -- relator_id é polimórfico (users.id ou pessoas.id), como em `vinculos`
  relator_id        TEXT,
  relator_nome      TEXT NOT NULL,   -- desnormalizado: nomes históricos sem cadastro
  programa_id       TEXT REFERENCES programas(id) ON DELETE SET NULL,
  data_designacao   TEXT,
  prazo_devolucao   TEXT,
  data_devolucao    TEXT,
  resultado_parecer TEXT,            -- FAVORAVEL|FAVORAVEL_RESSALVAS|DESFAVORAVEL|DILIGENCIA|ENCAMINHAMENTO
  parecer_url       TEXT,
  ativa             BOOLEAN DEFAULT TRUE,
  motivo_substituicao TEXT,
  criado_em         TIMESTAMPTZ DEFAULT now(),
  criado_por        TEXT
);
CREATE INDEX IF NOT EXISTS camara_rel_proc_idx ON camara_relatorias(processo_id);

-- Atos resultantes (resolução, decisão, portaria).
CREATE TABLE IF NOT EXISTS camara_atos (
  id            TEXT PRIMARY KEY,
  processo_id   TEXT NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE,
  tipo          TEXT,               -- RESOLUCAO_CEPE|RESOLUCAO_CONSU|DECISAO_SEG|PORTARIA|DESPACHO
  numero        TEXT,
  ano           INTEGER,
  data          TEXT,
  ementa        TEXT,
  link          TEXT,
  resolucao_id  TEXT REFERENCES resolucoes(id) ON DELETE SET NULL, -- publicação no site
  criado_em     TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT
);
```

### 7.1 Repositórios

- `camara_processos`, `camara_reunioes`, `camara_unidades`, `camara_atos` → usam a fábrica
  `createRepository` de `server/db/repository.js` (entidades de tabela única).
- `camara_eventos`, `camara_pauta_itens`, `camara_relatorias` → repositório manual com
  queries próprias (agregações, joins, ordenação por data), no padrão do
  `proficienciaController.js`.

### 7.2 Campos derivados (calculados, não armazenados)

- `dias_parado` = hoje − `localizacao_em`
- `atrasado` = existe relatoria ativa com `prazo_devolucao < hoje` e sem `data_devolucao`
- `reincidente` = `count(camara_pauta_itens) >= 3`
- `localizacao` = último evento `tipo='TRAMITACAO'` (as colunas `localizacao_id`/`localizacao_em`
  em `camara_processos` são cache de leitura, atualizadas pelo controller ao inserir o evento)

---

## 8. API — rotas e permissões

Prefixo `/api/camara`. Papéis existentes: `Administrator`, `Gestor` (PRPG), `GestorPrograma`.

| Método | Rota | Papéis | Descrição |
|---|---|---|---|
| GET | `/processos` | Admin, Gestor, GestorPrograma¹ | lista com filtros (`status`, `unidade`, `relator`, `programa`, `q`, `atrasados`, `reincidentes`) |
| GET | `/processos/:id` | Admin, Gestor, GestorPrograma¹ | ficha completa (com eventos, relatorias, pautas, atos) |
| POST | `/processos` | Admin, Gestor | cadastro |
| PUT | `/processos/:id` | Admin, Gestor | edição |
| PATCH | `/processos/:id/status` | Admin, Gestor | troca rápida de status (gera evento) |
| PATCH | `/processos/:id/localizacao` | Admin, Gestor | troca de localização (gera evento) |
| DELETE | `/processos/:id` | Admin | exclusão |
| POST | `/processos/:id/eventos` | Admin, Gestor | nota/cobrança/tramitação manual |
| POST | `/processos/:id/relatorias` | Admin, Gestor | designar relator |
| PUT | `/relatorias/:id` | Admin, Gestor | registrar devolução do parecer |
| GET | `/reunioes` | Admin, Gestor | lista de reuniões |
| POST/PUT/DELETE | `/reunioes[/:id]` | Admin, Gestor | CRUD de reunião |
| GET | `/reunioes/:id/pauta` | Admin, Gestor | itens da pauta |
| POST | `/reunioes/:id/pauta` | Admin, Gestor | pautar processos (aceita lote de IDs) |
| DELETE | `/reunioes/:id/pauta/:itemId` | Admin, Gestor | despautar |
| PUT | `/reunioes/:id/resultados` | Admin, Gestor | lançamento em lote das deliberações |
| GET | `/reunioes/:id/pauta.pdf` | Admin, Gestor | pauta em PDF (pdfkit) |
| GET | `/unidades` | Admin, Gestor, GestorPrograma | vocabulário de setores |
| POST/PUT/DELETE | `/unidades[/:id]` | Admin, Gestor | manutenção do vocabulário |
| GET | `/indicadores` | Admin, Gestor | painel |
| GET | `/exportar.xlsx` | Admin, Gestor | exportação total |
| POST | `/importar` | Admin | importação da planilha (pré-visualização + confirmação) |
| GET | `/meus-processos` | qualquer autenticado | "o que está comigo" (relator) |

¹ `GestorPrograma` enxerga **apenas** processos com `programa_id` igual ao seu, e apenas
leitura. Processos marcados `sigiloso` ficam restritos a Admin/Gestor.

Padrão do projeto a seguir: rotas específicas **antes** das genéricas `/:id`
(ver `server/routes/adminRoutes.js:120`).

---

## 9. Telas do painel administrativo

Rotas em `src/pages/admin/`, registradas em `src/App.jsx`, item de menu em
`src/components/AdminLayout.jsx` (seção **Administração**, ícone `Gavel` ou `Landmark`).

| Rota | Tela | Fase |
|---|---|---|
| `/admin/camara` | **Lista de processos** — tela-mãe | MVP |
| `/admin/camara/novo`, `/admin/camara/editar/:id` | formulário | MVP |
| `/admin/camara/:id` | **Ficha do processo** com linha do tempo | MVP |
| `/admin/camara/reunioes` | lista de reuniões | MVP |
| `/admin/camara/reunioes/:id` | **montagem da pauta** + lançamento de resultados | MVP |
| `/admin/camara/unidades` | vocabulário de setores | MVP |
| `/admin/camara/importar` | importação da planilha | MVP (uso único) |
| `/admin/camara/painel` | panorama e indicadores | Fase 3 |
| `/admin/camara/meus-processos` | visão do relator | Fase 4 |

### 9.1 Lista de processos (a tela que decide o projeto)

**Colunas, nesta ordem:**

1. `☐` seleção (usar `useBulkSelection` de `src/components/admin/BulkActions.jsx`)
2. **Processo** — NUP em fonte monoespaçada + ícone que abre o SIPAC em nova aba. Clicar no número abre a ficha.
3. **Status** — badge nomeado
4. **Assunto** — coluna elástica, truncada em 2 linhas, texto completo no `title`
5. **Responsável** — setor da PRPG
6. **Relator** — sigla do programa + nome curto; vazio mostra botão fantasma "designar"
7. **Localização** — setor atual, com "há 12 dias" em cinza abaixo
8. **Pautas** — pílula com a contagem; hover lista as datas
9. `⋯` menu de ação rápida

A coluna "Obs." **não é replicada** — quebrá-la é metade do valor do sistema.

**Filtros**, em barra fixa no topo: busca livre (casa número, assunto e relator; foco com `/`) ·
chips de status com contador (`Pendentes 8`, `Aguardando parecer 5`, `Resolvidos 55`) ·
selects de Setor responsável e Relator · chips-toggle `Atrasados` e `Reincidentes`.
Estado dos filtros persiste na querystring e no `localStorage`.

**Ordenação padrão:** pendentes primeiro; dentro deles, o mais antigo sem movimentação no
topo — a lista já responde "o que eu tenho que cobrar hoje". Resolvidos ocultos por padrão.

**Sem paginação.** São ~80 registros: lista inteira com cabeçalho fixo.

**Mapeamento de cores → badges** (a confirmar com a servidora na tela de importação):

| Planilha | Badge | Classe Tailwind |
|---|---|---|
| Rosa `#F4CCCC`/`#EA9999` | **Pendente** | `bg-rose-100 text-rose-800` |
| Amarelo `#FFF2CC` | **Aguardando parecer** | `bg-amber-100 text-amber-800` |
| Azul `#CFE2F3` | **Em diligência** | `bg-sky-100 text-sky-800` |
| Verde `#B6D7A8`/`#D9EAD3` | **Resolvido** | `bg-green-100 text-green-800` |
| — | **Arquivado** | `bg-slate-100 text-slate-700` |

Além do badge, uma **faixa vertical de 3px na borda esquerda da linha** na mesma cor: preserva
o *scan* visual de 1 segundo que a planilha oferecia, agora com legenda.

**Destaques ortogonais ao status:** processo atrasado ganha ícone de relógio âmbar ao lado do
relator com "há 41 dias" em vermelho; reincidente ganha pílula `↻ 4ª pauta`. Nenhum dos dois
muda a cor da linha.

### 9.2 Velocidade de operação (requisito não negociável)

O sistema só vence a planilha se for **mais rápido** de operar que ela.

**Um clique, na própria lista, sem modal:**

- **Marcar como resolvido** — o badge de status *é* o botão: clique abre popover com os
  status, escolher aplica na hora, a linha reordena e o toast mostra "Resolvido · Desfazer"
  por 8 s. Atalho de teclado `R` na linha focada.
- **Mudar localização** — célula editável inline: combobox de setores com autocomplete,
  `Enter` grava com a data de hoje e cria o evento de tramitação.
- **Designar relator** — combobox inline, busca por sigla do programa ou nome.
- **Anotar** — `⋯ → Anotar`, popover com textarea, `Ctrl+Enter` salva como evento datado.

**Com confirmação** (`useConfirm`): apenas excluir processo e desfazer reunião realizada.
Trocar status **não** pede confirmação — "Desfazer" no toast é mais rápido e menos irritante.

**Em massa** (`BulkActionBar`): pautar em… · mudar status · mudar localização · designar
relator · exportar.

### 9.3 Ficha do processo

Coluna larga + coluna lateral, sem abas:

- **Cabeçalho fixo** — número, badge editável, botão "Abrir no SIPAC", assunto.
- **Bloco Dados** — responsável, relator atual (com prazo), localização, data de entrada,
  tipo de matéria, programa, processo apensado.
- **Linha do tempo** (elemento central) — eventos em ordem cronológica inversa, com ícone,
  data, autor e texto: "Entrou na pauta de 12/03" · "Retirado — diligência" ·
  "Parecer recebido — favorável" · "Localização: DADM" · "Resolução nº 45/2026".
  Itens de pauta destacados e clicáveis para a reunião. **É aqui que morre o campo Obs.**
- **Lateral** — anexos (drag-and-drop via `/api/upload` já existente), link do SIPAC, atos
  vinculados e um bloco "Notas" livre.

### 9.4 Montagem da pauta

Duas modalidades para a mesma operação:

- **Tela da reunião, dois painéis** — esquerda "Candidatos" (processos não resolvidos, com os
  mesmos filtros da lista, marcando em cinza os já pautados em outra reunião); direita
  "Pauta de 12/03", reordenável por arrastar, com numeração automática e agrupamento por bloco.
- **Atalho do dia a dia** — selecionar várias linhas na lista principal e usar
  **"Pautar em…"** na barra de ações em massa.

**Depois da reunião — modo lançamento:** a mesma tela vira uma tabela de uma linha por item,
com três controles (deliberação, ato/observação, status resultante pré-preenchido), navegação
por `Tab` e um único botão **"Salvar reunião"** que grava tudo, escreve na linha do tempo de
cada processo e marca a reunião como realizada. Zero navegação entre telas para 13 processos.

### 9.5 Entrada de dados sem atrito

- **NUP** — máscara `23082.______/____-__` com prefixo preenchido; validação do dígito
  verificador (módulo 11) como **aviso amarelo**, nunca bloqueio (a planilha já tem um caso
  fora do padrão; travar o salvamento é a forma mais rápida de perder a usuária → grava
  `numero_valido = FALSE`).
- **Colar do Excel** — campo "colar linhas" que aceita várias linhas separadas por tabulação
  e cai na pré-visualização de importação.
- **Autocomplete** com "criar novo" inline para setores e relatores.
- **Padrões inteligentes** — data = hoje; setor responsável = último usado na sessão;
  status inicial = `RECEBIDO`; localização inicial = Secretaria da Câmara.
- **Campos obrigatórios: apenas número e assunto.** Todo o resto entra depois.

### 9.6 Erros de design a evitar

Estes são os que fariam a servidora voltar ao Excel:

- modal de confirmação em ação corriqueira;
- obrigar campos que a planilha não exigia;
- eliminar o campo de texto livre (o que não cabe em campo nenhum deixa de ser registrado);
- exigir navegar para outra página só para mudar um valor;
- paginar 13 itens;
- esconder o NUP atrás de um título "bonito" — o número é a identidade;
- perder a leitura por cor;
- validação rígida do NUP que impeça cadastrar processo real fora do padrão;
- exigir criar a reunião antes de cadastrar o processo (o processo chega solto);
- **não ter exportação para Excel.**

---

## 10. Artefatos gerados (PDF/XLSX)

`pdfkit` e `qrcode` já são dependências (usadas nas declarações de proficiência) e `xlsx`
também está instalado.

| Artefato | Formato | Assina | Fase |
|---|---|---|---|
| **Pauta da reunião** (itens numerados: NUP, interessado, matéria, relator, link) | PDF | Presidente da Câmara (Pró-Reitor[a]), secretariada | MVP |
| **Exportação completa** dos processos com filtros aplicados | XLSX | — | MVP |
| **Ofício de designação de relatoria** (um por relator, com prazo e link) | PDF + corpo de e-mail | Presidente da Câmara | Fase 3 |
| **Mapa de processos por relator** (pendentes, prazo, dias de atraso) | PDF/XLSX | uso interno | Fase 3 |
| **Espelho do processo** (tramitação completa, com QR de verificação — reaproveitar o padrão da proficiência) | PDF | Secretária da Câmara | Fase 4 |
| **Minuta de ata** a partir dos itens deliberados | PDF/DOCX | Presidente + presentes | Fase 4 |
| **Extrato de encaminhamento ao CEPE/SEG** | PDF | Pró-Reitor(a) | Fase 4 |
| **Relatório anual** (volume por matéria, tempo médio, taxa de deferimento, retiradas) | PDF/XLSX | Pró-Reitor(a) | Fase 4 |

Todo PDF traz no rodapé: *"Controle interno da Secretaria da Câmara de Pós-Graduação — os
autos oficiais tramitam no SIPAC."*

---

## 11. Indicadores

| Indicador | Cálculo | Meta sugerida |
|---|---|---|
| Tempo médio de tramitação | média(`data_encerramento − data_entrada`) dos encerrados no trimestre | ≤ 90 dias (3 ciclos) |
| **Devolução do parecer** | média(`data_devolucao − data_designacao`); e % devolvidos até D-3 da reunião | ≤ 20 dias; ≥ 80% no prazo |
| Reincidência de pauta | processos com ≥ 2 `pauta_itens` ÷ total pautado no período | *baseline* atual ~21%; meta ≤ 15% |
| Carga de relatoria | pareceres em aberto por conselheiro + média móvel 12 m | máx. 2 simultâneos; ninguém acima de 2× a média |
| Backlog por setor | processos abertos agrupados pela localização atual | nenhum setor > 30% do backlog |
| **Aging** | dias desde a última movimentação, em faixas 0-15 / 16-30 / 31-60 / > 60 | zero processos parados > 60 dias |
| Eficácia da pauta | itens deliberados ÷ itens pautados por reunião | ≥ 80% |

O *baseline* de reincidência (21,6% das linhas são recópia) já está medido a partir da
planilha atual e serve como marco zero.

---

## 12. Migração do acervo

**Ponto de atenção técnico**: a biblioteca `xlsx` (SheetJS *Community Edition*), já instalada
no projeto, **não lê cores de preenchimento de célula de forma confiável** — estilos são
recurso da versão Pro. Como o status está codificado em cor, o script de importação precisa
de `exceljs` (nova dependência de desenvolvimento) ou de um pré-processamento à parte.
Sem isso, a informação de status se perde na migração.

**Regras do importador:**

1. **Data da reunião** vem da célula A1 de cada aba (`"…em DD/MM/AAAA"`), **não** do nome da
   aba — metade delas se chama `PáginaNN`.
2. **Chave de deduplicação** = NUP normalizado (remover texto colado, como
   `"(Vai para o CEPE)"`). As 102 linhas viram 80 processos.
3. **Cada aparição em uma aba vira dois registros**: um `camara_pauta_itens` da reunião
   correspondente **e** um `camara_eventos` de tramitação com a "Localização" e a data
   daquela aba. Ou seja, **a duplicação que hoje destrói o histórico passa a reconstruí-lo.**
4. **De-para de setores** (`SEG` = `Secretaria Geral dos Conselhos` = `…-SEG`), construído em
   sessão de ~1 h com a servidora e materializado em `camara_unidades.aliases`.
5. **Mapa cor→status** validado por ela na tela de importação e documentado no código.
6. **A coluna "Obs." é preservada na íntegra** em `obs_original` e, em paralelo, parseada por
   expressões regulares nos 6 campos identificados (relator, resultado do parecer, tramitação,
   cobrança, situação SIPAC, número da resolução). **Nada é descartado.**
7. **Aba `Relatores`** → conciliar com `programas` pela sigla; criar/vincular pessoas.
   **Os telefones celulares vão para campo de acesso restrito**, não para listagem aberta.
8. Importação **idempotente** e reversível por 24 h ("desfazer importação").
9. O XLSX original é anexado como arquivo imutável no sistema — a planilha vira somente
   leitura e é arquivada, nunca apagada.

**Tela de importação em 4 passos:** (1) upload e detecção das abas → (2) mapa de cores, com
amostra real de cada cor e a pergunta "o que significa esta cor?" → (3) desduplicação, mostrando
"aparece em 4 abas" e o que mudou entre elas, com o registro consolidado proposto →
(4) pré-visualização com contadores (X processos, Y reuniões, Z relatores, W avisos) e
botão "Importar".

---

## 13. Plano de implementação em fases

### Fase 0 — Modelo de dados e migração (≈ 1 semana)

| # | Ação | Arquivo |
|---|---|---|
| 0.1 | Escrever as 7 tabelas em `schema.sql` | `server/db/schema.sql` |
| 0.2 | Migração idempotente para o banco existente | `server/db/migrations/AAAA-MM-DD_camara.sql` |
| 0.3 | Repositórios com `fromRow`/`toRow` | `server/db/repositories.js` |
| 0.4 | Repositório manual de eventos/pauta/relatorias | `server/db/camaraRepo.js` (novo) |
| 0.5 | *Seed* de `camara_unidades` com os setores extraídos da planilha + aliases | `server/db/migrations/…` |
| 0.6 | Sessão de 1 h com a servidora: legenda de cores + de-para de setores | — |
| 0.7 | Script de importação com `exceljs` | `server/services/importers/camaraImporter.js` |

**Pronto quando:** as 8 pautas + 54 finalizados estão importados, com histórico reconstruído,
e a servidora valida uma amostra de 10 processos.

### Fase 1 — MVP operacional (≈ 2 a 3 semanas)

| # | Ação | Arquivo |
|---|---|---|
| 1.1 | Controller de processos (CRUD, filtros, PATCH de status/localização) | `server/controllers/camaraController.js` |
| 1.2 | Controller de reuniões e pauta (incl. lançamento em lote) | `server/controllers/camaraReunioesController.js` |
| 1.3 | Rotas + permissões | `server/routes/adminRoutes.js` |
| 1.4 | Validação e sanitização (NUP, assunto, campos livres) | `server/utils/sanitize.js` (reuso) |
| 1.5 | Lista de processos com filtros, badges e ações rápidas | `src/pages/admin/AdminCamara.jsx` |
| 1.6 | Formulário de processo | `src/pages/admin/AdminCamaraForm.jsx` |
| 1.7 | Ficha com linha do tempo | `src/pages/admin/AdminCamaraProcesso.jsx` |
| 1.8 | Lista de reuniões | `src/pages/admin/AdminCamaraReunioes.jsx` |
| 1.9 | Montagem de pauta + lançamento de resultados | `src/pages/admin/AdminCamaraReuniao.jsx` |
| 1.10 | Tela de importação (4 passos) | `src/pages/admin/AdminCamaraImportar.jsx` |
| 1.11 | Cadastro de unidades/setores | `src/pages/admin/AdminCamaraUnidades.jsx` |
| 1.12 | Rotas do front + item de menu | `src/App.jsx`, `src/components/AdminLayout.jsx` |
| 1.13 | Geração da pauta em PDF | `server/services/camaraPdf.js` |
| 1.14 | Exportação XLSX | `server/controllers/camaraController.js` |

**Pronto quando:** a próxima pauta é montada 100% no sistema e o PDF sai sem tocar no Excel.

### Fase 2 — Cobrança do relator (≈ 1 a 2 semanas)

| # | Ação | Observação |
|---|---|---|
| 2.1 | Designação de relatoria com prazo calculado a partir da data da reunião | |
| 2.2 | Tela "quem devolveu / quem não devolveu" | |
| 2.3 | E-mail de designação + lembretes D-10 / D-5 / D-1 | **requer `nodemailer` + SMTP institucional — hoje o projeto não envia e-mail** |
| 2.4 | Link tokenizado para o relator enviar o parecer sem login | reaproveita o padrão de código de verificação da proficiência |
| 2.5 | Registro automático da cobrança como evento | substitui `"cobrei devolução em 05/05"` |

**Pronto quando:** a servidora deixa de telefonar para cobrar parecer.

### Fase 3 — Indicadores e painel (≈ 1 semana)

Painel com aging em semáforo, backlog por setor, carga de relatoria, reincidência de pauta e
tempo médio; ofício de designação e mapa por relator em PDF.

### Fase 4 — Acabamento (≈ 1 a 2 semanas)

Minuta de ata gerada dos itens deliberados; espelho do processo com QR; extrato de
encaminhamento ao CEPE; visão `meus-processos` para conselheiros; relatório anual;
busca *full-text*; log de auditoria por campo.

### Fora de escopo (justificativa)

Integração ou *scraping* do SIPAC (autenticação frágil, ganho pequeno para 10 processos/mês —
manter o link direto) · OCR de pareceres · assinatura digital própria (usar Gov.br quando
houver) · aplicativo móvel · motor de workflow configurável · BI externo.
**O volume não justifica nenhum deles.**

---

## 14. Testes

Vitest + supertest, no padrão de `server/__tests__/` (banco isolado `prpg_test`).
Arquivo novo: `server/__tests__/camara.test.js`.

Cobertura mínima:

- CRUD de processo e unicidade do NUP;
- validação do NUP (dígito verificador) gravando `numero_valido = FALSE` sem bloquear;
- `camara_eventos` é append-only: `PATCH /localizacao` cria evento e atualiza o cache;
- pautar o mesmo processo duas vezes na mesma reunião falha (`UNIQUE`);
- repautar em reunião diferente cria novo item e preserva o anterior;
- lançamento em lote de deliberações grava evento em cada processo;
- controle de acesso: `GestorPrograma` só lê processos do seu programa; processo `sigiloso`
  invisível para ele;
- importador: 102 linhas → 80 processos, 8 reuniões, histórico reconstruído, `obs_original` íntegra.

---

## 15. Gestão da mudança e riscos do projeto

**A servidora não é obstáculo: é a fonte da especificação.** Ela é a maior especialista do
processo e, hoje, o maior risco de continuidade. Tratá-la como coautora:

- ela é a dona da legenda de cores e do de-para de setores, nomeada assim no projeto;
- a migração é validada por ela antes de qualquer tela ser considerada pronta;
- o botão "Exportar XLSX" existe desde o primeiro dia, como cinto de segurança;
- nada é apagado: a planilha vira somente leitura e é arquivada.

**Três ganhos que ela precisa sentir na primeira semana:**

1. a pauta sai em um clique — o trabalho mais chato do mês desaparece já no primeiro ciclo;
2. "onde está e o que já aconteceu" numa tela só, sem varrer 8 abas;
3. ela para de ligar cobrando relator — o sistema cobra e ela apenas confere (Fase 2; é o
   ganho de maior impacto político, e o que efetivamente compra o projeto).

**Riscos e mitigações:**

| Risco | Mitigação |
|---|---|
| Ser lido como "sistema paralelo ao SIPAC" | delimitação explícita na UI e no rodapé dos PDFs |
| Digitação dupla | colar NUP monta o link e valida; importação em lote; colagem do Excel |
| Convivência longa com a planilha | paralelo por **um** ciclo de reunião apenas; se durar três, o Excel sobrevive |
| Rigidez excessiva dos vocabulários | toda lista fechada tem tela de administração e "outro (especificar)"; campo livre permanece ao lado dos campos estruturados |
| LGPD | telefones em campo de acesso restrito; `sigiloso` para processos com dado sensível; permissões por papel; finalidade registrada |
| Aprisionamento de dados | exportação total em XLSX/CSV a qualquer momento |
| Superdimensionamento | `enum` de status + histórico append-only bastam; nada de motor de workflow |

---

## 16. Decisões pendentes

Precisam de definição antes da Fase 0/1:

1. **Legenda das cores** — o que significa exatamente amarelo e azul na planilha? (só a
   servidora sabe)
2. **Prazo regimental do relator** — existe prazo formal no regimento da Câmara? Quantos dias?
   Ele conta da designação ou é referenciado à data da reunião?
3. **Conselheiros ≠ coordenadores** — a aba `Relatores` lista coordenadores de programa. Os
   relatores da Câmara são sempre os coordenadores, ou há conselheiros eleitos distintos?
4. **Quem acessa** — os conselheiros terão login no sistema (Fase 4) ou o acesso deles se dá
   por link tokenizado?
5. **E-mail institucional** — há SMTP disponível para a Fase 2? Sem ele, a automação de
   cobrança não sai do papel.
6. **Publicação pública** — as resoluções resultantes já são publicadas em `/resolucoes` no
   site. Vale vincular `camara_atos.resolucao_id` e publicar automaticamente?
7. **Retenção** — por quanto tempo o acervo fica no sistema? Há tabela de temporalidade
   aplicável (CONARQ)?

---

## Anexo A — Fontes deste documento

- Análise programática do arquivo `Processos - Câmara de Pós Graduação.xlsx` (11 abas,
  102 linhas de processo, extração de valores, cores de preenchimento, mesclagens e filtros).
- Contribuição de especialista em **administração pública e secretaria de órgãos colegiados**
  (seções 3, 5, 6, 10 e parte da 15).
- Contribuição de especialista em **eficiência operacional / BPM** (seções 2, 4, 11, 12, 13 e 15).
- Contribuição de especialista em **desenho de sistemas internos (UX de back-office)** (seção 9).
- Convenções do próprio projeto: `CLAUDE.md`, `server/db/schema.sql`,
  `server/db/repository.js`, `server/routes/adminRoutes.js`,
  `server/controllers/proficienciaController.js` (referência de mini-sistema completo),
  `src/pages/admin/AdminPortarias.jsx` (referência de tela de lista).
