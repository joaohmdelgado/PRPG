const closeServer = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

export function createGracefulShutdown({ getServer, dbPool, exit = process.exit, log = console.log }) {
  let shutdownPromise;

  return (signal) => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      log(`[Shutdown] Recebido ${signal}; encerrando conexões.`);
      let failed = false;
      const server = getServer();
      try {
        if (server) await closeServer(server);
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
      exit(failed ? 1 : 0);
    })();
    return shutdownPromise;
  };
}
