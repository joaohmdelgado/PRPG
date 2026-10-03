# Senha padrão `Mudar123` — marcar contas como provisórias

**Estado em 03/10/2026:** corrigido no código (importadores) e aplicado no banco de **dev**.
**Pendente: rodar em produção** (passo a passo abaixo).

## O problema

Em 30/09/2026 se achou que 89 dos 91 usuários do dev tinham a senha `Mudar123` (conferido com
`bcrypt.compare`) e nenhum tinha `users.senha_temporaria = true`, ou seja, o primeiro acesso não forçava a
troca. Causa: `alunosImporter.js` e `professoresImporter.js` criavam o usuário com a senha padrão sem passar
`senhaTemporaria: true` (só `usersController.createUser` fazia isso).

## O que já foi feito (commits `a4c106e`, `31e632d`, `fcd9a90`, na `main`)

- Os dois importadores passam a criar a conta com `senhaTemporaria: true`. Contas **novas** já nascem certas.
- `npm run senhas:padrao` (`server/scripts/marcarSenhaPadrao.mjs`, lógica em
  `server/services/senhaPadrao.js`) corrige as contas **que já existem**.
- Teste: `server/__tests__/senhaPadrao.test.js`.
- Dev: rodado em 03/10/2026 — 89 contas marcadas; nova simulação deu 0. As 2 restantes têm outra senha.

Não há migração SQL de propósito: o hash é bcrypt e o SQL não o compara sem `pgcrypto`; uma migração
aplicada também é imutável e roda em todo ambiente. A correção dos dados é um script pontual, por ambiente.

## O que o script faz (e não faz)

- Examina as contas com `senha_temporaria IS NOT TRUE`, compara cada hash com `Mudar123` e **só liga**
  `senha_temporaria = TRUE` nas que batem.
- **Não altera nenhuma senha**, papel ou outro campo. Quem tem a senha padrão continua entrando com ela,
  mas o painel passa a exigir a troca antes de liberar o acesso.
- **Simulação por padrão** (lista os e-mails e não grava). Só `--gravar` escreve.
- Idempotente: pode rodar de novo; contas já marcadas ou que já trocaram a senha não entram.
- Custo: um `bcrypt.compare` por conta (~60 ms cada); para centenas de contas, segundos.

## Como rodar em produção

Pré-requisitos: ambiente com o código da `main` (commit `fcd9a90` ou posterior) e `DATABASE_URL`/`JWT_SECRET`
de produção no ambiente do processo (o script importa a configuração do servidor, que exige os dois). Pode ser
dentro do pod/contêiner da aplicação (`kubectl -n prpg exec POD_APP -- ...`), um Job com a mesma imagem ou o
servidor de aplicação — o mesmo lugar de onde se roda `npm run agendador`.

1. **Backup antes de gravar.** Confirme que o backup diário/WAL está em dia (`backup-restore.md`) ou gere o
   dump lógico de contingência. A escrita é pequena e reversível (ver "Desfazer"), mas é produção.
2. **Simule** (nada é gravado) e confira a lista:

   ```sh
   npm run senhas:padrao
   ```

   Saída esperada: `[Senhas] N conta(s) ... examinada(s); M com a senha padrão.` e os e-mails. Confira que M é
   plausível (contas importadas: alunos e professores; contas criadas pelo painel sem senha já têm a flag).
   Contas de **Administrator/Gestor** na lista merecem atenção: a troca será exigida no próximo acesso delas.
3. **Grave**:

   ```sh
   npm run senhas:padrao -- --gravar
   ```

   Saída: `[Senhas] M conta(s) marcada(s) como senha provisória.`
4. **Reconfira**: rode a simulação de novo; deve dar `0 com a senha padrão`. Opcional, no banco:

   ```sql
   SELECT count(*) FILTER (WHERE senha_temporaria) AS marcadas, count(*) AS total FROM users;
   ```
5. **Registre** no ticket operacional: data, quantidade (M), commit da aplicação e responsável. Não registre
   senhas nem a lista de e-mails fora do ticket.

## Desfazer

Só existe se a conta foi marcada por engano (a flag nunca apaga senha). Para uma conta específica:
`UPDATE users SET senha_temporaria = FALSE WHERE email = '...';`. Não há motivo para reverter em lote.

## Limite conhecido — leia antes de dar o assunto por encerrado

A flag é **imposta só pelo painel** (front: `RequireAuth.jsx` + `AdminTrocarSenha.jsx`). A **API não a impõe**:
`login` devolve o token normalmente e o middleware `protect` não olha `senhaTemporaria`; quem usar o token
direto na API (sem o painel) não é obrigado a trocar a senha. Ou seja, marcar a flag resolve o fluxo normal de
primeiro acesso, **não** o risco de uma senha conhecida (`Mudar123`) continuar válida até a pessoa trocá-la.
O fechamento de verdade é o item pendente do plano de prontidão de produção
(`docs/superpowers/plans/2026-09-09-prontidao-producao-prpg.md`, Fase de segurança: "`must_change_password`
imposto pela API" e "substituir a senha compartilhada `Mudar123` por convite/reset aleatório, single-use e
expirável"). Até lá, quem não faz o primeiro acesso mantém a senha padrão; considere pedir às secretarias
que os usuários que nunca entraram façam a troca ou usar o reset de senha do painel (Usuários).

## Se `Mudar123` voltar a aparecer

Contas criadas pelo painel sem senha, pelos importadores (corrigidos) ou por reset do admin já saem com a flag.
Se a simulação voltar a listar contas, algum caminho de criação deixou de passar `senhaTemporaria` — o teste
`senhaPadrao.test.js` cobre os dois importadores; um novo importador de usuários deve incluir o mesmo caso.
