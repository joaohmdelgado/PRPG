# Agendador de prazos (Fase O.5)

Avalia as regras de `server/services/prazos.js` (relatorias da Câmara D-10/D-5/D-1 e cobrança,
pós-doutorado D-90/D-30/D+30/D+90, mandatos e portarias vencendo em 30 dias, reservas de número
pendentes há mais de 15 dias). **Roda fora do servidor web.**

| Como | Comando |
|---|---|
| Uma avaliação e sai (cron / Agendador de Tarefas do Windows) | `npm run agendador` |
| Processo próprio, avalia agora e a cada 24 h | `npm run agendador -- --continuo` |
| Manual, pelo painel | Notificações → "Executar agora" (só Administrator) |

Exemplo de cron (todo dia às 07:00): `0 7 * * *  cd /app && npm run agendador`.

## Modo só no painel (padrão)

Enquanto a **D-C5** (SMTP institucional) não é respondida, o agendador **não envia e-mail**:
cada aviso é registrado em `notificacoes` com situação **Só no painel** (`SO_PAINEL`), mesmo que
`SMTP_*` esteja preenchido. Cada execução fica em `agendador_execucoes` (a tela Notificações mostra
a última e avisa se passou de 36 h sem rodar). Duas execuções simultâneas não se atropelam (lock
consultivo do Postgres).

## Ligando o e-mail (depois da D-C5)

1. Preencher `SMTP_*` no `.env` e testar com "Enviar e-mail de teste" (Notificações).
2. Definir `AGENDADOR_EMAIL=true` no ambiente do agendador.
3. Os avisos **novos** passam a sair por e-mail. Os já registrados como "Só no painel" **não** são
   reenviados sozinhos (a deduplicação é por marco); use "reenviar" na linha, se quiser.

O painel de pendências (`/admin`) calcula relatorias atrasadas, pós-docs vencendo etc. direto dos
dados — não depende de o agendador ter rodado.
