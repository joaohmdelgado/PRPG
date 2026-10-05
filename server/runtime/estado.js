// Estado do processo compartilhado entre o boot (server/index.js) e as rotas de
// saúde: `encerrando` vira true no SIGTERM/SIGINT e o /api/ready passa a 503,
// para o balanceador parar de mandar tráfego enquanto o processo drena.
export const estadoProcesso = { encerrando: false };
