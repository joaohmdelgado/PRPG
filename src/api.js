// Base URL central da API.
// Em desenvolvimento usa o servidor Express local; em produção defina
// VITE_API_URL no ambiente de build (ex.: https://prpg.ufrpe.br).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Cliente central de API. Substitui o fetch direto espalhado pelas telas:
//  - prefixa a base (API_URL) quando o path começa com '/';
//  - injeta o cabeçalho Authorization com o token salvo (quando há sessão);
//  - aceita `json:` como atalho para enviar um corpo JSON (define o
//    Content-Type e serializa automaticamente).
// Retorna o Response cru (o chamador decide sobre .ok / .json()), para que a
// migração das telas existentes seja um drop-in do fetch.
//
// Opções extras (além das do fetch):
//   auth  — false desativa o envio do token (chamadas públicas). Padrão: true.
//   json  — objeto a ser serializado como corpo JSON.
export async function apiFetch(path, { auth = true, json, headers, body, ...rest } = {}) {
  const url = typeof path === 'string' && path.startsWith('/') ? `${API_URL}${path}` : path;
  const finalHeaders = { ...(headers || {}) };

  if (auth) {
    const token = localStorage.getItem('token');
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  let finalBody = body;
  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(json);
  }

  return fetch(url, { ...rest, headers: finalHeaders, body: finalBody });
}

// Atalho para GET que já devolve o JSON parseado (lança em status != 2xx).
export async function apiGet(path, options = {}) {
  const res = await apiFetch(path, { ...options, method: 'GET' });
  if (!res.ok) throw new Error(`GET ${path} falhou (${res.status})`);
  return res.json();
}

// Endereço exibível de uma mídia: uploads ficam gravados como /uploads/...
// (relativo) e são servidos pela API; URLs externas passam intactas.
export const urlMidia = (url) => (url && url.startsWith('/uploads/') ? `${API_URL}${url}` : url);
