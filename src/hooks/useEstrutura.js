import { useEffect, useState } from 'react';
import { apiFetch, urlMidia } from '../api';
import { linkTelefone } from './usePortal';

// Estrutura da PRPG (Fase H.4): setores, pessoas e contatos públicos, de
// /api/estrutura — a mesma fonte para Equipe e Estrutura Organizacional.
export default function useEstrutura() {
  const [raiz, setRaiz] = useState(null);
  const [estado, setEstado] = useState('carregando'); // carregando | ok | erro
  useEffect(() => {
    let vivo = true;
    apiFetch('/api/estrutura', { auth: false })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => { if (vivo) { setRaiz(d); setEstado('ok'); } })
      .catch(() => { if (vivo) setEstado('erro'); });
    return () => { vivo = false; };
  }, []);
  return { raiz, estado };
}

const ICONES = {
  EMAIL: 'fa-solid fa-envelope', TELEFONE: 'fa-solid fa-phone', RAMAL: 'fa-solid fa-phone',
  CELULAR: 'fa-solid fa-mobile-screen', WHATSAPP: 'fa-brands fa-whatsapp', SITE: 'fa-solid fa-globe',
  ENDERECO: 'fa-solid fa-location-dot', INSTAGRAM: 'fa-brands fa-instagram',
};
const ROTULOS = {
  EMAIL: 'E-mail', TELEFONE: 'Telefone', RAMAL: 'Ramal', CELULAR: 'Celular', WHATSAPP: 'WhatsApp',
  SITE: 'Site', ENDERECO: 'Endereço', INSTAGRAM: 'Instagram',
};

// Destino do link de um contato (ou null quando é só texto).
export const hrefContato = (c) => {
  if (c.tipo === 'EMAIL') return `mailto:${c.valor}`;
  if (c.tipo === 'WHATSAPP') return `https://wa.me/55${String(c.valor).replace(/\D/g, '').replace(/^55/, '')}`;
  if (['TELEFONE', 'CELULAR', 'RAMAL'].includes(c.tipo)) return linkTelefone(c.valor);
  if (c.tipo === 'SITE') return /^https?:/i.test(c.exibicao) ? c.exibicao : `https://${c.exibicao}`;
  return null;
};
export const iconeContato = (tipo) => ICONES[tipo] || 'fa-solid fa-circle-info';
export const rotuloContato = (tipo) => ROTULOS[tipo] || tipo;

// Primeira letra do primeiro e do último nome ("Maria Isabel de Moraes Gomes" -> "MG").
export const iniciais = (nome) => {
  const partes = String(nome || '').split(/\s+/).filter((p) => p && !/^(de|da|do|dos|das|e)$/i.test(p));
  if (!partes.length) return '?';
  return `${partes[0][0]}${partes.length > 1 ? partes[partes.length - 1][0] : ''}`.toUpperCase();
};

export const fotoPessoa = (m) => (m.foto ? urlMidia(m.foto) : null);
