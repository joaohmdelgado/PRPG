
-- =====================================================================
-- Fase N.3: o repositório global de teses (/teses) entra no menu principal,
-- em "Mestrado e Doutorado", logo depois de "Cursos Stricto Sensu". Só se o
-- menu tiver esse grupo e ainda não houver item apontando para /teses — o
-- menu é editável no painel e a migração não deve desfazer edições.
-- =====================================================================
DO $$
DECLARE
  grupo BIGINT;
BEGIN
  SELECT id INTO grupo FROM menu_itens WHERE menu = 'principal' AND pai_id IS NULL AND rotulo = 'Mestrado e Doutorado' LIMIT 1;
  IF grupo IS NOT NULL AND NOT EXISTS (SELECT 1 FROM menu_itens WHERE menu = 'principal' AND destino = '/teses') THEN
    UPDATE menu_itens SET ordem = ordem + 1 WHERE pai_id = grupo AND ordem >= 1;
    INSERT INTO menu_itens (menu, pai_id, rotulo, destino, ordem) VALUES ('principal', grupo, 'Teses e Dissertações', '/teses', 1);
  END IF;
END$$;
