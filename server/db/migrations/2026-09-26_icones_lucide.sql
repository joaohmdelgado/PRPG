
-- =====================================================================
-- Fase U.7 (docs/revisao-portal-conteudo-2026-09-24.md): o portal deixou o
-- Font Awesome e usa um só sistema de ícones (lucide). O valor gravado em
-- menu_itens.icone continua valendo nas duas formas ("fa-solid fa-gavel" ou
-- "gavel"), mas o painel agora oferece um seletor — então o texto de ajuda da
-- lista "Redes sociais", que mandava digitar a classe do Font Awesome, muda.
-- Só troca se ainda for o texto original (não sobrescreve edição feita).
-- =====================================================================
UPDATE menus
   SET descricao = 'Ícones de redes sociais no rodapé. Escolha o ícone da rede (Instagram, LinkedIn, YouTube, Facebook, X, WhatsApp).'
 WHERE chave = 'redes-sociais'
   AND descricao = 'Ícones de redes sociais no rodapé. Ícone: classe do Font Awesome (ex.: fa-brands fa-instagram).';
