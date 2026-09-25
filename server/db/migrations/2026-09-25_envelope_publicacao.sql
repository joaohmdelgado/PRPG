-- Envelope de publicacao nas tabelas de conteudo (Fase F.1 de
-- docs/revisao-portal-conteudo-2026-09-24.md).
--
-- Antes: salvar era publicar — nenhuma tabela de conteudo tinha status,
-- agendamento nem data de criacao/edicao. Convencao comum, sem tabela
-- generica `conteudos` (arquitetura-dados.md §4.1):
--
--   status        RASCUNHO | PUBLICADO | ARQUIVADO (linhas existentes: PUBLICADO)
--   publicado_em  NULL = publicado assim que o status for PUBLICADO;
--                 data futura = agendado (so aparece a partir dela)
--   criado_em     momento da criacao (NULL nas linhas anteriores a esta
--                 migracao — a data real e desconhecida, nao e inventada)
--   atualizado_em ultima edicao; mantido pelo trigger tocar_atualizado_em()
--                 e usado pelo painel para detectar edicao concorrente
--
-- Idempotente (ADD COLUMN IF NOT EXISTS / DROP TRIGGER IF EXISTS): o mesmo
-- bloco esta no fim de schema.sql para instalacoes novas.
--
-- Aplicar com: npm run db:migrate:apply

CREATE OR REPLACE FUNCTION tocar_atualizado_em() RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'news', 'editais', 'resolucoes', 'formularios', 'pages', 'faq',
    'disciplinas', 'teses_dissertacoes', 'grupos_pesquisa', 'bolsas', 'calendarios'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT ''PUBLICADO''', t);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_status_chk') THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I CHECK (status IN (''RASCUNHO'', ''PUBLICADO'', ''ARQUIVADO''))',
        t, t || '_status_chk');
    END IF;
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS publicado_em TIMESTAMPTZ', t);
    -- Sem DEFAULT no ADD COLUMN: as linhas antigas ficam NULL (data real
    -- desconhecida); o DEFAULT vale so para as novas.
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN criado_em SET DEFAULT now()', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN atualizado_em SET DEFAULT now()', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t || '_tocar_atualizado', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION tocar_atualizado_em()',
      t || '_tocar_atualizado', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (status)', t || '_status_idx', t);
  END LOOP;
END$$;

-- Notícia: destaque na home e texto alternativo da imagem de capa (acessibilidade).
ALTER TABLE news ADD COLUMN IF NOT EXISTS destaque BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE news ADD COLUMN IF NOT EXISTS imagem_alt TEXT;

-- Listas curadas: ordem manual dentro da seção.
ALTER TABLE resolucoes  ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;
ALTER TABLE faq         ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;
