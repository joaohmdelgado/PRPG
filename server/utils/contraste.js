// Contraste das cores do microsite (Fase S.5 de
// docs/revisao-portal-conteudo-2026-09-24.md). Módulo puro, sem dependências:
// o servidor valida ao salvar o programa e o formulário do painel importa o
// mesmo arquivo para avisar enquanto a pessoa escolhe.
//
// Fórmulas do WCAG 2.x (luminância relativa e razão de contraste). Os pares
// conferidos são os que o microsite usa com texto (ProgramaLayout, PageHero,
// ProgramaHome):
// - cor primária × fundo claro: títulos e links na cor primária sobre o fundo
//   da página (#f9fafb) e, pelo mesmo valor, texto branco sobre a primária
//   (topo, faixas, rodapé);
// - cor de destaque × primária: chamadas e selos na cor de destaque sobre a
//   primária e texto na primária sobre botões/selos na cor de destaque.
// A cor de destaque não é usada como texto sobre fundo claro.

export const COR_PRIMARIA_PADRAO = '#1e2b4f';
export const COR_DESTAQUE_PADRAO = '#febd11';
export const FUNDO_CLARO = '#f9fafb';
export const CONTRASTE_MINIMO = 4.5; // WCAG AA, texto de tamanho normal

// '#abc', '#AABBCC' ou 'aabbcc' -> '#aabbcc'; qualquer outra coisa -> null.
export function normalizarHex(valor) {
  if (typeof valor !== 'string') return null;
  let h = valor.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/.test(h) ? `#${h}` : null;
}

export function luminancia(hex) {
  const h = normalizarHex(hex).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function razaoContraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const fmt = (r) => `${(Math.floor(r * 10) / 10).toFixed(1).replace('.', ',')}:1`;

// Avalia as cores efetivas (vazio = padrão da PRPG). Devolve os pares, se
// passam, e mensagens prontas para o usuário.
export function avaliarCores({ cor_primaria, cor_secundaria } = {}) {
  const erros = [];
  const vazio = (v) => v == null || String(v).trim() === '';
  const primaria = vazio(cor_primaria) ? COR_PRIMARIA_PADRAO : normalizarHex(cor_primaria);
  const destaque = vazio(cor_secundaria) ? COR_DESTAQUE_PADRAO : normalizarHex(cor_secundaria);
  if (!primaria) erros.push('Cor primária inválida: use o formato #RRGGBB (ex.: #1e2b4f).');
  if (!destaque) erros.push('Cor de destaque inválida: use o formato #RRGGBB (ex.: #febd11).');
  if (erros.length) return { ok: false, pares: [], erros };

  const pares = [
    { chave: 'primaria-fundo', rotulo: 'Cor primária × fundo claro (e texto branco sobre a primária)', a: primaria, b: FUNDO_CLARO },
    { chave: 'destaque-primaria', rotulo: 'Cor de destaque × cor primária', a: destaque, b: primaria },
  ].map((p) => {
    const razao = razaoContraste(p.a, p.b);
    return { ...p, razao: Math.round(razao * 100) / 100, minimo: CONTRASTE_MINIMO, ok: razao >= CONTRASTE_MINIMO };
  });
  for (const p of pares) {
    if (!p.ok) erros.push(`Contraste insuficiente — ${p.rotulo}: ${fmt(p.razao)} (mínimo ${fmt(CONTRASTE_MINIMO)}).`);
  }
  if (!pares[0].ok) erros.push('Escolha uma cor primária mais escura.');
  else if (!pares[1].ok) erros.push('Escolha uma cor de destaque mais clara (ou uma primária mais escura).');
  return { ok: erros.length === 0, pares, erros };
}
