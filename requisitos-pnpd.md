# Requisitos e Plano de Implementação — Módulo Pós-Doutorado (PNPD Voluntário)

> **Objetivo**: substituir a planilha `PNPD Voluntário.xlsx`, hoje usada pela secretaria da
> PRPG para controlar os pós-doutorandos voluntários da UFRPE, por um mini-sistema dentro do
> painel administrativo já existente (React + Express + PostgreSQL), **reaproveitando ao
> máximo o módulo Câmara de Pós-Graduação, o cadastro de programas/pessoas e o padrão de
> declaração com QR code da Proficiência** — todos já implementados.
>
> **Status deste documento**: planejamento. Nenhuma linha de código foi escrita.
> Documento elaborado em 26/07/2026 a partir da análise programática do arquivo real e de
> contribuições de especialistas em administração pública, eficiência operacional (BPM),
> gestão documental/arquivística, gestão de pós-graduação (CAPES/Sucupira) e desenho de
> sistemas internos.
>
> Documento irmão: [`requisitos-camara.md`](requisitos-camara.md). As convenções, o vocabulário
> e as decisões de arquitetura daquele documento valem aqui, e são citadas quando aplicáveis.
>
> ---
>
> ⚠️ **ATUALIZAÇÃO (26/07/2026) — o §8 (modelo de dados) e o §14 (plano de fases) deste
> documento foram substituídos por [`arquitetura-dados.md`](arquitetura-dados.md).**
>
> Uma revisão de arquitetura posterior generalizou `camara_processos` → `processos`,
> `camara_eventos` → `eventos`, unificou `users`/`pessoas` numa identidade única e criou o
> núcleo compartilhado (`arquivos`/`anexos`, `atos`, `declaracoes`, `unidades`). Sobre essa
> fundação, a tabela `pos_doutorados` cai de 45 para 20 colunas e a tabela `posdoc_eventos`
> deixa de existir.
>
> **Continuam válidos e são a especificação vigente**: o diagnóstico (§1), os problemas (§2),
> os riscos (§3), o ciclo de vida (§6), os vocabulários (§7), a API (§9), as telas (§10), os
> artefatos (§11), os indicadores (§12), as regras de migração (§13), os testes (§15), a
> gestão da mudança (§16) e as decisões pendentes (§17).

---

## Sumário

1. [Diagnóstico da planilha atual](#1-diagnóstico-da-planilha-atual)
2. [Problemas identificados](#2-problemas-identificados)
3. [Riscos de conformidade e continuidade](#3-riscos-de-conformidade-e-continuidade)
4. [A mudança conceitual central](#4-a-mudança-conceitual-central)
5. [O que já existe no sistema e será reaproveitado](#5-o-que-já-existe-no-sistema-e-será-reaproveitado)
6. [Ciclo de vida do estágio pós-doutoral](#6-ciclo-de-vida-do-estágio-pós-doutoral)
7. [Vocabulários controlados](#7-vocabulários-controlados)
8. [Modelo de dados proposto](#8-modelo-de-dados-proposto)
9. [API — rotas e permissões](#9-api--rotas-e-permissões)
10. [Telas do painel administrativo](#10-telas-do-painel-administrativo)
11. [Artefatos gerados (PDF/XLSX)](#11-artefatos-gerados-pdfxlsx)
12. [Indicadores](#12-indicadores)
13. [Migração do acervo](#13-migração-do-acervo)
14. [Plano de implementação em fases](#14-plano-de-implementação-em-fases)
15. [Testes](#15-testes)
16. [Gestão da mudança e riscos do projeto](#16-gestão-da-mudança-e-riscos-do-projeto)
17. [Decisões pendentes](#17-decisões-pendentes)

---

## 1. Diagnóstico da planilha atual

Arquivo analisado: `PNPD Voluntário.xlsx` (29 KB, **1 aba** `Plan1`, 292 linhas de grade,
**95 registros reais** nas linhas 2 a 96).

### 1.1 Estrutura

Uma tabela única, sem filtro automático, sem validação de dados, sem formatação condicional,
sem comentários. Colunas:

| Col | Cabeçalho | Preenchidas | Vazias |
|---|---|---|---|
| A | `NOME` | 95 | 0 |
| B | `CPF` | 90 | **5** |
| C | ` PERÍODO` (com espaço à esquerda) | 92 | 3 |
| D | `PROGRAMA` | 94 | 1 |
| E | `ORIENTADOR` | 95 | 0 |
| F | `PROJETO` | 95 | 0 |
| G | `PROCESSO` | 94 | 1 |
| H | `Ativo?` | **6** | **89** |
| I | *(sem cabeçalho, vazia)* | 0 | 95 |
| J | `Ativos` (rótulo em J1, fórmula em J3) | 1 | — |

**Não há**: e-mail, telefone, nacionalidade, data de nascimento, modalidade (voluntário vs.
bolsista), agência de fomento, vínculo de origem, número de portaria, anexos (plano de
trabalho, termo de compromisso, relatório final), data de entrega do relatório, quem cadastrou,
quando foi alterado.

### 1.2 A contagem de ativos está errada

A célula `J3` contém `=COUNTIF(H48:H1001, "Sim")` e retorna **4**.

Três defeitos somados:

1. **A faixa começa em H48.** Os 46 primeiros registros ficam fora da conta.
2. **A coluna H quase não é preenchida** — 6 de 95 registros (`Sim` 4, `Não` 2). Os outros 89
   estão em branco, o que a fórmula lê como "não ativo".
3. **A vigência é derivável da coluna `PERÍODO` e ninguém a deriva.** Calculando as datas dos
   95 registros: **60 encerrados, 23 vigentes hoje (26/07/2026) e 2 com início futuro**
   (10 não são parseáveis — ver §1.4).

> **A planilha diz que há 4 pós-doutorandos ativos. Há 23.** Esse número sozinho justifica o
> projeto: é o dado que a PRPG informa a coordenações, à CAPES e a auditorias.

O painel congelado está em `A64` — ou seja, as 63 primeiras linhas ficam permanentemente
travadas na tela. O cabeçalho não acompanha a rolagem; a planilha é operada às cegas a partir
do registro 64.

### 1.3 CPF: três formatos e perda silenciosa de dígitos

| Formato | Ocorrências |
|---|---|
| `NNN.NNN.NNN-NN` (texto formatado) | 58 |
| **Número puro, sem zeros à esquerda** | **27** |
| Fora de qualquer padrão | 5 |

Os 27 armazenados como número perdem o zero à esquerda de forma irreversível na exibição:
`5252951438` deveria ser `052.529.514-38`. Uma exportação para CSV entrega o CPF errado.

Os 5 fora de padrão são erros de digitação: `011435813-34` (falta um dígito no bloco),
`063.665-454-05` (hífen no lugar do ponto), `006.209.892.62` (ponto no lugar do hífen),
`138.520.238.66`, `273564758-71`.

**Um CPF tem dígito verificador inválido**: `599.576.874-04` (Edmilson José de Sá). Não existe
validação alguma na planilha, então o erro é invisível.

### 1.4 `PERÍODO`: campo-chave em texto livre, cinco gramáticas diferentes

| Padrão | Ocorrências | Exemplo |
|---|---|---|
| `dd/mm/aaaa a dd/mm/aaaa` | 53 | `05/02/2019 a 05/07/2019` |
| Mês por extenso | 24 | `maio de 2015 a dezembro de 2018` |
| `mm/aaaa` | 13 | `11/2021 A 11/2022` |
| Ano com 2 dígitos | 1 | `10/03/25 a 30/06/25` |
| Mês abreviado | 1 | `Nov/2025 a Out/2027` |

Somam-se as variações de separador (`a`, `A`, `até`, `at é`) e de caixa (`ABRIL/2025 a
MARÇO/2028`, `10 DE NOVEMBRO DE 2025 a 09 DE NOVEMBRO DE 2026`).

**10 registros não são parseáveis** por máquina nem por regra estável:

- 3 vazios (Rozeane Porto Diniz, Enjolras de Albuquerque Medeiros Lima, Carlos Geraldo Barreto Gonçalves);
- 4 com o fim em aberto — `Setembro de 2021 a`, `07/02/2025 a `, `07/02/2025 a `, `01/12/2023 a `;
- 1 com intervalo aberto por extenso — `Junho a Dezembro de 2021` (sem ano no início);
- **2 com datas que não existem no calendário**: `01/04/2022 a 31/04/2024` (abril não tem 31)
  e `01/10/2019 até 31/09/2024` (setembro não tem 31).

### 1.5 `PROGRAMA`: 29 grafias para o mesmo conjunto de PPGs

O sistema já tem a tabela `programas` com 42 programas cadastrados. Conferindo as 29 grafias
da planilha contra ela:

- **23 casam automaticamente** (por nome exato normalizado ou por sigla) — inclusive
  `Renorbio` → *Biotecnologia*, `RENOEN` → *Ensino – Rede Nordeste de Ensino*,
  `FITOPATOLOGIA` → *Fitopatologia*.
- **6 não casam** e exigem de-para manual:

| Grafia na planilha | Provável correspondente | Observação |
|---|---|---|
| `Agronomia - Melhoramento Genético de Plantas` | Melhoramento Genético de Plantas | prefixo obsoleto |
| `Biometria  Estatística Aplicada` | Biometria e Estatística Aplicada | falta o "e", espaço duplo |
| `Educação, Cultura e Identidades` | Educação, Culturas e Identidades | singular/plural |
| `PROGEL` | Estudos da Linguagem (a confirmar) | sigla não cadastrada |
| `Departamento de Pesca e Aquicultura` | Recursos Pesqueiros e Aquicultura (a confirmar) | **é um departamento, não um PPG** |
| `ECOLOGIA` (5 registros) | — | **não existe PPG com esse nome na base atual** |

Há ainda duplicação por caixa dentro da própria planilha: `HISTÓRIA`/`História`,
`Medicina Veterinária`/`Medicina veterinária`. Qualquer tabela dinâmica conta cada uma
separadamente.

### 1.6 `ORIENTADOR`: 70 nomes em texto livre

Sem vínculo com `pessoas`, `users` ou `vinculos` — que já contêm os docentes dos programas.
Dois registros trazem **dois nomes no mesmo campo** (`Moacyr Cunha Filho e Neide Kazue
Sakugawa Shinohara`; `Péricles de Albuquerque Melo Filho e Manoel Adrião Gomes Filho`), o que
é cossupervisão registrada como concatenação de string. Grafias divergentes do mesmo docente
(`Mauro de Melo Júnior` / `Mauro de Melo Junior`; `Ana Lúcia Figueiredo Porto` / `Ana Lucia
Figueiredo Porto`) impedem contar quantos pós-docs cada supervisor acumula.

### 1.7 `PROCESSO`: o elo perdido com o módulo que já existe

| Formato | Ocorrências |
|---|---|
| NUP completo `23082.NNNNNN/AAAA-DD` | 85 |
| Formato curto pré-SEI `NNNN/AAAA` | 9 |
| Vazio | 1 |

Dois processos aparecem em duas linhas cada:

- `23082.007791/2022-55` → **duas pessoas distintas** (Joelson Moreno Brito de Moura e
  Risoneide Henriques da Silva, mesmo supervisor). Um processo instruiu dois pós-doutorados.
- `23082.006637/2023-47` → **mesma pessoa, dois períodos** (Vanessa Hasson de Oliveira).

Isso define a cardinalidade real: **N registros de pós-doutorado : 1 processo** — nunca 1:1.

### 1.8 Renovações registradas como pessoas repetidas

Cinco CPFs aparecem em duas linhas. Não são duplicatas: são **renovações ou novos estágios**,
e a planilha não tem como distinguir uma coisa da outra:

| Pessoa | Registro 1 | Registro 2 |
|---|---|---|
| Simone Santos Lira Silva | 07/2021–12/2024, Biodiversidade | 09/2025–08/2026, Melhoramento Genético |
| Leandro Fragoso Lins | 07/06/2022–30/11/2023, RENORBIO | 01/12/2023–?, Biotecnologia |
| Felipe José Cury Fracetto | 01/04/2022–31/04/2024, Ciência do Solo | 06/2023–06/2024, Ciência do Solo (**períodos sobrepostos, supervisores diferentes**) |
| Vanessa Hasson de Oliveira | 03/2023–03/2026, *sem programa* | 09/2023–08/2024, Medicina Veterinária (**mesmo processo**) |
| Jéssica Rafaella de Sousa Oliveira | 15/09/2023–01/12/2024 | 01/07/2024–30/06/2026 (**sobrepostos**) |

Três casos têm períodos sobrepostos — ou é erro de digitação, ou é prorrogação registrada como
estágio novo. Hoje é impossível saber.

### 1.9 Volume

95 registros históricos, ~23 vigentes, entrada estimada de 10 a 20 por ano.
**Volume baixo, criticidade documental e informacional alta.** Igual à Câmara: é caso para um
CRUD bem desenhado com histórico append-only, não para motor de workflow.

---

## 2. Problemas identificados

| # | Problema | Consequência |
|---|---|---|
| P1 | Vigência não é derivada das datas; coluna `Ativo?` 94% vazia | **a PRPG informa 4 ativos quando há 23** |
| P2 | Fórmula `COUNTIF(H48:H1001)` ignora os 46 primeiros registros | o único indicador da planilha está errado por construção |
| P3 | `PERÍODO` em texto livre com 5 gramáticas | não filtra, não ordena, não alerta vencimento |
| P4 | 2 datas inexistentes no calendário (`31/04`, `31/09`) | erro invisível; quebra qualquer importação |
| P5 | CPF em 3 formatos; 27 como número perdem o zero à esquerda | dado pessoal **corrompido silenciosamente** |
| P6 | 1 CPF com dígito verificador inválido; sem validação | identificação errada de pessoa em documento oficial |
| P7 | `PROGRAMA` em texto livre: 29 grafias, 6 sem correspondência | não agrupa por programa; duplica `HISTÓRIA`/`História` |
| P8 | `ORIENTADOR` em texto livre: 70 nomes, cossupervisão concatenada | não se sabe a carga de supervisão por docente |
| P9 | Sem vínculo com `camara_processos` | o processo que aprovou o pós-doc já está (ou estará) no sistema, e os dois não se falam |
| P10 | Renovação indistinguível de novo estágio; 3 períodos sobrepostos | não se responde "quantos estágios essa pessoa fez aqui" |
| P11 | Nenhum campo de relatório final, portaria, plano de trabalho ou anexo | o encerramento do estágio não é controlado |
| P12 | Sem alerta de vencimento | renovação e entrega de relatório dependem de alguém lembrar |
| P13 | Sem autoria/data de alteração | não se sabe quem cadastrou nem quando mudou |
| P14 | 90 CPFs num arquivo `.xlsx` que circula por e-mail/Downloads | exposição LGPD sem controle de acesso |
| P15 | Sem e-mail/contato do pós-doutorando | qualquer comunicação exige garimpar o processo no SIPAC |
| P16 | Dado invisível para o resto da instituição | coordenações e microsites de programa não enxergam seus pós-docs; Sucupira é preenchida do zero |

**Esforço manual recuperável estimado: 3 a 5 h/mês** — conferência de quem está vigente
(1-2 h), atendimento a pedidos de declaração e de "quantos pós-docs temos" (1 h), busca de
registro individual (30 min), correção de digitação e conciliação com o SIPAC (1 h). O ganho
maior, como na Câmara, não é hora: é **parar de publicar número errado** e recuperar o controle
do encerramento dos estágios.

---

## 3. Riscos de conformidade e continuidade

Levantados pela análise de administração pública e de gestão documental:

- **Informação oficial incorreta.** O número de pós-doutorandos ativos é informado a
  coordenações, à CAPES (Coleta Sucupira), a relatórios de gestão e ao controle interno. A
  planilha entrega 4 onde há 23. Informação de gestão errada em documento oficial é achado de
  auditoria, não detalhe de forma.

- **LGPD (Lei 13.709/2018).** 90 CPFs, nomes completos e vínculos institucionais num arquivo
  `.xlsx` sem controle de acesso, versionamento ou registro de quem o leu, ferem os princípios
  de segurança e de necessidade (art. 6º, VII e III) e a obrigação do art. 46. O tratamento
  pelo poder público é lícito (art. 23), mas exige finalidade declarada, minimização e acesso
  controlado. **E há corrupção do dado**: 27 CPFs sem o zero à esquerda são dado pessoal
  incorreto, o que aciona também o direito de retificação (art. 18, III).

- **Rastreabilidade do ato (Lei 9.784/1999, arts. 22 e 50).** O estágio pós-doutoral nasce de
  um ato administrativo — aprovação pelo colegiado do PPG, deliberação da Câmara, portaria de
  designação. A planilha guarda o número do processo e mais nada: não registra a data da
  aprovação, quem aprovou, qual portaria, se houve prorrogação formal. A memória do ato mora
  no SIPAC e nunca é trazida para o controle.

- **Encerramento sem prestação de contas.** 60 estágios encerrados e nenhum campo de relatório
  final. Não é possível dizer quantos pós-doutorandos concluíram regularmente, quantos
  entregaram relatório, quantos abandonaram. Para um programa cujo produto é produção
  científica associada à UFRPE, isso é perda direta de indicador.

- **Continuidade.** O conhecimento de "quem está ativo de verdade" é reconstruído mentalmente
  a cada consulta por uma pessoa. Férias ou saída dessa pessoa param o controle. *Bus factor* = 1,
  exatamente como na Câmara.

> **Delimitação obrigatória**, igual à da Câmara: o SIPAC é o sistema oficial dos autos. Este
> módulo é o **controle interno da PRPG sobre os estágios pós-doutorais**. Isso deve estar
> escrito na interface e no rodapé de todo PDF gerado.

---

## 4. A mudança conceitual central

> Hoje a **linha da planilha** é a entidade: uma pessoa, um período e um projeto, tudo colado.
>
> No sistema, a entidade é o **estágio pós-doutoral** — um vínculo temporário com início, fim,
> supervisor, projeto e situação derivada das datas. A **pessoa** é uma entidade separada e
> reutilizável; o **processo** é uma entidade que **já existe no sistema** (`camara_processos`)
> e passa a ser referenciada, não redigitada.

Consequências diretas:

- **`Ativo?` deixa de ser digitado e passa a ser calculado.** `situacao` é derivada de
  `data_inicio`/`data_fim` (com override manual explícito para interrupções). P1 e P2 morrem aqui.
- **Renovação vira encadeamento** (`renovacao_de_id`), não linha repetida. P10 morre aqui.
- **`PROGRAMA` e `ORIENTADOR` viram chaves estrangeiras** para `programas` e para
  `users`/`pessoas`. P7 e P8 morrem aqui.
- **`PROCESSO` vira FK para `camara_processos`**, e a ficha do pós-doc passa a mostrar a linha
  do tempo do processo — relatoria, pauta, deliberação, resolução — sem redigitar nada. P9
  morre aqui.
- **O período vira duas datas ISO**, com o texto original preservado ao lado
  (`periodo_original`) e um marcador de precisão (`data_inicio_aprox`) para os 24 casos em que
  a planilha só registrou mês/ano. **Nada é descartado.**

---

## 5. O que já existe no sistema e será reaproveitado

Esta é a resposta direta à pergunta "dá para aproveitar os tipos de conteúdo que já temos?".
**Sim — e mais do que parece.** O módulo Câmara de Pós-Graduação (Fases 0 e 1, já em produção)
resolve metade do problema.

| Ativo existente | Onde está | Como é reaproveitado no PNPD |
|---|---|---|
| **`camara_processos`** | `schema.sql`, `camaraController.js` | O processo do pós-doc **é** um processo da Câmara. 85 dos 95 já têm NUP completo. `pos_doutorados.processo_id` referencia a tabela; a ficha do pós-doc mostra tramitação, relator, pauta e ato sem duplicar nada. Basta acrescentar `POS_DOUTORADO` ao vocabulário `tipo_materia`. |
| **`camara_eventos`** (append-only) | `camaraRepo.js` | Padrão copiado para `posdoc_eventos` (mesma forma, mesmo repositório). A ficha **funde as duas linhas do tempo** na exibição. |
| **`camara_atos`** | `schema.sql` | A portaria/resolução que homologa o estágio já tem onde morar, ligada ao processo. |
| **Validação de NUP** (`validarNumeroProcesso`, `NUP_REGEX`) | `camaraController.js:67` | Reutilizada tal e qual, inclusive a política de **aviso e nunca bloqueio** — os 9 processos em formato curto entram com `numero_valido = false`. |
| **`programas`** (42 cadastrados) | `schema.sql` | `programa_id` substitui as 29 grafias livres. 23 casam automaticamente. |
| **`pessoas`** e **`users`** | `schema.sql` | Pós-doutorando e supervisor viram pessoas de verdade. `pessoas` para quem não precisa de login (o caso normal), `users` quando houver acesso ao painel — o mesmo polimorfismo já usado em `vinculos.pessoa_id`. |
| **`vinculos`** | `schema.sql`, `programasController.js:684` | Novo papel `POS_DOUTORANDO` na família `PAPEIS_DISCENTE`. Ganha-se de graça: listagem no microsite do programa, tela `AdminProgramaDiscentes`, contagem por programa. |
| **`portarias`** | `portariasController.js` | `vinculos.portaria_id` já existe. A portaria de designação do pós-doc é cadastrada uma vez e referenciada. |
| **Declaração com QR + código de verificação** | `proficienciaController.js`, `src/pages/DeclaracaoProficiencia.jsx` | **O maior ganho isolado.** O padrão completo (UUID de verificação, `emitida_em` congelada, QR apontando para rota pública, endpoint `verificar*` com CPF mascarado) é replicado para a **declaração de vínculo** e o **certificado de conclusão** do pós-doutorado — documentos que a secretaria emite hoje à mão, um a um. |
| **`pdfkit` + `qrcode` + `xlsx`** | `package.json`, `camaraPdf.js` | Já são dependências. Nenhuma biblioteca nova para PDF ou planilha. |
| **`/api/upload`** (15 MB, PDF/imagem, allowlist) | `adminRoutes.js` | Plano de trabalho, termo de compromisso, relatório final e diploma de doutorado. |
| **`taxonomia_refs`** e tela de Taxonomias | `taxonomiaRefsController.js`, `AdminTaxonomias.jsx` | De-para de grafias históricas (as 6 de programa, as de supervisor) sem código *hardcoded*. |
| **Componentes de painel** | `src/components/admin/` | `BulkActions` (seleção em massa), `ConfirmModal`, `Toast`, `AdminUI` (`TableSkeleton`, `EmptyRow`), `AuditInfo`. A tela de lista nasce pronta. |
| **`createRepository`** | `db/repository.js` | CRUD de tabela única com auditoria (`criado_por`/`atualizado_por`) automática. |
| **Papéis e middleware** | `authMiddleware.js` | `Administrator`, `Gestor`, `GestorPrograma` (escopado) — o mesmo desenho de permissão da Câmara. |
| **`importers/`** | `server/services/importers/` | Estrutura de importador já estabelecida (`alunosImporter.js`, `professoresImporter.js`). |

### 5.1 O que **não** deve ser reaproveitado, e por quê

- **Não modelar o pós-doutorado como um `camara_processos` com `tipo_materia` especial.**
  Tentador, mas errado: um processo instruiu **dois** pós-doutorados diferentes
  (§1.7), e uma pessoa teve **dois** períodos no mesmo processo. Forçar 1:1 quebraria já na
  importação. O estágio é a entidade; o processo é uma referência N:1.

- **Não estender `camara_eventos` com FK polimórfica.** A coluna `processo_id` é
  `NOT NULL REFERENCES camara_processos(id) ON DELETE CASCADE` e o módulo já está em produção.
  Trocá-la por `(entidade, entidade_id)` sacrificaria integridade referencial de um módulo
  funcionando para economizar uma tabela de 10 colunas. **Decisão: tabela irmã
  `posdoc_eventos`, idêntica em forma, fundida na leitura.** O custo é ~40 linhas; o benefício
  é não mexer no que funciona.

- **Não usar `vinculos` como registro principal do estágio.** `vinculos` não tem projeto,
  processo, relatório nem renovação — e serve a docentes, discentes e comissões. O `vinculo` é
  criado **em espelho** do estágio (para alimentar microsite e contagens), não no lugar dele.

---

## 6. Ciclo de vida do estágio pós-doutoral

### 6.1 Fluxo principal

```
Solicitação recebida (candidato + supervisor + plano de trabalho)
  → Em análise no programa (colegiado do PPG)
  → Aprovado no programa
  → Em processo (autuado no SIPAC → vira processo da Câmara)
  → Deliberado pela Câmara
  → Portaria/ato de designação publicado
  → VIGENTE                       [data_inicio … data_fim]
      ├→ Prorrogado / Renovado    [novo registro encadeado]
      └→ Interrompido             [desistência, óbito, quebra de termo]
  → Encerrado (fim do prazo)
  → Relatório final entregue
  → Certificado emitido
  → Arquivado
```

### 6.2 Situações que precisam ser estado de primeira classe

`EM_ANALISE` · `APROVADO` · `VIGENTE` · `PRORROGADO` · `ENCERRADO` ·
`ENCERRADO_SEM_RELATORIO` · `INTERROMPIDO` · `INDEFERIDO` · `CANCELADO`

**Regra de derivação** (o coração do módulo):

```
se situacao_manual definida  → usa situacao_manual   (INTERROMPIDO, INDEFERIDO, CANCELADO)
senão se data_inicio > hoje  → APROVADO (início futuro)
senão se data_fim >= hoje    → VIGENTE
senão se relatorio_entregue  → ENCERRADO
senão                        → ENCERRADO_SEM_RELATORIO
```

O campo `situacao_manual` é a válvula de escape: só ele é digitado, e só para o que as datas
não conseguem dizer. Tudo o mais é calculado a cada leitura — **nunca armazenado desatualizado**,
que foi exatamente o defeito da coluna `Ativo?`.

### 6.3 Marcos de prazo

- **D-90 antes de `data_fim`** — aviso ao programa: renovar ou encerrar?
- **D-30** — aviso de encerramento iminente.
- **D+30 depois de `data_fim`** — cobrança de relatório final.
- **D+90 sem relatório** — pendência registrada; certificado bloqueado.

---

## 7. Vocabulários controlados

Cada lista vira `enum` (validado no controller, coluna `TEXT` no banco) com tela de
administração e opção "outro (especificar)" — mesma política do §6 da Câmara: **sem a válvula,
tudo volta para o campo livre.**

**Modalidade**: `VOLUNTARIO` (o caso desta planilha) · `BOLSISTA_PNPD_CAPES` ·
`BOLSISTA_FACEPE` · `BOLSISTA_CNPQ` · `BOLSISTA_OUTRA_AGENCIA` · `SENIOR` · `EMPRESARIAL`.

> A planilha só controla voluntários. O campo existe desde o dia 1 para que a PRPG possa
> **unificar aqui o controle dos bolsistas** — hoje, presumivelmente, em outra planilha
> (ver §17, decisão 4).

**Vínculo de origem do pós-doutorando**: `SEM_VINCULO` · `DOCENTE_OUTRA_IES` ·
`SERVIDOR_UFRPE` · `SERVIDOR_OUTRO_ORGAO` · `PROFISSIONAL_LIBERAL` · `ESTRANGEIRO_VISITANTE`.

**Situação**: ver §6.2.

**Tipos de anexo**: `PLANO_TRABALHO` · `TERMO_COMPROMISSO` · `DIPLOMA_DOUTORADO` ·
`CURRICULO_LATTES` · `ATA_COLEGIADO` · `PORTARIA` · `RELATORIO_PARCIAL` · `RELATORIO_FINAL` ·
`OUTRO`.

**Motivos de interrupção**: `DESISTENCIA` · `APROVACAO_EM_CONCURSO` · `MUDANCA_INSTITUICAO` ·
`DESCUMPRIMENTO_PLANO` · `SAUDE` · `OBITO` · `OUTRO`.

**Tipos de evento** (linha do tempo): `SITUACAO` · `PRORROGACAO` · `RELATORIO` · `ANEXO` ·
`PORTARIA` · `PROCESSO` · `NOTA` · `COBRANCA` · `CERTIFICADO`.

---

## 8. Modelo de dados proposto

> ⚠️ **SUPERADO por [`arquitetura-dados.md`](arquitetura-dados.md) §5.11.** O modelo abaixo
> assume o schema anterior à harmonização (com `camara_processos`, `users`/`pessoas` separados
> e sem núcleo compartilhado). Está mantido como registro do raciocínio — em especial o §5.1,
> que explica por que o pós-doutorado **não** pode ser modelado como um processo (cardinalidade
> N:1 comprovada nos dados). O modelo vigente é o do documento de arquitetura.

Segue as convenções do projeto (`server/db/schema.sql`): IDs `TEXT`, datas simples como
`TEXT 'YYYY-MM-DD'`, *timestamps* `TIMESTAMPTZ`, auditoria `criado_por`/`atualizado_por`,
objetos aninhados genuinamente livres em `JSONB`.

```sql
-- ===================== Pós-Doutorado (PNPD) =====================

-- Estágio pós-doutoral: a entidade central. Uma pessoa pode ter vários
-- (renovações e novos estágios), encadeados por renovacao_de_id.
CREATE TABLE IF NOT EXISTS pos_doutorados (
  id                    TEXT PRIMARY KEY,

  -- ----- Pessoa (polimórfico users.id | pessoas.id, como em vinculos) -----
  pessoa_id             TEXT,
  nome                  TEXT NOT NULL,      -- desnormalizado: acervo histórico sem cadastro
  cpf                   TEXT,               -- SEMPRE 11 dígitos, sem máscara
  cpf_valido            BOOLEAN DEFAULT TRUE, -- FALSE = dígito verificador não confere (aviso)
  email                 TEXT,
  telefone              TEXT,
  estrangeiro           BOOLEAN DEFAULT FALSE,
  nacionalidade         TEXT,
  lattes_url            TEXT,
  orcid                 TEXT,

  -- ----- Vínculo acadêmico -----
  programa_id           TEXT REFERENCES programas(id) ON DELETE SET NULL,
  programa_original     TEXT,               -- grafia da planilha, preservada na íntegra
  supervisor_id         TEXT,               -- users.id | pessoas.id
  supervisor_nome       TEXT NOT NULL,      -- desnormalizado (70 nomes históricos)
  cossupervisor_id      TEXT,
  cossupervisor_nome    TEXT,               -- resolve os 2 casos "Fulano e Beltrano"
  projeto_titulo        TEXT NOT NULL,
  projeto_resumo        TEXT,
  linha_pesquisa_id     TEXT REFERENCES linhas_pesquisa(id) ON DELETE SET NULL,

  -- ----- Modalidade e fomento -----
  modalidade            TEXT NOT NULL DEFAULT 'VOLUNTARIO',
  agencia_fomento       TEXT,
  vinculo_origem        TEXT,
  instituicao_origem    TEXT,

  -- ----- Período (o que era a coluna PERÍODO) -----
  data_inicio           TEXT,               -- 'YYYY-MM-DD'
  data_fim              TEXT,
  data_inicio_aprox     BOOLEAN DEFAULT FALSE, -- TRUE quando a origem só deu mês/ano
  data_fim_aprox        BOOLEAN DEFAULT FALSE,
  periodo_original      TEXT,               -- texto íntegro da planilha (auditoria)

  -- ----- Situação -----
  -- situacao NÃO é armazenada: é derivada das datas na leitura (§6.2).
  -- Só o override manual mora no banco.
  situacao_manual       TEXT,               -- INTERROMPIDO|INDEFERIDO|CANCELADO|...
  situacao_motivo       TEXT,
  situacao_data         TEXT,

  -- ----- Processo e atos (reaproveita o módulo Câmara) -----
  processo_id           TEXT REFERENCES camara_processos(id) ON DELETE SET NULL,
  processo_numero       TEXT,               -- cache do NUP; é o que a planilha tinha
  processo_valido       BOOLEAN DEFAULT TRUE, -- FALSE = formato curto pré-SEI
  portaria_id           TEXT REFERENCES portarias(id) ON DELETE SET NULL,
  data_aprovacao_colegiado TEXT,
  data_deliberacao_camara  TEXT,

  -- ----- Encerramento -----
  renovacao_de_id       TEXT REFERENCES pos_doutorados(id) ON DELETE SET NULL,
  relatorio_entregue_em TEXT,
  relatorio_url         TEXT,
  -- Certificado/declaração: mesmo padrão da proficiência (código congelado na
  -- 1ª emissão para que a reemissão seja idêntica e verificável).
  certificado_codigo    TEXT UNIQUE,
  certificado_emitido_em TIMESTAMPTZ,

  -- ----- Livre -----
  anexos                JSONB DEFAULT '[]'::jsonb, -- [{tipo,nome,url,enviadoEm,enviadoPor}]
  observacoes           TEXT,

  criado_em             TIMESTAMPTZ DEFAULT now(),
  atualizado_em         TIMESTAMPTZ DEFAULT now(),
  criado_por            TEXT,
  atualizado_por        TEXT
);
CREATE INDEX IF NOT EXISTS posdoc_programa_idx  ON pos_doutorados(programa_id);
CREATE INDEX IF NOT EXISTS posdoc_fim_idx       ON pos_doutorados(data_fim);
CREATE INDEX IF NOT EXISTS posdoc_cpf_idx       ON pos_doutorados(cpf);
CREATE INDEX IF NOT EXISTS posdoc_processo_idx  ON pos_doutorados(processo_id);

-- Histórico append-only. Espelha camara_eventos (§5.1): nada é atualizado
-- ou apagado. A ficha funde esta linha do tempo com a do processo vinculado.
CREATE TABLE IF NOT EXISTS posdoc_eventos (
  id            TEXT PRIMARY KEY,
  posdoc_id     TEXT NOT NULL REFERENCES pos_doutorados(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,  -- SITUACAO|PRORROGACAO|RELATORIO|ANEXO|PORTARIA|PROCESSO|NOTA|COBRANCA|CERTIFICADO
  data          TEXT NOT NULL,  -- data do fato, não do registro
  descricao     TEXT,
  anexo_url     TEXT,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  criado_por    TEXT
);
CREATE INDEX IF NOT EXISTS posdoc_ev_idx ON posdoc_eventos(posdoc_id, data);
```

### 8.1 Alterações em tabelas existentes

| Tabela | Alteração | Motivo |
|---|---|---|
| `programasController.PAPEIS_DISCENTE` | acrescentar `POS_DOUTORANDO` + rótulo `'Pós-doutorando(a)'` | faz o pós-doc aparecer no microsite e na tela de discentes do programa |
| `camaraController.STATUS_PROCESSO` | nenhuma | os status atuais já servem |
| *vocabulário* `tipo_materia` | acrescentar `POS_DOUTORADO_VOLUNTARIO` e `POS_DOUTORADO_BOLSISTA` | permite filtrar na Câmara "só os processos de pós-doc" |
| `taxonomia_refs` | *seed* com o de-para de programas (§1.5) e de supervisores | evita de-para *hardcoded* |

Nenhuma coluna existente muda de tipo ou de restrição. **A Fase 0 não toca em dado em produção.**

### 8.2 Repositórios

- `pos_doutorados` → fábrica `createRepository` (`server/db/repositories.js`), com
  `fromRow`/`toRow` no padrão camelCase.
- `posdoc_eventos` → repositório manual em `server/db/posdocRepo.js`, cópia estrutural de
  `camaraEventosRepo`.

### 8.3 Campos derivados (calculados, nunca armazenados)

| Campo | Cálculo |
|---|---|
| `situacao` | regra do §6.2 |
| `diasRestantes` | `data_fim − hoje` (negativo = encerrado há N dias) |
| `vencendo` | `0 <= diasRestantes <= 90` |
| `relatorioPendente` | `data_fim < hoje` e `relatorio_entregue_em IS NULL` |
| `duracaoMeses` | `data_fim − data_inicio` em meses |
| `renovacoes` | contagem da cadeia `renovacao_de_id` |
| `cpfMascarado` | `***.XXX.XXX-**` — o que aparece em listagem (LGPD) |

---

## 9. API — rotas e permissões

Prefixo `/api/pos-doutorado`. Papéis existentes: `Administrator`, `Gestor` (PRPG),
`GestorPrograma` (escopado ao próprio programa).

| Método | Rota | Papéis | Descrição |
|---|---|---|---|
| GET | `/vocabularios` | leitura | modalidades, situações, tipos de anexo, motivos |
| GET | `/` | Admin, Gestor, GestorPrograma¹ | lista com filtros (`situacao`, `programa`, `supervisor`, `modalidade`, `q`, `vencendo`, `semRelatorio`, `ano`) |
| GET | `/:id` | Admin, Gestor, GestorPrograma¹ | ficha completa (eventos próprios + eventos e dados do processo vinculado + cadeia de renovações) |
| POST | `/` | Admin, Gestor | cadastro |
| PUT | `/:id` | Admin, Gestor | edição |
| PATCH | `/:id/situacao` | Admin, Gestor | override manual de situação (gera evento) |
| POST | `/:id/prorrogar` | Admin, Gestor | cria o registro-filho já preenchido, com `renovacao_de_id` |
| POST | `/:id/relatorio` | Admin, Gestor | registra entrega do relatório final (gera evento) |
| POST | `/:id/anexos` | Admin, Gestor | anexa documento (usa `/api/upload`) |
| DELETE | `/:id/anexos/:anexoId` | Admin, Gestor | remove anexo |
| POST | `/:id/eventos` | Admin, Gestor | nota/cobrança manual |
| POST | `/:id/processo` | Admin, Gestor | **vincula a um `camara_processos` existente pelo NUP, ou cria um novo já com `tipo_materia = POS_DOUTORADO_*`** |
| DELETE | `/:id` | Admin | exclusão |
| GET | `/:id/declaracao` | Admin, Gestor | declaração de vínculo em PDF (com QR) |
| GET | `/:id/certificado` | Admin, Gestor | certificado de conclusão em PDF (com QR) — exige relatório entregue |
| GET | `/declaracoes/:codigo` | **público** | verificação do documento (padrão `verificarDeclaracao` da proficiência) |
| GET | `/indicadores` | Admin, Gestor | painel |
| GET | `/exportar.xlsx` | Admin, Gestor | exportação total com filtros aplicados |
| POST | `/importar` | Admin | importação da planilha (pré-visualização + confirmação) |
| GET | `/publico/programa/:slug` | **público** | pós-doutorandos vigentes do programa (sem CPF, sem contato) |

¹ `GestorPrograma` enxerga apenas registros com `programa_id` igual ao seu, e apenas leitura —
mesma implementação de `isProgramaScoped` já usada em `camaraController.js:100`.

Padrão do projeto a seguir: rotas específicas **antes** das genéricas `/:id`.

---

## 10. Telas do painel administrativo

Rotas em `src/pages/admin/`, registradas em `src/App.jsx`, item de menu em
`src/components/AdminLayout.jsx` (seção **Administração**, ícone `Microscope` ou `UserPlus`).

| Rota | Tela | Fase |
|---|---|---|
| `/admin/pos-doutorado` | **Lista** — tela-mãe | MVP |
| `/admin/pos-doutorado/novo`, `/admin/pos-doutorado/editar/:id` | formulário | MVP |
| `/admin/pos-doutorado/:id` | **Ficha** com linha do tempo e documentos | MVP |
| `/admin/pos-doutorado/importar` | importação da planilha | MVP (uso único) |
| `/admin/pos-doutorado/painel` | indicadores | Fase 4 |
| `/pos-doutorado/declaracao/:codigo` | verificação pública do documento | Fase 2 |

### 10.1 Lista (a tela que decide o projeto)

**Colunas, nesta ordem:**

1. `☐` seleção (`useBulkSelection` de `src/components/admin/BulkActions.jsx`)
2. **Nome** — clicável, abre a ficha. Abaixo, em cinza, o CPF **mascarado**.
3. **Situação** — badge nomeado, com faixa vertical de 3 px na borda esquerda da linha
   (o mesmo recurso da Câmara: preserva o *scan* visual de 1 segundo).
4. **Programa** — sigla, com o nome completo no `title`.
5. **Supervisor** — nome curto; vazio mostra botão fantasma "vincular".
6. **Período** — `01/09/2025 – 31/08/2026`, com `~` quando aproximado, e
   **"faltam 37 dias"** em âmbar quando `vencendo`.
7. **Processo** — NUP em fonte monoespaçada, linkando para a ficha do processo na Câmara
   (`/admin/camara/:id`) quando vinculado; `⚠` quando o número é de formato antigo.
8. **Renovações** — pílula `↻ 2º estágio` quando faz parte de uma cadeia.
9. `⋯` ações rápidas.

**Filtros**, em barra fixa no topo, com contadores reais:

- chips de situação — `Vigentes 23` · `Encerrados 60` · `A iniciar 2` · `Sem relatório N`
- selects de Programa, Supervisor e Modalidade
- chips-*toggle* `Vencendo em 90 dias` e `Relatório pendente`
- busca livre (nome, CPF, projeto, processo, supervisor), foco com `/`
- filtro de ano de vigência

**Padrão de abertura: vigentes primeiro, ordenados por `data_fim` crescente** — a lista já
responde "quem vence primeiro", que é a pergunta operacional real. Encerrados ocultos por padrão.

**Sem paginação.** São ~95 registros: lista inteira com cabeçalho fixo (e desta vez o
cabeçalho realmente fixo, ao contrário do `freeze A64` da planilha).

**Mapa de situação → badge:**

| Situação | Badge | Classe Tailwind |
|---|---|---|
| `VIGENTE` | **Vigente** | `bg-green-100 text-green-800` |
| `APROVADO` (início futuro) | **A iniciar** | `bg-sky-100 text-sky-800` |
| `EM_ANALISE` | **Em análise** | `bg-gray-100 text-gray-700` |
| `PRORROGADO` | **Prorrogado** | `bg-violet-100 text-violet-800` |
| `ENCERRADO` | **Encerrado** | `bg-slate-100 text-slate-700` |
| `ENCERRADO_SEM_RELATORIO` | **Sem relatório** | `bg-amber-100 text-amber-800` |
| `INTERROMPIDO` | **Interrompido** | `bg-rose-100 text-rose-800` |
| `INDEFERIDO` / `CANCELADO` | **Indeferido** | `bg-rose-100 text-rose-800` |

### 10.2 Velocidade de operação (requisito não negociável)

Vale integralmente o §9.2 da Câmara. Especificamente aqui:

- **Prorrogar em um clique** — `⋯ → Prorrogar` abre popover com apenas duas datas
  pré-preenchidas (início = dia seguinte ao fim atual; fim = +12 meses). Salvar cria o
  registro encadeado copiando pessoa, programa, supervisor e projeto. **Isso substitui a
  redigitação de uma linha inteira.**
- **Registrar relatório em um clique** — `⋯ → Relatório entregue`, data = hoje, opção de anexar
  o PDF na hora.
- **Emitir declaração em um clique** — botão direto na linha; o PDF baixa na hora.
- **Em massa** (`BulkActionBar`): exportar · marcar situação · gerar declarações em lote.
- **Com confirmação** (`useConfirm`): apenas excluir registro.

### 10.3 Ficha do pós-doutorado

Coluna larga + coluna lateral, sem abas:

- **Cabeçalho fixo** — nome, badge de situação, período com contagem regressiva, programa,
  botão "Emitir declaração".
- **Bloco Pessoa** — CPF (completo, só para Admin/Gestor), e-mail, telefone, nacionalidade,
  Lattes/ORCID.
- **Bloco Estágio** — supervisor e cossupervisor (com link para a ficha do docente), projeto,
  linha de pesquisa, modalidade, fomento, vínculo de origem.
- **Bloco Processo** — NUP, status atual do processo **puxado de `camara_processos`**, link
  para o SIPAC e para a ficha na Câmara, portaria de designação, data da deliberação.
  Quando não há processo vinculado: campo de busca por NUP + botão "criar processo na Câmara".
- **Linha do tempo unificada** — eventos próprios (`posdoc_eventos`) **fundidos** com os
  eventos do processo (`camara_eventos`), em ordem cronológica, distinguidos por ícone e por
  uma etiqueta discreta de origem (`estágio` / `processo`). É aqui que a história completa
  aparece pela primeira vez.
- **Lateral** — documentos (upload por arrastar), cadeia de renovações (estágio anterior /
  posterior), bloco de notas livre, `AuditInfo` (quem criou/alterou).

### 10.4 Entrada de dados sem atrito

- **CPF** — máscara automática, validação de dígito verificador como **aviso amarelo, nunca
  bloqueio** (há 1 CPF inválido no acervo real; travar o salvamento é a forma mais rápida de
  perder a usuária → grava `cpf_valido = FALSE`). **Normalização para 11 dígitos com zeros à
  esquerda é obrigatória e silenciosa.**
- **Período** — dois campos de data, **mais** um campo "colar período" que aceita o texto no
  formato da planilha (`maio de 2021 a maio de 2022`) e preenche as duas datas marcando
  `aprox = true`. Isso mantém a velocidade de digitação de quem está acostumada ao texto livre.
- **Duração sugerida** — ao informar o início, o fim é pré-preenchido com +12 meses (editável).
- **NUP** — máscara `23082.______/____-__`; ao colar, busca o processo na Câmara e oferece
  vincular; se não existir, oferece criar.
- **Supervisor e programa** — *combobox* com autocomplete sobre `users`/`pessoas` e `programas`,
  com "criar novo" inline.
- **Campos obrigatórios: apenas nome, projeto e supervisor.** Todo o resto entra depois —
  o acervo real tem registros sem CPF, sem período e sem processo, e eles precisam caber.

### 10.5 Erros de design a evitar

Além dos listados no §9.6 da Câmara:

- **derivar a situação e ainda assim deixar o usuário digitá-la** — seria recriar a coluna
  `Ativo?` e seu desencontro com a realidade;
- **exigir processo para cadastrar** — o pós-doc chega antes do processo;
- **bloquear período com fim em aberto** — 4 registros reais estão assim;
- **exibir CPF completo em listagem** — LGPD, e não há necessidade operacional;
- **não permitir dois registros da mesma pessoa** — renovação é caso normal, não duplicata;
- **não ter exportação para Excel.**

---

## 11. Artefatos gerados (PDF/XLSX)

`pdfkit`, `qrcode` e `xlsx` já são dependências do projeto.

| Artefato | Formato | Reaproveita | Fase |
|---|---|---|---|
| **Exportação completa** (com filtros aplicados) | XLSX | `exportXlsx` de `camaraController.js:344` | MVP |
| **Declaração de vínculo** (nome, CPF mascarado, programa, supervisor, projeto, período, situação) com QR de verificação | PDF | integralmente o padrão de `proficienciaController.gerarDeclaracao` | Fase 2 |
| **Certificado de conclusão** do estágio pós-doutoral, com QR | PDF | idem | Fase 2 |
| **Relação de pós-doutorandos vigentes por programa** | PDF/XLSX | `camaraPdf.js` | Fase 3 |
| **Ofício de cobrança de relatório final** | PDF | `camaraPdf.js` | Fase 3 |
| **Relatório anual** (entradas, saídas, duração média, por programa e por área) | PDF/XLSX | — | Fase 4 |
| **Extrato para a Coleta Sucupira** (pós-docs por programa e período) | XLSX | — | Fase 4 |

Todo PDF traz no rodapé: *"Controle interno da Pró-Reitoria de Pós-Graduação — os autos
oficiais tramitam no SIPAC."* Declaração e certificado trazem, além do QR, o código de
verificação por extenso e a URL pública, como já faz a declaração de proficiência.

---

## 12. Indicadores

| Indicador | Cálculo | Marco zero (planilha atual) |
|---|---|---|
| **Pós-doutorandos vigentes** | `situacao = VIGENTE` | **23** (a planilha reportava 4) |
| Estágios encerrados | `situacao` encerrada | 60 |
| **Relatórios pendentes** | encerrados sem `relatorio_entregue_em` | **60 de 60** (nenhum controlado hoje) |
| Vencendo em 90 dias | `0 <= diasRestantes <= 90` | calculável a partir da importação |
| Duração média do estágio | média(`data_fim − data_inicio`) | ~14 meses (estimativa dos 85 parseáveis) |
| Concentração por supervisor | pós-docs ativos por supervisor | máx. observado: 5 (Ana Lúcia F. Porto, Romildo M. de Holanda) |
| Distribuição por programa | contagem por `programa_id` | 29 grafias → ~24 programas reais |
| Taxa de renovação | estágios com `renovacao_de_id` ÷ total | 5 pessoas com 2 registros |
| **Qualidade do cadastro** | % de registros sem CPF / sem período / sem processo / sem programa | 5% / 3% / 1% / 1% |

O último indicador é deliberado: dá à secretaria um alvo mensurável de saneamento e mostra o
progresso do próprio módulo.

---

## 13. Migração do acervo

Script novo: `server/services/importers/posDoutoradoImporter.js`, no padrão dos importadores
existentes. Diferente da Câmara, **aqui a biblioteca `xlsx` (SheetJS) já instalada é
suficiente** — não há informação codificada em cor de célula neste arquivo.

**Regras do importador:**

1. **95 registros → 95 estágios.** Não há deduplicação por pessoa: os 5 CPFs repetidos são
   estágios distintos. A cadeia `renovacao_de_id` é sugerida pelo importador
   (mesmo CPF + programa, períodos consecutivos) e **confirmada manualmente** na tela — não
   presumida.
2. **CPF**: remover máscara, preencher com zeros à esquerda até 11 dígitos, validar dígito
   verificador, gravar `cpf_valido = FALSE` sem bloquear. Os 5 fora de padrão entram para uma
   lista de saneamento manual.
3. **`PERÍODO`**: parser em cascata para as 5 gramáticas (§1.4). Mês/ano → dia 1 (início) e
   último dia do mês (fim), marcando `aprox = true`. As 2 datas inexistentes (`31/04`, `31/09`)
   viram o último dia real do mês, com aviso. Os 10 não parseáveis entram com datas nulas e
   `periodo_original` preenchido, listados como pendência. **O texto original é sempre gravado.**
4. **`PROGRAMA`**: casamento por nome normalizado e por sigla contra `programas` (23 automáticos);
   os 6 restantes vão para a tela de de-para, e o resultado vira linhas em `taxonomia_refs`.
   `programa_original` guarda a grafia da planilha sempre.
5. **`ORIENTADOR`**: normalizar acentuação e caixa; casar contra `users`/`pessoas` com vínculo
   docente no programa. Campos com `" e "` são **divididos em supervisor + cossupervisor**.
   Sem correspondência → `supervisor_nome` fica desnormalizado, sem `supervisor_id`.
6. **`PROCESSO`**: normalizar; validar com `NUP_REGEX` (reuso); **buscar em
   `camara_processos` pelo número e vincular quando existir**. Os 9 em formato curto entram com
   `processo_valido = FALSE`. Os 2 NUPs compartilhados vinculam dois estágios ao mesmo processo —
   comportamento correto e esperado.
7. **`Ativo?`**: os 6 valores digitados são **conferidos contra a situação derivada** e as
   divergências são listadas na pré-visualização. Onde a coluna diz `Não` mas as datas dizem
   vigente (ou vice-versa), a secretaria decide caso a caso — e a decisão vira `situacao_manual`.
8. **`vinculos` em espelho**: cada estágio importado gera um `vinculo` com
   `papel = 'POS_DOUTORANDO'`, `ativo` conforme a vigência, alimentando microsite e contagens.
9. Importação **idempotente** (rerodar não duplica) e reversível por 24 h.
10. O XLSX original é anexado ao sistema como arquivo imutável. **A planilha vira somente
    leitura e é arquivada, nunca apagada.**

**Tela de importação em 4 passos:**

1. **Upload e leitura** — mostra "95 registros encontrados".
2. **De-para de programas e supervisores** — as 6 grafias sem correspondência, com sugestão e
   busca; supervisores sem cadastro listados com a opção "criar pessoa" ou "deixar como texto".
3. **Saneamento** — três listas lado a lado: 10 períodos não parseáveis · 6 CPFs problemáticos
   (5 de formato + 1 de dígito) · 6 divergências da coluna `Ativo?`. Cada item corrigível ali mesmo.
4. **Pré-visualização e confirmação** — contadores (X estágios, Y pessoas novas, Z processos
   vinculados, W avisos) e o número que fecha o argumento: **"vigentes hoje: 23"**.

---

## 14. Plano de implementação em fases

> ⚠️ **SUPERADO por [`arquitetura-dados.md`](arquitetura-dados.md) §7.** O plano vigente tem
> quatro fases (A: núcleo · B: refit dos módulos atuais · C: PNPD · D: legado Drupal), e o
> PNPD sai na Fase C — menor, porque a fundação já entrega eventos, anexos, declarações com QR,
> validação de CPF/NUP e cálculo de vigência. O escopo funcional (§10) não mudou.

### Fase 0 — Modelo de dados e migração (≈ 1 semana)

| # | Ação | Arquivo |
|---|---|---|
| 0.1 | Escrever as 2 tabelas em `schema.sql` | `server/db/schema.sql` |
| 0.2 | Migração idempotente para o banco existente | `server/db/migrations/2026-08-XX_pos_doutorado.sql` |
| 0.3 | Repositório de `pos_doutorados` com `fromRow`/`toRow` | `server/db/repositories.js` |
| 0.4 | Repositório manual de eventos | `server/db/posdocRepo.js` (novo) |
| 0.5 | Acrescentar `POS_DOUTORANDO` a `PAPEIS_DISCENTE` e ao rótulo | `server/controllers/programasController.js:684` |
| 0.6 | Acrescentar `POS_DOUTORADO_*` ao vocabulário `tipo_materia` da Câmara | `server/controllers/camaraController.js` |
| 0.7 | Utilitários compartilhados: `normalizarCpf`, `validarCpf`, `parsePeriodo` | `server/utils/` (novos, com teste unitário) |
| 0.8 | Importador com parser de período e de-para | `server/services/importers/posDoutoradoImporter.js` |
| 0.9 | Sessão de 1 h com a secretaria: de-para de programas + os 6 casos de `Ativo?` + os 10 períodos | — |

**Pronto quando:** os 95 registros estão importados, a contagem de vigentes bate com a
conferência manual da secretaria e nenhuma informação da planilha foi perdida
(`periodo_original`, `programa_original` e observações preservados).

### Fase 1 — MVP operacional (≈ 2 semanas)

| # | Ação | Arquivo |
|---|---|---|
| 1.1 | Controller: CRUD, filtros, situação derivada, prorrogação, relatório, anexos | `server/controllers/posDoutoradoController.js` |
| 1.2 | Rotas + permissões (incl. escopo `GestorPrograma`) | `server/routes/adminRoutes.js` |
| 1.3 | Validação e sanitização (reuso de `server/utils/sanitize.js`) | — |
| 1.4 | Lista com filtros, badges e ações rápidas | `src/pages/admin/AdminPosDoutorado.jsx` |
| 1.5 | Formulário (com "colar período" e máscara de CPF/NUP) | `src/pages/admin/AdminPosDoutoradoForm.jsx` |
| 1.6 | Ficha com linha do tempo unificada e documentos | `src/pages/admin/AdminPosDoutoradoFicha.jsx` |
| 1.7 | Tela de importação (4 passos) | `src/pages/admin/AdminPosDoutoradoImportar.jsx` |
| 1.8 | Constantes de apresentação (rótulos e cores) | `src/constants/posDoutorado.js` |
| 1.9 | Rotas do front + item de menu | `src/App.jsx`, `src/components/AdminLayout.jsx` |
| 1.10 | Exportação XLSX | `posDoutoradoController.js` |

**Pronto quando:** a secretaria cadastra o próximo pós-doutorando inteiramente no sistema e a
pergunta "quantos estão ativos?" é respondida por um chip na tela.

### Fase 2 — Documentos e verificação pública (≈ 1 semana)

| # | Ação | Observação |
|---|---|---|
| 2.1 | Declaração de vínculo em PDF com QR | copia `gerarDeclaracao` da proficiência |
| 2.2 | Certificado de conclusão em PDF com QR | exige relatório entregue |
| 2.3 | Rota e página pública de verificação | espelha `src/pages/DeclaracaoProficiencia.jsx` |
| 2.4 | Registro de emissão na linha do tempo | evento `CERTIFICADO` |

**Pronto quando:** a secretaria para de redigitar declarações em editor de texto.

### Fase 3 — Integração com a Câmara e prazos (≈ 1 semana)

| # | Ação | Observação |
|---|---|---|
| 3.1 | Vincular/criar `camara_processos` a partir da ficha do pós-doc | |
| 3.2 | Linha do tempo unificada (eventos do estágio + do processo) | |
| 3.3 | Filtro na Câmara por `tipo_materia = POS_DOUTORADO_*` | |
| 3.4 | Painel de vencimentos: D-90 / D-30 / relatório vencido | |
| 3.5 | Ofício de cobrança de relatório em PDF | |
| 3.6 | E-mail automático de aviso ao programa e ao supervisor | **requer `nodemailer` + SMTP institucional — hoje o projeto não envia e-mail** (mesma dependência da Fase 2 da Câmara) |

### Fase 4 — Visibilidade e indicadores (≈ 1 a 2 semanas)

- Seção "Pós-doutorandos" no microsite de cada programa (dados públicos apenas: nome, projeto,
  supervisor, período — **nunca CPF ou contato**), alimentada pelo `vinculo` espelho.
- Painel de indicadores (§12).
- Extrato para a Coleta Sucupira.
- Autosserviço: o `GestorPrograma` cadastra a solicitação do seu programa e acompanha o
  andamento; a PRPG só valida.
- Relatório anual em PDF.

### Fora de escopo (justificativa)

Integração/*scraping* do SIPAC (manter o link direto, como na Câmara) · portal de inscrição
aberto ao candidato externo · assinatura digital própria (usar Gov.br quando houver) ·
aplicativo móvel · controle financeiro de bolsas (não há bolsa no PNPD voluntário; se a PRPG
unificar bolsistas, o campo `agencia_fomento` basta para o controle acadêmico).
**O volume de ~15 entradas/ano não justifica nenhum deles.**

---

## 15. Testes

Vitest + supertest, no padrão de `server/__tests__/` (banco isolado `prpg_test`).
Arquivo novo: `server/__tests__/posDoutorado.test.js`.

Cobertura mínima:

- **derivação de situação** — tabela de casos: início futuro → `APROVADO`; hoje dentro do
  intervalo → `VIGENTE`; fim passado com relatório → `ENCERRADO`; fim passado sem relatório →
  `ENCERRADO_SEM_RELATORIO`; `situacao_manual` vence todas;
- **`normalizarCpf`** — `5252951438` → `05252951438`; máscara removida; comprimento fixo;
- **`validarCpf`** — `599.576.874-04` reprova mas **não bloqueia** o cadastro (`cpf_valido = FALSE`);
- **`parsePeriodo`** — as 5 gramáticas do §1.4, mais `31/04/2024` (ajuste para 30/04 com aviso)
  e fim em aberto (data nula, `periodo_original` preservado);
- **prorrogação** — cria registro encadeado, copia campos, mantém o original intacto;
- **N:1 com o processo** — dois estágios apontando para o mesmo `camara_processos` é aceito;
- **`posdoc_eventos` é append-only** — `PATCH /situacao` cria evento e não sobrescreve nada;
- **controle de acesso** — `GestorPrograma` só lê registros do seu programa; CPF completo não
  aparece na listagem, só na ficha, e nunca no endpoint público;
- **certificado** — código congelado na 1ª emissão; reemissão devolve o mesmo código e a mesma
  data; verificação pública devolve CPF mascarado;
- **importador** — 95 linhas → 95 estágios, 23 vigentes na data de referência, 2 processos
  compartilhados, 10 períodos pendentes, `periodo_original` íntegro em 100% dos registros.

---

## 16. Gestão da mudança e riscos do projeto

**A secretaria é a fonte da especificação**, não um obstáculo — mesma postura do §15 da Câmara:

- ela é a dona do de-para de programas, da leitura dos 10 períodos ambíguos e da decisão sobre
  as 6 divergências da coluna `Ativo?`;
- a migração é validada por ela antes de qualquer tela ser considerada pronta;
- o botão "Exportar XLSX" existe desde o primeiro dia, como cinto de segurança;
- nada é apagado: a planilha vira somente leitura e é arquivada.

**Três ganhos que ela precisa sentir na primeira semana:**

1. **O número certo.** "Quantos pós-docs ativos temos?" deixa de ser meia hora de conferência e
   vira um chip na tela — e o número passa a estar correto.
2. **A declaração sai em um clique**, com QR de verificação, em vez de ser redigitada.
3. **Renovar deixa de ser recopiar uma linha** e vira duas datas.

**Riscos e mitigações:**

| Risco | Mitigação |
|---|---|
| Rejeição por perda de velocidade de digitação | campo "colar período" aceita o texto livre de sempre; só nome, projeto e supervisor são obrigatórios |
| Migração perder informação | `periodo_original`, `programa_original` e o XLSX original são preservados; importação reversível por 24 h |
| Ser lido como "sistema paralelo ao SIPAC" | delimitação explícita na UI e no rodapé dos PDFs; o NUP linka para o SIPAC |
| Ficar dependente da conclusão do módulo Câmara | `processo_id` é **opcional**; o módulo funciona sozinho e a integração é a Fase 3 |
| Registros históricos incompletos travarem o cadastro | nenhuma validação bloqueante: CPF inválido, NUP fora do padrão e período em aberto são avisos |
| LGPD | CPF mascarado em listagem e ausente do endpoint público; acesso por papel; finalidade registrada; a planilha sai de circulação |
| Superdimensionamento | situação derivada + histórico append-only bastam; nada de motor de workflow |

---

## 17. Decisões pendentes

Precisam de definição antes da Fase 0/1:

1. **Norma de referência** — existe resolução do CEPE/UFRPE que regulamenta o estágio
   pós-doutoral? Qual o número? Ela define prazo máximo, número de renovações e obrigação de
   relatório? Isso determina as regras de prazo do §6.3.
2. **Rito de aprovação** — o fluxo é colegiado do PPG → Câmara de Pós-Graduação → portaria?
   Toda solicitação vai à Câmara, ou só as renovações/exceções? Define se `processo_id` é
   praticamente sempre preenchido.
3. **`ECOLOGIA`** — 5 registros apontam para um PPG que não consta na base atual de `programas`.
   É programa descredenciado, é o atual "Biodiversidade", ou é grafia antiga de outro? Precisa
   de decisão antes da importação.
4. **Bolsistas PNPD** — existe outra planilha controlando os pós-doutorandos **com bolsa**
   (CAPES/FACEPE/CNPq)? Se sim, unificar aqui desde a Fase 1 (o campo `modalidade` já prevê)
   ou manter separado?
5. **Relatório final** — há exigência formal de relatório ao fim do estágio? Com que prazo?
   Isso define se `ENCERRADO_SEM_RELATORIO` é pendência real ou apenas informativa.
6. **Certificado** — a PRPG emite certificado/declaração de conclusão de pós-doutorado hoje?
   Quem assina (Pró-Reitor[a] ou coordenação do PPG)? Define o layout do PDF da Fase 2.
7. **Publicação pública** — os pós-doutorandos podem aparecer no microsite do programa? Que
   campos? Há necessidade de consentimento, ou basta o interesse público do art. 23 da LGPD?
8. **Os 3 registros sem período e os 4 com fim em aberto** — são estágios ativos sem prazo
   definido, cadastros incompletos, ou registros a descartar?
9. **Períodos sobrepostos** (Felipe José Cury Fracetto, Jéssica Rafaella de Sousa Oliveira) —
   são erro de digitação ou prorrogação registrada como estágio novo?
10. **Retenção** — por quanto tempo o acervo fica no sistema? Há tabela de temporalidade
    aplicável (CONARQ) para registros de estágio pós-doutoral?

---

## Anexo A — Contribuições dos especialistas consultados

### A.1 Administração pública e conformidade

> "O achado grave deste diagnóstico não é a planilha ser feia — é ela **produzir número
> oficial errado**. Quatro contra vinte e três não é imprecisão, é ordem de grandeza. Esse
> número circula em relatório de gestão e em resposta a controle interno. A primeira entrega do
> sistema, antes de qualquer tela bonita, é o número certo, calculado sempre da mesma forma e
> auditável."

Contribuições incorporadas: §3 (riscos de conformidade), §6.2 (regra de derivação como
regra única e explícita), §12 (indicadores com marco zero medido), §17.1 (norma de referência).

Fundamentos citados: Lei 9.784/1999 (forma, autoria e motivação do ato administrativo);
Lei 13.709/2018, arts. 6º, 18, 23 e 46 (minimização, retificação, tratamento pelo poder
público, segurança); Lei 12.527/2011 (LAI).

### A.2 Eficiência operacional (BPM)

> "Há dois desperdícios clássicos aqui. O primeiro é **retrabalho de verificação**: toda vez que
> alguém pergunta 'quantos estão ativos', uma pessoa recalcula manualmente uma informação que
> já está no dado. O segundo é **trabalho invisível não feito**: sessenta estágios encerrados e
> zero relatórios controlados. Ninguém está perdendo tempo com isso — o processo simplesmente
> não existe. Automatizar a primeira parte libera tempo exatamente para criar a segunda."

Contribuições incorporadas: §2 (quantificação do esforço recuperável), §4 (derivar em vez de
digitar), §6.3 (marcos de prazo), §10.2 (prorrogação em um clique como substituto direto da
recópia), §12 ("relatórios pendentes: 60 de 60" como indicador que expõe o processo faltante).

### A.3 Gestão documental e arquivística

> "A planilha é simultaneamente cadastro e prova. Ela não pode ser as duas coisas. O sistema
> precisa separar: o registro estruturado (consultável, filtrável, exportável) e o documento
> comprobatório (plano de trabalho, portaria, relatório, certificado). E precisa **nunca
> descartar a forma original do dado**: quando eu normalizo `maio de 2015 a dezembro de 2018`
> em duas datas ISO, estou interpretando. Se a interpretação estiver errada e o original tiver
> sido jogado fora, o erro é irreversível."

Contribuições incorporadas: `periodo_original`, `programa_original` e `obs` preservados
(§8, §13.3); anexos tipados (§7); XLSX original arquivado como imutável (§13.10);
§17.10 (temporalidade CONARQ).

### A.4 Gestão de pós-graduação (CAPES/Sucupira)

> "Pós-doutorando é produção. Ele publica com afiliação UFRPE, orienta informalmente, participa
> de projeto. Se o PPG não sabe quem são os seus, ele não os reporta na Coleta — e perde
> pontuação numa avaliação em que esse item conta. O dado já está sendo coletado uma vez pela
> PRPG; o desperdício é ele morrer numa planilha em vez de chegar ao programa."

Contribuições incorporadas: §5 (vínculo espelho em `vinculos` alimentando o microsite),
§11 (extrato para a Coleta Sucupira), §12 (distribuição por programa e concentração por
supervisor), Fase 4 (visibilidade pública e autosserviço do programa).

### A.5 Desenho de sistemas internos (UX de back-office)

> "A pergunta que essa tela responde não é 'quem são os pós-doutorandos'. É 'de quem eu preciso
> cuidar esta semana'. Por isso a ordenação padrão é por data de fim crescente, entre os
> vigentes: quem vence primeiro aparece primeiro. Uma lista ordenada alfabeticamente seria
> bonita e inútil."

Contribuições incorporadas: §10.1 (colunas, ordenação e filtros com contadores reais),
§10.2 (ações de um clique), §10.3 (linha do tempo unificada), §10.4 (campo "colar período",
avisos em vez de bloqueios), §10.5 (erros a evitar).

---

## Anexo B — Fontes deste documento

- Análise programática do arquivo `PNPD Voluntário.xlsx` (1 aba, 95 registros, 10 colunas):
  extração de valores, fórmulas, formatação, painéis congelados, validações e mesclagens;
  conferência de formato e dígito verificador dos 90 CPFs; *parsing* dos 92 períodos; conciliação
  das 29 grafias de programa contra `server/data/programas.json`; detecção de NUPs e CPFs
  repetidos.
- Convenções e código do próprio projeto: `CLAUDE.md`, `server/db/schema.sql`,
  `server/db/repository.js`, `server/db/camaraRepo.js`, `server/routes/adminRoutes.js`,
  `server/controllers/camaraController.js`, `server/controllers/proficienciaController.js`,
  `server/controllers/programasController.js`, `src/pages/admin/AdminCamara.jsx`,
  `src/constants/camara.js`, `src/components/admin/`.
- Documento irmão [`requisitos-camara.md`](requisitos-camara.md), cujas decisões de arquitetura
  (processo como registro permanente, histórico append-only, vocabulários com válvula de escape,
  avisos em vez de bloqueios, exportação XLSX desde o dia 1) são aqui reaproveitadas.
