
-- =====================================================================
-- Fase N.2 (docs/revisao-portal-conteudo-2026-09-24.md): todo programa com
-- endereço público. Só 2 dos 42 programas tinham `slug` (os com microsite);
-- sem ele não há como apontar para a página automática /programas/<slug>.
-- Regra: a sigla em minúsculas, quando existe (S/SIGLA é marcador de
-- ausência); senão o nome sem acento. Colisão com outro programa, com rota
-- fixa do site ou com página geral ganha sufixo. Programa que já tem slug
-- não muda (o microsite depende dele).
-- =====================================================================
DO $$
DECLARE
  p RECORD;
  base TEXT;
  candidato TEXT;
  n INTEGER;
  reservados TEXT[] := ARRAY['sobre', 'missao-visao-valores', 'historico', 'estrutura-organizacional',
    'equipe', 'financeiro', 'proext-pg', 'programas', 'calendario-academico', 'editais', 'resolucoes',
    'formularios', 'proficiencia', 'declaracoes', 'verificar', 'relatorios-autoavaliacao',
    'especializacao', 'residencia-profissional', 'sobre-internacionalizacao', 'alunos-estrangeiros',
    'capes-print', 'mobilidade-estudantil', 'reconhecimento', 'noticias', 'noticia', 'p', 'admin',
    'busca', 'privacidade', 'teses'];
BEGIN
  FOR p IN SELECT id, nome, sigla FROM programas WHERE slug IS NULL ORDER BY nome LOOP
    base := CASE WHEN p.sigla IS NOT NULL AND p.sigla <> '' AND p.sigla <> 'S/SIGLA' THEN p.sigla ELSE p.nome END;
    base := trim(both '-' from regexp_replace(lower(public.unaccent(base)), '[^a-z0-9]+', '-', 'g'));
    IF base = '' THEN base := 'programa'; END IF;
    candidato := base;
    n := 1;
    WHILE candidato = ANY(reservados)
       OR EXISTS (SELECT 1 FROM programas WHERE slug = candidato)
       OR EXISTS (SELECT 1 FROM pages WHERE programa_id IS NULL AND slug = candidato) LOOP
      n := n + 1;
      candidato := base || '-' || n;
    END LOOP;
    UPDATE programas SET slug = candidato WHERE id = p.id;
  END LOOP;
END$$;
