// Logs de borda: não serialize objetos de erro ou request, pois mensagens e
// propriedades podem carregar credenciais, CPF, corpo HTTP ou SQL com dados.
export const formatErrorLog = ({ requestId, error }) => JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'error',
  event: 'unhandled_request_error',
  requestId: requestId || null,
  errorType: error?.constructor?.name || 'UnknownError',
  errorCode: typeof error?.code === 'string' || typeof error?.code === 'number' ? error.code : null,
});

export const logUnexpectedError = (context) => {
  console.error(formatErrorLog(context));
};
