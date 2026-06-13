// Base URL central da API.
// Em desenvolvimento usa o servidor Express local; em produção defina
// VITE_API_URL no ambiente de build (ex.: https://prpg.ufrpe.br).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
