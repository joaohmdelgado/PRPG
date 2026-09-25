-- =====================================================================
-- Fase S.2 (docs/revisao-portal-conteudo-2026-09-24.md): páginas fixas
-- para todos os programas — além de "Sobre", Impacto Social,
-- Autoavaliação, Infraestrutura, Internacionalização e Planejamento (o que
-- os sites atuais dos programas têm em "O Programa"). Nascem vazias e ficam
-- fora do menu do microsite até ganharem texto (server/utils/micrositeMenu.js).
-- Mesmo critério de pagesRepo.ensureFixedPages: se o programa já tinha uma
-- página comum com esse endereço, ela passa a ser a fixa (texto mantido).
-- Idempotente; num banco novo (sem programas) não faz nada.
-- =====================================================================
DO $$
DECLARE
  fixa RECORD;
BEGIN
  FOR fixa IN SELECT * FROM (VALUES
      ('sobre', 'Sobre o Programa'),
      ('impacto-social', 'Impacto Social'),
      ('autoavaliacao', 'Autoavaliação'),
      ('infraestrutura', 'Infraestrutura'),
      ('internacionalizacao', 'Internacionalização'),
      ('planejamento', 'Planejamento')) AS v(chave, titulo)
  LOOP
    UPDATE pages pg SET chave = fixa.chave
     WHERE pg.programa_id IS NOT NULL AND pg.slug = fixa.chave AND pg.chave IS NULL
       AND NOT EXISTS (SELECT 1 FROM pages o WHERE o.programa_id = pg.programa_id AND o.chave = fixa.chave);

    INSERT INTO pages (id, title, slug, chave, body_value, body_summary, programa_id)
    SELECT gen_random_uuid()::text, fixa.titulo, fixa.chave, fixa.chave, '', '', p.id
      FROM programas p
     WHERE NOT EXISTS (SELECT 1 FROM pages o WHERE o.programa_id = p.id AND o.chave = fixa.chave);
  END LOOP;
END $$;
