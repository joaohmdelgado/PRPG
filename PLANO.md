# PLANO — Implementação consolidada

> Índice único de execução para a reconstrução da arquitetura de dados e para os quatro
> mini-sistemas levantados. **Este é o documento de trabalho**; os cinco documentos de
> requisitos continuam sendo a especificação detalhada de cada assunto.
>
> | Documento | Papel |
> |---|---|
> | [`arquitetura-dados.md`](arquitetura-dados.md) | modelo de dados do núcleo — **a referência de schema** |
> | [`requisitos-camara.md`](requisitos-camara.md) | Câmara de Pós-Graduação (Fases 0-1 já implementadas) |
> | [`requisitos-contatos.md`](requisitos-contatos.md) | agenda das coordenações |
> | [`requisitos-expedientes.md`](requisitos-expedientes.md) | ofícios, editais e portarias |
> | [`requisitos-pnpd.md`](requisitos-pnpd.md) | pós-doutorado voluntário |
>
> **Estado**: nenhuma linha de código escrita para as fases abaixo.
> Elaborado em 27/07/2026, com verificação item a item contra o código.

---

## Sumário

1. [Como usar](#1-como-usar)
2. [Estado atual verificado](#2-estado-atual-verificado)
3. [Ordem de execução](#3-ordem-de-execução)
4. [Decisões que bloqueiam](#4-decisões-que-bloqueiam)
5. [Fase A — Núcleo](#fase-a--núcleo)
6. [Fase B — Refit e conclusão dos módulos existentes](#fase-b--refit-e-conclusão-dos-módulos-existentes)
7. [Fase G — Agenda de contatos](#fase-g--agenda-de-contatos)
8. [Fase E — Expedientes](#fase-e--expedientes)
9. [Fase C — PNPD](#fase-c--pnpd)
10. [Fase I — Notificações](#fase-i--notificações)
11. [Fase J — Prazos e cobranças](#fase-j--prazos-e-cobranças)
12. [Fase K — Painéis e indicadores](#fase-k--painéis-e-indicadores)
13. [Fase L — Acabamento documental](#fase-l--acabamento-documental)
14. [Fase D — Legado Drupal](#fase-d--legado-drupal)
15. [Fase M — Diplomas em lote](#fase-m--diplomas-em-lote-condicional)
16. [Riscos do plano](#16-riscos-do-plano)
17. [Registro de execução](#17-registro-de-execução)

---

## 1. Como usar

- As letras (**A**, **B**, **G**, **E**, **C**, **D**, **I**, **J**, **K**, **L**, **M**) são
  **identificadores estáveis**, citados pelos outros documentos — não são ordem alfabética.
  A ordem de execução é a do §3.
- Cada item tem `[ ]` para marcar conclusão, o arquivo afetado e, quando aplicável, a decisão
  pendente que o bloqueia (`⛔ D-xx`).
- **Nenhuma fase começa antes de a anterior passar no seu critério de pronto.**
- Ao concluir uma fase, marcar no §17 e fazer commit — o histórico do repositório é o registro.

---

## 2. Estado atual verificado

Conferido contra o código em 27/07/2026, não presumido.

### 2.1 Implementado e funcionando

| Módulo | Situação |
|---|---|
| Site público e painel (notícias, editais, resoluções, formulários, programas, calendários, teses, FAQ, disciplinas, bolsas, páginas, portarias, grupos, taxonomias, usuários) | completo |
| Microsites por programa (Fases 1-6) | completo |
| Proficiência em línguas (inscrição, nota, declaração com QR) | completo |
| Câmara de Pós-Graduação — **Fases 0 e 1** | completo, **exceto os 3 itens do §2.2** |
| Suíte de testes | **103 casos** em 9 arquivos |

### 2.2 Planejado e **não** implementado (dívida aberta)

| Item | Previsto em | Situação verificada |
|---|---|---|
| `server/services/importers/camaraImporter.js` | `requisitos-camara.md` Fase 0.7 | **arquivo não existe** |
| `src/pages/admin/AdminCamaraImportar.jsx` | `requisitos-camara.md` Fase 1.10 | **arquivo não existe** |
| `server/__tests__/camara.test.js` | `requisitos-camara.md` §14 | **arquivo não existe** |

> **Consequência**: o módulo da Câmara está em produção **vazio**. As 102 linhas / 80 processos
> da planilha `Processos - Câmara de Pós Graduação.xlsx` nunca foram migrados. Isso entra na
> Fase B (B.8-B.10).

### 2.3 Divergências de documentação a corrigir

| Item | Onde | Correção |
|---|---|---|
| `CLAUDE.md` diz "~41 testes" | `CLAUDE.md` §Testing | são **103** — atualizar |
| `CLAUDE.md` descreve controllers lendo JSON de `server/data/` | `CLAUDE.md` §Controller Pattern | os controllers usam repositórios sobre PostgreSQL desde a migração; o exemplo está obsoleto |
| `CLAUDE.md` não menciona Câmara, `camara_*` nem os 4 planos | `CLAUDE.md` | acrescentar após a Fase A |

---

## 3. Ordem de execução

```
  ┌─────────────────────────────────────────────────────────┐
  │ 1. FASE A — Núcleo                            ~2 sem    │  ← nada novo para o usuário
  └────────────────────────┬────────────────────────────────┘
  ┌────────────────────────▼────────────────────────────────┐
  │ 2. FASE B — Refit + conclusão da Câmara       ~1,5 sem  │
  └────────────────────────┬────────────────────────────────┘
  ┌────────────────────────▼────────────────────────────────┐
  │ 3. FASE G — Agenda de contatos                ~1 sem    │  ← preenche o cadastro
  └────────────────────────┬────────────────────────────────┘
  ┌────────────────────────▼────────────────────────────────┐
  │ 4. FASE E — Expedientes                       ~2 sem    │  ← maior volume diário
  └────────────────────────┬────────────────────────────────┘
  ┌────────────────────────▼────────────────────────────────┐
  │ 5. FASE C — PNPD                              ~2 sem    │
  └────────────────────────┬────────────────────────────────┘
  ┌────────────────────────▼────────────────────────────────┐
  │ 6. FASE I — Notificações (SMTP)               ~0,5 sem  │  ⛔ depende de D-C5
  └────────────────────────┬────────────────────────────────┘
  ┌────────────────────────▼────────────────────────────────┐
  │ 7. FASE J — Prazos e cobranças                ~1,5 sem  │
  └────────────────────────┬────────────────────────────────┘
  ┌────────────────────────▼────────────────────────────────┐
  │ 8. FASE K — Painéis e indicadores             ~1,5 sem  │
  └────────────────────────┬────────────────────────────────┘
  ┌────────────────────────▼────────────────────────────────┐
  │ 9. FASE L — Acabamento documental             ~1,5 sem  │
  └─────────────────────────────────────────────────────────┘
     FASE D — Legado Drupal        ~1 sem   (dívida, a qualquer momento após B)
     FASE M — Diplomas em lote     a definir (condicional a D-E4)
```

**Total do caminho principal: ~13,5 semanas.** As fases 1 a 5 (~8,5 semanas) entregam a
fundação e os quatro mini-sistemas operacionais; as fases 6 a 9 (~5 semanas) entregam
automação de prazo, indicadores e documentos.

### 3.1 Por que esta ordem

| Decisão | Motivo |
|---|---|
| A antes de tudo | cada módulo construído sobre o schema antigo teria de ser reescrito depois |
| B logo após A | não deixar dois modelos convivendo; e a Câmara está em produção vazia desde julho |
| G antes de E e C | dá 31 siglas ao cadastro de programas, 113 pessoas reais aos supervisores do PNPD e aos relatores da Câmara, e as unidades destinatárias dos expedientes |
| E antes de C | 275 documentos/ano contra 15; risco de número duplicado em livro oficial; e as portarias alimentam `vinculos.ato_id`, que o PNPD usa |
| I antes de J | sem SMTP, nenhuma cobrança automática sai do papel |
| J, K, L por último | são melhorias sobre módulos já operantes; nenhuma bloqueia o uso diário |

### 3.2 Dependência circular tratada

`G` importa vínculos de coordenação **sem data de início**; `E` importa as portarias que
designam essas pessoas e **preenche as datas retroativamente** (`vinculos.ato_id`). A data
nunca é inventada. Ver `requisitos-contatos.md` §7.9.

---

## 4. Decisões que bloqueiam

38 questões em aberto, agrupadas pela fase que travam. **As sete do primeiro bloco precisam de
resposta antes da primeira linha de código.**

### 4.1 Bloqueiam a Fase A — responder antes de começar

| ID | Questão | Item | Recomendação |
|---|---|---|---|
| **D-A1** | `users.id` ou `pessoas.id` como identidade no JWT? | A.2 | manter `users.id` (não invalida sessões); resolver `pessoa_id` no middleware |
| **D-A2** | `perfil_aluno`/`perfil_professor` JSONB migram inteiros para `vinculos.dados`? | A.2, A.10 | sim — mas **inspecionar o conteúdo real antes** (tarefa A.2a) |
| **D-A3** | Algum item de `formularios.json` é ato normativo disfarçado? | A.8 | conferir o arquivo antes de separar `atos` de `documentos` |
| **D-A4** | `/resolucoes` do site passa a ler de `atos WHERE publicado` — a URL e o JSON mudam? | A.8, B.4 | manter ambos; o controller adapta |
| **D-B1** | **Legenda das cores da planilha da Câmara** — o que significam amarelo e azul? | **B.8** | só a servidora sabe; **sem isso o importador da Câmara não roda** |
| **D-E1** | As 6 séries de numeração são todas? Há memorando/circular/instrução normativa? | E.4 | — |
| **D-G5** | Programas da **UFAPE** (PPCIAM, PROFLETRAS, PPGSRAP) permanecem sob a Câmara da PRPG? | G.4 | decisão institucional, não técnica |

### 4.2 Bloqueiam a Fase G

| ID | Questão | Item |
|---|---|---|
| D-G1 | Quais tipos de contato vão ao microsite por padrão? | G.9 |
| D-G2 | A coluna `VICE-COORDENADOR` é vice formal ou substituto eventual? (30 registros) | G.4 |
| D-G3 | `NOTA CAPES = 'A'` em 5 programas significa o quê? | G.4 |
| D-G4 | PROEF está no sistema e não na planilha — descredenciado? | G.4 |
| D-G6 | PGCAP e PPGPA: programas novos ou nomes antigos de existentes? | G.4 |
| D-G7 | O próprio programa mantém seus contatos (via `GestorPrograma`)? | G.3 |
| D-G8 | A aba `Relatores` da planilha da Câmara pode ser descartada após esta importação? | G.4, B.8 |

### 4.3 Bloqueiam a Fase E

| ID | Questão | Item |
|---|---|---|
| D-E2 | Portarias de 2025: 16 contra 60 em 2026 — sub-registro ou outra fonte? | E.5 |
| D-E3 | Os 306 números reservados em branco: importar como `CANCELADO`? | E.5 |
| D-E5 | Os 46 editais numerados devem todos virar registros publicados no site? | E.5, E.12 |
| D-E6 | Quem reserva número: qualquer servidor com login ou só a secretaria? | E.3 |
| D-E7 | A PRPG numera resoluções próprias ou só encaminha minutas ao CEPE? | E.4 |
| D-E8 | Há data de publicação no Boletim/DOU a controlar? | E.1 |

### 4.4 Bloqueiam a Fase C

| ID | Questão | Item |
|---|---|---|
| D-C1 | Existe resolução do CEPE regulamentando o estágio pós-doutoral? Prazo máximo? Renovações? | C.3 |
| D-C2 | Rito de aprovação: colegiado → Câmara → portaria? Toda solicitação vai à Câmara? | C.3 |
| D-C3 | **`ECOLOGIA`** (5 registros) aponta para PPG inexistente na base — qual é? | C.5 |
| D-C4 | Existe planilha paralela de bolsistas PNPD a unificar? | C.1 |
| D-C6 | Há exigência formal de relatório final? Com que prazo? | C.3 |
| D-C7 | A PRPG emite certificado de conclusão? Quem assina? | C.7 |
| D-C8 | Os 3 registros sem período e os 4 com fim em aberto: ativos, incompletos ou descartáveis? | C.5 |
| D-C9 | Períodos sobrepostos (Fracetto, Jéssica Rafaella): erro ou prorrogação? | C.5 |

### 4.5 Bloqueiam as Fases I, J, K, L

| ID | Questão | Fase |
|---|---|---|
| **D-C5** | **Há SMTP institucional disponível?** | **I** — sem ele, as Fases I e J não existem |
| D-J1 | Prazo regimental do relator: existe? Quantos dias? Conta da designação ou da reunião? | J |
| D-J2 | Conselheiros da Câmara são sempre os coordenadores, ou há eleitos distintos? | J |
| D-J3 | Conselheiros terão login, ou acesso por link tokenizado? | J, L |
| D-K1 | Pós-doutorandos podem aparecer no microsite? Que campos? | K |
| D-L1 | As resoluções resultantes de processos são publicadas automaticamente em `/resolucoes`? | L |

### 4.6 Não bloqueiam — registrar como dívida

| ID | Questão |
|---|---|
| D-Z1 | Retenção/temporalidade (CONARQ) do acervo da Câmara |
| D-Z2 | Retenção/temporalidade do acervo do PNPD |
| D-Z3 | Fase D entra no escopo ou fica como dívida? *(recomendação: dívida)* |
| D-E4 | Expedição de diplomas: um ofício por concluinte ou em lote? *(define a Fase M)* |

---

## Fase A — Núcleo

**~2 semanas · nenhuma funcionalidade nova · bloqueia todas as demais**

Referência: [`arquitetura-dados.md`](arquitetura-dados.md) §5 e §7.

| | # | Ação | Arquivo | Bloqueio |
|---|---|---|---|---|
| `[x]` | A.0 | Backup dos dados não reproduzíveis pelo seed (§6.1 da arquitetura) | `backup-dados-vivos.sql` | |
| `[x]` | A.1 | Reescrever `schema.sql` como *baseline* consolidado; arquivar migrações históricas | `server/db/schema.sql`, `server/db/migrations/arquivo/` | |
| `[x]` | A.2a | **Inspecionar** o conteúdo real de `perfil_aluno`/`perfil_professor` e decidir o destino de cada chave | — | ⛔ D-A2 |
| `[x]` | A.2 | **G1**: `pessoas` como identidade; `users` vira credencial com `pessoa_id UNIQUE` | `schema.sql`, `repositories.js` | ⛔ D-A1, D-A2 |
| `[x]` | A.3 | **G7**: datas simples viram `DATE`; `fromRow` formata `'YYYY-MM-DD'` na saída | `repositories.js`, `utils/datas.js` | |
| `[x]` | A.4 | **G8**: `camara_unidades` → `unidades` (+ `tipo`, `unidade_pai_id`) | `schema.sql` | |
| `[x]` | A.5 | **G5**: `arquivos` + `anexos`; `/api/upload` registra o arquivo e devolve `{id, url}` | `adminRoutes.js`, `db/anexosRepo.js` | |
| `[ ]` | A.5b | `contatos` (§5.9) + `utils/contato.js`; remove os 8 campos de contato espalhados | `schema.sql`, `db/contatosRepo.js` | |
| `[ ]` | A.6 | **G2**: `eventos` polimórfica + `eventosRepo` + *trigger* de limpeza + lista `ENTIDADES` | `db/eventosRepo.js`, `db/core.js` | |
| `[ ]` | A.7 | **G3**: `camara_processos` → `processos` (+ `interessado_pessoa_id`) | `schema.sql` | |
| `[ ]` | A.8 | **G4**: `atos` + `ato_series` + `ato_referencias` + `proximo_sequencial()`; `documentos` (de `formularios`) | `schema.sql`, `db/atosRepo.js` | ⛔ D-A3, D-A4, D-E1 |
| `[ ]` | A.9 | **G6**: `declaracoes` + serviço de emissão + rota pública única de verificação | `services/declaracoes.js` | |
| `[ ]` | A.10 | **G9**: `vinculos` com FK real, `data_inicio`/`data_fim`, `carater`, `ordem`, situação derivada | `schema.sql`, `utils/vigencia.js` | ⛔ D-A2 |
| `[ ]` | A.11 | FKs faltantes: os 8 `programa_id`, `vinculos.ato_id`, `eventos.*` | `schema.sql` | |
| `[ ]` | A.12 | Remover `proficiencia_periodos` (tabela morta) | `schema.sql`, `repositories.js:421` | |
| `[ ]` | A.13 | Atualizar `migrate.mjs` e `__tests__/helpers.js` com a **lista completa** de tabelas (hoje faltam as `camara_*`) | ambos | |
| `[ ]` | A.14 | Utilitários: `cpf.js`, `vigencia.js`, `datas.js`, `nup.js` (movido de `camaraController`), `contato.js` | `server/utils/` | |
| `[ ]` | A.15 | Atualizar `CLAUDE.md` (§2.3 deste plano) | `CLAUDE.md` | |

**Critério de pronto**: `npm test` passa inteiro (103 casos), `npm run db:migrate` reconstrói do
zero, e o painel opera Câmara, Proficiência e Programas **exatamente como antes**. Toda asserção
de teste alterada precisa de justificativa escrita no commit.

---

## Fase B — Refit e conclusão dos módulos existentes

**~1,5 semana**

| | # | Ação | Arquivo | Bloqueio |
|---|---|---|---|---|
| `[ ]` | B.1 | Câmara: `camaraEventosRepo` → `eventosRepo`; `camara_atos` → `atos`; `*_url` → `anexos` | `camaraController.js`, `camaraRepo.js` | |
| `[ ]` | B.2 | Proficiência: emissão via `declaracoes`; **redirect da URL antiga** de verificação | `proficienciaController.js` | |
| `[ ]` | B.3 | Programas: `buildCombined` deletado; listagem de pessoas vira `JOIN` | `programasController.js` | |
| `[ ]` | B.4 | Portarias/Resoluções/Formulários: telas apontam para `atos` e `documentos` | várias | ⛔ D-A4 |
| `[ ]` | B.5 | **G10**: `vocabularios` + endpoint + seed; vocabulário de `vinculo.papel` consolidado com o de-para de `COORDENADOR_ATUAL`/`ANTERIOR`/`SUBSTITUTO`/`TAE` | `db/`, `controllers/` | |
| `[ ]` | B.6 | `filterSensitivePessoa` aposentada em favor de `contatos.publico` | `programasController.js` | |
| `[ ]` | B.7 | `camara.test.js` — cobertura do §14 de `requisitos-camara.md` | `server/__tests__/camara.test.js` | |
| `[ ]` | B.8 | **Importador da Câmara** (dívida do §2.2): 102 linhas → 80 processos, 8 reuniões, histórico reconstruído | `services/importers/camaraImporter.js` | ⛔ **D-B1**, D-G8 |
| `[ ]` | B.9 | Tela de importação da Câmara em 4 passos | `src/pages/admin/AdminCamaraImportar.jsx` | ⛔ D-B1 |
| `[ ]` | B.10 | Rodar a importação e validar 10 processos com a secretaria | — | |

**Critério de pronto**: nenhuma referência a `camara_processos`, `camara_eventos`, `portarias`
ou `camara_atos` no código; suíte verde; **e a Câmara deixa de estar vazia** — os 80 processos
importados e validados.

---

## Fase G — Agenda de contatos

**~1 semana** · Referência: [`requisitos-contatos.md`](requisitos-contatos.md) §9

| | # | Ação | Arquivo | Bloqueio |
|---|---|---|---|---|
| `[ ]` | G.1 | Repositório de contatos + normalização de e-mail e telefone (DDD) | `db/contatosRepo.js`, `utils/contato.js` | |
| `[ ]` | G.2 | Controller: CRUD, agenda por cargo, "copiar e-mails do cargo", exportar XLSX | `controllers/contatosController.js` | |
| `[ ]` | G.3 | Rotas e permissões (`GestorPrograma` edita os do seu programa) | `routes/adminRoutes.js` | ⛔ D-G7 |
| `[ ]` | G.4 | Importador da planilha (47 programas, 113 pessoas, 157 e-mails, 72 telefones) | `services/importers/contatosImporter.js` | ⛔ D-G2..D-G6, D-G8 |
| `[ ]` | G.5 | Tela de agenda, indexada por cargo | `src/pages/admin/AdminContatos.jsx` | |
| `[ ]` | G.6 | Ficha da pessoa (dados, contatos, todos os vínculos, expedientes) | `src/pages/admin/AdminPessoa.jsx` | |
| `[ ]` | G.7 | Bloco de contatos no formulário de programa e de usuário | telas existentes | |
| `[ ]` | G.8 | Importação em 5 passos | `src/pages/admin/AdminContatosImportar.jsx` | |
| `[ ]` | G.9 | Microsite: seção de contato lendo `contatos.publico` | `src/components/programa/` | ⛔ D-G1 |

**Critério de pronto**: os 31 programas sem sigla passam a ter sigla; a agenda responde "todos
os coordenadores" em um clique, com o botão de copiar e-mails funcionando; nenhum celular
pessoal aparece em endpoint público (teste explícito).

---

## Fase E — Expedientes

**~2 semanas** · Referência: [`requisitos-expedientes.md`](requisitos-expedientes.md) §12

| | # | Ação | Arquivo | Bloqueio |
|---|---|---|---|---|
| `[ ]` | E.1 | Controller: CRUD, filtros, `reservar`, situação, referências | `controllers/atosController.js` | ⛔ D-E8 |
| `[ ]` | E.2 | Repositório + alocação atômica de número (advisory lock) | `db/atosRepo.js` | |
| `[ ]` | E.3 | Rotas e permissões | `routes/adminRoutes.js` | ⛔ D-E6 |
| `[ ]` | E.4 | Seed das séries + de-para de unidades (aliases dos 88 destinatários) | `schema.sql` | ⛔ D-E1, D-E7 |
| `[ ]` | E.5 | Importador das 11 abas (593 atos + 306 reservas) | `services/importers/atosImporter.js` | ⛔ D-E2, D-E3, D-E5 |
| `[ ]` | E.6 | Livro de expedientes: lista + barra de séries com o próximo número | `src/pages/admin/AdminAtos.jsx` | |
| `[ ]` | E.7 | Formulário de emissão | `src/pages/admin/AdminAtoForm.jsx` | |
| `[ ]` | E.8 | Ficha com referências bidirecionais e linha do tempo | `src/pages/admin/AdminAto.jsx` | |
| `[ ]` | E.9 | Administração de séries | `src/pages/admin/AdminAtoSeries.jsx` | |
| `[ ]` | E.10 | Importação em 5 passos, com conciliação de editais | `src/pages/admin/AdminAtosImportar.jsx` | |
| `[ ]` | E.11 | Migração de `portarias` → `atos`; `AdminPortarias` aposentada | várias | |
| `[ ]` | E.12 | `editais.ato_id` no formulário de edital | `AdminEditalForm.jsx` | ⛔ D-E5 |
| `[ ]` | E.13 | Exportação XLSX, menu, constantes | — | |
| `[ ]` | E.14 | **Preencher retroativamente** `vinculos.ato_id` e as datas de mandato a partir das portarias importadas (§3.2) | `atosImporter.js` | |

**Critério de pronto**: 20 reservas simultâneas na mesma série produzem sequenciais 1..20 sem
repetição e sem buraco (teste); a secretaria emite o próximo ofício pelo sistema; os 593
documentos históricos estão no livro.

---

## Fase C — PNPD

**~2 semanas** · Referência: [`requisitos-pnpd.md`](requisitos-pnpd.md) §10 (telas) e
[`arquitetura-dados.md`](arquitetura-dados.md) §5.12 (modelo)

| | # | Ação | Arquivo | Bloqueio |
|---|---|---|---|---|
| `[ ]` | C.1 | Tabela `pos_doutorados` (20 colunas) + repositório | `schema.sql`, `repositories.js` | ⛔ D-C4 |
| `[ ]` | C.2 | Papel `POS_DOUTORANDO` no vocabulário de `vinculo.papel` | seed de `vocabularios` | |
| `[ ]` | C.3 | Controller: CRUD, filtros, situação derivada, prorrogação, relatório, vínculo com processo | `controllers/posDoutoradoController.js` | ⛔ D-C1, D-C2, D-C6 |
| `[ ]` | C.4 | Rotas + permissões | `routes/adminRoutes.js` | |
| `[ ]` | C.5 | Importador (parser de período, de-para, CPF) | `services/importers/posDoutoradoImporter.js` | ⛔ D-C3, D-C8, D-C9 |
| `[ ]` | C.6 | Lista, formulário, ficha com linha do tempo unificada, importação | `src/pages/admin/AdminPosDoutorado*.jsx` | |
| `[ ]` | C.7 | Declaração de vínculo e certificado de conclusão (usa o serviço da A.9) | `services/declaracoes.js` | ⛔ D-C7 |
| `[ ]` | C.8 | Exportação XLSX, menu, constantes | `src/constants/posDoutorado.js` | |

**Critério de pronto**: os 95 registros importados; a pergunta "quantos pós-doutorandos ativos
temos?" respondida por um chip na tela, com o número **conferido pela secretaria** (a
expectativa é 23, não 4).

---

## Fase I — Notificações

**~0,5 semana · ⛔ toda a fase depende de D-C5 (existe SMTP institucional?)**

Capacidade nova que **não existe hoje**: o projeto não envia e-mail. É pré-requisito das
Fases J e L, e está citada como dependência em `requisitos-camara.md` (Fase 2.3) e
`requisitos-pnpd.md` (Fase 3.6).

| | # | Ação | Arquivo |
|---|---|---|---|
| `[ ]` | I.1 | Dependência `nodemailer` + variáveis `SMTP_*` no `.env.example`; falha silenciosa e registrada quando não configurado | `package.json`, `.env.example` |
| `[ ]` | I.2 | Serviço de envio com fila simples e reprocessamento | `server/services/email.js` |
| `[ ]` | I.3 | Tabela `notificacoes` (destinatário, tipo, entidade, enviado_em, erro) — auditável e não reenvia | `schema.sql` |
| `[ ]` | I.4 | Modelos de mensagem em vocabulário editável, não *hardcoded* | `vocabularios` |
| `[ ]` | I.5 | Agendador diário (cron do sistema ou `node-cron`) que avalia prazos e enfileira | `server/services/agendador.js` |
| `[ ]` | I.6 | Tela de acompanhamento de envios | `src/pages/admin/AdminNotificacoes.jsx` |

**Critério de pronto**: um e-mail de teste sai pelo SMTP institucional e fica registrado; com
SMTP ausente, o sistema continua funcionando e apenas registra a intenção.

---

## Fase J — Prazos e cobranças

**~1,5 semana** · Consolida a Fase 2 de `requisitos-camara.md` e a Fase 3 de
`requisitos-pnpd.md` — **são a mesma capacidade aplicada a dois módulos**.

| | # | Ação | Módulo | Bloqueio |
|---|---|---|---|---|
| `[ ]` | J.1 | Motor de prazos genérico: regra (entidade, campo de data, deslocamento, destinatário) | núcleo | |
| `[ ]` | J.2 | Designação de relatoria com prazo calculado a partir da data da reunião | Câmara | ⛔ D-J1 |
| `[ ]` | J.3 | Tela "quem devolveu / quem não devolveu" | Câmara | ⛔ D-J2 |
| `[ ]` | J.4 | E-mail de designação + lembretes D-10 / D-5 / D-1 | Câmara | ⛔ D-C5 |
| `[ ]` | J.5 | Link tokenizado para o relator enviar o parecer sem login | Câmara | ⛔ D-J3 |
| `[ ]` | J.6 | Registro automático da cobrança como evento (substitui *"cobrei devolução em 05/05"*) | Câmara | |
| `[ ]` | J.7 | Alertas de vencimento do estágio: D-90 / D-30 / D+30 (relatório) / D+90 (pendência) | PNPD | ⛔ D-C6 |
| `[ ]` | J.8 | E-mail de aviso ao programa e ao supervisor | PNPD | ⛔ D-C5 |
| `[ ]` | J.9 | Alerta de vencimento de mandato de coordenação e de portaria | Contatos / Expedientes | |
| `[ ]` | J.10 | Reservas de número pendentes há mais de 15 dias | Expedientes | |

**Critério de pronto**: a secretaria da Câmara deixa de telefonar cobrando parecer; nenhum
estágio pós-doutoral vence sem aviso prévio.

---

## Fase K — Painéis e indicadores

**~1,5 semana** · Consolida a Fase 3 de `requisitos-camara.md` e a Fase 4 de
`requisitos-pnpd.md`, mais os indicadores de Expedientes (§11) e Contatos.

Todos os marcos zero já estão **medidos** nos documentos de requisitos — o painel nasce com
linha de base, não com zero.

| | # | Ação | Referência | Bloqueio |
|---|---|---|---|---|
| `[ ]` | K.1 | Componente de painel reutilizável (cartões, aging em semáforo, séries) | — | |
| `[ ]` | K.2 | Painel da Câmara: aging, backlog por setor, carga de relatoria, reincidência, tempo médio | `requisitos-camara.md` §11 | |
| `[ ]` | K.3 | Painel do PNPD: vigentes, relatórios pendentes, vencendo, duração média, concentração por supervisor, qualidade do cadastro | `requisitos-pnpd.md` §12 | |
| `[ ]` | K.4 | Painel de Expedientes: por série/ano, reservas pendentes, atos sem PDF, por destinatário, carga por servidor | `requisitos-expedientes.md` §11 | |
| `[ ]` | K.5 | Seção pública "Pós-doutorandos" no microsite do programa | `requisitos-pnpd.md` Fase 4 | ⛔ D-K1 |
| `[ ]` | K.6 | Extrato para a Coleta Sucupira (pós-docs por programa e período) | `requisitos-pnpd.md` §11 | |
| `[ ]` | K.7 | Autosserviço: `GestorPrograma` cadastra e acompanha os pós-docs do seu programa | `requisitos-pnpd.md` Fase 4 | |
| `[ ]` | K.8 | Integrar os painéis ao `/admin/metricas` já existente | `AdminMetricas.jsx` | |

**Critério de pronto**: nenhum número de gestão da PRPG precisa ser recontado à mão.

---

## Fase L — Acabamento documental

**~1,5 semana** · Consolida a Fase 4 de `requisitos-camara.md` e o restante dos artefatos
previstos nos quatro documentos.

| | # | Ação | Módulo | Bloqueio |
|---|---|---|---|---|
| `[ ]` | L.1 | Minuta de ata gerada a partir dos itens deliberados | Câmara | |
| `[ ]` | L.2 | Espelho do processo com QR (usa `declaracoes` da A.9) | Câmara | |
| `[ ]` | L.3 | Extrato de encaminhamento ao CEPE/SEG | Câmara | |
| `[ ]` | L.4 | Visão "meus processos" para conselheiros | Câmara | ⛔ D-J3 |
| `[ ]` | L.5 | Ofício de designação de relatoria (PDF + corpo de e-mail) | Câmara | |
| `[ ]` | L.6 | Ofício de cobrança de relatório final | PNPD | |
| `[ ]` | L.7 | Relação de pós-doutorandos vigentes por programa (PDF/XLSX) | PNPD | |
| `[ ]` | L.8 | Relatórios anuais (Câmara e PNPD) | ambos | |
| `[ ]` | L.9 | Publicação automática de resoluções resultantes em `/resolucoes` | Câmara | ⛔ D-L1 |
| `[ ]` | L.10 | Busca *full-text* e log de auditoria por campo | núcleo | |

---

## Fase D — Legado Drupal

**~1 semana · dívida registrada · executável a qualquer momento após a Fase B**

⛔ D-Z3: confirmar se entra no escopo. **Recomendação: manter como dívida** e reavaliar depois
que os quatro módulos estiverem em uso.

| | # | Ação |
|---|---|---|
| `[ ]` | D.1 | `teses_dissertacoes`: `field_*` → nomes reais; `autor_pessoa_id`, `orientador_pessoa_id`, `arquivo_id` |
| `[ ]` | D.2 | `disciplinas`: `field_docente` → `docente_pessoa_id`; demais renomeados |
| `[ ]` | D.3 | `bolsas`: `field_aluno` → `pessoa_id`; período → `data_inicio`/`data_fim` |
| `[ ]` | D.4 | `faq.field_resposta` → `resposta`; `grupos_pesquisa.field_lideres` JSONB → `vinculos` |
| `[ ]` | D.5 | Atualizar as 10 telas que consomem `field_*` |
| `[ ]` | D.6 | `editais`: `resultado_parcial`/`resultado_final`/`erratas` → `eventos` |

> **É a única fase que muda o contrato da API consumido pelo frontend.** Por isso fica isolada
> e por último.

---

## Fase M — Diplomas em lote (condicional)

**⛔ D-E4 — decisão administrativa, não técnica.**

106 dos 425 ofícios (25%) são o mesmo ofício de envio de documentação de conclusão. Três
caminhos em `requisitos-expedientes.md` §9.4. A Fase E já implementa o caminho (1) — formulário
dedicado com dois campos. Esta fase só existe se a secretaria optar pelo caminho (2), o ofício
em lote, que **muda o procedimento administrativo**.

---

## 16. Riscos do plano

| Risco | Mitigação |
|---|---|
| **As 7 decisões do §4.1 não chegarem a tempo** | são poucas e específicas; agendar **uma reunião única** com a secretaria cobrindo D-B1, D-G5 e D-E1 — as três que dependem de conhecimento tácito |
| Fase A ser "invisível" e parecer que nada anda | o critério de pronto é objetivo (suíte verde, painel idêntico); e as Fases G e E entregam valor visível em 3 semanas |
| Escopo crescer durante A | A **não inclui nenhuma funcionalidade nova** — qualquer pedido vai para a fase do módulo correspondente |
| Perda de dado vivo na reconstrução | A.0 é a primeira ação, com dump nominal das 7 tabelas não reproduzíveis pelo seed |
| QR codes de proficiência já impressos deixarem de resolver | B.2 mantém a rota antiga redirecionando; os códigos são migrados preservando `codigo_verificacao` e `emitida_em` |
| SMTP nunca ser liberado | as Fases I e J ficam suspensas; **as Fases A, B, G, E, C, K e L não dependem dele** e entregam os quatro módulos operacionais |
| Convivência longa com as planilhas | paralelo por **um** ciclo apenas em cada módulo; exportação XLSX existe desde o primeiro dia como cinto de segurança |
| A Câmara seguir vazia | B.8-B.10 têm data: a dívida do §2.2 é fechada na Fase B, não adiada de novo |

---

## 17. Registro de execução

| Fase | Itens | Decisões a responder antes | Início | Fim | Estado |
|---|---|---|---|---|---|
| A — Núcleo | 18 | D-A1, D-A2, D-A3, D-A4, D-E1 | 27/07/2026 | | 🟨 em andamento (A.0, A.1, A.2a concluídos) |
| B — Refit + Câmara | 10 | D-B1, D-G8, D-A4 | | | ⬜ |
| G — Contatos | 9 | D-G1..D-G8 | | | ⬜ |
| E — Expedientes | 14 | D-E1..D-E3, D-E5..D-E8 | | | ⬜ |
| C — PNPD | 8 | D-C1..D-C4, D-C6..D-C9 | | | ⬜ |
| I — Notificações | 6 | **D-C5** | | | ⬜ |
| J — Prazos e cobranças | 10 | D-C5, D-C6, D-J1, D-J2, D-J3 | | | ⬜ |
| K — Painéis | 8 | D-K1 | | | ⬜ |
| L — Acabamento | 10 | D-J3, D-L1 | | | ⬜ |
| D — Legado Drupal | 6 | D-Z3 | | | ⬜ dívida |
| M — Diplomas em lote | — | D-E4 | | | ⬜ condicional |
| | **99 itens** | **38 decisões** | | | |

---

## Anexo — Verificações feitas para este plano

Conferido no repositório em 27/07/2026, não presumido:

- existência de cada arquivo previsto nas Fases 0 e 1 de `requisitos-camara.md` → 12 existem,
  **3 não** (`camaraImporter.js`, `AdminCamaraImportar.jsx`, `camara.test.js`);
- contagem de casos de teste: **103** em 9 arquivos (`CLAUDE.md` afirma ~41);
- inventário das 59 ações já numeradas nos documentos de requisitos, e das 40 que faltavam;
- extração das 38 decisões pendentes das cinco seções correspondentes, com o item que cada
  uma bloqueia;
- confirmação de que `nodemailer`/SMTP aparece como dependência em dois documentos e **em
  nenhum item de ação**;
- confirmação de que as Fases 2-4 de `requisitos-camara.md` e 3-4 de `requisitos-pnpd.md` não
  tinham correspondência no plano consolidado — agora nas Fases I, J, K e L.
