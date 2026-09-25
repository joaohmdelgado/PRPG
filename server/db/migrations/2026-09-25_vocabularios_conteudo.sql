-- Classificacoes de conteudo editaveis no painel (Fase F.4 de
-- docs/revisao-portal-conteudo-2026-09-24.md).
--
-- Antes: categoria de noticia fixa no formulario, categoria de edital fixa na
-- pagina publica (edital com outra categoria sumia do site), secoes de
-- resolucao/formulario com ordem fixa no codigo, e subcategoria de resolucao/
-- tipo de bolsa numa quarta estrutura (`taxonomias`). Tudo passa a morar em
-- `vocabularios` (valor = chave estavel gravada no conteudo; rotulo =
-- exibicao; ordem; cor = classes do selo).
--
-- `taxonomias` continua existindo para as chaves do cadastro de usuario
-- (entradas, situacoes_aluno), fora do escopo desta fase.
--
-- Idempotente (ON CONFLICT DO NOTHING); o mesmo bloco esta no fim de
-- schema.sql. Aplicar com: npm run db:migrate:apply

INSERT INTO vocabularios (dominio, valor, rotulo, cor, ordem) VALUES
  ('noticia.categoria', 'pesquisa',      'Pesquisa',      'bg-ufrpe-cyan text-white',          0),
  ('noticia.categoria', 'institucional', 'Institucional', 'bg-blue-600 text-white',            1),
  ('noticia.categoria', 'eventos',       'Eventos',       'bg-green-600 text-white',           2),
  ('noticia.categoria', 'internacional', 'Internacional', 'bg-purple-600 text-white',          3),
  ('noticia.categoria', 'editais',       'Editais',       'bg-ufrpe-yellow text-ufrpe-blue',   4),
  ('noticia.categoria', 'premiacao',     'Premiação',     'bg-amber-600 text-white',           5),
  ('edital.categoria', 'mestrado-doutorado',  'Mestrado e Doutorado', NULL, 0),
  ('edital.categoria', 'especializacao',      'Especialização',       NULL, 1),
  ('edital.categoria', 'residencia',          'Residência',           NULL, 2),
  ('edital.categoria', 'internacionalizacao', 'Internacionalização',  NULL, 3),
  ('documento.secao', 'mestrado-doutorado',  'Mestrado e Doutorado',   NULL, 0),
  ('documento.secao', 'internacionalizacao', 'Internacionalização',    NULL, 1),
  ('documento.secao', 'lato-sensu',          'Lato sensu',             NULL, 2),
  ('documento.secao', 'apoio-financeiro',    'Apoio Financeiro',       NULL, 3),
  ('documento.secao', 'outras',              'Outras / Institucional', NULL, 4)
ON CONFLICT (dominio, valor, COALESCE(programa_id, '')) DO NOTHING;

-- "Premiação" era gravada com o slug de "Eventos" (mapeamento fixo do
-- formulário); passa a ter o próprio.
UPDATE news SET category_slug = 'premiacao' WHERE category = 'Premiação' AND category_slug = 'eventos';

-- Subcategoria de resolução e tipo de bolsa: o conteúdo grava o rótulo
-- (category_title / tipo_bolsa), então valor = rótulo sem acento em slug.
-- Origem: as listas de `taxonomias` e os valores já usados no conteúdo.
WITH origem AS (
  SELECT 'resolucao.subcategoria' AS dominio, unnest(valores) AS rotulo
    FROM taxonomias WHERE chave = 'subcategorias_resolucao'
  UNION
  SELECT 'resolucao.subcategoria', category_title FROM resolucoes WHERE coalesce(category_title, '') <> ''
  UNION
  SELECT 'bolsa.tipo', unnest(valores) FROM taxonomias WHERE chave = 'tipo_bolsa'
  UNION
  SELECT 'bolsa.tipo', tipo_bolsa FROM bolsas WHERE coalesce(tipo_bolsa, '') <> ''
)
INSERT INTO vocabularios (dominio, valor, rotulo, ordem)
SELECT dominio,
       btrim(regexp_replace(lower(translate(rotulo,
         'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
         'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')), '[^a-z0-9]+', '-', 'g'), '-'),
       rotulo,
       (row_number() OVER (PARTITION BY dominio ORDER BY rotulo))::int - 1
  FROM origem
ON CONFLICT (dominio, valor, COALESCE(programa_id, '')) DO NOTHING;
