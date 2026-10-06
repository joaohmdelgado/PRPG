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

**Desde 05/10/2026 a API impõe a flag** (AUTH-02, `server/middleware/authMiddleware.js`): o `protect` lê
`users.senha_temporaria` do banco a cada requisição e, com a flag ligada, só libera `GET /api/minha-conta`,
`PUT /api/minha-conta/senha` e `PUT /api/users/<próprio id>` com **só** a senha no corpo; o resto recebe
`403 { codigo: 'SENHA_TEMPORARIA' }` (o front leva à troca de senha ao receber esse código). Vale para tokens
emitidos antes e para o reset feito pelo admin no meio da sessão; o `optionalProtect` trata esse token como
anônimo; token de conta excluída recebe 401. A nova senha escolhida pela pessoa tem de ter 8+ caracteres e não
pode ser `Mudar123` (`erroNovaSenha` em `server/services/senhaPadrao.js`).

**Desde 05/10/2026 conta nova não recebe mais `Mudar123`** (decisão do usuário): cadastro sem senha gera uma
senha provisória aleatória (`gerarSenhaProvisoria`, 3×4 caracteres sem ambíguos), devolvida **uma vez** na
resposta e mostrada no painel para quem cadastrou repassar; os importadores legados criam a conta com senha
aleatória que ninguém recebe. Para dar acesso a uma conta (importada ou que perdeu a senha): Usuários → editar →
**Gerar senha provisória** (`POST /api/users/:id/senha-provisoria` — Admin/Gestor, ou Gestor de Programa só para
aluno/professor do próprio programa; derruba as sessões da conta). Senha escolhida à mão (pelo admin ou pela
pessoa) precisa de 8+ caracteres e não pode ser `Mudar123`.

**O que continua aberto:** as contas **antigas** que ainda têm `Mudar123` (as 89 do dev, e as de produção)
continuam com a senha conhecida até a pessoa trocar — a flag provisória só garante que a troca acontece no
primeiro acesso, não que o primeiro acesso seja da própria pessoa. Para fechar: depois de rodar `senhas:padrao`,
gerar senha provisória para quem vai entrar (ou, em lote, uma rotação — ainda não implementada). Convite por
e-mail com link de uso único continua dependendo da D-C5.

## Se `Mudar123` voltar a aparecer

Contas criadas pelo painel sem senha, pelos importadores (corrigidos) ou por reset do admin já saem com a flag.
Se a simulação voltar a listar contas, algum caminho de criação deixou de passar `senhaTemporaria` — o teste
`senhaPadrao.test.js` cobre os dois importadores; um novo importador de usuários deve incluir o mesmo caso.
