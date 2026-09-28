// Desempenho real (Fase P.6 de docs/revisao-portal-conteudo-2026-09-24.md):
// o Lighthouse mede em laboratório; aqui é o que quem visita o site realmente
// viveu — reportado pelo navegador (src/webVitals.js, biblioteca web-vitals)
// e agregado no painel Qualidade dos dados.
import { query } from '../db/pool.js';

const METRICAS = ['CLS', 'FCP', 'INP', 'LCP', 'TTFB'];
const AVALIACOES = ['good', 'needs-improvement', 'poor'];
const DISPOSITIVOS = ['mobile', 'desktop'];

// Mesmos limiares que a biblioteca web-vitals usa no navegador (CLSThresholds
// etc.) — para classificar o p75 agregado com a mesma régua "boa/razoável/
// ruim" que o Lighthouse e o Chrome UX Report usam.
const LIMIARES = { LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500], FCP: [1800, 3000], TTFB: [800, 1800] };
const avaliar = (metrica, valor) => {
  const [bom, ruim] = LIMIARES[metrica];
  return valor <= bom ? 'good' : valor <= ruim ? 'needs-improvement' : 'poor';
};

// POST /web-vitals — anônimo, um beacon por métrica por visita (CLS, FCP,
// INP, LCP ou TTFB). Sem sessão, sem cookie, sem IP nem user-agent gravados:
// só o necessário para o p75 por rota (minimização, LGPD). O CHECK do banco é
// uma segunda barreira, porque este endpoint aceita escrita de qualquer
// visitante.
export const registrarWebVitals = async (req, res) => {
  const b = req.body;
  if (typeof b?.rota !== 'string' || !b.rota.trim()) {
    return res.status(400).json({ message: 'Rota inválida.' });
  }
  if (!METRICAS.includes(b.metrica)) return res.status(400).json({ message: 'Métrica inválida.' });
  if (typeof b.valor !== 'number' || !Number.isFinite(b.valor) || b.valor < 0) {
    return res.status(400).json({ message: 'Valor inválido.' });
  }
  if (!AVALIACOES.includes(b.avaliacao)) return res.status(400).json({ message: 'Avaliação inválida.' });
  if (b.dispositivo != null && !DISPOSITIVOS.includes(b.dispositivo)) {
    return res.status(400).json({ message: 'Dispositivo inválido.' });
  }

  await query(
    'INSERT INTO web_vitals (rota, metrica, valor, avaliacao, dispositivo) VALUES ($1, $2, $3, $4, $5)',
    [b.rota.trim().slice(0, 120), b.metrica, b.valor, b.avaliacao, b.dispositivo || null],
  );

  // Retenção leve, sem cron dedicado: uma fração dos envios apaga o que
  // passou de 180 dias (o painel olha no máximo os últimos 90 — ver getResumo).
  // Não é aguardado: não atrasa a resposta do beacon.
  if (Math.random() < 1 / 500) {
    query("DELETE FROM web_vitals WHERE capturado_em < now() - interval '180 days'").catch(() => {});
  }

  res.status(204).end();
};

const DIAS_PADRAO = 30;
const DIAS_MAX = 90;
// Amostra mínima para o painel considerar o p75 confiável (rotas com pouca
// visita mostram o número, mas marcadas — um p75 de 3 amostras é ruído).
const AMOSTRA_MINIMA = 10;

// GET /web-vitals/resumo?dias= — p75 por rota e métrica, Admin/Gestor
// (Qualidade dos dados). Sem filtro por dispositivo: o painel é um retrato
// geral; quem quiser o detalhe consulta o banco diretamente.
export const getResumoWebVitals = async (req, res) => {
  const dias = Math.min(Math.max(Number.parseInt(req.query.dias, 10) || DIAS_PADRAO, 1), DIAS_MAX);

  const { rows } = await query(
    `SELECT rota, metrica,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY valor) AS p75,
            count(*)::int AS n
       FROM web_vitals
      WHERE capturado_em >= now() - ($1 || ' days')::interval
      GROUP BY rota, metrica`,
    [dias],
  );

  const porRota = new Map();
  for (const r of rows) {
    if (!porRota.has(r.rota)) porRota.set(r.rota, { rota: r.rota, amostras: 0, metricas: {} });
    const item = porRota.get(r.rota);
    item.amostras += r.n;
    item.metricas[r.metrica] = { p75: Number(r.p75), n: r.n, avaliacao: avaliar(r.metrica, Number(r.p75)), confiavel: r.n >= AMOSTRA_MINIMA };
  }

  const rotas = [...porRota.values()].sort((a, b) => b.amostras - a.amostras);
  res.json({ dias, totalAmostras: rows.reduce((n, r) => n + r.n, 0), rotas });
};
