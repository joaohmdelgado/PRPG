# Decisões e trabalho pendente para destravar N.4, N.7 e N.8

Três itens da Fase N (`docs/revisao-portal-conteudo-2026-09-24.md`) continuam `⛔`: perfil
público do docente (N.4), "vigente/revogada" nas resoluções (N.7) e contatos como fonte única
(N.8). Nenhum dos três trava só numa pergunta — cada um é uma **cadeia**: decisão(ões) → dado
importado de verdade → tela construída. Este documento junta as três cadeias inteiras num
lugar só, para quem for desbloquear um deles saber exatamente por onde começar.

**Não duplica** [`oficina-decisoes-planilhas.md`](oficina-decisoes-planilhas.md): as decisões que
nascem da leitura das planilhas (D-G1, D-G2..D-G8, D-E2, D-E3, D-E5) já têm ficha completa lá —
aqui só aponta para elas. A exceção é **D-R2**, que não é sobre planilha nenhuma (é uma decisão
de privacidade/LGPD) e por isso nunca ganhou uma ficha de verdade — a ficha completa está na
seção N.4 abaixo.

**Preparado em:** 28/09/2026, a partir do `PLANO.md` §4, de
[`revisao-portal-conteudo-2026-09-24.md`](revisao-portal-conteudo-2026-09-24.md) §3 (Fase N) e
§4, de [`arquitetura-dados.md`](../arquitetura-dados.md) §5.9 e de uma leitura do código
(`programaPublicoController.js`, `programasController.js`, `schema.sql`).

---

## Resumo

| | Decisão(ões) | Depois da decisão, ainda falta | Quem decide |
|---|---|---|---|
| **N.4** — perfil público do docente | ✅ **D-R2 respondida** (opt-out — visível por padrão, com opção de ocultar) | fechar a FK de `vinculos.pessoa_id` (B.3, dívida técnica — não é decisão), ligar `linhas_pesquisa` a `pessoas`, construir a tela e o interruptor em `/minha-conta` | resolvida — decidiu o encarregado de dados da UFRPE |
| **N.7** — vigente/revogada nas resoluções | ✅ D-E2, D-E3, D-E5 — **as três respondidas** (fichas em `oficina-decisoes-planilhas.md` §4.2) | gravar o importador de expedientes de verdade (hoje só simulado), migrar `portarias`/`resolucoes`/`formularios` para `atos`/`documentos` (E.11 — schema pronto, dado não migrado) | só trabalho técnico agora |
| **N.8** — contatos como fonte única | ✅ **todas as decisões do bloco G respondidas** (D-G1, D-G2, D-G3, D-G4, D-G5, D-G6, D-G7, D-G8 — ver folha; fichas em `oficina-decisoes-planilhas.md` §4.3) | gravar o importador de contatos de verdade (hoje só simulado — a tabela `contatos` tem zero linhas); ✅ **G.9 (seção de contato no microsite) já implementada e testada em 29/09/2026** — aparece assim que houver dado; falta aposentar `filterSensitivePessoa` (B.6), só depois de G.4 gravar de verdade | resolvida — só trabalho técnico agora |

**As três decisões que travavam N.4/N.7/N.8 estão respondidas.** O que falta em todas é só
trabalho técnico: rodar os dois importadores (expedientes e contatos) com `--gravar` — hoje só
simulados — e construir a UI que falta em cada um (E.11, a tela de perfil do docente e o
interruptor em `/minha-conta`; G.9 já está pronta). Nenhum dos três precisa mais de decisão para
avançar.

---

## N.4 — Perfil público do docente

**O que o item pede** (`revisao-portal-conteudo-2026-09-24.md`, Fase N): uma página por docente
com programas e papéis, linhas de pesquisa, disciplinas, orientações, grupos, Lattes/ORCID e os
contatos marcados como públicos — "visibilidade por flag + `contatos.publico`".

### Cadeia completa

1. **D-R2** — responder (ficha completa abaixo).
2. **B.3** — fechar a FK real de `vinculos.pessoa_id` (hoje é `TEXT` solto, sem `REFERENCES
   pessoas(id)`; foi adiada duas vezes — na A.10 e de novo quando "B.3" rodou em julho e só fez a
   parte de `programasController.js`, ver `PLANO.md` linhas 242 e 263, e a nota no topo de
   `server/db/schema.sql`). **Não é uma decisão — é trabalho técnico represado**, e exige mexer
   junto na criação de usuário, na listagem por pessoa e na limpeza ao excluir um usuário.
3. **Ligar `linhas_pesquisa` a `pessoas`** — hoje as linhas de pesquisa são do programa
   (`programa_linhas_pesquisa`), não têm dono individual; o perfil do docente precisa saber quais
   são as dele. Não tem item numerado no `PLANO.md`; é descoberta desta revisão.
4. **Construir a tela** — rota pública nova, endpoint que junta vínculos + linhas + disciplinas +
   orientações (teses) + grupos + `contatos.publico`, e a UI. Nada disso existe ainda.
5. **Auto-atendimento em `/minha-conta`** — seja qual for a resposta de D-R2 (opt-in ou opt-out),
   a pessoa precisa de um jeito de ver/mudar sua própria visibilidade. Hoje `/minha-conta` (Fase
   U.1) não tem esse controle — só edita telefones, Lattes/ORCID/Scholar e os `contatos.publico`
   que ela mesma cadastra; não tem um interruptor "meu perfil aparece no site".

### Achado importante para a ficha: parte disso **já está público hoje**, sem D-R2

Antes de levar D-R2 para decisão, vale registrar o que o site **já mostra, sem consentimento
algum**, independente de N.4 existir:

- `/programas/:slug/publico` (página automática, N.2) devolve **nome e Lattes** de todo docente
  vinculado a um programa sem microsite — `server/controllers/programaPublicoController.js:24-30`.
- `/api/programas/slug/:slug/pessoas` (rota pública, sem `protect`,
  `server/routes/adminRoutes.js:201`) devolve **nome, foto, Lattes, ORCID, Google Scholar e o
  e-mail funcional (`email_funcao`) do vínculo** de todo docente de um programa **com** microsite
  — `server/controllers/programasController.js:587-630` — e o microsite realmente exibe tudo
  isso, inclusive o e-mail (`src/pages/programa/ProgramaPessoas.jsx:17-42`).

Ou seja: **nome, foto, e-mail funcional, Lattes, ORCID e Google Scholar de todo docente com
microsite já são públicos, hoje, para qualquer visitante — sem opt-in, sem opt-out, sem
D-R2.** N.4 não cria essa exposição; ele **consolida e amplia** (soma linhas de pesquisa,
disciplinas, orientações e grupos numa página só). Vale levar isso para quem responde D-R2 —
pode ser que o e-mail funcional publicado sem filtro no microsite mereça uma revisão própria,
independente de N.4 andar ou não.

### Ficha — D-R2: perfil público de docente é visível por padrão, ou só com consentimento? ✅ respondida (29/09/2026)

- **Resposta:** (a) Visível por padrão, com opção de ocultar (opt-out). Decisão do encarregado de
  dados da UFRPE (`encarregado.lgpd@ufrpe.br`) — diverge da recomendação deste documento, que
  sugeria (c) híbrido; a palavra final era do encarregado, e ele optou por manter o comportamento
  que o site já tem hoje (nome/foto/e-mail/Lattes já saem sem pedir nada) para todo o perfil
  unificado, em vez de restringir a parte "extra" (foto, e-mail direto, agregação) a opt-in.
- **Quem decide:** encarregado de dados da UFRPE (LGPD) — `encarregado.lgpd@ufrpe.br`. Não é
  decisão técnica.
- **Dado envolvido:** nome, foto, vínculo/papel no programa, Lattes/ORCID/Google Scholar,
  linhas de pesquisa, disciplinas, orientações (teses), grupos de pesquisa, e os contatos que a
  própria pessoa marcar como públicos (`contatos.publico`, granular por contato — já existe e
  resolve o "tudo ou nada" dos antigos `priv_mostrar_email`/`priv_mostrar_telefone`, ver
  `arquitetura-dados.md` §5.9).
- **Contexto que já existe hoje** (ver achado acima): nome, foto, e-mail funcional e os três
  links acadêmicos de todo docente com microsite já saem publicamente pela página de pessoas do
  programa, sem nenhum controle de consentimento. O perfil unificado da N.4 seria uma extensão
  do que já está no ar, não uma exposição nova de categoria de dado.
- **Opções:**
  - **(a) Visível por padrão, com opção de ocultar (opt-out).** Consistente com o que o site já
    faz hoje (nome/foto/e-mail/Lattes já saem sem pedir nada). Precisa de um interruptor em
    `/minha-conta` e uma tela de auditoria para quem administra ver quem se ocultou.
  - **(b) Só com consentimento explícito (opt-in).** Mais conservador; nenhum perfil aparece até
    a pessoa marcar que quer. Mais alinhado ao princípio de minimização da LGPD, mas muda o
    comportamento atual do microsite (teria que também revisar `programaPublicoController.js`/
    `getProgramaDocentesPublic`, hoje sem filtro).
  - **(c) Híbrido.** O que já é institucional por natureza (nome, vínculo, Lattes — a mesma
    informação que já está no currículo público da CAPES/plataforma Lattes) fica visível por
    padrão; o que é extra (foto, e-mail funcional, biografia, agregação num perfil único) exige
    opt-in.
- **Recomendação para a conversa:** (c) é o que menos muda o que já está no ar e o que mais se
  alinha à ideia de "dado que já é público em outro lugar oficial não precisa de consentimento
  para ser espelhado, mas o que é conveniência do site (foto, e-mail direto, agregação) sim".
  Mas a palavra final é do encarregado de dados — este documento não decide, só organiza.
- **Agora que respondida:** a página unificada pode ser construída com **opt-out** — visível por
  padrão, com um interruptor em `/minha-conta` para quem quiser se ocultar, e uma tela de
  auditoria para quem administra ver quem se ocultou. O que falta é só o trabalho técnico listado
  na cadeia completa acima (fechar a FK de B.3, ligar `linhas_pesquisa` a `pessoas`, construir a
  tela e o interruptor em `/minha-conta`) — nenhum deles depende de mais decisão.
- **Destrava:** N.4. Não destrava B.3 nem o vínculo `linhas_pesquisa`↔`pessoas` — esses precisam
  de trabalho técnico à parte, listado na cadeia acima.

---

## N.7 — "Vigente/revogada/alterada por" nas resoluções

**O que o item pede:** a página `/resolucoes` passa a mostrar a situação de cada resolução
(vigente, revogada, alterada por outra) usando `ato_referencias` — o mesmo mecanismo que a
Câmara já usa para atos.

### Cadeia completa

1. **D-E2 ✅, D-E3 ✅, D-E5 ✅ — as três respondidas em 29/09/2026** (fichas completas em
   [`oficina-decisoes-planilhas.md` §4.2](oficina-decisoes-planilhas.md#42-expedientes-ofícios-editais-e-portarias)).
   Resumo:
   - D-E2: sub-registro sem fonte recuperável — o livro de 2025 fica incompleto, com nota; não
     há outra fonte a trazer.
   - D-E3: os 306 números "em branco" são todos a grade pré-numerada sem uso — nenhum vira
     `CANCELADO`, nenhum é importado (ver a folha de respostas para uma ressalva sobre 2 linhas
     que o levantamento original separou como possíveis buracos reais).
   - D-E5: sim, todos os 46 editais numerados viram registros públicos no site — diverge da
     recomendação da ficha (que sugeria só ligar os que já têm página); os ~34 que faltam
     precisam ser criados como páginas públicas. Conferir a lista antes de publicar (pode haver
     edital interno/cancelado que não deveria virar página pública).
2. **Rodar o importador de expedientes de verdade** — `npm run planilha -- expedientes
   <arquivo> --gravar`. Hoje só a simulação rodou (Fase O.3: "550 atos, 17 referências entre
   atos ligadas... nada gravado no banco"). Sem isso, `atos`/`ato_referencias` continuam vazias
   de dado histórico, e não tem "vigente/revogada" pra mostrar.
3. **E.11** — migrar `portarias`, `resolucoes` e `formularios` para `atos`/`documentos`
   (`PLANO.md` linha 354, "investigada, não aplicada"). O núcleo (`atos`/`ato_series`/
   `ato_referencias`) já está pronto e testado; falta só o dado — que por sua vez depende do
   importador (passo 2). A parte de schema que preocupava (o que fazer com `section_id`) já foi
   resolvida pela Fase F.4 (`documento.secao` como vocabulário — ver D-E9, não-★, na mesma
   oficina); só falta confirmar isso na pauta.
4. Com E.11 aplicada, a página `/resolucoes` troca a leitura da tabela `resolucoes` por
   `documentos`/`atos` e passa a mostrar `ato_referencias`. Esse último passo é pequeno depois
   que os três de cima estiverem prontos.

**As três decisões estão respondidas** — não precisa esperar a oficina inteira acontecer.
O que falta agora é só técnico: rodar o importador com `--gravar` (passo 2) e aplicar a E.11
(passo 3).

---

## N.8 — Contatos como fonte única

**O que o item pede:** fim dos 8 campos de contato hoje espalhados por 4 tabelas
(`pessoas.email_institucional`/`telefones`, `users.priv_mostrar_email`/`priv_mostrar_telefone`,
`programas.email_programa`/`telefone_secretaria`/`whatsapp`, `vinculos.email_funcao`) — tudo
passa a vir de `contatos`, com `publico` por registro.

### Cadeia completa

1. **D-G1 ✅ respondida em 29/09/2026** — aceitou a recomendação da ficha: por padrão, o
   microsite mostra só e-mail da coordenação e telefone da secretaria; celular e e-mail pessoal
   nunca aparecem, salvo marcação individual explícita naquele registro (ficha completa em
   [`oficina-decisoes-planilhas.md` §4.3](oficina-decisoes-planilhas.md#43-agenda-de-contatos)).
   Esta é a decisão que de fato destrava G.9/N.8/B.6 — as demais (D-G2..D-G8) só afetam o volume
   de pendência de revisão.
2. **D-G2..D-G8** — não bloqueiam o importador rodar (o modelo "importar fielmente" não espera
   por elas), mas quanto mais responderem antes, menos pendência de revisão sobra depois. **Todas
   já foram respondidas em 29/09/2026** (ver a folha de respostas): D-G2 (vice formal), D-G3
   (nota `A` é teto de mestrado, não "sem avaliação"), D-G4 (programa novo, não
   descredenciado), D-G5 (UFAPE não continua sob a Câmara da PRPG — confirmada, não mais
   provisória), D-G6 (PGCAP/PPGPA tratados como programas distintos, decisão de Claude a pedido
   da secretaria — a confirmar depois), D-G7 (cada programa mantém os próprios contatos), D-G8
   (descarta a aba `Relatores`).
3. **Rodar o importador de contatos de verdade** — `npm run planilha -- contatos <arquivo>
   --gravar`. Hoje só simulado (Fase O.3: "40 programas entram, 7 ficam guardados..."; Fase O
   nota final: "nenhuma importação foi gravada"). A tabela `contatos` (criada desde a Fase A.5b)
   **continua com zero linhas em produção** (`PLANO.md`, nota B.6) — os 8 campos antigos
   continuam sendo a fonte real até essa gravação acontecer.
4. **G.9 ✅ implementada e testada em 29/09/2026** — seção de contato do microsite lendo
   `contatos.publico` (`src/components/programa/ContatosPublicos.jsx`). Soma aos campos legados
   de `programas` sem substituí-los; fica vazia até o passo 3 rodar de verdade.
5. **B.6** — aposentar `filterSensitivePessoa` (a única proteção de privacidade hoje em vigor no
   endpoint público de programas) em favor de ler `contatos` direto. Só pode acontecer **depois**
   do passo 3 — aposentar o filtro sem a tabela populada seria regressão de privacidade
   (`PLANO.md`, nota B.6).
6. Só depois dos 5 passos acima é que os 8 campos espalhados somem de verdade.

---

## Achados de passagem (não bloqueiam, valem registrar)

- **`PLANO.md` aponta arquivos que não existem mais.** As linhas G.4 e E.5 citam
  `services/importers/contatosImporter.js` e `services/importers/atosImporter.js` — esses
  importadores de julho foram substituídos pelos da Fase O
  (`server/services/planilhas/contatosImporter.js` e `expedientesImporter.js`, arquitetura
  "importar fielmente + marcar para revisão"). O código e os testes seguem o caminho novo; só a
  coluna "Arquivo" do registro de julho ficou desatualizada. Não corrigi aqui para não misturar
  uma edição histórica com este levantamento nas cadeias de N — mas é uma troca de duas linhas
  quando alguém for mexer em `PLANO.md` de novo.
- **A exposição pública de e-mail funcional/foto/Lattes/ORCID de docentes** (achado da seção
  N.4) já está no ar independente de qualquer coisa deste documento. Vale um olhar do
  encarregado de dados mesmo que D-R2 demore.

---

## Como usar isto

Nenhuma decisão listada aqui foi tomada por este documento — ele só organiza o que já estava
espalhado entre `PLANO.md`, `revisao-portal-conteudo-2026-09-24.md`, a oficina O.1 e o código. As
respostas de D-E2/D-E3/D-E5/D-G1 vão para a
[folha de respostas da oficina](oficina-decisoes-planilhas.md#6-folha-de-respostas); a resposta de
D-R2 (sem folha própria na oficina, por não ser uma decisão de planilha) fica registrada na tabela
de decisões de `revisao-portal-conteudo-2026-09-24.md` §4, que já aponta para a ficha completa
aqui.
