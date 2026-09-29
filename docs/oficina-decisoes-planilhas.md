# Oficina de decisões — saída das planilhas (Fase O.1)

**Para:** secretaria da PRPG, secretaria da Câmara de Pós-Graduação e quem responde pelas
decisões institucionais (Pró-Reitoria/coordenadorias).
**Duração:** cerca de 2 horas.
**Preparado em:** 25/09/2026, a partir do `PLANO.md` §4, dos quatro `requisitos-*.md`, do
§4 de [`revisao-portal-conteudo-2026-09-24.md`](revisao-portal-conteudo-2026-09-24.md) e de
uma leitura das quatro planilhas feita na mesma data.

> **Este documento não decide nada.** Cada ficha traz o contexto, as opções e uma
> recomendação para a conversa. Quem decide é a oficina. As respostas vão para a
> [folha de respostas](#6-folha-de-respostas) e, depois, para o `PLANO.md` §4.

---

## Sumário

1. [Por que esta oficina](#1-por-que-esta-oficina)
2. [O que o sistema já faz enquanto não há resposta](#2-o-que-o-sistema-já-faz-enquanto-não-há-resposta)
3. [Pauta sugerida](#3-pauta-sugerida)
4. [Fichas de decisão](#4-fichas-de-decisão)
   - [4.1 Câmara](#41-câmara-de-pós-graduação)
   - [4.2 Expedientes](#42-expedientes-ofícios-editais-e-portarias)
   - [4.3 Contatos](#43-agenda-de-contatos)
   - [4.4 Pós-doutorado](#44-pós-doutorado-pnpd)
   - [4.5 Transversais e de outros donos](#45-transversais-e-de-outros-donos)
5. [Critério para aposentar cada planilha](#5-critério-para-aposentar-cada-planilha)
6. [Folha de respostas](#6-folha-de-respostas)
7. [Conferências de dado (não são decisões)](#7-conferências-de-dado-não-são-decisões)

---

## 1. Por que esta oficina

Os módulos da Câmara, de Expedientes, de Contatos e de Pós-doutorado estão prontos, mas
**vazios**: as quatro planilhas continuam sendo a fonte da verdade. Os importadores esperavam
cerca de 20 respostas antes de rodar. Algumas só a secretaria sabe responder, como o
significado das cores da planilha da Câmara.

A estratégia mudou (Fase O.2): **importar fielmente agora e interpretar depois**. A oficina
deixa de ser pré-requisito para importar. Ela passa a ser o momento de **fechar as
interpretações**, e cada resposta vira uma ação em lote no sistema, sem retrabalho.

**Quem precisa estar:**

| Quem | Por quê |
|---|---|
| Servidora que mantém a planilha da Câmara | D-B1 (cores) só ela sabe; D-J1/D-J2 |
| Quem expede ofícios e portarias (ao menos uma pessoa das 12) | D-E1, D-E2, D-E3, D-E6 |
| Quem mantém a agenda de contatos | D-G2..D-G8 |
| Quem acompanha o pós-doutorado | D-C1..D-C9 |
| Alguém com autoridade para decisões institucionais | D-G5 (UFAPE), D-G6, D-E7, D-L1 |

Fora da oficina, com outros donos: D-C5 (TI, SMTP), D-R2 e a Política de Privacidade
(encarregado de dados), D-S1..D-S3 (TI, domínios). Estão na [seção 4.5](#45-transversais-e-de-outros-donos) só para registro.

---

## 2. O que o sistema já faz enquanto não há resposta

Nada fica parado à espera da oficina:

- **O dado entra como está na planilha.** O texto original fica guardado: cada linha importada é
  registrada com a aba, o número da linha e as colunas como vieram. Nas colunas `*_original`
  (`obs_original`, `periodo_original`, `programa_original`, `supervisor_original`,
  `processo_original`) fica o texto de cada campo que depende de interpretação.
- **O que depende de decisão é marcado para revisão**, com o número da decisão (D-xx). A tela
  **Revisão da importação**, no painel, lista essas pendências agrupadas. Uma resposta da oficina
  resolve todas as pendências do mesmo tipo de uma vez. Por exemplo, "verde-escuro significa
  X" atualiza os 56 processos daquela cor.
- **Reimportar é seguro.** Cada registro é identificado pela sua chave natural: NUP; série, ano e
  número; CPF e período; programa e papel. Rodar de novo não duplica nada e não sobrescreve o que
  já foi corrigido no sistema.

Então a pergunta de cada ficha não é "podemos importar?". É **"qual é a interpretação certa
para aplicar em lote?"**.

---

## 3. Pauta sugerida

As decisões são ~40. Duas horas não bastam para todas. A pauta prioriza as que **destravam dado
real** (marcadas ★). O resto fica para uma segunda rodada ou para resposta por e-mail.

| Tempo | Bloco | Decisões |
|---|---|---|
| 0:00–0:10 | Abertura: o que mudou (§2) e o critério de aposentadoria (§5) | — |
| 0:10–0:40 | Câmara | ★ D-B1, ★ D-G8, D-J1, D-J2, D-J3, D-L1 |
| 0:40–1:05 | Expedientes | ★ D-E2, ★ D-E3, ★ D-E5, D-E1, D-E6, D-E7, D-E8, D-E9 |
| 1:05–1:25 | Contatos | ★ D-G2, ★ D-G3, ★ D-G4, ★ D-G5, ★ D-G6, D-G1, D-G7 |
| 1:25–1:50 | Pós-doutorado | ★ D-C3, ★ D-C8, ★ D-C9, D-C1, D-C2, D-C4, D-C6, D-C7, D-K1 |
| 1:50–2:00 | Encaminhamentos: quem responde o que ficou aberto, e até quando | D-Z1, D-Z2 e o resto |

**Material para levar:** este documento impresso e a tela **Revisão da importação** aberta, com
a simulação de cada planilha já rodada. A tela mostra os casos reais de cada pendência, e isso
evita discutir no abstrato.

---

## 4. Fichas de decisão

Formato de cada ficha: **pergunta** · contexto · opções · **recomendação** · o que destrava ·
o que o sistema faz até lá.

> Os números do contexto vêm do levantamento de julho (`requisitos-*.md`), conferidos contra as
> planilhas em 25/09/2026 quando indicado. A simulação da importação (O.3) reconta tudo antes da
> oficina.

### 4.1 Câmara de Pós-Graduação

#### ★ D-B1 — O que significa cada cor da planilha da Câmara?

- **Contexto.** A planilha não tem coluna de situação: a situação é a **cor de fundo** da linha,
  sem legenda. Contagem por cor nas 102 linhas de processo (conferida em 25/09/2026):

  | Cor | Linhas | Onde aparece | O que costuma estar escrito ao lado |
  |---|---|---|---|
  | verde-escuro `#B6D7A8` | 56 | 50 no acervo "Processos finalizados" | "Recebido na SEG em…", "Situação: ARQUIVADO" |
  | verde-claro `#D9EAD3` | 21 | pautas de 2026 | "Recebido na Secretaria Geral dos Conselhos…", relator indicado |
  | rosa `#F4CCCC` | 19 | pautas de 2026 | enviado ao PPG/Reitoria, "retirado de pauta", troca de relator |
  | amarelo `#FFF2CC` | 3 | pendentes e finalizados | "vai ser encaminhado para o CONSU" |
  | azul `#CFE2F3` | 2 | pautas de 2026 | "apreciação do CONSU", "grupo de trabalho do SIPAC" |
  | vermelho `#EA9999` | 1 | finalizados | caso com perícia agendada |

- **Opções.** (a) A servidora diz o significado de cada cor, que vira uma situação do sistema.
  (b) Parte das cores não tem significado estável: esses processos ficam "a classificar" e são
  revisados um a um.
- **Recomendação.** Fazer (a) cor por cor, com a tela aberta nos exemplos reais. Onde a cor não
  bastar, usar (b) só para aquela cor. A coluna "O que costuma estar escrito" é **uma leitura dos
  dados para orientar a conversa, não uma resposta**.
- **Destrava:** B.8 (importador da Câmara com situação real), B.10, e os indicadores e o painel
  de pendências da Câmara com dado verdadeiro.
- **Até lá:** os 80 processos entram com a situação **"A classificar (importado)"** e a cor
  original registrada. Eles não aparecem como trabalho novo nem como resolvidos.

#### ★ D-G8 — A aba `Relatores` pode ser descartada depois da importação de contatos?

- **Contexto.** São 44 coordenadores com celular pessoal, a mesma informação da planilha de
  contatos (que tem 47 programas). Hoje existem duas cópias de dados pessoais circulando sem
  controle de acesso.
- **Opções.** (a) Descartar a aba e usar a agenda do sistema como única fonte. (b) Importar
  também a aba, para conferir contra a planilha de contatos.
- **Recomendação:** (a). A planilha de contatos é mais completa e está mais atualizada. Antes
  de apagar a aba, a simulação lista o que só existe nela.
- **Destrava:** G.4 e B.8 sem dupla fonte.
- **Até lá:** o importador da Câmara **não lê** a aba `Relatores` e registra isso como pendência.

#### D-J1 — Existe prazo regimental para o relator devolver o parecer?

- **Contexto.** Hoje a secretaria digita o prazo de devolução à mão. O sistema já manda lembretes
  D-10/D-5/D-1 e registra a cobrança. A planilha registra "cobrei devolução em 05/05" em texto.
- **Opções.** (a) Prazo fixo em dias, contado da designação. (b) Prazo contado da data da
  reunião. (c) Não há prazo regimental: continua manual.
- **Recomendação.** Se o regimento tiver prazo, (a) ou (b) conforme o texto. Se não tiver, (c),
  com um prazo padrão sugerido no formulário (15 dias) que a secretaria pode mudar.
- **Destrava:** J.2 (prazo calculado automaticamente).

#### D-J2 — Os conselheiros da Câmara são sempre os coordenadores, ou há eleitos distintos?

- **Contexto.** A aba `Relatores` lista coordenadores; as relatorias da planilha citam também
  vice-coordenadores e docentes.
- **Recomendação.** Registrar a composição real da Câmara como vínculo (papel de conselheiro,
  com portaria). Sem isso, "quem pode relatar" não é conferível.
- **Destrava:** regras de designação da Fase J.

#### D-J3 — O conselheiro entra no sistema com login ou recebe um link?

- **Contexto.** A tela "Meus processos" (L.4) já existe para quem tem login.
- **Opções.** (a) Login, com a tela que já existe. (b) Link tokenizado por relatoria, sem login.
- **Recomendação:** (a) se os conselheiros já têm conta institucional no sistema; (b) só se
  criar conta for um obstáculo real. A opção (b) é mais cara e deixa a L.4 sem uso.
- **Destrava:** J.5.

#### D-L1 — As resoluções que resultam de processos vão automaticamente para `/resolucoes`?

- **Recomendação.** Não automaticamente. O sistema propõe a publicação e alguém da PRPG
  confirma. Publicação é ato com responsável.
- **Destrava:** L.9.

### 4.2 Expedientes (ofícios, editais e portarias)

#### ★ D-E2 — Por que há só 16 portarias em 2025, contra 60 em 2026?

- **Contexto (conferido em 25/09/2026).** A aba `Portarias - 2025` tem 16 portarias preenchidas
  e **179 números pré-numerados em branco depois da última**. Isso sugere que a aba foi
  abandonada cedo, e não que houve poucas portarias.
- **Opções.** (a) Houve outra fonte (outra planilha, SIPAC, boletim), que entra na importação.
  (b) Foi sub-registro sem fonte recuperável: o livro de 2025 fica incompleto, com nota.
- **Recomendação.** Perguntar primeiro onde as portarias de 2025 foram controladas. Se houver
  fonte, trazê-la para a mesma importação.
- **Destrava:** E.5 completo para 2025, e E.14 (datas de mandato a partir das portarias).
- **Até lá:** as 16 portarias entram. A lacuna fica registrada como pendência da série de 2025.

#### ★ D-E3 — O que fazer com os números reservados em branco?

- **Contexto (conferido em 25/09/2026).** Dos 306 números "em branco", **304 estão depois do
  último número usado** de cada aba: 124 em `2026 ofícios`, 179 em `Portarias - 2025` e 1 em
  `2026 - Portarias`. É a grade pré-numerada, não reserva de fato. Os buracos reais **entre**
  números usados são poucos e ficam em `OFÍCIOS - 2024`. Lá também há linhas com o número e só
  um traço ("-") nos outros campos.
- **Opções.** (a) Buracos reais e linhas com traço entram como `CANCELADO`, com o motivo
  "reservado e não utilizado (planilha)". (b) Não importar: o livro fica com buracos.
- **Recomendação.** A grade pré-numerada depois do último número **nunca é importada** (senão o
  próximo ofício de 2026 sairia com o número 196). Para os buracos reais e as linhas com traço,
  usar (a): um livro de numeração não deve ter buraco sem explicação.
- **Destrava:** E.5 (densidade do livro).
- **Até lá:** a grade depois do último número é ignorada. Os buracos e as linhas com traço
  **não** são criados e ficam como pendência por série e ano. A tela oferece "importar como
  cancelados" em um clique.

#### ★ D-E5 — Todos os editais numerados da planilha viram editais publicados no site?

- **Contexto.** São 46 editais numerados no livro (PRPG, PRINT, Lato Sensu, Proficiência) e 12
  no site. A aba ` EDITAIS PRPG 2025` mistura editais de 2022 a 2025.
- **Opções.** (a) Todos vão ao site. (b) O livro guarda todos, e só os que já têm página no site
  ficam ligados a ela. Os demais (internos, cancelados) ficam só no livro.
- **Recomendação:** (b). O livro de numeração e a vitrine do site são coisas diferentes. Onde o
  "Link publicação" da planilha é igual ao link de um edital do site, o sistema liga os dois; o
  resto fica listado para conferência.
- **Destrava:** E.12 (campo do ato no formulário de edital) e a conciliação da E.10.

#### D-E1 — As 6 séries são todas? Há memorando, circular ou instrução normativa?

- **Contexto.** As 6 séries hoje: Ofício, Portaria, Edital PRPG, Edital PRINT, Edital Lato Sensu
  e Edital Proficiência.
- **Recomendação.** Listar na oficina qualquer outro documento numerado. Uma série nova se cria
  no painel em 1 minuto (Expedientes → Séries).

#### D-E6 — Quem pode reservar número?

- **Contexto.** Hoje 12 pessoas escrevem na planilha. No sistema, reservam Administrador e
  Gestor.
- **Opções.** (a) Só a secretaria. (b) Qualquer servidor da PRPG com login.
- **Recomendação:** (b), mas só depois de criar os logins das pessoas que já expedem. A reserva é
  atômica e registra quem reservou, então abrir o acesso não cria risco de colisão.
- **Destrava:** E.3 completo, e a associação das 40 grafias de "Usuário" às pessoas.

#### D-E7 — A PRPG numera resoluções próprias, ou só encaminha minutas ao CEPE/CONSU?

- **Contexto.** Os dados sugerem só encaminhamento: o ofício 2025 nº 184 encaminha *minuta* de
  resolução do CEPE.
- **Recomendação.** Se for só encaminhamento, `RESOLUCAO` **não** é série da PRPG. A resolução
  entra como referência externa (o que já acontece nos atos da Câmara).

#### D-E8 — Há data de publicação no Boletim ou no DOU a controlar?

- **Recomendação.** Se houver, vira um campo de data do ato, além do link que já existe.
  Se não, nada muda.

#### D-E9 — O agrupamento por "seção" de resoluções e formulários (novo nesta oficina)

- **Contexto.** Registrado nas notas B.4/E.11 do `PLANO.md`. Desde a Fase F.4, a seção gravada é
  um valor do vocabulário `documento.secao`. Falta confirmar que esse agrupamento basta quando
  resoluções e formulários migrarem para atos e documentos.
- **Recomendação.** Confirmar que sim. A seção passa a ser o vocabulário, e a E.11 deixa de ter
  pergunta de modelo pendente.

### 4.3 Agenda de contatos

#### ★ D-G2 — A coluna `VICE-COORDENADOR(A)` é de vice formal ou de substituto eventual?

- **Contexto.** São 30 registros. As portarias da planilha de expedientes usam "substituto
  eventual".
- **Opções.** (a) Todos são vice formal. (b) Todos são substituto eventual. (c) Varia: é preciso
  classificar um a um.
- **Recomendação.** Uma resposta única, (a) ou (b), se a prática for uniforme. O sistema troca o
  papel dos 30 de uma vez.
- **Até lá:** entram como `VICE_COORDENADOR`, com pendência "papel a confirmar".

#### ★ D-G3 — O que significa `NOTA CAPES = 'A'` em 5 programas?

- **Opções.** Programa novo sem avaliação; aguardando a quadrienal; ou outra escala (mestrado
  profissional).
- **Recomendação.** Se for "sem avaliação ainda", guardar vazio e marcar "em avaliação" na
  situação do programa. Não inventar uma nota.
- **Até lá:** a nota entra como o texto `A`, sem conversão, com pendência.

#### ★ D-G4 — O PROEF está no sistema e não na planilha: foi descredenciado?

- **Recomendação.** Se foi, registrar a data de descredenciamento (o campo já existe). Se só
  ficou de fora do levantamento, completar os contatos.

#### ★ D-G5 — Os programas da UFAPE (PPCIAM, PROFLETRAS, PPGSRAP) continuam sob a Câmara da PRPG?

- **Contexto.** A UFAPE se desmembrou da UFRPE. **É decisão institucional, não técnica.**
- **Opções.** (a) Continuam: entram no cadastro com instituição própria. (b) Não continuam: saem
  da agenda.
- **Até lá:** **nenhum programa é criado automaticamente.** As linhas ficam guardadas, com
  pendência, e entram assim que a decisão for registrada.

#### ★ D-G6 — PGCAP e PPGPA são programas novos ou nomes antigos de programas existentes?

- **Até lá:** ficam como no caso anterior: guardados, sem criar nada. A tela oferece "ligar a um
  programa existente".

#### D-G1 — Que tipos de contato aparecem no microsite por padrão?

- **Recomendação.** E-mail da coordenação e telefone da secretaria, sim. Celular e e-mail
  pessoal, nunca, salvo marcação individual explícita.
- **Até lá:** todo contato importado entra como **não público**. O microsite continua mostrando
  o que mostra hoje.
- **Destrava:** G.9, N.8, B.6.

#### D-G7 — Cada programa mantém os próprios contatos (pelo perfil Gestor de Programa)?

- **Recomendação.** Sim. A PRPG só confere. É o que evita a agenda desatualizar de novo.
- **Destrava:** G.3 com escopo de programa.

### 4.4 Pós-doutorado (PNPD)

#### ★ D-C3 — `ECOLOGIA` (5 registros): que programa é esse?

- **Opções.** Programa descredenciado; o atual "Biodiversidade"; ou o nome antigo de outro.
- **Até lá:** os 5 entram **sem programa**, com a grafia original guardada e pendência. A tela
  permite escolher o programa uma vez para os 5.

#### ★ D-C8 — Os 3 registros sem período e os 4 com fim em aberto: o que são?

- **Opções.** Ativos sem prazo definido; cadastros incompletos; registros a descartar.
- **Recomendação.** Tratar como cadastro incompleto e completar as datas a partir do processo. Só
  descartar o que se confirmar que nunca começou.
- **Até lá:** entram sem as datas que faltam, com o texto original e pendência. Não são contados
  como vigentes nem como encerrados.

#### ★ D-C9 — Períodos sobrepostos da mesma pessoa: erro ou prorrogação?

- **Contexto.** Dois casos de sobreposição (a lista aparece na tela de revisão), além de 5 CPFs
  com duas linhas cada.
- **Opções.** (a) Prorrogação: o segundo registro vira renovação do primeiro. (b) Erro de
  digitação: corrige-se a data.
- **Até lá:** os dois registros entram como estão, com pendência. A renovação é só **sugerida**,
  nunca aplicada automaticamente.

#### D-C1 — Existe resolução do CEPE sobre o estágio pós-doutoral? Com que prazo máximo e quantas renovações?

- **Destrava:** as regras de prazo que dependem de norma. Os marcos D-90/D-30/D+30/D+90 já
  funcionam sem ela.

#### D-C2 — Qual é o rito de aprovação? Toda solicitação vai à Câmara?

- **Recomendação.** Se todo estágio passa pela Câmara, o processo vira campo obrigatório no
  cadastro novo. Os importados continuam aceitando processo vazio.

#### D-C4 — Existe planilha paralela de bolsistas PNPD a unificar?

- **Recomendação.** Se existir, trazer para a mesma importação, com modalidade "bolsista". O
  campo já existe.

#### D-C6 — Há exigência formal de relatório final? Com que prazo?

- **Destrava:** o sentido de "encerrado sem relatório" (pendência real ou só informativa).

#### D-C7 — A PRPG emite certificado de conclusão? Quem assina?

- **Destrava:** o certificado da C.7. A declaração de vínculo já existe.

#### D-K1 — Os pós-doutorandos podem aparecer no microsite? Com que campos?

- **Recomendação.** Nome, supervisor, período e título do projeto, com base no interesse público.
  Confirmar com o encarregado de dados antes de publicar.
- **Destrava:** K.5.

### 4.5 Transversais e de outros donos

| ID | Pergunta | Dono | Recomendação | Destrava |
|---|---|---|---|---|
| D-C5 | Há SMTP institucional disponível? | TI | Pedir uma conta de serviço (`naoresponda.prpg@…`). Até lá, o agendador registra os avisos **só no painel** (O.5) | e-mails das Fases I/J/L |
| D-R2 | Perfil público de docente: por padrão, ou só com consentimento? | encarregado de dados | ficha completa (contexto, opções, o que já está público hoje) em [`decisoes-pendentes-conexoes-n.md`](decisoes-pendentes-conexoes-n.md#ficha--d-r2-perfil-público-de-docente-é-visível-por-padrão-ou-só-com-consentimento) | N.4 |
| D-R4 | SEO: metadados injetados pelo servidor ou SSR? | equipe técnica | injeção pelo servidor agora | P.4 |
| D-R5 | Data desta oficina | Pró-Reitoria | o quanto antes | toda a Fase O |
| D-S1..D-S3 | Slugs dos microsites, preservar `/sites/default/files`, quando desligar cada Drupal | TI | ver [redirecionamentos-dominios-programas.md](redirecionamentos-dominios-programas.md) | S.6 |
| D-Z1, D-Z2 | Temporalidade (CONARQ) dos acervos da Câmara e do PNPD | arquivo/protocolo | registrar como dívida; não bloqueia | — |
| — | Política de Privacidade (minuta da H.7): prazo de guarda e contato do encarregado | encarregado de dados | validar antes de publicar | H.7 no ar |

---

## 5. Critério para aposentar cada planilha

Proposto para a oficina **validar**. Está implementado na tela "Revisão da importação"
(Fase O.4):

1. **Importação inicial** feita e revisada. Nenhuma pendência ★ aberta na planilha.
2. **Um ciclo em paralelo:** a equipe registra no sistema **e** na planilha. O ciclo de cada
   planilha:

   | Planilha | Ciclo proposto |
   |---|---|
   | Câmara | da reunião seguinte à importação até a reunião depois dela (~1 mês) |
   | Expedientes | 1 mês corrido |
   | Contatos | 1 mês corrido, ou até a próxima troca de coordenação, o que vier primeiro |
   | PNPD | 1 mês corrido |

3. **Sem divergência:** ao fim do ciclo, a simulação da importação é rodada de novo com a
   planilha do dia. Ela não pode ter linha nova (algo registrado só na planilha) nem linha
   alterada depois da importação.
4. **Só leitura:** a planilha é trancada para edição e arquivada, **nunca apagada**. O arquivo
   original fica guardado no sistema desde a importação.

Se houver divergência, o ciclo recomeça depois de conciliar as diferenças.

---

## 6. Folha de respostas

Preencher durante a oficina. "Decidido por" é o nome ou cargo de quem respondeu.

| ID | Resposta | Decidido por | Observação |
|---|---|---|---|
| D-B1 | verde-escuro = … · verde-claro = … · rosa = … · amarelo = … · azul = … · vermelho = … | | |
| D-G8 | | | |
| D-J1 | | | |
| D-J2 | | | |
| D-J3 | | | |
| D-L1 | | | |
| D-E1 | | | |
| D-E2 | | | |
| D-E3 | | | |
| D-E5 | | | |
| D-E6 | | | |
| D-E7 | | | |
| D-E8 | | | |
| D-E9 | | | |
| D-G1 | | | |
| D-G2 | | | |
| D-G3 | | | |
| D-G4 | | | |
| D-G5 | | | |
| D-G6 | | | |
| D-G7 | | | |
| D-C1 | | | |
| D-C2 | | | |
| D-C3 | | | |
| D-C4 | | | |
| D-C6 | | | |
| D-C7 | | | |
| D-C8 | | | |
| D-C9 | | | |
| D-K1 | | | |
| Critério §5 | aprovado / ajustado: … | | |

---

## 7. Conferências de dado (não são decisões)

Dados em que duas fontes divergem, encontrados nas fases anteriores. Basta confirmar qual está
certo:

- **Coordenação de Internacionalização:** a página antiga "Equipe" citava uma pessoa; "Estrutura"
  e "Sobre a Internacionalização" citavam outra. Ficou a segunda (nota da Fase H.4).
- **E-mail do Lato Sensu:** `latosensu@` × `latosensu.prpg@`. Ficou o segundo.
- **E-mail da secretaria:** `sec.prpg@` (no setor) × `secretaria.prpg@` (no topo do site).
- **Celulares e WhatsApp de servidores** publicados em "Equipe": revisar à luz da LGPD. Dá para
  desmarcar "No site" em "Equipe e estrutura".
