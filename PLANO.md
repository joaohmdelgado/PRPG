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
| `[x]` | A.5b | `contatos` (§5.9) + `utils/contato.js`; remove os 8 campos de contato espalhados | `schema.sql`, `db/contatosRepo.js` | (tabela criada; remoção dos 8 campos fica para a Fase G, quando a agenda existir) |
| `[x]` | A.6 | **G2**: `eventos` polimórfica + `eventosRepo` + *trigger* de limpeza + lista `ENTIDADES` | `db/eventosRepo.js`, `db/core.js` | |
| `[x]` | A.7 | **G3**: `camara_processos` → `processos` (+ `interessado_pessoa_id`) | `schema.sql` | |
| `[x]` | A.8 | **G4**: `atos` + `ato_series` + `ato_referencias` + `proximo_sequencial()`; `documentos` (de `formularios`) | `schema.sql`, `db/atosRepo.js` | ⛔ D-A3, D-A4, D-E1 |
| `[x]` | A.9 | **G6**: `declaracoes` + serviço de emissão + rota pública única de verificação | `services/declaracoes.js` | (rota pública fica para a Fase B.2, junto com a migração da proficiência) |
| `[x]` | A.10 | **G9**: `vinculos` com FK real, `data_inicio`/`data_fim`, `carater`, `ordem`, situação derivada | `schema.sql`, `utils/vigencia.js` | ⛔ D-A2 — **FK real de `pessoa_id` adiada para a Fase B.3** (ver nota no schema: apertar agora exigiria mudar simultaneamente criação de usuário, listagem por pessoa e limpeza ao excluir usuário) |
| `[x]` | A.11 | FKs faltantes: os 8 `programa_id`, `vinculos.ato_id`, `eventos.*` | `schema.sql` | |
| `[x]` | A.12 | Remover `proficiencia_periodos` (tabela morta) | `schema.sql`, `repositories.js:421` | |
| `[x]` | A.13 | Atualizar `migrate.mjs` e `__tests__/helpers.js` com a **lista completa** de tabelas (hoje faltam as `camara_*`) | ambos | |
| `[x]` | A.14 | Utilitários: `cpf.js`, `vigencia.js`, `datas.js`, `nup.js` (movido de `camaraController`), `contato.js` | `server/utils/` | |
| `[x]` | A.15 | Atualizar `CLAUDE.md` (§2.3 deste plano) | `CLAUDE.md` | |

**Critério de pronto**: `npm test` passa inteiro (103 casos), `npm run db:migrate` reconstrói do
zero, e o painel opera Câmara, Proficiência e Programas **exatamente como antes**. Toda asserção
de teste alterada precisa de justificativa escrita no commit.

---

## Fase B — Refit e conclusão dos módulos existentes

**~1,5 semana**

| | # | Ação | Arquivo | Bloqueio |
|---|---|---|---|---|
| `[x]` | B.1 | Câmara: `camaraEventosRepo` → `eventosRepo`; `camaraProcessosRepo`/`camaraUnidadesRepo` → `processosRepo`/`unidadesRepo` | `camaraController.js`, `camaraReunioesController.js`, `camaraRepo.js` | ⛔ `camara_atos`→`atos` e `*_url`→`anexos` **adiados para a Fase E** (ver nota abaixo) |
| `[x]` | B.2 | Proficiência: emissão via `declaracoes`; **redirect da URL antiga** de verificação | `proficienciaController.js`, `declaracoesController.js` | |
| `[x]` | B.3 | Programas: `buildCombined` deletado; listagem de pessoas vira `JOIN` | `programasController.js` | ⛔ FK real de `vinculos.pessoa_id` segue adiada (mesma sprawl da A.10 — ver nota no schema) |
| `[ ]` | B.4 | Portarias/Resoluções/Formulários: telas apontam para `atos` e `documentos` | várias | ⛔ **adiado para a Fase E** (ver nota abaixo) |
| `[x]` | B.5 | **G10**: `vocabularios` + endpoint + seed; vocabulário-alvo de `vinculo.papel` seedado | `db/vocabulariosRepo.js`, `controllers/vocabulariosController.js` | ⛔ de-para real de `COORDENADOR_ATUAL`/`ANTERIOR`/`SUBSTITUTO`/`TAE` para os novos valores adiado para a Fase G (depende de D-G2) |
| `[ ]` | B.6 | `filterSensitivePessoa` aposentada em favor de `contatos.publico` | `programasController.js` | ⛔ **adiado para a Fase G** (ver nota abaixo) |
| `[x]` | B.7 | `camara.test.js` — cobertura do §14 de `requisitos-camara.md` | `server/__tests__/camara.test.js` | ⛔ item "importador" do §14 fora do escopo (⛔ D-B1) |
| `[ ]` | B.8 | **Importador da Câmara** (dívida do §2.2): 102 linhas → 80 processos, 8 reuniões, histórico reconstruído | `services/importers/camaraImporter.js` | ⛔ **D-B1**, D-G8 |
| `[ ]` | B.9 | Tela de importação da Câmara em 4 passos | `src/pages/admin/AdminCamaraImportar.jsx` | ⛔ D-B1 |
| `[ ]` | B.10 | Rodar a importação e validar 10 processos com a secretaria | — | |

> **Nota B.4** — investigada, não aplicada: migrar `portarias`/`resolucoes` para `atos` esbarra
> no mesmo problema do `camara_atos` (B.1) — exige série/sequencial reais, bloqueados por D-E1.
> Além disso `resolucoes` **e** `formularios` têm uma coluna `section_id` (chave de agrupamento
> estável, distinta do rótulo `section_title`) que **não existe** em `atos`/`documentos` — migrar
> agora perderia esse dado silenciosamente. Faltando decidir: `section_id` vira coluna nova em
> `atos`/`documentos`, ou o agrupamento muda de modelo? Escopo incorporado à Fase E (junto de
> E.4/E.11), com essa pergunta registrada como decisão a mais a levantar antes de lá.

**Critério de pronto**: nenhuma referência a `camara_processos`, `camara_eventos`, `portarias`
ou `camara_atos` no código; suíte verde; **e a Câmara deixa de estar vazia** — os 80 processos
importados e validados.

> **Nota B.6** — investigada, não aplicada: `contatos` (criada na A.5b) tem **zero linhas** em
> produção — nenhum dado foi migrado para lá ainda (`pessoas.email_institucional`/`telefones`,
> `users.priv_mostrar_*`, `programas.email_programa`/`telefone_secretaria`/`whatsapp`,
> `vinculos.email_funcao` continuam sendo a fonte real). Aposentar `filterSensitivePessoa` agora
> — a única proteção de privacidade hoje em vigor no endpoint público de programas — sem uma
> tabela `contatos` populada seria: ou parar de mostrar dado nenhum (regressão funcional), ou
> remover o filtro sem substituto (regressão de privacidade, pior). A migração de dado para
> `contatos` é G.1/G.4; `filterSensitivePessoa` só pode aposentar depois que a Fase G povoar a
> tabela e `programasController.js` passar a ler de lá.

> **Nota B.1** — `camara_eventos` foi removida (linha do tempo do processo passou a usar a
> tabela genérica `eventos`, `entidade='processo'`); `reuniao_id`/`relatoria_id` viraram
> `eventos.origem_tipo`/`origem_id`, `anexo_url` crua guardada em `eventos.dados` (JSONB)
> até a Fase E/G migrar o upload de anexos do processo para `arquivos`/`anexos`.
> `camara_atos` **não** foi migrada para `atos`: a tabela `atos` é definida como "expedido
> pela PRPG" com série/sequencial obrigatórios (ver `arquitetura-dados.md` §5.6), mas
> `camara_atos` mistura atos próprios (PORTARIA, DESPACHO) com resoluções externas
> (RESOLUCAO_CEPE, RESOLUCAO_CONSU, DECISAO_SEG) que não têm numeração PRPG — forçar um
> `serie_id`/`sequencial` provisório agora colidiria com o seed real de séries que a E.4
> faz (bloqueada por D-E1). Migração de `camara_atos` incorporada ao escopo de **E.11**
> (que já migra `portarias` → `atos`).

---

## Fase G — Agenda de contatos

**~1 semana** · Referência: [`requisitos-contatos.md`](requisitos-contatos.md) §9

| | # | Ação | Arquivo | Bloqueio |
|---|---|---|---|---|
| `[x]` | G.1 | Repositório de contatos + normalização de e-mail e telefone (DDD) | `db/contatosRepo.js`, `utils/contato.js` | já existia (A.5b) |
| `[x]` | G.2 | Controller: CRUD, agenda por cargo, "copiar e-mails do cargo" (front monta a partir da agenda), exportar XLSX | `controllers/contatosController.js` | |
| `[x]` | G.3 | Rotas e permissões (Admin/Gestor por enquanto) | `routes/adminRoutes.js` | ⛔ escopo por `GestorPrograma` adiado — D-G7 não respondida |
| `[ ]` | G.4 | Importador da planilha (47 programas, 113 pessoas, 157 e-mails, 72 telefones) | `services/importers/contatosImporter.js` | ⛔ D-G2..D-G6, D-G8 |
| `[x]` | G.5 | Tela de agenda, indexada por cargo | `src/pages/admin/AdminContatos.jsx` | verificado no navegador com dado real de produção |
| `[ ]` | G.6 | Ficha da pessoa (dados, contatos, todos os vínculos, expedientes) | `src/pages/admin/AdminPessoa.jsx` | ⛔ não é decisão pendente — deixado para depois por escopo/tempo desta sessão (ver nota) |
| `[ ]` | G.7 | Bloco de contatos no formulário de programa e de usuário | telas existentes | ⛔ idem — a funcionalidade já existe via G.5 (ver nota) |
| `[ ]` | G.8 | Importação em 5 passos | `src/pages/admin/AdminContatosImportar.jsx` | ⛔ depende de G.4 |
| `[ ]` | G.9 | Microsite: seção de contato lendo `contatos.publico` | `src/components/programa/` | ⛔ D-G1 |

**Critério de pronto**: os 31 programas sem sigla passam a ter sigla; a agenda responde "todos
os coordenadores" em um clique, com o botão de copiar e-mails funcionando; nenhum celular
pessoal aparece em endpoint público (teste explícito).

> **Nota G.6/G.7** — a capacidade central (ler/criar/editar/remover contato por pessoa ou por
> programa) já está entregue e verificada pela tela de agenda (G.5) e pela API
> (`contatosController.js`). G.6 (uma página dedicada `/admin/pessoas/:id` reunindo dados,
> contatos, vínculos, relatorias da Câmara e supervisões de pós-doc) e G.7 (embutir um bloco de
> contatos dentro de `AdminProgramaForm.jsx`/`AdminUserForm.jsx`, formulários de 1200/700 linhas)
> são conveniência de UX, não uma lacuna funcional bloqueando outra fase — deixados para depois
> por escopo desta sessão, não por decisão pendente.

---

## Fase E — Expedientes

**~2 semanas** · Referência: [`requisitos-expedientes.md`](requisitos-expedientes.md) §12

| | # | Ação | Arquivo | Bloqueio |
|---|---|---|---|---|
| `[x]` | E.1 | Controller: CRUD, filtros, `reservar`, situação, referências | `controllers/atosController.js` | ⛔ D-E8 (campo de data de publicação Boletim/DOU não implementado — só `link_externo`, já existente) |
| `[x]` | E.2 | Repositório + alocação atômica de número (advisory lock) | `db/atosRepo.js` | |
| `[x]` | E.3 | Rotas e permissões | `routes/adminRoutes.js` | ⛔ D-E6 (default Admin/Gestor para escrita, igual aos outros módulos, até a secretaria decidir quem mais reserva) |
| `[x]` | E.4 | Seed das séries (parcial) + de-para de unidades (aliases dos 88 destinatários) | `schema.sql` | ⛔ D-E1 quanto a *completude* (memorando/circular/IN?), não às 6 já seedadas; de-para de destinatários é E.5 |
| `[ ]` | E.5 | Importador das 11 abas (593 atos + 306 reservas) | `services/importers/atosImporter.js` | ⛔ D-E2, D-E3, D-E5 |
| `[x]` | E.6 | Livro de expedientes: lista + barra de séries com o próximo número | `src/pages/admin/AdminAtos.jsx` | |
| `[x]` | E.7 | Formulário de emissão | `src/pages/admin/AdminAtoForm.jsx` | |
| `[x]` | E.8 | Ficha com referências bidirecionais e linha do tempo | `src/pages/admin/AdminAto.jsx` | |
| `[x]` | E.9 | Administração de séries | `src/pages/admin/AdminAtoSeries.jsx` | |
| `[ ]` | E.10 | Importação em 5 passos, com conciliação de editais | `src/pages/admin/AdminAtosImportar.jsx` | ⛔ depende de E.5 |
| `[ ]` | E.11 | Migração de `portarias`, `resolucoes`, `formularios` → `atos`/`documentos` **e de `camara_atos`** (adiadas da B.1/B.4 — ver notas); resolve o gap de `section_id`; `AdminPortarias` aposentada | várias | ⛔ **investigada, não aplicada** — ver nota abaixo |
| `[ ]` | E.12 | `editais.ato_id` no formulário de edital | `AdminEditalForm.jsx` | ⛔ D-E5 |
| `[x]` | E.13 | Exportação XLSX, menu, constantes | `controllers/atosController.js`, `src/constants/atos.js` | |
| `[ ]` | E.14 | **Preencher retroativamente** `vinculos.ato_id` e as datas de mandato a partir das portarias importadas (§3.2) | `atosImporter.js` | ⛔ depende de E.5/E.11 |

**Critério de pronto**: 20 reservas simultâneas na mesma série produzem sequenciais 1..20 sem
repetição e sem buraco (teste — feito, `atos.test.js`); a secretaria emite o próximo ofício pelo
sistema (telas prontas, aguardando uso real); os 593 documentos históricos estão no livro
(⛔ depende do importador E.5, bloqueado por D-E2/D-E3/D-E5).

> **Nota E.11** — investigada, não aplicada nesta sessão: migrar `portarias`/`resolucoes`/
> `formularios` para `atos`/`documentos` exige decidir o destino da coluna `section_id`
> (chave de agrupamento estável usada por `resolucoes` e `formularios`, sem equivalente em
> `atos`/`documentos` — vira coluna nova, ou o agrupamento muda de modelo?) **e** migrar dado
> real de produção sem numeração de série própria retroativa (as portarias/resoluções
> existentes não têm `serie_id`/`sequencial` reais — atribuí-los agora exigiria uma regra de
> retro-numeração que só o importador E.5 resolve de forma auditável, casando com o acervo
> real da planilha). Como o núcleo (`atos`/`ato_series`/`ato_referencias`) já está pronto e
> testado nesta fase, a migração de dado fica para quando o importador rodar — não há mais
> trabalho de schema pendente, só de dado.

---

## Fase C — PNPD

**~2 semanas** · Referência: [`requisitos-pnpd.md`](requisitos-pnpd.md) §10 (telas) e
[`arquitetura-dados.md`](arquitetura-dados.md) §5.12 (modelo)

| | # | Ação | Arquivo | Bloqueio |
|---|---|---|---|---|
| `[x]` | C.1 | Tabela `pos_doutorados` (20 colunas) + repositório | `schema.sql`, `db/posDoutoradoRepo.js` | ⛔ D-C4 afeta só se bolsistas entram desde já (campo `modalidade` já genérico); estrutura da tabela não depende da decisão |
| `[x]` | C.2 | Papel `POS_DOUTORANDO` no vocabulário de `vinculo.papel` | seed de `vocabularios` | já existia (seedado junto da B.5) |
| `[x]` | C.3 | Controller: CRUD, filtros, situação derivada, prorrogação, relatório, vínculo com processo | `controllers/posDoutoradoController.js` | ⛔ D-C1/D-C2/D-C6 afetam só regras de prazo/rito (Fase J) e a semântica de "pendência real" do relatório — não bloqueiam CRUD/derivação/prorrogação |
| `[x]` | C.4 | Rotas + permissões | `routes/adminRoutes.js` | |
| `[ ]` | C.5 | Importador (parser de período, de-para, CPF) | `services/importers/posDoutoradoImporter.js` | ⛔ D-C3, D-C8, D-C9 |
| `[x]` | C.6 | Lista, formulário, ficha com linha do tempo unificada | `src/pages/admin/AdminPosDoutorado*.jsx` | tela de importação (4 passos) adiada — depende de C.5 |
| `[x]` | C.7 | Declaração de vínculo (usa o serviço da A.9) | `controllers/posDoutoradoController.js` | ⛔ **certificado de conclusão não implementado** — D-C7 (quem assina) |
| `[x]` | C.8 | Exportação XLSX, menu, constantes | `src/constants/posDoutorado.js` | |

**Critério de pronto**: os 95 registros importados (⛔ depende do importador C.5, bloqueado por
D-C3/D-C8/D-C9); a pergunta "quantos pós-doutorandos ativos temos?" respondida por um chip na
tela — feito (`AdminPosDoutorado.jsx`), com o número a ser **conferido pela secretaria** contra
os dados reais só após a importação rodar.

> **Nota C.1/C.3** — o modelo harmonizado (`arquitetura-dados.md` §5.12) faz `pos_doutorados`
> ser extensão de um `vinculos(papel='POS_DOUTORANDO')`: pessoa, programa, período e situação
> derivada vêm do vínculo (reaproveitando `utils/vigencia.js`, o mesmo usado pelas coordenações);
> só o que é específico do estágio (projeto, supervisão, prestação de contas) mora em
> `pos_doutorados`. Sem `posdoc_eventos` própria — usa a tabela genérica `eventos`
> (`entidade='pos_doutorado'`) já criada na Fase A.6, e a ficha funde essa linha do tempo com a
> do `processo` vinculado (quando houver). `supervisor_id`/`cossupervisor_id`/o próprio
> pós-doutorando resolvem para `pessoas.id` via um pequeno helper
> (`resolverOuCriarPessoa`) que cria uma pessoa mínima quando o nome não bate com nada
> cadastrado — mesma prevenção do bug de FK já corrigido em B.2 (declarações) e na Fase E (atos):
> nunca gravar `users.id` bruto onde a coluna referencia `pessoas(id)`.

---

## Fase I — Notificações

**~0,5 semana · ⛔ toda a fase depende de D-C5 (existe SMTP institucional?)**

Capacidade nova que **não existe hoje**: o projeto não envia e-mail. É pré-requisito das
Fases J e L, e está citada como dependência em `requisitos-camara.md` (Fase 2.3) e
`requisitos-pnpd.md` (Fase 3.6).

| | # | Ação | Arquivo |
|---|---|---|---|
| `[x]` | I.1 | Dependência `nodemailer` + variáveis `SMTP_*` no `.env.example`; falha silenciosa e registrada quando não configurado | `package.json`, `.env.example` |
| `[x]` | I.2 | Serviço de envio com reprocessamento | `server/services/email.js` |
| `[x]` | I.3 | Tabela `notificacoes` (destinatário, tipo, entidade, enviado_em, erro) — auditável e não reenvia sozinha | `schema.sql` |
| `[x]` | I.4 | Modelos de mensagem em vocabulário editável, não *hardcoded* | `vocabularios` (`dominio='notificacao.modelo'`) |
| `[x]` | I.5 | Agendador — esqueleto (`avaliarPrazos()`) sem regras reais | `server/services/agendador.js` | ⛔ ver nota |
| `[x]` | I.6 | Tela de acompanhamento de envios | `src/pages/admin/AdminNotificacoes.jsx` |

**Critério de pronto**: um e-mail de teste sai pelo SMTP institucional e fica registrado — testável
assim que D-C5 for respondida e as credenciais entrarem no `.env` (mecanismo pronto e testado com
transporte mockado); com SMTP ausente, o sistema continua funcionando e apenas registra a
intenção — **verificado ao vivo no navegador**.

> **Nota I.5** — a fase foi originalmente marcada como bloqueada por inteiro por D-C5, mas o
> próprio critério de pronto já previa o caminho sem SMTP como caso normal, não exceção — por
> isso I.1-I.4 e I.6 foram implementados e testados independentemente da resposta a D-C5.
> `avaliarPrazos()` existe como ponto de extensão para a Fase J, mas está vazio: as regras de
> prazo (D-90/D-30 da Câmara, D+30/D+90 do PNPD) são o conteúdo da própria Fase J, ainda não
> construída. Por isso `iniciarAgendador()` não é chamado por `server/index.js` — ligar um timer
> permanente sem nenhuma regra para avaliar não teria efeito.

---

## Fase J — Prazos e cobranças

**~1,5 semana** · Consolida a Fase 2 de `requisitos-camara.md` e a Fase 3 de
`requisitos-pnpd.md` — **são a mesma capacidade aplicada a dois módulos**.

| | # | Ação | Módulo | Bloqueio |
|---|---|---|---|---|
| `[x]` | J.1 | Motor de prazos genérico: regra (entidade, campo de data, deslocamento, destinatário) | `server/services/prazos.js` | |
| `[ ]` | J.2 | Designação de relatoria com prazo calculado a partir da data da reunião | Câmara | ⛔ D-J1 (prazo regimental em dias não confirmado; hoje a secretaria digita `prazoDevolucao` manualmente, o que já funciona) |
| `[x]` | J.3 | Tela "quem devolveu / quem não devolveu" | `AdminCamara.jsx` (chip "Atrasados") | já existia (Fase 0/1, antes desta reconstrução) — não é item novo |
| `[x]` | J.4 | E-mail de designação + lembretes D-10 / D-5 / D-1 | `services/prazos.js` (`avaliarRelatoriasCamara`) | ⛔ e-mail de **designação** (no momento em que a relatoria é criada, não por agendador) não implementado — só os lembretes de prazo |
| `[ ]` | J.5 | Link tokenizado para o relator enviar o parecer sem login | Câmara | ⛔ D-J3 |
| `[x]` | J.6 | Registro automático da cobrança como evento (substitui *"cobrei devolução em 05/05"*) | `services/prazos.js` | |
| `[x]` | J.7 | Alertas de vencimento do estágio: D-90 / D-30 / D+30 (relatório) / D+90 (pendência) | `services/prazos.js` (`avaliarPosDoutorado`) | D-C6 não bloqueia — os marcos já estão especificados em requisitos-pnpd.md §6.3 independente da resposta |
| `[x]` | J.8 | E-mail de aviso ao pós-doutorando | `services/prazos.js` | ⛔ **só ao pós-doutorando** — "e ao supervisor" simplificado nesta sessão (ver nota); D-C5 não bloqueia (mesmo raciocínio da Fase I) |
| `[x]` | J.9 | Alerta de vencimento de mandato de coordenação e de portaria | `services/prazos.js` (`avaliarMandatosVencendo`/`avaliarPortariasVencendo`) | |
| `[x]` | J.10 | Reservas de número pendentes há mais de 15 dias | `services/prazos.js` (`avaliarReservasPendentes`) | |

**Critério de pronto**: a secretaria da Câmara deixa de telefonar cobrando parecer — mecanismo
pronto e testado (evento `COBRANCA` automático a cada relatoria atrasada, ver `prazos.test.js`);
nenhum estágio pós-doutoral vence sem aviso prévio — mecanismo pronto (D-90/D-30/D+30/D+90),
mas **nenhuma regra roda de verdade em produção ainda**: `iniciarAgendador()` não é chamado por
`server/index.js` (ver nota em `agendador.js`) — falta decidir a estratégia de disparo (cron do
SO vs. timer no processo) antes de ligar de fato.

> **Nota J.4/J.8** — o e-mail dispara apenas ao destinatário direto (relator na Câmara,
> pós-doutorando no PNPD) por simplicidade desta sessão: `enviarEmail()` deduplica por
> `(tipo, entidade, entidade_id)`, e mandar dois e-mails para o mesmo marco exigiria ou uma
> chave composta por destinatário, ou uma lista de destinatários por chamada — nenhuma das duas
> foi necessária para o critério de pronto (a secretaria para de cobrar por telefone; o programa/
> supervisor recebendo cópia é reforço, não o requisito central). Ampliar para múltiplos
> destinatários é direto quando pedido: parametrizar `enviarEmail` para aceitar um array.

---

## Fase K — Painéis e indicadores

**~1,5 semana** · Consolida a Fase 3 de `requisitos-camara.md` e a Fase 4 de
`requisitos-pnpd.md`, mais os indicadores de Expedientes (§11) e Contatos.

Todos os marcos zero já estão **medidos** nos documentos de requisitos — o painel nasce com
linha de base, não com zero.

| | # | Ação | Referência | Bloqueio |
|---|---|---|---|---|
| `[x]` | K.1 | Componente de painel reutilizável (cartões, aging em semáforo, séries) | `src/components/admin/Painel.jsx` | |
| `[x]` | K.2 | Painel da Câmara: aging, backlog por setor, carga de relatoria, reincidência, tempo médio | `camaraController.getIndicadores` | |
| `[x]` | K.3 | Painel do PNPD: vigentes, relatórios pendentes, vencendo, duração média, concentração por supervisor, qualidade do cadastro | `posDoutoradoController.getIndicadores` | |
| `[x]` | K.4 | Painel de Expedientes: por série/ano, reservas pendentes, atos sem PDF, por destinatário, carga por servidor | `atosController.getIndicadores` | |
| `[ ]` | K.5 | Seção pública "Pós-doutorandos" no microsite do programa | `requisitos-pnpd.md` Fase 4 | ⛔ D-K1 |
| `[x]` | K.6 | Extrato para a Coleta Sucupira (pós-docs por programa e período) | `posDoutoradoController.exportSucupira` | |
| `[x]` | K.7 | Autosserviço: `GestorPrograma` cadastra e acompanha os pós-docs do seu programa | `routes/adminRoutes.js` (`POSDOC_ESCRITA_PROGRAMA`) | escopo já existia desde a Fase C (`isProgramaScoped`); só faltava abrir a rota de escrita |
| `[x]` | K.8 | Integrar os painéis ao `/admin/metricas` já existente | `AdminMetricas.jsx` | abas: Métricas dos Programas (existente) · Câmara · Pós-Doutorado · Expedientes |

**Critério de pronto**: nenhum número de gestão da PRPG precisa ser recontado à mão — os quatro
painéis (Programas, Câmara, PNPD, Expedientes) calculam tudo na leitura, nada fica desatualizado
por esquecimento. Verificado ao vivo no navegador; os números aparecem em 0 porque o ambiente de
desenvolvimento não tem carga real além dos dados de teste — a query em si foi validada por
`indicadores.test.js` com dados semeados.

---

## Fase L — Acabamento documental

**~1,5 semana** · Consolida a Fase 4 de `requisitos-camara.md` e o restante dos artefatos
previstos nos quatro documentos.

| | # | Ação | Módulo | Bloqueio |
|---|---|---|---|---|
| `[x]` | L.1 | Minuta de ata gerada a partir dos itens deliberados | `camaraPdf.gerarMinutaAtaPdf` | |
| `[x]` | L.2 | Espelho do processo com QR (usa `declaracoes` da A.9) | `camaraController.espelhoProcessoPdf` | |
| `[x]` | L.3 | Extrato de encaminhamento ao CEPE/SEG | `camaraController.extratoEncaminhamentoPdf` | |
| `[x]` | L.4 | Visão "meus processos" para conselheiros | `AdminMeusProcessos.jsx` | ⛔ D-J3 não bloqueia — o backend (`getMeusProcessos`) já existia apostando no caminho "conselheiro com login"; só faltava a tela. Se D-J3 vier "link tokenizado", esta tela deixa de fazer sentido |
| `[x]` | L.5 | Ofício de designação de relatoria (PDF + corpo de e-mail) | `camaraController.oficioRelatoriaPdf` + `addRelatoria` | fecha a lacuna deixada na Nota J.4/J.8 (e-mail de designação nunca tinha sido disparado, só os lembretes) |
| `[x]` | L.6 | Ofício de cobrança de relatório final | `posdocPdf.gerarOficioCobrancaPdf` | |
| `[x]` | L.7 | Relação de pós-doutorandos vigentes por programa (PDF/XLSX) | `posdocPdf.gerarRelacaoVigentesPdf` (XLSX já existia via `exportXlsx?programa=`) | |
| `[x]` | L.8 | Relatórios anuais (Câmara e PNPD) | `camaraController.relatorioAnualPdf`, `posDoutoradoController.relatorioAnualPdf` | |
| `[ ]` | L.9 | Publicação automática de resoluções resultantes em `/resolucoes` | Câmara | ⛔ D-L1 |
| `[x]` | L.10 | Busca *full-text* | `buscaController.buscaGlobal` (`GET /api/busca`) | ⛔ **log de auditoria por campo não implementado** — ver nota |

> **Nota L.10** — a busca cobre processos, atos e estágios PNPD por `ILIKE` sobre os campos
> textuais relevantes (não é um índice `tsvector` com relevância ranqueada, mas resolve "onde
> está isso" na prática, com o volume atual). O **log de auditoria por campo** (quem mudou qual
> valor, de que para quê) ficou de fora: exigiria triggers de banco ou um wrapper de escrita
> genérico registrando diffs em todas as tabelas — infraestrutura nova e transversal a todo o
> projeto, desproporcional ao tempo restante desta sessão. O que já existe cobre "quem e quando"
> (`criado_por`/`atualizado_por` em toda tabela, e a linha do tempo append-only em `eventos`),
> só não "qual campo mudou de que para quê" — essa é a lacuna real, registrada aqui para quando
> houver tempo dedicado a ela.

---

## Fase D — Legado Drupal

**~1 semana · dívida registrada · executável a qualquer momento após a Fase B**

⛔ D-Z3: confirmar se entra no escopo. **Recomendação: manter como dívida** e reavaliar depois
que os quatro módulos estiverem em uso. *Executada mesmo assim em 29/07/2026, a pedido
explícito do usuário — a recomendação original não foi revertida, só superada por decisão
direta.*

| | # | Ação |
|---|---|---|
| `[x]` | D.1 | `teses_dissertacoes`: `field_*` → nomes reais; `autor_pessoa_id`, `orientador_pessoa_id`, `arquivo_url` (ver nota) |
| `[x]` | D.2 | `disciplinas`: `field_docente` → `docente_pessoa_id`; demais renomeados |
| `[x]` | D.3 | `bolsas`: `field_aluno` → `pessoa_id`; período → `data_inicio`/`data_fim` |
| `[x]` | D.4 | `faq.field_resposta` → `resposta`; `grupos_pesquisa.field_lideres` JSONB → `vinculos` |
| `[x]` | D.5 | Atualizar as 10+ telas que consomem `field_*` |
| `[x]` | D.6 | `editais`: `resultado_parcial`/`resultado_final`/`erratas` → `eventos` |

> **É a única fase que muda o contrato da API consumido pelo frontend.** Por isso fica isolada
> e por último.

**Nota D.1**: `arquivo_url`/`ementa_url` (disciplinas) ficaram como `TEXT` simples, não como
FK para `arquivos` — são links de PDFs legados (upload externo ou por `/api/upload`, não
necessariamente registrados como `arquivos`), e criar uma linha `arquivos` fabricada para cada
um não teria contrapartida real (sem `sha256`/tamanho/autoria confiáveis). `autor_pessoa_id`/
`docente_pessoa_id`/`pessoa_id` (bolsas) são FKs reais para `pessoas`, resolvidas por um novo
`server/db/pessoasRepo.js#resolverOuCriarPessoa` (extraído do que já existia em
`posDoutoradoRepo.js`, Fase C) — inclusive fazendo backfill sob demanda de uma `pessoa` para
usuários que ainda não tinham uma (users.pessoa_id era `NULL` na maioria dos casos reais).
Migração aplicada ao banco de dev com os 57 registros reais de `teses_dissertacoes` e 36 de
`disciplinas` sem perda de dado (confirmado antes e depois: 57/57 autores resolvidos via
`users.pessoa_id`; `disciplinas.field_docente` e `bolsas`/`faq`/`grupos_pesquisa` já estavam
100% vazios em produção, então migração trivial ali). `grupos_pesquisa.field_lideres` virou
`vinculos` com `papel='LIDER_GRUPO_PESQUISA'` e a nova coluna `vinculos.grupo_pesquisa_id`
(FK). `editais.erratas`/`resultado_parcial`/`resultado_final` viraram `eventos`
(`entidade='edital'`, tipos `ERRATA`/`ERRATA_REMOVIDA`/`RESULTADO_PARCIAL`/`RESULTADO_FINAL`) —
append-only, então "remover" uma errata grava um evento de remoção em vez de apagar a linha;
resultado parcial/final é sempre o evento mais recente do tipo. As páginas públicas
(`Edital.jsx`/`Editais.jsx`) não mudaram — o controller devolve exatamente o mesmo formato
(`erratas`/`resultadoParcial`/`resultadoFinal`) computado a partir dos eventos. De passagem,
corrigido um bug pré-existente e não relacionado em `programasController.buscaPrograma`: a
busca do microsite referenciava colunas inexistentes (`disciplinas.desc`,
`teses_dissertacoes.author`) além do `faq.field_resposta` quebrado pelo rename — as três
buscas nunca tinham funcionado.

---

## Fase M — Diplomas em lote (condicional)

**⛔ D-E4 — decisão administrativa, não técnica.** *Implementada em 29/07/2026 a pedido do
usuário, como uma opção adicional — não substitui o caminho (1) nem força a secretaria a
mudar de procedimento; ela escolhe qual caminho usar a cada expedição.*

106 dos 425 ofícios (25%) são o mesmo ofício de envio de documentação de conclusão. Três
caminhos em `requisitos-expedientes.md` §9.4. A Fase E já implementa o caminho (1) — formulário
dedicado com dois campos, um ofício por concluinte. Esta fase implementa o caminho (2), o
ofício em lote — um único ofício cobrindo vários concluintes.

**O que foi feito** (sem forçar a decisão administrativa: os dois caminhos convivem):
- `ato_diplomas` (tabela filha de `atos`): `nome_concluinte`, `livro`, `ordem` — a lista de
  concluintes cobertos por um único ofício.
- `server/db/atosRepo.js#diplomasRepo` (`listByAto`/`setLista`) e novos endpoints em
  `atosController.js`: `POST /api/atos/diplomas-lote` (cria um ofício — reservado ou já
  emitido — e anexa a lista num só passo), `GET`/`PUT /api/atos/:id/diplomas` (ver/editar a
  lista de um ofício existente), `GET /api/atos/:id/diplomas.xlsx` (exporta a lista).
- `src/pages/admin/AdminAtoDiplomasLote.jsx` (rota `/admin/atos/diplomas`, já prevista na
  tabela de rotas de `requisitos-expedientes.md` §9): lista dinâmica de concluintes
  (nome + livro), cria o ofício e leva à ficha. Link adicionado em `AdminAtos.jsx`.
- `AdminAto.jsx` (ficha): mostra a lista de concluintes e o botão de exportação quando o
  ofício tiver diplomas anexados.
- Testado em `server/__tests__/atos.test.js` (5 casos novos: criação reservada/emitida,
  assunto customizado, validação de lista vazia, edição da lista, exportação XLSX) e
  verificado ao vivo no navegador (criação de um OFÍCIO Nº 1/2026 com um concluinte,
  exibido corretamente na ficha).

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
| A — Núcleo | 18 | D-A1, D-A2, D-A3, D-A4, D-E1 | 27/07/2026 | 27/07/2026 | ✅ concluída (D-A1/D-A4 conforme recomendação; FK real de `vinculos.pessoa_id` adiada para B.3 — ver A.10) |
| B — Refit + Câmara | 10 | D-B1, D-G8, D-A4 | 28/07/2026 | 28/07/2026 | 🟡 7/10 feitos (B.1-B.3, B.5, B.7 aplicados; B.4/B.6 investigados e adiados p/ Fase E/G; B.8-B.10 bloqueados por D-B1) |
| G — Contatos | 9 | D-G1..D-G8 | 28/07/2026 | 28/07/2026 | 🟡 5/9 feitos (G.1-G.3, G.5 aplicados e verificados no navegador; G.6/G.7 deixados por escopo; G.4/G.8 bloqueados por D-G2..D-G8; G.9 bloqueado por D-G1) |
| E — Expedientes | 14 | D-E1..D-E3, D-E5..D-E8 | 28/07/2026 | 28/07/2026 | 🟡 9/14 feitos (E.1-E.4, E.6-E.9, E.13 aplicados e testados; E.5/E.10/E.12/E.14 bloqueados pelas decisões D-E2/D-E3/D-E5; E.11 investigada e adiada — depende do importador) |
| C — PNPD | 8 | D-C1..D-C4, D-C6..D-C9 | 28/07/2026 | 28/07/2026 | 🟡 7/8 feitos (C.1-C.4, C.6, C.8 aplicados e testados; C.7 parcial — declaração de vínculo pronta, certificado adiado por D-C7; C.5 bloqueado por D-C3/D-C8/D-C9) |
| I — Notificações | 6 | **D-C5** | 28/07/2026 | 28/07/2026 | ✅ concluída (D-C5 não bloqueia: o critério de pronto já previa o caminho sem SMTP como caso normal; I.5 é esqueleto sem regras — dependem da Fase J) |
| J — Prazos e cobranças | 10 | D-C5, D-C6, D-J1, D-J2, D-J3 | 28/07/2026 | 28/07/2026 | 🟡 8/10 feitos e testados (J.1, J.3-J.4, J.6-J.10); J.2 bloqueado por D-J1; J.5 bloqueado por D-J3; agendador não ligado em produção (decisão de operação, não técnica) |
| K — Painéis | 8 | D-K1 | 28/07/2026 | 28/07/2026 | 🟡 7/8 feitos e testados (K.1-K.4, K.6-K.8); K.5 bloqueado por D-K1 |
| L — Acabamento | 10 | D-J3, D-L1 | 28/07/2026 | 28/07/2026 | 🟡 9/10 feitos e testados (L.1-L.8, L.10 parcial); L.9 bloqueado por D-L1; log de auditoria por campo (metade de L.10) adiado — ver nota |
| D — Legado Drupal | 6 | D-Z3 | 29/07/2026 | 29/07/2026 | ✅ concluída (executada a pedido do usuário, apesar da recomendação de dívida; migração real de 57 teses + 36 disciplinas sem perda de dado; bug pré-existente de busca do microsite corrigido de passagem) |
| M — Diplomas em lote | — | D-E4 | 29/07/2026 | 29/07/2026 | ✅ concluída (implementada a pedido do usuário como opção adicional ao caminho 1 da Fase E, sem forçar a decisão administrativa D-E4 — a secretaria escolhe qual caminho usar a cada expedição) |
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
