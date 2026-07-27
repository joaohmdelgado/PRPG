# Requisitos — Agenda de Contatos das Coordenações de Pós-Graduação

> **Objetivo**: substituir a planilha `Contatos - Coordenações de PG.xlsx` por uma agenda
> viva no sistema, **indexada por cargo** — que é como a PRPG realmente a consulta.
>
> **Achado central**: esta planilha não é uma lista de contatos. É o **cadastro de programas
> mais atualizado que a PRPG tem** — 47 programas contra os 42 do sistema, com **31 siglas
> que o sistema não tem**, notas CAPES e a composição atual das coordenações. Os contatos são
> a parte visível; o cadastro é o que está por baixo.
>
> **Status**: planejamento. Data: 26/07/2026.
> Documentos irmãos: [`arquitetura-dados.md`](arquitetura-dados.md) (fundação),
> [`requisitos-expedientes.md`](requisitos-expedientes.md), [`requisitos-camara.md`](requisitos-camara.md),
> [`requisitos-pnpd.md`](requisitos-pnpd.md).
>
> Este documento **acrescenta** uma tabela ao núcleo (`contatos`) e ajusta `vinculos` — ver §5.

---

## 1. Diagnóstico

Arquivo: uma aba (`Base`), **47 programas** nas linhas 2 a 48, 12 colunas, filtro automático
ativo em `A1:K48` e painel congelado em `A2`. É a planilha mais bem-cuidada das quatro
analisadas — e ainda assim tem os mesmos problemas estruturais.

### 1.1 Colunas e preenchimento

| Col | Cabeçalho | Preenchidas |
|---|---|---|
| A | `PROGRAMA` | 47/47 |
| B | `SIGLA` | 47/47 |
| C | `NOTA CAPES` | 43/47 |
| D | `COORDENADOR(A)` | 47/47 |
| E | `COORD TEL` | 29/47 |
| F | `VICE-COORDENADOR(A)` | 30/47 |
| G | `VICE TEL` | **10/47** |
| H | `E-MAIL` | 47/47 |
| I | `SECRETÁRIO(A)` | 38/47 |
| J | `EMAIL` (do secretário) | 39/47 |
| K | `TELEFONE` (do secretário) | 33/47 |
| L | `observações` | 1/47 |

**113 pessoas distintas** (coordenadores + vices + secretários), duas delas atuando em dois
programas (Maria Carolina Accioly de Albuquerque e Almir de Santana Alves).

### 1.2 A coluna `E-MAIL` mistura três entidades diferentes

95 endereços em 47 células (até **4 numa só**). Classificando-os:

| Natureza | Quantidade | Exemplo | A quem pertence |
|---|---|---|---|
| E-mail institucional de pessoa | 71 | `renataoliveira@ufrpe.br` | **pessoa** |
| E-mail funcional do programa | 69 | `coordenacao.ppad@ufrpe.br`, `sec.pmpsu@ufrpe.br` | **programa** (permanece quando o coordenador muda) |
| E-mail pessoal externo | **17** | `jacioli@hotmail.com`, `pjduarteneto@gmail.com` | **pessoa**, fora do domínio institucional |

Ou seja: uma célula guarda o e-mail do coordenador, o do vice **e** o da coordenação, sem
separador consistente — ora `;`, ora espaços, ora quebra de linha.

> Essa é a descoberta que dispensa desenho novo: os três destinos **já existem no schema**.
> Ver §4.1.

### 1.3 Telefones: 30 células de 72 têm problema

| Problema | Exemplo |
|---|---|
| Dois ou três números na mesma célula | `'3320.6460 / 99611.6668'`, `' (81) 33206460; 991769078'` |
| Tipo do número dentro do texto | `'(81) 33206079 (fixo/whatsapp); 98827-0595'` |
| Espaços em excesso | `'81 982996505                             '` |
| Separadores variados | `3320.6460` · `99199.3005` · `87 98824-5964` · `(87) 3764-5556 / 5521` |
| DDD ausente | `'3320.6460'` |

Normalizando: 39 números de 11 dígitos (celular com DDD), 22 de 10 (fixo com DDD), 7 de 9 e
6 de 8 (**sem DDD**). Uma célula concatena três números.

E a informação mais útil está perdida no texto: qual é celular, qual é fixo, **qual é
WhatsApp**.

### 1.4 Nomes com sujeira e status de mandato

**13 células** com problema:

- **Quebra de linha dentro do nome**: `'DIEGO DE SOUZA \nBUARQUE'`,
  `'Marco Aurélio Benevides de Pinho\n'`, `'Hárrison Fábio de Oliveira \nDutra (FUNDAJ)'`.
- **Oito coordenadores "pro tempore"**, em cinco grafias diferentes: `(Pro tempore)`,
  `(pro tempore)`, `(PRO TEMPORE)`. É **status do mandato** escrito dentro do nome da pessoa.
- Um **caractere invisível** (espaço de largura zero, `U+200B`) no início do nome do programa
  PPGECI — o tipo de coisa que faz uma busca falhar sem explicação.

### 1.5 `NOTA CAPES`: seis valores para uma escala

`4` (14 programas) · `5` (10) · `3` (9) · `6` (5) · **`A`** (5) · vazio (4).

Os cinco `A` não são nota da escala CAPES 1-7. Precisa de esclarecimento (§8.3).

### 1.6 A planilha está mais atualizada que o sistema

Cruzando as 47 linhas com os 42 programas de `server/data/programas.json`:

| Resultado | Quantidade |
|---|---|
| Casam por nome ou sigla | 41 |
| **Na planilha e ausentes do sistema** | **6** |
| **Siglas reais que o sistema ganharia** (hoje gravadas como `S/SIGLA`) | **31** |
| No sistema e ausentes da planilha | 1 (PROEF — Educação Física em Rede Nacional) |

Os seis ausentes do sistema são, em boa parte, programas de **outra instituição** ou novos:

| Sigla | Programa |
|---|---|
| PGCAP | Ciência Animal e Pastagens |
| PPGPA | Produção Agrícola |
| PPCIAM | Ciências Ambientais **(UFAPE)** |
| PROFLETRAS | Letras **(UFAPE)** |
| PPGSRAP | Sanidade e Reprodução de Animais de Produção **(UFAPE)** |
| PGMP | Agronomia - Melhoramento Genético das Plantas *(variação de nome do que o sistema chama "Melhoramento Genético de Plantas")* |

A planilha também traz **campus e instituição entre parênteses** no nome — `(UAST)`,
`(UACSA)`, `(UFAPE)`, `(FUNDAJ/UFRPE)` — informação que o sistema tem só parcialmente
(`programas.campus`).

> **A UFAPE se desmembrou da UFRPE.** Se esses programas continuam sob a Câmara da PRPG, é
> decisão de cadastro que precisa ser tomada explicitamente (§8.5), não por importação
> silenciosa.

### 1.7 Esta é a segunda cópia dos mesmos dados pessoais

O `requisitos-camara.md` §1.6 já havia registrado, na planilha da Câmara, uma aba `Relatores`
com **44 coordenadores e seus telefones celulares pessoais**, e a classificou como duplicação
paralela do cadastro do sistema.

**É a mesma informação, num segundo arquivo.** Somando: ~113 pessoas com celular pessoal e 17
com e-mail pessoal externo, em dois arquivos `.xlsx` que circulam sem controle de acesso.

---

## 2. Problemas identificados

| # | Problema | Consequência |
|---|---|---|
| C1 | Coluna `E-MAIL` mistura e-mail de pessoa, de programa e de função | não se sabe para quem escrever; não se separa o que é pessoal do que é institucional |
| C2 | Telefones com 2-3 números na mesma célula, sem tipo | não dá para ligar, nem mandar WhatsApp, a partir do dado |
| C3 | 13 números sem DDD | inutilizáveis fora do 81 |
| C4 | "Pro tempore" escrito dentro do nome, em 5 grafias | não se filtra "quem está em mandato provisório" |
| C5 | Nenhum registro de início/fim de mandato nem da portaria | não se sabe desde quando nem por que ato aquela pessoa é coordenadora |
| C6 | Quebras de linha e caractere invisível nos nomes | busca falha sem explicação |
| C7 | Sistema com 42 programas e 32 sem sigla; planilha com 47 e todas as siglas | o site publica dado desatualizado enquanto a informação correta está numa planilha |
| C8 | Nota CAPES com valor `A` fora da escala | indicador não agregável |
| C9 | ~113 celulares pessoais + 17 e-mails pessoais em arquivo compartilhado | exposição LGPD — **e é a segunda cópia** (a outra está na planilha da Câmara) |
| C10 | Atualização depende de alguém avisar e alguém editar | quando um coordenador troca, a planilha, o site e o sistema divergem |
| C11 | Não há como buscar "todos os coordenadores" para um comunicado | a operação mais frequente exige copiar 47 células à mão |

**Esforço manual recuperável: 1 a 2 h/mês** — o menor dos quatro módulos. Mas o **impacto
indireto é o maior**: este é o cadastro que alimenta os microsites dos programas, a Câmara
(relatores), os expedientes (destinatários) e o PNPD (supervisores). Um cadastro errado aqui
se propaga para tudo.

---

## 3. A mudança conceitual central

> Hoje **a linha é o programa**, e as pessoas são colunas dentro dele.
>
> No sistema, **a pessoa é uma entidade, o programa é outra, e o cargo é o vínculo entre as
> duas** — com período, caráter (efetivo/pro tempore) e a portaria que o designou. A "agenda"
> é uma **leitura** desse modelo, não uma tabela.

O sistema já tem as três entidades (`programas`, `pessoas`, `vinculos`) e já usa os papéis
`COORDENADOR_ATUAL`, `SUBSTITUTO`, `TAE` e `COORDENADOR_ANTERIOR` em
`programasController.js`. **Esta planilha não pede modelo novo: pede que o modelo existente
seja preenchido e ganhe uma tela de consulta por cargo.**

---

## 4. O que a planilha revela sobre a arquitetura

### 4.1 A coluna `E-MAIL` se decompõe em três campos que já existem

| Endereço | Destino no schema | Já existe? |
|---|---|---|
| `renataoliveira@ufrpe.br` (do coordenador) | `pessoas` | sim (proposto em G1) |
| `coordenacao.ppad@ufrpe.br` (do programa) | `programas.email_programa` | **sim, hoje** (`schema.sql:138`) |
| `sec.coordenacao.ppad@ufrpe.br` (da função) | `vinculos.email_funcao` | **sim, hoje** (`schema.sql:209`) |

Os três campos existem e estão vazios, enquanto a informação vive concatenada numa célula.
**Nada a criar; tudo a preencher.**

O mesmo vale para `programas.telefone_secretaria` (`schema.sql:137`) e `programas.whatsapp`
(`schema.sql:390`), ambos já no schema.

### 4.2 Quinta confirmação de G1 (identidade única de pessoa)

113 pessoas que são, ao mesmo tempo: docentes de programa (`vinculos`), potenciais relatores
da Câmara (`camara_relatorias.relator_nome`), supervisores de pós-doc
(`pos_doutorados.supervisor_nome`), solicitantes de expedientes
(`atos.solicitante_pessoa_id`) e usuários do painel (`users`).

Sem a identidade única, o mesmo coordenador existe cinco vezes, em cinco grafias, e trocar seu
telefone exige atualizar cinco lugares. **É o argumento mais concreto de todos os quatro
levantamentos a favor de G1.**

### 4.3 O que falta no núcleo: uma tabela `contatos`

Este é o único desenho novo que a planilha exige, e ele resolve um problema mais amplo que o
dela. Hoje a informação de contato está espalhada por **sete campos** de três tabelas, com
formatos diferentes:

| Onde | Campo | Formato |
|---|---|---|
| `users` | `email` | TEXT (login) |
| `pessoas`* | `email`, `telefones` | TEXT, TEXT[] |
| `pessoas` (atual) | `email_institucional`, `telefones` | TEXT, **TEXT** (string, não array!) |
| `users` | `priv_mostrar_email`, `priv_mostrar_telefone` | BOOLEAN × 2 |
| `programas` | `email_programa`, `telefone_secretaria`, `whatsapp` | TEXT × 3 |
| `vinculos` | `email_funcao` | TEXT |
| `unidades` | — | não tem contato nenhum |

Nenhum deles suporta o que a planilha real contém: **vários números por pessoa, com tipo**
(`fixo/whatsapp`), e a distinção entre o que é público e o que não é.

Uma tabela `contatos` polimórfica — no mesmo padrão de `eventos`, `anexos` e `declaracoes` —
unifica os sete e serve pessoa, programa e unidade com a mesma estrutura. Ver §5.1.

### 4.4 O vocabulário de papéis está fragmentado

`programasController.js` tem três famílias declaradas (`PAPEIS_DOCENTE`, `PAPEIS_DISCENTE`,
`PAPEIS_COMISSAO`) **e quatro literais soltos** comparados inline, que não pertencem a família
nenhuma: `'COORDENADOR_ATUAL'`, `'COORDENADOR_ANTERIOR'`, `'SUBSTITUTO'`, `'TAE'`.

A planilha mostra que a lista também está **incompleta e imprecisa**:

- não há papel de **secretário(a)** — o sistema usa `'TAE'`, que é o cargo do servidor, não a
  função no programa;
- `'SUBSTITUTO'` funde dois papéis distintos: **vice-coordenador** (a coluna F desta planilha)
  e **substituto eventual** (o que as portarias da planilha de expedientes designam —
  *"Designar Daniel Friguglietti Brandespim, Substituto Eventual…"*).

É exatamente o que **G10 (`vocabularios`)** resolve. Ver §5.3.

### 4.5 O elo com o módulo de Expedientes

A planilha de expedientes tem **60 portarias em 2026**, e boa parte delas designa exatamente
as pessoas desta planilha:

- *"Portaria Coordenadora Programa de Residência Veterinária - RENATA PIMENTEL"*
- *"Designar Gilvania de Oliveira Silva, Coordenadora Eventual Substituta do Curso de Especialização…"*
- *"Tornar sem efeito a Portaria 44/2026 e Designar Juliana Alves de Andrade, Coordenadora do Curso…"*

**As portarias são o fundamento legal dos contatos.** Com os dois módulos no sistema, a agenda
deixa de responder só "qual é o telefone da coordenadora do PGZ" e passa a responder
"**coordenadora desde 26/05/2026, por força da Portaria PRPG nº 51/2026**", com link para o
ato e para o PDF assinado. E o C5 (nenhum registro de mandato) morre sem que ninguém precise
digitar a informação duas vezes.

---

## 5. Alterações no modelo

### 5.1 Tabela nova: `contatos`

```sql
-- Meio de contato de qualquer entidade: pessoa, programa ou unidade.
-- Unifica os 7 campos hoje espalhados (§4.3) e suporta múltiplos valores
-- por entidade, com tipo e visibilidade.
CREATE TABLE contatos (
  id           TEXT PRIMARY KEY,
  entidade     TEXT NOT NULL,   -- 'pessoa'|'programa'|'unidade'
  entidade_id  TEXT NOT NULL,
  tipo         TEXT NOT NULL,   -- EMAIL|TELEFONE|CELULAR|WHATSAPP|RAMAL|SITE|INSTAGRAM|...
  valor        TEXT NOT NULL,   -- normalizado: e-mail minúsculo; telefone só dígitos com DDD
  valor_exibicao TEXT,          -- '(81) 99611-6668' — formatação para leitura
  rotulo       TEXT,            -- 'institucional'|'pessoal'|'coordenação'|'secretaria'
  vinculo_id   TEXT REFERENCES vinculos(id) ON DELETE CASCADE, -- contato ligado à FUNÇÃO
  principal    BOOLEAN DEFAULT FALSE,
  publico      BOOLEAN DEFAULT FALSE,  -- aparece no microsite/site (LGPD)
  observacao   TEXT,
  ordem        INTEGER DEFAULT 0,
  criado_em    TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por   TEXT,
  atualizado_por TEXT
);
CREATE INDEX contatos_entidade_idx ON contatos(entidade, entidade_id);
CREATE INDEX contatos_valor_idx    ON contatos(tipo, valor);
CREATE INDEX contatos_vinculo_idx  ON contatos(vinculo_id);
```

Três decisões embutidas:

1. **`publico BOOLEAN` por contato**, não por pessoa. Hoje `users.priv_mostrar_email` e
   `priv_mostrar_telefone` são dois interruptores para o tudo-ou-nada. Um coordenador quer
   publicar o e-mail institucional e **não** o celular pessoal — o que é exatamente a
   distinção que a planilha não consegue fazer. O padrão é `FALSE`: nada vai a público sem
   marcação explícita.
2. **`vinculo_id` opcional** distingue "telefone da pessoa" de "telefone **da função**". O
   `sec.coordenacao.ppad@ufrpe.br` segue o cargo, não o servidor; quando o vínculo encerra, o
   contato da função encerra junto (`ON DELETE CASCADE`).
3. **`valor` normalizado + `valor_exibicao`**. O `valor` é a chave de busca e de deduplicação
   (só dígitos, com DDD); o `valor_exibicao` é o que a tela mostra. Resolve C2 e C3 sem perder
   legibilidade.

**Campos que saem** ao adotar `contatos`: `pessoas.email_institucional`, `pessoas.telefones`,
`users.priv_mostrar_email`, `users.priv_mostrar_telefone`, `programas.email_programa`,
`programas.telefone_secretaria`, `programas.whatsapp`, `vinculos.email_funcao`.
**`users.email` permanece coluna** — é credencial de login, com `UNIQUE`, usada pela
autenticação; não é contato.

### 5.2 `vinculos` — dois campos

```sql
ALTER TABLE vinculos
  ADD COLUMN carater  TEXT DEFAULT 'EFETIVO',  -- EFETIVO|PRO_TEMPORE|SUBSTITUTO_EVENTUAL|INTERINO
  ADD COLUMN ordem    INTEGER DEFAULT 0;       -- ordenação na exibição da equipe
```

`carater` resolve C4: os 8 "pro tempore" saem de dentro do nome da pessoa e viram um campo
filtrável. `data_inicio`, `data_fim` e `ato_id` (a portaria) já estavam previstos no §5.8 de
`arquitetura-dados.md` e resolvem C5.

### 5.3 Vocabulário de papéis — consolidado

O domínio `vinculo.papel` (G10) passa a ter a lista completa, substituindo as três famílias e
os quatro literais soltos:

| Grupo | Valores |
|---|---|
| Gestão do programa | `COORDENADOR` · `VICE_COORDENADOR` · `SUBSTITUTO_EVENTUAL` · `SECRETARIO` |
| Docentes | `DOCENTE_PERMANENTE` · `DOCENTE_COLABORADOR` · `DOCENTE_VISITANTE` |
| Discentes | `DISCENTE_MESTRADO` · `DISCENTE_DOUTORADO` · `DISCENTE_PROFISSIONAL` · `EGRESSO` |
| Pós-doutorado | `POS_DOUTORANDO` |
| Comissões | `COMISSAO_CPG` · `COMISSAO_BOLSAS` · `COMISSAO_SELECAO` · `COMISSAO_PESQUISA` · `COMISSAO_ORIENTACAO` · `COMISSAO_AUTOAVALIACAO` |

De-para na migração: `COORDENADOR_ATUAL` → `COORDENADOR` (o "atual" vira consequência de
`data_fim IS NULL`, derivado, não digitado); `COORDENADOR_ANTERIOR` → `COORDENADOR` com
`data_fim` preenchida; `SUBSTITUTO` → `VICE_COORDENADOR` **ou** `SUBSTITUTO_EVENTUAL`,
caso a caso, com conferência da secretaria; `TAE` → `SECRETARIO`.

> `COORDENADOR_ATUAL` e `COORDENADOR_ANTERIOR` como papéis distintos é o mesmo defeito da
> coluna `Ativo?` do PNPD e do `vinculos.ativo`: **estado armazenado que envelhece sozinho**.
> Quem é o coordenador atual se deriva das datas.

### 5.4 `programas` — enriquecimento pela importação

Nenhuma coluna nova. A importação preenche o que já existe e está vazio: `sigla` (31
programas), `campus` (extraído dos parênteses: UAST, UACSA, UFAPE, FUNDAJ), `email_programa`
(via `contatos`). A `nota_capes` já tem lugar em `modalidades.nota_capes`.

---

## 6. A agenda — a tela que a planilha realmente é

O requisito declarado é *"ser simples de achar pelo cargo"*. A tela é desenhada em torno
disso, e não em torno do programa.

### 6.1 `/admin/contatos` — Agenda

**Barra superior: chips de cargo com contador**, que é o índice primário:

```
[ Coordenadores 47 ]  [ Vice-coordenadores 30 ]  [ Secretários 38 ]  [ Todos 113 ]
```

Clicar em um chip lista **só aquele cargo**, uma linha por pessoa:

| Coluna | Conteúdo |
|---|---|
| Pessoa | nome + foto; badge `Pro tempore` quando o caráter não é efetivo |
| Programa | sigla (com nome completo no `title`) + campus |
| E-mail | institucional, com ícone de copiar e `mailto:` |
| Telefone | com ícone de ligar (`tel:`) e, quando o tipo é `WHATSAPP`, ícone do WhatsApp (`wa.me`) |
| Desde | data de início do mandato + link para a portaria (`atos`) |
| ⋯ | ver ficha da pessoa · ver programa · editar contatos |

**Filtros**: busca livre (nome, programa, sigla, e-mail, telefone) · campus · nota CAPES ·
chip `Pro tempore` · chip `Sem contato cadastrado` (a lista de pendências do cadastro).

### 6.2 As três ações que a planilha não tem

1. **"Copiar e-mails deste cargo"** — um botão que copia os 47 e-mails dos coordenadores
   separados por `;`, pronto para colar no campo *Cco* do cliente de e-mail. **É a operação
   mais frequente que a planilha suporta hoje na base do copiar-célula-a-célula**, e é o
   ganho que a secretaria sente no primeiro dia.
2. **"Exportar XLSX"** — no formato da planilha atual, para quem quiser continuar tendo o
   arquivo. Cinto de segurança, como nos outros módulos.
3. **"Contatos desatualizados"** — vínculos de coordenação com `data_fim` vencida ou sem
   nenhum contato cadastrado. Resolve C10: a desatualização passa a ser visível em vez de
   descoberta quando o e-mail volta.

### 6.3 Ficha da pessoa (`/admin/pessoas/:id`)

Reúne o que hoje está espalhado: dados pessoais, contatos (com o interruptor `público` por
item), **todos os vínculos** (coordenação, docência, comissões, relatorias na Câmara,
supervisões de pós-doc) e os expedientes que solicitou. É a tela que só passa a ser possível
depois de G1.

### 6.4 Reflexo público, sem exposição

O microsite de cada programa já tem seção de contato. Com `contatos.publico`, ele passa a
mostrar **apenas o que foi marcado como público** — tipicamente o e-mail da coordenação e o
telefone da secretaria, nunca o celular pessoal do coordenador.

O `filterSensitivePessoa` de `programasController.js`, que hoje remove `cpf`, `siape`,
`telefones` e `email_institucional` para não-administradores, deixa de ser necessário: a
regra passa a estar no dado, não numa função de filtro que pode ser esquecida no próximo
endpoint.

---

## 7. Migração

Importador `server/services/importers/contatosImporter.js`. Uma aba, 47 linhas — o menor dos
quatro importadores, mas o que exige mais conferência humana, porque **altera o cadastro de
programas**.

**Regras:**

1. **Limpeza de texto primeiro**: remover `U+200B` (o caractere invisível do PPGECI), colapsar
   quebras de linha e espaços múltiplos em todos os campos.
2. **Programa**: casar por sigla e por nome normalizado (41 dos 47 casam). Os **6 sem
   correspondência** vão para a tela de decisão — criar programa novo, ligar a um existente ou
   ignorar (§8.5). **Nenhum programa é criado automaticamente.**
3. **Sigla**: preencher os 31 programas hoje com `S/SIGLA`. Sobrescrita **só** onde o valor
   atual for vazio ou `S/SIGLA`; divergência real vira item de conferência.
4. **Campus/instituição**: extrair dos parênteses do nome (`(UAST)`, `(UACSA)`, `(UFAPE)`,
   `(FUNDAJ/UFRPE)`) para `programas.campus`, e **remover do nome**.
5. **Nota CAPES** → `modalidades.nota_capes`. Os 5 valores `A` entram como texto, sem
   conversão, e são listados para esclarecimento (§8.3).
6. **Pessoas**: nome limpo, marcador de mandato extraído (`(Pro tempore)` → `carater`).
   Casamento contra `pessoas`/`users` por nome normalizado **e por e-mail institucional** — o
   e-mail é a chave mais confiável. Sem correspondência, cria pessoa **sem login**.
7. **E-mails (a coluna soup)**: dividir por `;`, vírgula, espaço e quebra de linha; classificar
   cada endereço por padrão:
   - começa com `coordenacao.`/`secretaria.`/`sec.` ou casa com a sigla do programa
     → contato do **programa**;
   - domínio `ufrpe.br`/`ufape.edu.br` com padrão `nome.sobrenome` → contato **institucional
     da pessoa**;
   - demais domínios (hotmail, yahoo, gmail) → contato **pessoal da pessoa**, com
     `publico = FALSE` e `rotulo = 'pessoal'`.

   A classificação é **sugerida, não decidida**: os 157 endereços aparecem na tela de
   importação já classificados, para confirmação em lote.
8. **Telefones**: separar por `/`, `;` e espaços largos; extrair o tipo do texto adjacente
   (`(fixo/whatsapp)` → dois contatos, um `TELEFONE` e um `WHATSAPP`); normalizar para dígitos.
   **Números sem DDD (13 casos) não recebem DDD presumido** — entram com aviso, para a
   secretaria completar. Presumir `81` seria inventar dado.
9. **Vínculos**: criar/atualizar `COORDENADOR`, `VICE_COORDENADOR` e `SECRETARIO` por programa,
   com `carater` e `data_inicio` **em branco** — a data virá da portaria quando o módulo de
   Expedientes for importado (§4.5), e não deve ser inventada agora.
10. **Nada é sobrescrito sem mostrar**: toda divergência entre planilha e sistema aparece lado
    a lado, com a escolha padrão sendo *manter o que está no sistema*.
11. Importação idempotente, reversível por 24 h; XLSX original anexado como arquivo imutável.

**Tela de importação em 5 passos**: (1) leitura e limpeza, com o relatório do que foi
higienizado → (2) conciliação de programas (41 automáticos, 6 a decidir, 31 siglas a
preencher) → (3) conciliação de pessoas (113 nomes, casados por e-mail) → (4) classificação
dos 157 e-mails e 72 telefones, em lote → (5) pré-visualização e confirmação.

---

## 8. Decisões pendentes

1. **Contatos públicos**: quais tipos vão ao microsite por padrão? Sugestão: e-mail da
   coordenação e telefone da secretaria, sim; celular e e-mail pessoal, não — nunca, salvo
   marcação individual explícita.
2. **Vice-coordenador × substituto eventual**: a coluna F desta planilha é vice-coordenador
   formal, ou substituto eventual? As portarias da planilha de expedientes usam o segundo
   termo. Os 30 registros precisam ser classificados — provavelmente em lote, se a resposta
   for uniforme.
3. **`NOTA CAPES = 'A'`** (5 programas): significa o quê? Programa novo sem avaliação,
   aguardando quadrienal, ou escala diferente para mestrado profissional?
4. **PROEF** (Educação Física em Rede Nacional) está no sistema e não na planilha. Foi
   descredenciado, ou só ficou de fora do levantamento de contatos?
5. **Programas da UFAPE** (PPCIAM, PROFLETRAS, PPGSRAP): permanecem sob a Câmara de
   Pós-Graduação da UFRPE? Se sim, entram no cadastro com instituição própria; se não, saem
   da agenda. **É decisão institucional, não técnica.**
6. **PGCAP e PPGPA** (Ciência Animal e Pastagens; Produção Agrícola): programas novos a
   cadastrar, ou nomes antigos de programas já existentes?
7. **Quem mantém a agenda atualizada?** A opção que elimina C10 é o próprio programa manter
   seus contatos, pelo perfil `GestorPrograma` que já existe — a PRPG só confere. Vale abrir
   isso na Fase B?
8. **A aba `Relatores` da planilha da Câmara** (44 coordenadores com celular) é a mesma
   informação. Confirmar que ela pode ser descartada após esta importação, evitando manter
   duas fontes.

---

## 9. Impacto no plano de implementação

Este módulo é **pequeno e cedo**: ele preenche o cadastro do qual os outros três dependem.

| Fase | Alteração |
|---|---|
| **A** (núcleo) | acrescenta a tabela `contatos` (A.5-bis), os campos `vinculos.carater`/`ordem`, e a remoção dos 8 campos de contato espalhados (§5.1) |
| **B** (refit) | `programasController` passa a ler contatos de `contatos`; `filterSensitivePessoa` é aposentada em favor de `contatos.publico`; vocabulário `vinculo.papel` consolidado com o de-para do §5.3 |
| **G** (novo, ~1 semana) | **Agenda**: importador, tela de agenda por cargo, ficha da pessoa, contatos no formulário do programa. **Roda logo após B**, antes de Expedientes |
| **E** (Expedientes) | ganha os destinatários e solicitantes já cadastrados como pessoas e unidades; e passa a alimentar `vinculos.ato_id` com as portarias de designação |
| **C** (PNPD) | ganha os supervisores já cadastrados — 70 nomes em texto livre que passam a casar com pessoas reais |

**Ordem consolidada dos quatro módulos: A → B → G → E → C → D.**

| Fase | Conteúdo | Duração |
|---|---|---|
| A | Núcleo (com `contatos`) | ~2 sem |
| B | Refit dos módulos atuais | ~1 sem |
| **G** | **Agenda de contatos + cadastro de programas** | **~1 sem** |
| E | Expedientes | ~2 sem |
| C | PNPD | ~2 sem |
| D | Legado Drupal (adiável) | ~1 sem |

**Total ~8 semanas** para a fundação e os quatro mini-sistemas.

Detalhamento da Fase G:

| # | Ação | Arquivo |
|---|---|---|
| G.1 | Repositório de contatos + normalização (`utils/contato.js`: e-mail, telefone, DDD) | `db/contatosRepo.js`, `server/utils/contato.js` |
| G.2 | Controller: CRUD de contatos, agenda por cargo, "copiar e-mails" | `controllers/contatosController.js` |
| G.3 | Rotas e permissões (`GestorPrograma` edita os do seu programa) | `routes/adminRoutes.js` |
| G.4 | Importador da planilha | `services/importers/contatosImporter.js` |
| G.5 | Tela de agenda | `src/pages/admin/AdminContatos.jsx` |
| G.6 | Ficha da pessoa | `src/pages/admin/AdminPessoa.jsx` |
| G.7 | Bloco de contatos no formulário de programa e de usuário | telas existentes |
| G.8 | Importação em 5 passos | `src/pages/admin/AdminContatosImportar.jsx` |
| G.9 | Microsite: seção de contato lendo `contatos.publico` | `src/components/programa/` |

---

## 10. Testes

`server/__tests__/contatos.test.js`:

- `utils/contato.js`: `'3320.6460 / 99611.6668'` → dois contatos; `'(81) 33206079
  (fixo/whatsapp); 98827-0595'` → `TELEFONE` + `WHATSAPP` + `CELULAR`; número sem DDD entra
  com aviso e **sem DDD presumido**;
- e-mail normalizado para minúsculas; duplicado na mesma entidade é rejeitado;
- `publico = FALSE` é o padrão; endpoint público não devolve contato não-público **nem para
  usuário autenticado sem papel** — teste explícito, pois é o controle de LGPD;
- contato com `vinculo_id` some quando o vínculo é removido (`CASCADE`);
- agenda por cargo: `GET /api/contatos?papel=COORDENADOR` devolve um registro por programa
  com vínculo vigente, e nenhum encerrado;
- `carater = 'PRO_TEMPORE'` filtra corretamente;
- de-para de papéis: `COORDENADOR_ATUAL` migrado vira `COORDENADOR` com `data_fim IS NULL`, e
  `COORDENADOR_ANTERIOR` vira `COORDENADOR` com `data_fim` preenchida — **e a agenda mostra só
  o primeiro**;
- importador: 47 linhas → 47 programas conciliados (41 automáticos), 113 pessoas, 157 e-mails
  classificados nas três categorias, 72 telefones, 8 `PRO_TEMPORE` extraídos do nome,
  0 caracteres invisíveis remanescentes.

---

## Anexo — Verificações feitas neste levantamento

- Leitura da aba `Base`: 47 programas, 12 colunas, preenchimento por coluna.
- Extração e classificação por expressão regular dos 157 e-mails: 71 institucionais de pessoa,
  69 funcionais de programa, 17 pessoais externos (listados nominalmente por sigla).
- Análise dos 72 campos de telefone: distribuição por quantidade de números na célula (1 a 3)
  e por comprimento após normalização — 39 de 11 dígitos, 22 de 10, 13 sem DDD.
- Detecção de 13 nomes com quebra de linha ou marcador de mandato, e de 1 caractere
  `U+200B` (espaço de largura zero) no nome do programa PPGECI.
- Cruzamento com `server/data/programas.json`: 41 de 47 casam; 6 ausentes do sistema;
  31 siglas que o sistema ganharia; 1 programa do sistema ausente da planilha.
- Leitura de `programasController.js`: papéis `COORDENADOR_ATUAL`, `COORDENADOR_ANTERIOR`,
  `SUBSTITUTO` e `TAE` comparados como literais soltos, fora das três famílias declaradas; e
  `filterSensitivePessoa` como controle de privacidade em função, não no dado.
- Conferência dos campos já existentes e vazios: `programas.email_programa`,
  `programas.telefone_secretaria`, `programas.whatsapp`, `vinculos.email_funcao`.
