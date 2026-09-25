
-- =====================================================================
-- Fase H.1 (docs/revisao-portal-conteudo-2026-09-24.md): menus, atalhos e
-- dados de contato do portal no banco, editáveis no painel — antes fixos em
-- Navbar.jsx, Footer.jsx e Home.jsx. Semeado com o que o código mostrava.
--
-- menus: cada lista editável do portal. `niveis` = 1 (lista simples) ou 2
-- (itens com subitens); `campos` = os campos extras que a lista usa
-- (icone, descricao, imagem), para o editor mostrar só o que importa.
-- menu_itens.destino: rota interna ('/editais'), página ('/p/slug' ou
-- '/slug') ou URL externa ('https://...'); NULL = só agrupa subitens.
-- configuracoes: pares chave -> JSON (contato da PRPG, chamada da home).
-- =====================================================================
CREATE TABLE IF NOT EXISTS menus (
  chave     TEXT PRIMARY KEY,
  nome      TEXT NOT NULL,
  descricao TEXT,
  niveis    INTEGER NOT NULL DEFAULT 1 CHECK (niveis IN (1, 2)),
  campos    TEXT[] NOT NULL DEFAULT '{}',
  ordem     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_itens (
  id             BIGSERIAL PRIMARY KEY,
  menu           TEXT NOT NULL REFERENCES menus(chave) ON DELETE CASCADE,
  pai_id         BIGINT REFERENCES menu_itens(id) ON DELETE CASCADE,
  rotulo         TEXT NOT NULL,
  destino        TEXT,
  descricao      TEXT,
  icone          TEXT,
  imagem         TEXT,
  ordem          INTEGER NOT NULL DEFAULT 0,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por TEXT
);
CREATE INDEX IF NOT EXISTS idx_menu_itens_menu ON menu_itens (menu, pai_id, ordem);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave          TEXT PRIMARY KEY,
  valor          JSONB NOT NULL DEFAULT '{}',
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por TEXT
);

INSERT INTO menus (chave, nome, descricao, niveis, campos, ordem) VALUES
  ('principal',     'Menu principal',     'Barra de navegação do topo do site. Itens com subitens abrem um submenu.', 2, '{}', 0),
  ('topo',          'Links da faixa superior', 'Links curtos na faixa azul acima do menu (sistemas da UFRPE).', 1, '{}', 1),
  ('rodape',        'Rodapé',             'Colunas de links do rodapé: cada item de primeiro nível é o título de uma coluna.', 2, '{}', 2),
  ('redes-sociais', 'Redes sociais',      'Ícones de redes sociais no rodapé. Ícone: classe do Font Awesome (ex.: fa-brands fa-instagram).', 1, '{icone}', 3),
  ('acesso-rapido', 'Acesso rápido (home)', 'Atalhos com ícone logo abaixo do banner da página inicial.', 1, '{icone}', 4),
  ('jornada',       'Jornada do aluno (home)', 'Cartões de serviços da página inicial.', 1, '{icone,descricao}', 5),
  ('cursos',        'Programas e cursos (home)', 'Cartões "Nossos Programas e Cursos" da página inicial.', 1, '{descricao,imagem}', 6),
  ('parceiros',     'Parceiros e fomento', 'Logomarcas no fim da página inicial.', 1, '{imagem}', 7)
ON CONFLICT (chave) DO NOTHING;

-- Semeia um menu só se ele ainda estiver vazio (a migração pode rodar num
-- banco em que alguém já editou os menus).
DO $$
DECLARE
  pai BIGINT;
  vazio BOOLEAN;
BEGIN
  -- ------------------------------------------------ principal
  SELECT NOT EXISTS (SELECT 1 FROM menu_itens WHERE menu = 'principal') INTO vazio;
  IF vazio THEN
    INSERT INTO menu_itens (menu, rotulo, destino, ordem) VALUES ('principal', 'A Pós-Graduação', NULL, 0) RETURNING id INTO pai;
    INSERT INTO menu_itens (menu, pai_id, rotulo, destino, ordem) VALUES
      ('principal', pai, 'Missão, Visão e Valores', '/missao-visao-valores', 0),
      ('principal', pai, 'Sobre a PRPG', '/sobre', 1),
      ('principal', pai, 'Histórico', '/historico', 2),
      ('principal', pai, 'Estrutura Organizacional', '/estrutura-organizacional', 3),
      ('principal', pai, 'Equipe', '/equipe', 4),
      ('principal', pai, 'Financeiro', '/financeiro', 5),
      ('principal', pai, 'Projetos Institucionais', 'https://prpg.ufrpe.br/projetos-institucionais', 6);
    INSERT INTO menu_itens (menu, rotulo, destino, ordem) VALUES ('principal', 'Mestrado e Doutorado', '/programas', 1) RETURNING id INTO pai;
    INSERT INTO menu_itens (menu, pai_id, rotulo, destino, ordem) VALUES
      ('principal', pai, 'Cursos Stricto Sensu', '/programas', 0),
      ('principal', pai, 'Calendário Acadêmico', '/calendario-academico', 1),
      ('principal', pai, 'Catálogo de Cursos', 'https://prpg.ufrpe.br/sites/default/files/2024-06/Cat%C3%A1logo%20UFRPE_compressed.pdf', 2),
      ('principal', pai, 'Proext-PG', '/proext-pg', 3),
      ('principal', pai, 'Resoluções Gerais', '/resolucoes', 4),
      ('principal', pai, 'Relatórios de Autoavaliação', '/relatorios-autoavaliacao', 5);
    INSERT INTO menu_itens (menu, rotulo, destino, ordem) VALUES ('principal', 'Especialização', NULL, 2) RETURNING id INTO pai;
    INSERT INTO menu_itens (menu, pai_id, rotulo, destino, ordem) VALUES
      ('principal', pai, 'Especialização', '/especializacao', 0),
      ('principal', pai, 'Residência Profissional', '/residencia-profissional', 1);
    INSERT INTO menu_itens (menu, rotulo, destino, ordem) VALUES ('principal', 'Internacionalização', NULL, 3) RETURNING id INTO pai;
    INSERT INTO menu_itens (menu, pai_id, rotulo, destino, ordem) VALUES
      ('principal', pai, 'Sobre', '/sobre-internacionalizacao', 0),
      ('principal', pai, 'Alunos Estrangeiros', '/alunos-estrangeiros', 1),
      ('principal', pai, 'Capes PrInt', '/capes-print', 2),
      ('principal', pai, 'Mobilidade Estudantil', '/mobilidade-estudantil', 3),
      ('principal', pai, 'Reconhecimento de Diploma', '/reconhecimento', 4),
      ('principal', pai, 'Plano Internacionalização', 'http://prpg.ufrpe.br/sites/default/files/arquivos-noticias/Plano%20Internacionaliza%C3%A7%C3%A3o%202025%20-%202030%20da%20UFRPE.pdf', 5);
    INSERT INTO menu_itens (menu, rotulo, destino, ordem) VALUES ('principal', 'Documentos', '/editais', 4) RETURNING id INTO pai;
    INSERT INTO menu_itens (menu, pai_id, rotulo, destino, ordem) VALUES
      ('principal', pai, 'Editais', '/editais', 0),
      ('principal', pai, 'Resoluções', '/resolucoes', 1),
      ('principal', pai, 'Formulários', '/formularios', 2);
    INSERT INTO menu_itens (menu, rotulo, destino, ordem) VALUES ('principal', 'Notícias', '/noticias', 5);
  END IF;

  -- ------------------------------------------------ topo
  SELECT NOT EXISTS (SELECT 1 FROM menu_itens WHERE menu = 'topo') INTO vazio;
  IF vazio THEN
    INSERT INTO menu_itens (menu, rotulo, destino, ordem) VALUES
      ('topo', 'Portal UFRPE', 'https://www.ufrpe.br/', 0),
      ('topo', 'SIGAA', 'https://sigs.ufrpe.br/sigaa/', 1),
      ('topo', 'AVA', 'http://ava.ufrpe.br/', 2);
  END IF;

  -- ------------------------------------------------ rodape
  SELECT NOT EXISTS (SELECT 1 FROM menu_itens WHERE menu = 'rodape') INTO vazio;
  IF vazio THEN
    INSERT INTO menu_itens (menu, rotulo, destino, ordem) VALUES ('rodape', 'Acesso Rápido', NULL, 0) RETURNING id INTO pai;
    INSERT INTO menu_itens (menu, pai_id, rotulo, destino, ordem) VALUES
      ('rodape', pai, 'Calendário Acadêmico', '/calendario-academico', 0),
      ('rodape', pai, 'Resoluções', '/resolucoes', 1),
      ('rodape', pai, 'Formulários', '/formularios', 2),
      ('rodape', pai, 'Editais', '/editais', 3),
      ('rodape', pai, 'Relatório de Gestão', 'https://prpg.ufrpe.br/relatorio-de-gestao', 4);
    INSERT INTO menu_itens (menu, rotulo, destino, ordem) VALUES ('rodape', 'Sistemas', NULL, 1) RETURNING id INTO pai;
    INSERT INTO menu_itens (menu, pai_id, rotulo, destino, ordem) VALUES
      ('rodape', pai, 'SIGAA', 'https://sigs.ufrpe.br/sigaa/', 0),
      ('rodape', pai, 'AVA - UFRPE', 'http://ava.ufrpe.br/', 1),
      ('rodape', pai, 'E-mail Institucional', 'https://www.ufrpe.br/', 2),
      ('rodape', pai, 'Wi-Fi Eduroam', 'https://www.ufrpe.br/', 3);
  END IF;

  -- ------------------------------------------------ acesso-rapido
  SELECT NOT EXISTS (SELECT 1 FROM menu_itens WHERE menu = 'acesso-rapido') INTO vazio;
  IF vazio THEN
    INSERT INTO menu_itens (menu, rotulo, destino, icone, ordem) VALUES
      ('acesso-rapido', 'Calendário Acadêmico', '/calendario-academico', 'fa-regular fa-calendar-days', 0),
      ('acesso-rapido', 'Catálogo de Cursos', 'https://prpg.ufrpe.br/sites/default/files/2024-06/Cat%C3%A1logo%20UFRPE_compressed.pdf', 'fa-solid fa-book-open', 1),
      ('acesso-rapido', 'Resoluções', '/resolucoes', 'fa-solid fa-gavel', 2),
      ('acesso-rapido', 'Formulários', '/formularios', 'fa-solid fa-file-signature', 3),
      ('acesso-rapido', 'Internacionalização', '/sobre-internacionalizacao', 'fa-solid fa-globe', 4),
      ('acesso-rapido', 'Proext-PG', '/proext-pg', 'fa-solid fa-people-arrows', 5),
      ('acesso-rapido', 'Editais', '/editais', 'fa-solid fa-bullhorn', 6);
  END IF;

  -- ------------------------------------------------ jornada
  SELECT NOT EXISTS (SELECT 1 FROM menu_itens WHERE menu = 'jornada') INTO vazio;
  IF vazio THEN
    INSERT INTO menu_itens (menu, rotulo, destino, icone, descricao, ordem) VALUES
      ('jornada', 'Ingresso e Seleção', '/editais', 'fa-solid fa-door-open', 'Editais, inscrição, matrícula inicial e linhas de pesquisa.', 0),
      ('jornada', 'Vida Acadêmica', '/calendario-academico', 'fa-solid fa-book-open-reader', 'Disciplinas, créditos, frequência e orientação.', 1),
      ('jornada', 'Qualificação e Defesa', '/formularios#mestrado-doutorado', 'fa-solid fa-graduation-cap', 'Prazos, banca examinadora e entrega final de trabalhos.', 2),
      ('jornada', 'Bolsas e Apoio', '/financeiro', 'fa-solid fa-hand-holding-dollar', 'Critérios, implementação, relatórios e cancelamento.', 3),
      ('jornada', 'Documentação', '/formularios', 'fa-solid fa-folder-open', 'Histórico, declarações, diploma e comprovantes.', 4),
      ('jornada', 'Sistemas e Acesso', 'https://sigs.ufrpe.br/sigaa/', 'fa-solid fa-laptop-code', 'SIGAA, e-mail institucional e Wi-Fi Eduroam.', 5);
  END IF;

  -- ------------------------------------------------ cursos
  SELECT NOT EXISTS (SELECT 1 FROM menu_itens WHERE menu = 'cursos') INTO vazio;
  IF vazio THEN
    INSERT INTO menu_itens (menu, rotulo, destino, descricao, imagem, ordem) VALUES
      ('cursos', 'Stricto Sensu', '/programas', 'Mestrados e Doutorados Acadêmicos e Profissionais voltados para a formação de pesquisadores e docentes de excelência.', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80', 0),
      ('cursos', 'Lato Sensu', '/especializacao', 'Cursos de Especialização para aprofundamento técnico, atualização profissional e prática.', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80', 1),
      ('cursos', 'Residência', '/residencia-profissional', 'Residência em Medicina Veterinária e Residência Profissional, unindo teoria e prática intensiva.', 'https://images.unsplash.com/photo-1629813359670-652f4477ca3f?w=800&q=80', 2);
  END IF;

  -- ------------------------------------------------ parceiros
  SELECT NOT EXISTS (SELECT 1 FROM menu_itens WHERE menu = 'parceiros') INTO vazio;
  IF vazio THEN
    INSERT INTO menu_itens (menu, rotulo, destino, imagem, ordem) VALUES
      ('parceiros', 'CAPES', 'https://www.gov.br/capes/', 'https://prpg.ufrpe.br/themes/prpg_ufrpe/assets/img/capes.png', 0),
      ('parceiros', 'BNB', 'https://www.bnb.gov.br/', 'https://prpg.ufrpe.br/themes/prpg_ufrpe/assets/img/bnb.png', 1),
      ('parceiros', 'CNPq', 'https://www.gov.br/cnpq/', 'https://prpg.ufrpe.br/themes/prpg_ufrpe/assets/img/cnpq.png', 2),
      ('parceiros', 'FACEPE', 'https://www.facepe.br/', 'https://prpg.ufrpe.br/themes/prpg_ufrpe/assets/img/facepe.png', 3);
  END IF;
END$$;

INSERT INTO configuracoes (chave, valor) VALUES
  ('contato', jsonb_build_object(
     'email', 'secretaria.prpg@ufrpe.br',
     'telefone', '+55 81 3320-6050',
     'whatsapp', '+55 81 3320-6050',
     'endereco', E'Pró-Reitoria de Pós-Graduação\nUniversidade Federal Rural de Pernambuco\nRua Dom Manoel de Medeiros, s/n\nDois Irmãos, Recife - PE, Brasil\nCEP 52171-900',
     'mapa', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3950.8570172108657!2d-34.94817!3d-8.013677399999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7ab198ad41794ab%3A0x4536f257f56330d1!2sPr%C3%B3-Reitoria%20de%20Pesquisa%20e%20P%C3%B3s-Gradua%C3%A7%C3%A3o%20da%20UFRPE!5e0!3m2!1spt-BR!2sbr!4v1778710761960!5m2!1spt-BR!2sbr')),
  ('home', jsonb_build_object(
     'selo', 'Pós-Graduação UFRPE',
     'titulo', 'Aprendendo hoje,',
     'destaque', 'liderando amanhã.',
     'texto', 'Formando profissionais para o exercício, em alto nível, da docência, da pesquisa e da atividade autônoma, fomentando a produção de novos conhecimentos.',
     'imagem', 'https://prpg.ufrpe.br/sites/default/files/configuracoes/pos-graduacao-ufrpe.jpg')),
  ('identidade', jsonb_build_object(
     'logo', 'https://prpg.ufrpe.br/themes/prpg_ufrpe/assets/img/Bras%C3%A3o%20UFRPE%20-%20Fundo%20Branco.png'))
ON CONFLICT (chave) DO NOTHING;

-- atualizado_em por trigger, como no conteúdo (Fase F.1).
DROP TRIGGER IF EXISTS trg_menu_itens_atualizado_em ON menu_itens;
CREATE TRIGGER trg_menu_itens_atualizado_em BEFORE UPDATE ON menu_itens
  FOR EACH ROW EXECUTE FUNCTION tocar_atualizado_em();
DROP TRIGGER IF EXISTS trg_configuracoes_atualizado_em ON configuracoes;
CREATE TRIGGER trg_configuracoes_atualizado_em BEFORE UPDATE ON configuracoes
  FOR EACH ROW EXECUTE FUNCTION tocar_atualizado_em();
