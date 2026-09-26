# Aposentadoria das planilhas (Fase O.4)

Critério explícito para deixar cada planilha de ser a fonte da verdade. Proposto na
[oficina de decisões](oficina-decisoes-planilhas.md) (§5) para a secretaria **validar**; está
implementado no painel em **Planilhas (importação)**, e a avaliação é calculada, não digitada
(`server/services/planilhas/aposentadoria.js`).

## Os estados

| Estado | Significa |
|---|---|
| **Em uso** | a planilha é a fonte; o sistema pode ter recebido uma importação, mas ninguém registra nele ainda |
| **Em paralelo** | a equipe registra no sistema **e** na planilha, por um ciclo |
| **Aposentada (somente leitura)** | o sistema é a fonte; a planilha é trancada para edição e arquivada — **nunca apagada** |

O sistema **não** consegue trancar a planilha (ela mora fora dele); "aposentada" registra a data em
que a equipe o fez. O arquivo importado fica guardado, imutável, em
`server/private-uploads/importacoes/<sha256>.xlsx`, e o hash está em `importacoes`.

## Os quatro critérios

A planilha só pode passar a **aposentada** quando os quatro estão cumpridos (o botão fica
desabilitado, e a API responde 409 com a lista):

1. **Importação inicial gravada** (sem erro).
2. **Sem pendência aberta das decisões que mudam o dado** — as ★ da oficina:

   | Planilha | Decisões |
   |---|---|
   | Contatos | D-G2, D-G3, D-G5/D-G6 |
   | Expedientes | D-E2, D-E3, D-E5 |
   | Câmara | D-B1, D-G8 |
   | PNPD | D-C3, D-C8, D-C9 |

3. **Um ciclo completo em paralelo**, contado a partir do início do paralelo. Padrão de 30 dias
   (`planilhas.ciclo_dias`). Na **Câmara**, o ciclo precisa conter ao menos uma reunião.
4. **Sem divergência ao fim do ciclo:** depois do fim do ciclo, roda-se a **simulação** com a
   planilha do dia. Ela não pode ter linha nova (registrada só na planilha), linha alterada depois
   da importação nem conflito com o sistema. Isso é o **relatório de divergência**
   (`GET /api/importacoes/planilhas/:fonte/divergencias`, botão no cartão da planilha).

Se houver divergência: concilia-se (registra no sistema o que estava só na planilha), usa-se
**Recomeçar o ciclo** e repete-se. Se algo grave for descoberto depois, **Voltar para em uso**.

## Como conduzir cada planilha

1. **Simular** a planilha atual em Planilhas; conferir o relatório.
2. Responder as decisões da oficina em **Revisão da importação** (uma resposta resolve o lote).
3. **Importar** (grava). Reimportar é seguro: chave natural já vista não é duplicada.
4. **Começar o ciclo em paralelo.** Avisar a equipe: registrar nos dois lugares.
5. Ao fim do ciclo, enviar a planilha do dia e **Simular**. Ler o relatório de divergência.
6. Sem divergência: **Aposentar**; trancar a planilha no Drive/Excel e arquivá-la.

## O que fica de fora

- Não há trava técnica sobre a planilha (arquivo externo).
- A simulação compara **o que a planilha tem** com o sistema, não o inverso: registro criado só
  no sistema durante o paralelo é esperado e não conta como divergência.
- O ciclo de 30 dias é proposta; a secretaria pode mudar `planilhas.ciclo_dias`.
