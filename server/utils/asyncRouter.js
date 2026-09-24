// Express 4 não captura a rejeição de um handler `async`: o erro escapa como
// `unhandledRejection` e server/index.js encerra o processo (a API inteira cai
// por causa de uma requisição). Este wrapper encaminha a rejeição para
// `next(err)`, onde o tratador global de server/app.js responde em JSON.

// Middlewares de erro (4 argumentos) e valores que não são função (paths,
// opções) passam intactos.
export const wrapAsync = (fn) => {
  if (typeof fn !== 'function' || fn.length === 4) return fn;
  return function wrapped(req, res, next) {
    try {
      const result = fn.call(this, req, res, next);
      if (result && typeof result.catch === 'function') result.catch(next);
    } catch (err) {
      next(err);
    }
  };
};

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all'];

// Faz todo handler registrado no router passar pelo wrapAsync, sem precisar
// envolver rota a rota (e sem depender de quem escrever a próxima rota lembrar).
export function asyncRouter(router) {
  for (const method of METHODS) {
    const original = router[method].bind(router);
    router[method] = (...args) =>
      original(...args.map((a) => (Array.isArray(a) ? a.map(wrapAsync) : wrapAsync(a))));
  }
  return router;
}
