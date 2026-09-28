-- =====================================================================
-- Fase P.6 (docs/revisao-portal-conteudo-2026-09-24.md): medição real de
-- Web Vitals (CLS, FCP, INP, LCP, TTFB), reportada pelo navegador de quem
-- visita o site (biblioteca web-vitals, src/webVitals.js) e agregada por
-- família de rota (server/controllers/webVitalsController.js,
-- painel Qualidade dos dados). Uma linha por métrica por visita — sem
-- identificador de pessoa, IP nem user-agent (minimização, LGPD); os CHECKs
-- são defesa a mais porque a tabela recebe escrita pública (anônima).
-- =====================================================================
CREATE TABLE IF NOT EXISTS web_vitals (
  id            BIGSERIAL PRIMARY KEY,
  rota          TEXT NOT NULL CHECK (char_length(rota) <= 120),
  metrica       TEXT NOT NULL CHECK (metrica IN ('CLS', 'FCP', 'INP', 'LCP', 'TTFB')),
  valor         DOUBLE PRECISION NOT NULL CHECK (valor >= 0 AND valor < 1e9),
  avaliacao     TEXT NOT NULL CHECK (avaliacao IN ('good', 'needs-improvement', 'poor')),
  dispositivo   TEXT CHECK (dispositivo IN ('mobile', 'desktop')),
  capturado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS web_vitals_metrica_rota_idx ON web_vitals (metrica, rota, capturado_em DESC);
CREATE INDEX IF NOT EXISTS web_vitals_capturado_em_idx ON web_vitals (capturado_em);
