// Fase O.3: casamento das grafias da planilha com o cadastro (programas,
// unidades, pessoas) e leitura de datas escritas à mão. Tudo roda dentro da
// transação da importação (ctx.q), para a simulação enxergar o que a própria
// importação acabou de criar.
import crypto from 'crypto';
import { chaveTexto, limpar } from './nucleo.js';
import { normalizarCpf, cpfValido } from '../../utils/cpf.js';

// ------------------------------------------------------------ datas ----------
const ultimoDia = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
const iso = (a, m, d) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const anoCompleto = (a) => {
  const n = Number(a);
  return String(a).length <= 2 ? 2000 + n : n;
};

// 'dd/mm/aaaa', 'dd/mm/aa', 'dd/mm' (com anoPadrao), '1º/10/2025', '02/02//2024'.
// Dia inexistente (31/04) vira o último dia do mês com `ajustada`.
// Devolve { data, ajustada } ou null.
export const lerDataBr = (texto, anoPadrao = null) => {
  const s = limpar(texto).replace(/º|°/g, '').replace(/\/{2,}/g, '/');
  const m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  if (!m) return null;
  const ano = m[3] ? anoCompleto(m[3]) : anoPadrao;
  const mes = Number(m[2]);
  let dia = Number(m[1]);
  if (!ano || mes < 1 || mes > 12 || dia < 1) return null;
  const max = ultimoDia(ano, mes);
  let ajustada = false;
  if (dia > max) { if (dia > 31) return null; dia = max; ajustada = true; }
  return { data: iso(ano, mes, dia), ajustada };
};

const MESES = {
  jan: 1, janeiro: 1, fev: 2, fevereiro: 2, mar: 3, marco: 3, abr: 4, abril: 4, mai: 5, maio: 5,
  jun: 6, junho: 6, jul: 7, julho: 7, ago: 8, agosto: 8, set: 9, setembro: 9, out: 10, outubro: 10,
  nov: 11, novembro: 11, dez: 12, dezembro: 12,
};

// Um lado de um período: data completa, 'mm/aaaa', 'mês de aaaa', 'mês/aaaa',
// 'dd de mês de aaaa'. `lado` diz se mês/ano vira o 1º (início) ou o último dia (fim).
const lerLado = (texto, lado) => {
  const s = chaveTexto(texto);
  if (!s) return null;
  const completa = lerDataBr(limpar(texto));
  if (completa) return { data: completa.data, aprox: false, ajustada: completa.ajustada };
  let m = limpar(texto).match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mes = Number(m[1]); const ano = Number(m[2]);
    if (mes < 1 || mes > 12) return null;
    return { data: iso(ano, mes, lado === 'inicio' ? 1 : ultimoDia(ano, mes)), aprox: true };
  }
  m = s.match(/^(\d{1,2}) de ([a-z]+) de (\d{4})$/);
  if (m && MESES[m[2]]) {
    const r = lerDataBr(`${m[1]}/${MESES[m[2]]}/${m[3]}`);
    return r ? { data: r.data, aprox: false, ajustada: r.ajustada } : null;
  }
  m = s.match(/^([a-z]+) (?:de )?(\d{4})$/);
  if (m && MESES[m[1]]) {
    const mes = MESES[m[1]]; const ano = Number(m[2]);
    return { data: iso(ano, mes, lado === 'inicio' ? 1 : ultimoDia(ano, mes)), aprox: true };
  }
  return null;
};

// Período do PNPD (requisitos-pnpd.md §1.4): cinco gramáticas, separador
// 'a'/'A'/'até'/'at é'. Fim em aberto ('07/02/2025 a ') e início sem ano
// ('Junho a Dezembro de 2021') não são adivinhados.
// Devolve { inicio, fim, inicioAprox, fimAprox, ajustada, completo }.
export const lerPeriodo = (texto) => {
  const vazio = { inicio: null, fim: null, inicioAprox: false, fimAprox: false, ajustada: false, completo: false };
  const s = limpar(texto);
  if (!s) return vazio;
  const partes = s.split(/\s+(?:a|at\s?[eé]|ate)(?:\s+|$)/i);
  const [ini, fim = ''] = partes.length >= 2 ? partes : [s, ''];
  const a = lerLado(ini, 'inicio');
  const b = lerLado(fim, 'fim');
  const r = {
    inicio: a?.data || null, fim: b?.data || null,
    inicioAprox: !!a?.aprox, fimAprox: !!b?.aprox,
    ajustada: !!(a?.ajustada || b?.ajustada),
  };
  r.completo = !!(r.inicio && r.fim);
  return r;
};

// ------------------------------------------------------------ programas ------
const PREFIXOS_PROGRAMA = [
  'programa de pos graduacao em', 'programa de pos graduacao', 'mestrado profissional em',
  'mestrado academico em', 'doutorado em', 'mestrado em', 'ppg em', 'pos graduacao em',
];

// Núcleo comparável do nome de um programa: sem "Programa de Pós-Graduação em",
// sem o que vem entre parênteses (campus/instituição) e sem " - SIGLA" no fim.
export const nucleoPrograma = (nome) => {
  let s = limpar(nome).replace(/\([^)]*\)/g, ' ');
  s = chaveTexto(s);
  for (const p of PREFIXOS_PROGRAMA) if (s.startsWith(p + ' ') || s === p) { s = s.slice(p.length).trim(); break; }
  return s;
};

// Texto entre parênteses no nome ('(UAST)', '(FUNDAJ/UFRPE)') — campus/instituição.
export const parentesesDoNome = (nome) => [...limpar(nome).matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim());

export async function carregarProgramas(ctx) {
  const { rows } = await ctx.q(`SELECT id, nome, sigla, campus FROM programas`);
  const porNucleo = new Map();
  const porSigla = new Map();
  for (const p of rows) {
    const n = nucleoPrograma(p.nome);
    if (n) porNucleo.set(n, [...(porNucleo.get(n) || []), p]);
    const sg = chaveTexto(p.sigla);
    if (sg && sg !== 's sigla') porSigla.set(sg, [...(porSigla.get(sg) || []), p]);
  }
  return {
    todos: rows,
    // Casamento por nome (exato, depois prefixo único) e, só então, por sigla
    // única — duas linhas da planilha de contatos usam a mesma sigla PPGCS.
    casar(nome, sigla) {
      const n = nucleoPrograma(nome);
      if (n && porNucleo.get(n)?.length === 1) return porNucleo.get(n)[0];
      if (n && n.length >= 6) {
        const cand = rows.filter((p) => {
          const pn = nucleoPrograma(p.nome);
          return pn && pn.length >= 6 && (pn.startsWith(n) || n.startsWith(pn));
        });
        if (cand.length === 1) return cand[0];
      }
      const sg = chaveTexto(sigla);
      if (sg && porSigla.get(sg)?.length === 1) return porSigla.get(sg)[0];
      return null;
    },
    porId: (id) => rows.find((p) => p.id === id) || null,
  };
}

// Palpite para a revisão (nunca aplicado sozinho): o programa com mais
// palavras em comum com a grafia, se tiver ao menos metade delas.
export const sugerirPrograma = (programas, grafia) => {
  const palavras = new Set(nucleoPrograma(grafia).split(' ').filter((p) => p.length >= 3 && !['pos', 'graduacao'].includes(p)));
  if (!palavras.size) return null;
  let melhor = null;
  let nota = 0;
  for (const p of programas.todos) {
    const alvo = new Set(nucleoPrograma(p.nome).split(' ').filter((x) => x.length >= 3));
    const comuns = [...palavras].filter((x) => alvo.has(x) || [...alvo].some((a) => a.startsWith(x) || x.startsWith(a))).length;
    const s = comuns / Math.max(palavras.size, alvo.size);
    if (s > nota) { nota = s; melhor = p; }
  }
  return nota >= 0.5 ? melhor : null;
};

// ------------------------------------------------------------ unidades -------
export async function carregarUnidades(ctx, extras = {}) {
  const { rows } = await ctx.q('SELECT id, sigla, nome, aliases FROM unidades WHERE ativo');
  const mapa = new Map();
  const por = (k, id) => { const c = chaveTexto(k); if (c && !mapa.has(c)) mapa.set(c, id); };
  for (const u of rows) {
    por(u.sigla, u.id); por(u.nome, u.id);
    for (const a of u.aliases || []) por(a, u.id);
  }
  for (const [k, id] of Object.entries(extras)) if (rows.some((u) => u.id === id)) por(k, id);
  return {
    casar(texto) {
      const c = chaveTexto(texto);
      if (!c) return null;
      if (mapa.has(c)) return mapa.get(c);
      // "DAP/PROGEPE", "DIRETORIA DE CONTABILIDADE E FINANÇAS-PROPLAD": um
      // segmento inteiro conhecido, do último para o primeiro. Palavra solta
      // não vale ("VICE-REITORIA" não é a Reitoria) — casamento errado não
      // vira pendência e ninguém o revisaria.
      const segmentos = limpar(texto).split(/\s*\/\s*|\s+-\s+|-(?=[A-ZÀ-Ý]{3,}$)/);
      if (segmentos.length > 1) {
        for (let k = segmentos.length - 1; k >= 0; k--) {
          const antes = chaveTexto(segmentos[k - 1] || '');
          if (/(^| )(vice|pro|sub|ex)$/.test(antes)) continue;
          const s = chaveTexto(segmentos[k]);
          if (s.length >= 3 && mapa.has(s)) return mapa.get(s);
        }
      }
      return null;
    },
  };
}

// ------------------------------------------------------------ pessoas --------
// Índice de pessoas por CPF, e-mail e nome normalizado. Nome só casa quando é
// único — homônimo nunca é resolvido por adivinhação.
export async function carregarPessoas(ctx) {
  const { rows } = await ctx.q(`
    SELECT p.id, p.nome, p.cpf, lower(p.email_institucional) AS email FROM pessoas p
    UNION ALL
    SELECT u.pessoa_id, COALESCE(p.nome, u.perfil_nome), COALESCE(p.cpf, u.perfil_cpf), lower(u.email)
      FROM users u LEFT JOIN pessoas p ON p.id = u.pessoa_id WHERE u.pessoa_id IS NOT NULL`);
  const { rows: emails } = await ctx.q(
    `SELECT entidade_id AS id, valor FROM contatos WHERE entidade = 'pessoa' AND tipo = 'EMAIL'`);
  const porCpf = new Map(); const porEmail = new Map(); const porNome = new Map();
  const add = (p) => {
    const cpf = normalizarCpf(p.cpf);
    if (cpf) porCpf.set(cpf, p.id);
    if (p.email) porEmail.set(p.email, p.id);
    const n = chaveTexto(p.nome);
    if (n) porNome.set(n, [...new Set([...(porNome.get(n) || []), p.id])]);
  };
  rows.forEach(add);
  for (const e of emails) porEmail.set(String(e.valor).toLowerCase(), e.id);

  return {
    porCpf: (cpf) => porCpf.get(normalizarCpf(cpf)) || null,
    porEmail: (email) => porEmail.get(String(email || '').toLowerCase()) || null,
    porNome: (nome) => { const l = porNome.get(chaveTexto(nome)); return l?.length === 1 ? l[0] : null; },
    // Cria uma pessoa sem login e já a deixa no índice (a mesma importação
    // pode encontrá-la de novo, ex.: renovação de estágio).
    async criar({ nome, cpf = null, email = null }) {
      const id = crypto.randomUUID();
      const cpfN = normalizarCpf(cpf);
      await ctx.q(
        `INSERT INTO pessoas (id, nome, cpf, cpf_valido, email_institucional, criado_por) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, limpar(nome), cpfN, cpfN ? cpfValido(cpfN) : true, email, ctx.actor]);
      add({ id, nome, cpf: cpfN, email: email ? email.toLowerCase() : null });
      return id;
    },
  };
}

// ------------------------------------------------------------ processos ------
export const NUP_NO_TEXTO = /\d{5}\.\d{5,6}\/\d{4}-\d{2}/g;

// Liga atos e estágios de pós-doc aos processos já cadastrados pelo NUP que
// aparece no texto da planilha. Roda ao fim de cada importação: a ordem
// Contatos → Expedientes → Câmara → PNPD põe os ofícios antes dos processos
// da Câmara, então a ligação se completa quando a Câmara é importada.
export async function religarProcessos(ctx) {
  const atos = await ctx.q(`
    UPDATE atos a SET processo_id = p.id
      FROM processos p
     WHERE a.processo_id IS NULL AND a.obs_original IS NOT NULL
       AND position(p.numero IN a.obs_original) > 0`);
  const posdocs = await ctx.q(`
    UPDATE pos_doutorados pd SET processo_id = p.id
      FROM processos p
     WHERE pd.processo_id IS NULL AND pd.processo_original IS NOT NULL
       AND position(p.numero IN pd.processo_original) > 0`);
  return { atos: atos.rowCount, posdocs: posdocs.rowCount };
}
