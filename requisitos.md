Aqui está o documento de requisitos completo:

---

# Requisitos do Sistema — Cadastro de Programas de Pós-Graduação (PRPG/UFRPE)

---

## 1. Visão Geral

Sistema web para cadastro, consulta e manutenção dos dados dos Programas de Pós-Graduação da UFRPE, substituindo a planilha Excel atual. O sistema deve centralizar informações de programas, coordenadores, secretaria e histórico de gestão.

---

## 2. Fonte de Dados (Excel de Referência)

O Excel possui 4 abas:

- **BANCO DE DADOS PRPG** — aba principal, 48 programas, 27 colunas agrupadas em 5 blocos
- **Sem UFAPE – CAPES** — lista com classificação CAPES, notas e modalidades (sem campus UFAPE)
- **Sem UFAPE** — lista simplificada sem coluna de área CAPES
- **Com UFAPE** — lista incluindo programas do campus UFAPE

As abas de lista são visões derivadas da aba principal. No sistema, devem ser geradas dinamicamente como filtros ou exportações, não cadastradas separadamente.

---

## 3. Modelo de Dados

### 3.1 Entidade: Programa

| Campo | Tipo | Obrigatório | Observações |
|---|---|---|---|
| `id` | UUID | Sim (gerado) | Chave primária |
| `nome` | texto | Sim | Nome completo do programa |
| `sigla` | texto (20) | Sim | Identificador curto, armazenar em maiúsculas |
| `site` | URL | Não | Endereço do site oficial |
| `codigo_capes` | texto (20) | Não | Código de 13 caracteres, ex: `25003011022P7` |
| `campus` | enum | Não | `SEDE`, `UAST`, `UACSA`. Default: `SEDE` |
| `em_rede` | booleano | Não | Indica se é programa em rede nacional/regional |
| `nome_rede` | texto | Não | Nome da rede, ex: RENORBIO, PROFIAP. Preencher se `em_rede = true` |
| `grande_area` | texto | Não | Grande área do conhecimento (CAPES) |
| `area_conhecimento` | texto | Não | Área de conhecimento |
| `area_avaliacao` | texto | Não | Área de avaliação CAPES |
| `criado_em` | timestamp | Sim (gerado) | |
| `atualizado_em` | timestamp | Sim (gerado) | |

---

### 3.2 Entidade: Modalidade do Programa

Cada programa pode ter até 3 modalidades (M, D, P). Modelar como tabela separada para permitir múltiplos registros por programa.

| Campo | Tipo | Obrigatório | Observações |
|---|---|---|---|
| `id` | UUID | Sim (gerado) | |
| `programa_id` | UUID | Sim | FK → Programa |
| `tipo` | enum | Sim | `M` (Mestrado Acadêmico), `D` (Doutorado), `P` (Mestrado Profissional) |
| `ano_inicio` | inteiro (4 dig) | Não | Ano de credenciamento da modalidade |
| `nota_capes` | texto (2) | Não | Valores aceitos: `1`, `2`, `3`, `4`, `5`, `6`, `7`, `A`. `A` = em avaliação |

Restrição: combinação `(programa_id, tipo)` deve ser única.

---

### 3.3 Entidade: Pessoa

Tabela reutilizável para coordenadores, substitutos, TAEs e histórico.

| Campo | Tipo | Obrigatório | Observações |
|---|---|---|---|
| `id` | UUID | Sim (gerado) | |
| `nome` | texto | Sim | |
| `cpf` | texto (14) | Não | Armazenar formatado: `000.000.000-00` |
| `siape` | texto (10) | Não | Matrícula SIAPE do servidor |
| `email_institucional` | e-mail | Não | E-mail pessoal do servidor (`@ufrpe.br`) |
| `telefones` | texto | Não | Campo livre, múltiplos contatos separados por vírgula |
| `endereco` | texto | Não | Campo livre — usado somente para TAE quando o endereço diferir da sede |
| `criado_em` | timestamp | Sim (gerado) | |
| `atualizado_em` | timestamp | Sim (gerado) | |

---

### 3.4 Entidade: Vínculo (Programa ↔ Pessoa)

Tabela de relacionamento que registra qual pessoa ocupa qual papel em qual programa, em qual período.

| Campo | Tipo | Obrigatório | Observações |
|---|---|---|---|
| `id` | UUID | Sim (gerado) | |
| `programa_id` | UUID | Sim | FK → Programa |
| `pessoa_id` | UUID | Sim | FK → Pessoa |
| `papel` | enum | Sim | `COORDENADOR_ATUAL`, `SUBSTITUTO`, `TAE`, `COORDENADOR_ANTERIOR` |
| `portaria` | texto | Não | Texto completo da portaria, ex: `PORTARIA GR/UFRPE Nº 846/2025, DE 7 DE AGOSTO DE 2025` |
| `data_vencimento` | data | Não | Data de vencimento do mandato. Presente principalmente para coordenadores |
| `email_funcao` | e-mail | Não | E-mail da função, distinto do e-mail pessoal. Ex: `coordenacao.ppgba@ufrpe.br`. Usado para coordenadores e TAEs |
| `ativo` | booleano | Sim | `true` para vínculos atuais, `false` para histórico |
| `criado_em` | timestamp | Sim (gerado) | |

Restrição: para `papel = COORDENADOR_ATUAL` e `ativo = true`, deve existir no máximo um registro por programa.

---

## 4. Regras de Negócio

### 4.1 Sigla
- Armazenar sempre em maiúsculas
- Deve ser única entre todos os programas ativos

### 4.2 Código CAPES
- Formato esperado: 13 caracteres alfanuméricos, ex: `25003011022P7`
- Validar formato mas não bloquear cadastro em caso de não conformidade (campo informativo)

### 4.3 Modalidades
- Um programa deve ter ao menos uma modalidade cadastrada
- `nota_capes` aceita somente os valores: `1`, `2`, `3`, `4`, `5`, `6`, `7`, `A`
- `ano_inicio` deve ser um ano de 4 dígitos entre 1950 e o ano corrente

### 4.4 Coordenador Atual
- Todo programa ativo deve ter exatamente um vínculo com `papel = COORDENADOR_ATUAL` e `ativo = true`
- Ao cadastrar novo coordenador atual, o vínculo anterior deve ser automaticamente marcado como `ativo = false` e `papel` alterado para `COORDENADOR_ANTERIOR`

### 4.5 Substituto Eventual
- Opcional. Um programa pode ter zero ou um substituto ativo por vez
- Não possui data de vencimento de mandato no modelo atual

### 4.6 TAE da Secretaria
- Opcional. Campo `endereco` da entidade Pessoa deve ser utilizado apenas para registrar o endereço da secretaria quando diferir da sede do programa

### 4.7 Coordenador Anterior
- Registro histórico. Não há limite de quantos coordenadores anteriores um programa pode ter
- Campos mínimos esperados: nome, SIAPE, CPF e portaria de nomeação original

### 4.8 Portaria
- Campo texto livre. O sistema não deve tentar parsear o conteúdo da portaria
- Armazenar exatamente como informado, sem normalização automática

---

## 5. Interface — Formulário de Cadastro

### 5.1 Estrutura Geral
O formulário é dividido em **4 etapas** (wizard):

1. Dados do Programa
2. Coordenação (Atual + Substituto)
3. Secretaria / TAE
4. Revisão e Confirmação

### 5.2 Etapa 1 — Dados do Programa

**Seção: Identificação**
- Sigla (obrigatório) — input texto, uppercase automático
- Nome Completo (obrigatório) — input texto
- Código CAPES — input texto com máscara informativa
- Site do Programa — input URL
- Campus — select: Sede Recife / UAST / UACSA
- Programa em Rede — select: Não / Sim Nacional / Sim Regional
- Nome da Rede — input texto, exibido somente se "Programa em Rede = Sim"

**Seção: Modalidades, Anos e Notas CAPES**
- Para cada modalidade (M, D, P):
  - Toggle "Oferece esta modalidade?" — checkbox
  - Ano de início — input numérico de 4 dígitos, habilitado somente se modalidade ativa
  - Nota CAPES — grupo de botões de seleção (1 a 7 + A), habilitado somente se modalidade ativa

**Seção: Área Acadêmica**
- Grande Área do Conhecimento — select com as 9 grandes áreas do CNPq/CAPES
- Área de Conhecimento — input texto
- Área de Avaliação CAPES — input texto

### 5.3 Etapa 2 — Coordenação

**Subseção: Coordenador(a) Atual** (obrigatório)
- Nome Completo (obrigatório)
- CPF — com máscara `000.000.000-00`
- SIAPE (obrigatório)
- E-mail Institucional (obrigatório)
- E-mail da Coordenação — e-mail funcional da coordenação (campo separado)
- Contatos — campo texto livre (telefone/WhatsApp, múltiplos)
- Portaria de Nomeação (obrigatório) — texto livre
- Data de Vencimento do Mandato — date picker, opcional

**Subseção: Subcoordenador / Substituto Eventual** (opcional)
- Nome Completo
- CPF
- SIAPE
- E-mail Institucional
- Contatos
- Portaria de Nomeação

### 5.4 Etapa 3 — Secretaria / TAE

**Subseção: TAE da Secretaria** (opcional)
- Nome Completo
- SIAPE
- E-mail (pessoal ou da secretaria)
- Contato (telefone/WhatsApp)
- Endereço da Secretaria — textarea, preencher somente quando diferir da sede
- Portaria de Designação

### 5.5 Etapa 4 — Revisão
- Exibição somente leitura de todos os dados preenchidos nas etapas anteriores
- Botão "Editar" em cada seção para retornar ao passo correspondente
- Botão "Confirmar e Salvar" — submete o cadastro
- Botão "Salvar como Rascunho" — persiste sem validação completa

---

## 6. Funcionalidades Complementares

### 6.1 Listagem de Programas
- Tabela com colunas: Sigla, Nome, Campus, Modalidades (badges M/D/P), Nota(s) CAPES, Coordenador Atual
- Filtros: Campus, Modalidade, Grande Área, Nota CAPES, Rede (Sim/Não)
- Busca por texto: nome ou sigla
- Ordenação por qualquer coluna

### 6.2 Visualização de Programa
- Página de detalhe com todos os blocos do formulário em modo leitura
- Histórico de coordenadores anteriores exibido em ordem cronológica inversa

### 6.3 Edição
- Mesmo formulário do cadastro, pré-preenchido
- Ao trocar o coordenador atual, o sistema exibe confirmação: "Isso moverá [Nome Atual] para o histórico. Confirmar?"

### 6.4 Exportação
- Exportar para Excel (.xlsx) reproduzindo a estrutura original da planilha
- Exportar para CSV
- Filtros das abas "Sem UFAPE" e "Com UFAPE" devem ser aplicáveis na exportação

### 6.5 Rascunho Automático
- O formulário salva rascunho automaticamente a cada 30 segundos no browser (localStorage ou equivalente)
- Ao retornar ao formulário com rascunho salvo, exibir banner: "Você tem um rascunho não salvo. Deseja continuar de onde parou?"

---

## 7. Validações

| Campo | Validação |
|---|---|
| Sigla | Obrigatório, único, máx 20 caracteres, maiúsculas |
| Nome | Obrigatório, máx 200 caracteres |
| Código CAPES | Opcional, formato `[0-9]{5}[0-9]{3}[0-9]{3}[A-Z0-9]{2}[0-9]` ou similar |
| E-mail | Formato de e-mail válido |
| CPF | Formato `000.000.000-00`, validar dígitos verificadores |
| SIAPE | Numérico, 7 a 8 dígitos |
| Ano de início | Inteiro, entre 1950 e ano corrente |
| Nota CAPES | Valor no conjunto `{1,2,3,4,5,6,7,A}` |
| Site | URL válida com protocolo `https://` |
| Ao menos uma modalidade | Bloquear envio se nenhuma modalidade estiver marcada |
| Coordenador atual | Obrigatório para salvar (não apenas rascunho) |

---