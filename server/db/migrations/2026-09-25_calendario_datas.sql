
-- =====================================================================
-- Fase N.6 (docs/revisao-portal-conteudo-2026-09-24.md): marcos do
-- calendário com data de verdade. `date` (TEXT) continua sendo o período
-- como escrito ("02/03/2026 a 06/03/2026", "até 24/04/2026") e é o que o
-- site exibe; data_inicio/data_fim são derivadas dele ao salvar
-- (calendariosRepo) e servem para ordenar, filtrar "próximos prazos" e gerar
-- o .ics. edital_id liga o marco a um edital (opcional).
-- =====================================================================
ALTER TABLE calendario_milestones ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE calendario_milestones ADD COLUMN IF NOT EXISTS data_fim DATE;
ALTER TABLE calendario_milestones ADD COLUMN IF NOT EXISTS edital_id TEXT REFERENCES editais(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_calendario_milestones_fim ON calendario_milestones (data_fim);

-- Carga das datas a partir do texto já gravado: a última data do texto é o
-- fim; a primeira é o início, exceto em "até dd/mm/aaaa" (só prazo final).
UPDATE calendario_milestones SET
  data_fim = to_date(substring(date FROM '(\d{2}/\d{2}/\d{4})[^0-9]*$'), 'DD/MM/YYYY'),
  data_inicio = CASE WHEN date ~* '^\s*at' THEN NULL
                     ELSE to_date(substring(date FROM '(\d{2}/\d{2}/\d{4})'), 'DD/MM/YYYY') END
WHERE data_fim IS NULL AND date ~ '\d{2}/\d{2}/\d{4}';
