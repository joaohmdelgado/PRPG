# Como fazer backup e recuperação do PRPG no Kubernetes

Este guia é para o operador responsável pelo PostgreSQL de produção executado
como workload stateful no Kubernetes. Ele pressupõe `kubectl` autorizado no
cluster, uma credencial de banco guardada em Secret e um destino de backup fora
do cluster (bucket institucional S3 compatível ou repositório equivalente).

## Objetivo de recuperação

Definir estes valores com a PRPG e infraestrutura antes do primeiro deploy:

| Item | Valor inicial a aprovar |
| --- | --- |
| RPO | até 15 minutos de dados |
| RTO | até 4 horas |
| Retenção diária | 35 dias |
| Retenção mensal | 12 meses |
| Retenção de documentos | conforme tabela de temporalidade e decisão LGPD |

O volume persistente do PostgreSQL não é backup. Uma falha de zona, exclusão de
PVC, credencial comprometida ou erro lógico pode atingir simultaneamente banco
e volume.

## Configurar proteção antes de produção

1. Mantenha PostgreSQL em `StatefulSet` com PVC exclusivo, `PodDisruptionBudget`
   e requests/limits definidos. Não exponha a porta do banco por `LoadBalancer`.
2. Use uma solução que faça backup físico contínuo e arquivamento de WAL, como
   CloudNativePG, Crunchy PGO, pgBackRest ou WAL-G. A escolha deve ser única e
   suportada pela infraestrutura; não execute duas ferramentas de WAL ao mesmo
   tempo.
3. Armazene base backup e WAL em bucket fora do cluster, com TLS, criptografia
   no destino, versionamento e credencial limitada ao prefixo do PRPG.
4. Proíba exclusão imediata no bucket: configure retenção/imutabilidade durante
   a janela aprovada. A conta que roda a aplicação não deve poder apagar backups.
5. Faça backup separado do storage privado de comprovantes. O banco contém os
   metadados, mas não substitui os arquivos.
6. Programe um `CronJob` ou recurso nativo do operador para backup diário e
   verifique alertas de falha, atraso de WAL e capacidade do bucket.

## Executar backup lógico de contingência

O backup físico/WAL é o mecanismo principal para PITR. O dump lógico abaixo é
uma camada adicional para inspeção e portabilidade, não substitui o anterior.

1. Localize o pod primário e gere o dump em formato custom:

   ```sh
   kubectl -n prpg get pods -l app=postgres
   kubectl -n prpg exec POD_PRIMARIO -- \
     pg_dump -U "$POSTGRES_USER" -d prpg --format=custom --file=/tmp/prpg.dump
   ```

2. Copie o arquivo para uma estação administrativa temporária, calcule SHA-256
   e envie-o ao destino institucional. Apague a cópia local depois de conferir o
   checksum no destino.
3. Registre data, versão do PostgreSQL, versão da aplicação, tamanho, checksum
   e responsável no ticket operacional. Nunca registre senhas, URLs assinadas,
   CPF ou documentos.

## Restaurar em ambiente isolado

Nunca restaure primeiro no namespace de produção.

1. Crie namespace e instância isolados, por exemplo `prpg-restore-drill`.
2. Restaure o último backup físico e WAL até um horário anterior ao incidente
   (PITR), seguindo o procedimento da ferramenta escolhida.
3. Alternativamente, para validar dump lógico:

   ```sh
   pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d prpg_restore prpg.dump
   ```

4. Execute `npm run db:migrate:apply` com a versão da aplicação que será
   publicada. Nunca execute `npm run db:migrate`: ele é seed destrutivo de
   desenvolvimento e é bloqueado em produção.
5. Compare schema, número de linhas das tabelas críticas e uma amostra de
   checksums do storage privado. Valide login, permissões, inscrições de
   proficiência e consulta de declaração sem usar dados pessoais em relatórios.
6. Meça o tempo total. Se exceder o RTO ou perder dados acima do RPO, corrija o
   processo antes do go-live.

## Recuperar produção após aprovação

1. Declare incidente e interrompa escrita da aplicação (maintenance mode ou
   escala para zero), preservando evidências.
2. Registre o instante-alvo de recuperação e obtenha aprovação do responsável
   funcional e da infraestrutura.
3. Promova a instância restaurada apenas após todas as validações do ambiente
   isolado. Atualize Secret/Service de forma controlada; não copie PVCs às
   pressas nem sobrescreva o original antes de confirmar a recuperação.
4. Reative a aplicação, execute smoke tests autenticados e monitore erros,
   conexões, lag de WAL e uploads.
5. Faça post-mortem: causa, intervalo perdido, RPO/RTO atingidos, evidências e
   ações com responsável e prazo.

## Critério de aceite para produção

O requisito de backup só é considerado atendido quando existir evidência de um
restore isolado bem-sucedido, dentro de RPO/RTO aprovados, incluindo banco e
documentos privados. Agende esse ensaio ao menos trimestralmente e após mudança
de versão relevante do PostgreSQL, operador, bucket ou schema.
