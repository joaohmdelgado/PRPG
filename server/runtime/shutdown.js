const closeServer = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

// OPS-04: para de aceitar conexões, fecha as keep-alive ociosas (que sozinhas
// prendiam o server.close em Node < 19), drena as requisições em andamento,
// fecha o pool e sai. Se não terminar em `prazoMs` (uma requisição longa ou
// presa), sai com 1 em vez de esperar o SIGKILL do orquestrador.
export function createGracefulShutdown({
  getServer, dbPool, exit = process.exit, log = console.log, aoIniciar = () => {}, prazoMs = 10000,
}) {
  let shutdownPromise;

  return (signal) => {
    if (shutdownPromise) return shutdownPromise;
    aoIniciar();
    const prazo = setTimeout(() => {
      log(`[Shutdown] Prazo de ${prazoMs} ms esgotado; saindo sem terminar de drenar.`);
      exit(1);
    }, prazoMs);
    prazo.unref?.();
    shutdownPromise = (async () => {
      log(`[Shutdown] Recebido ${signal}; encerrando conexões.`);
      let failed = false;
      const server = getServer();
      try {
        if (server) {
          const fechando = closeServer(server);
          server.closeIdleConnections?.();
          await fechando;
        }
      } catch (error) {
        failed = true;
        log(`[Shutdown] Falha ao fechar HTTP: ${error?.constructor?.name || 'Error'}`);
      }
      try {
        await dbPool.end();
      } catch (error) {
        failed = true;
        log(`[Shutdown] Falha ao fechar PostgreSQL: ${error?.constructor?.name || 'Error'}`);
      }
      clearTimeout(prazo);
      exit(failed ? 1 : 0);
    })();
    return shutdownPromise;
  };
}
