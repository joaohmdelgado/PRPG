# Redirecionamento dos domínios antigos dos programas

**Data:** 25 de setembro de 2026
**Para:** equipe de TI (DNS, servidores web e certificados) e PRPG
**Origem:** Fase S.6 de [revisao-portal-conteudo-2026-09-24.md](revisao-portal-conteudo-2026-09-24.md)
**Escopo:** plano e tabela de redirecionamentos. Este documento não altera DNS nem servidor; a
execução é da TI, depois das decisões da seção 2.

---

## 1. Resumo

- Os programas mantêm hoje sites próprios em subdomínios `<sigla>.ufrpe.br`. **30 domínios**
  conhecidos: os 29 analisados em 14/09/2026 (`analises-sites-pos-graduacao/`) e o `pgh.ufrpe.br`,
  achado na verificação de 25/09.
- Todos rodam a **mesma instalação Drupal 8**, com os mesmos caminhos de menu (conferido em
  25/09 em pgb, ppgia, pgcta e pgh). Por isso uma única tabela de caminhos (seção 5) serve para
  todos os domínios.
- Destino de cada domínio: `https://<portal>/<slug>`. O endereço funciona **antes e depois** de o
  programa publicar o microsite: enquanto não publicado, o portal leva automaticamente à página
  pública do programa (`/programas/<slug>`); depois, abre o microsite. A TI configura o
  redirecionamento uma vez só.
- `<portal>` é o domínio público de produção (variável `PUBLIC_SITE_URL`; o exemplo do
  `.env.example` é `https://prpg.ufrpe.br`). **A confirmar com a TI.**

## 2. Decisões antes de configurar

| ID | Questão | Recomendação |
|---|---|---|
| D-S1 | O endereço do programa no portal usa o subdomínio antigo (`/pgb`) ou o slug gerado do nome (`/biodiversidade`)? | **Usar o subdomínio antigo.** É o nome que a comunidade já conhece e deixa a regra de redirecionamento óbvia (`pgb.ufrpe.br` → `/pgb`). A troca é feita no painel (Programa → Slug) e precisa acontecer **antes** de divulgar os endereços: hoje só o PGH (`/pgh`) está publicado. Os slugs longos atuais foram gerados em 25/09 (Fase N.2) porque 32 dos 42 programas não têm sigla cadastrada |
| D-S2 | O que fazer com os arquivos já publicados (`/sites/default/files/...`: PDFs de editais, resoluções, atas)? | **Não redirecionar esse caminho.** Antes de desligar cada Drupal, copiar a pasta `sites/default/files` e servi-la como arquivo estático no mesmo domínio (seção 6). Links para esses PDFs estão em documentos oficiais, no Sucupira e em currículos Lattes |
| D-S3 | Quando desligar cada Drupal? | Quando o programa tiver o essencial no portal: checklist de publicação do "Site do Programa" (Fase S.4) em 100% **e** conteúdo migrado (Fase O). Até lá o domínio antigo continua no ar e o redirecionamento não é ativado |

## 3. Como o destino se comporta no portal

| Endereço pedido | Microsite publicado | Microsite não publicado |
|---|---|---|
| `/<slug>` | Início do microsite | Página pública do programa `/programas/<slug>` |
| `/<slug>/<subpágina>` | Subpágina do microsite | Página pública do programa `/programas/<slug>` |
| `/<slug>` de programa inexistente | "Página não encontrada" | "Página não encontrada" |

Implementado em `src/pages/programa/ProgramaSite.jsx` (Fase S.6). O painel mostra, em "Site do
Programa", o checklist do que falta publicar.

## 4. Tabela de domínios

Situação: "no ar" = respondeu na verificação indicada. O **slug proposto** segue a D-S1; o
**destino** usa o slug proposto — se a D-S1 for recusada, trocar pelo slug atual.

| # | Domínio antigo | Programa | Situação | Slug atual | Slug proposto (D-S1) | Destino |
|---|---|---|---|---|---|---|
| 1 | padr.ufrpe.br | Administração e Desenvolvimento (PPAD) | no ar (14/09) | `ppad` | `ppad` | `<portal>/ppad` |
| 2 | papgcm.ufrpe.br | Ciências do Movimento | no ar (14/09) | `ciencias-do-movimento` | `papgcm` | `<portal>/papgcm` |
| 3 | pgb.ufrpe.br | Biodiversidade | no ar (25/09) | `biodiversidade` | `pgb` | `<portal>/pgb` |
| 4 | pgba.ufrpe.br | Biociência Animal | no ar (14/09) | `biociencia-animal` | `pgba` | `<portal>/pgba` |
| 5 | pgbc.ufrpe.br | Biodiversidade e Conservação | no ar (14/09) | `biodiversidade-e-conservacao` | `pgbc` | `<portal>/pgbc` |
| 6 | pgcds.ufrpe.br | **não identificado** | sem resposta (14/09 e 25/09) | — | — | **a confirmar pela TI** |
| 7 | pgcta.ufrpe.br | Ciência e Tecnologia de Alimentos | no ar (25/09) | `ciencia-e-tecnologia-de-alimentos` | `pgcta` | `<portal>/pgcta` |
| 8 | pgea.ufrpe.br | Engenharia Agrícola | no ar (25/09) | `engenharia-agricola` | `pgea` | `<portal>/pgea` |
| 9 | pgetno.ufrpe.br | Etnobiologia e Conservação da Natureza | no ar (14/09) | `etnobiologia-e-conservacao-da-natureza` | `pgetno` | `<portal>/pgetno` |
| 10 | pgh.ufrpe.br | História (PGH) | no ar (25/09) | `pgh` | `pgh` | `<portal>/pgh` — **microsite já publicado** |
| 11 | pgs.ufrpe.br | Ciência do Solo | no ar (14/09) | `ciencia-do-solo` | `pgs` | `<portal>/pgs` |
| 12 | pgvet.ufrpe.br | Medicina Veterinária | no ar (14/09) | `medicina-veterinaria` | `pgvet` | `<portal>/pgvet` |
| 13 | ppeamb.ufrpe.br | Engenharia Ambiental | no ar (14/09) | `engenharia-ambiental` | `ppeamb` | `<portal>/ppeamb` |
| 14 | ppengfis.ufrpe.br | Engenharia Física | no ar (25/09) | `engenharia-fisica` | `ppengfis` | `<portal>/ppengfis` |
| 15 | ppgadt.ufrpe.br | Agroecologia e Desenvolvimento Territorial | no ar (14/09) | `agroecologia-e-desenvolvimento-territorial` | `ppgadt` | `<portal>/ppgadt` |
| 16 | ppgbea.ufrpe.br | Biometria e Estatística Aplicada | no ar (14/09) | `biometria-e-estatistica-aplicada` | `ppgbea` | `<portal>/ppgbea` |
| 17 | ppgc.ufrpe.br | Controladoria | no ar (25/09) | `controladoria` | `ppgc` | `<portal>/ppgc` |
| 18 | ppgcf.ufrpe.br | Ciências Florestais | no ar (14/09) | `ciencias-florestais` | `ppgcf` | `<portal>/ppgcf` |
| 19 | ppgcs.ufrpe.br | Ciências Sociais | no ar (14/09) | `ciencias-sociais` | `ppgcs` | `<portal>/ppgcs` |
| 20 | ppgditm.ufrpe.br | Desenvolvimento e Inovação Tecnológica em Medicamentos | no ar (25/09) | `desenvolvimento-e-inovacao-tecnologica-em-medicamentos` | `ppgditm` | `<portal>/ppgditm` |
| 21 | ppge.ufrpe.br | Entomologia | no ar (14/09) | `entomologia` | `ppge` | `<portal>/ppge` |
| 22 | ppgec.ufrpe.br | Ensino das Ciências | no ar (14/09) | `ensino-das-ciencias` | `ppgec` | `<portal>/ppgec` |
| 23 | ppgeci.ufrpe.br | Educação, Culturas e Identidades (UFRPE–Fundaj) | no ar (25/09) | `educacao-culturas-e-identidades` | `ppgeci` | `<portal>/ppgeci` |
| 24 | ppgese.ufrpe.br | Engenharia de Sistemas de Energia | no ar (14/09) | `engenharia-de-sistemas-de-energia` | `ppgese` | `<portal>/ppgese` |
| 25 | ppgf.ufrpe.br | Fitopatologia | no ar (25/09) | `fitopatologia` | `ppgf` | `<portal>/ppgf` |
| 26 | ppgfa.ufrpe.br | Física Aplicada | no ar (14/09) | `fisica-aplicada` | `ppgfa` | `<portal>/ppgfa` |
| 27 | ppgia.ufrpe.br | Informática Aplicada | no ar (25/09) | `informatica-aplicada` | `ppgia` | `<portal>/ppgia` |
| 28 | proef.ufrpe.br | Educação Física em Rede Nacional (PROEF) | no ar (14/09) | `proef` | `proef` | `<portal>/proef` |
| 29 | progel.ufrpe.br | Estudos da Linguagem | no ar (14/09) | `estudos-da-linguagem` | `progel` | `<portal>/progel` |
| 30 | renorbio.ufrpe.br | Biotecnologia (RENORBIO) | no ar (14/09) | `renorbio` | `renorbio` | `<portal>/renorbio` |

**Programas sem domínio conhecido** (13): Melhoramento Genético de Plantas, Saúde Única (PMPSU),
Políticas Públicas e Desenvolvimento, Produção Vegetal, PROFFIS, PROFIAP, PROFMAT, PROFQUI,
Química, Recursos Pesqueiros e Aquicultura, RENOEN, Tecnologia e Gestão em Educação a Distância e
Zootecnia. A TI confere na zona DNS `ufrpe.br` se algum deles tem subdomínio próprio (o `pgcds` pode
ser um deles); os que tiverem entram na tabela acima com a mesma regra.

## 5. Tabela de caminhos (vale para todos os domínios)

Caminhos da instalação Drupal padrão dos programas, conferidos em 25/09/2026. `<destino>` é a
última coluna da seção 4. Caminhos com ou sem barra final devem casar igual.

| Caminho antigo | Vai para |
|---|---|
| `/`, `/pt-br`, `/en`, `/es` | `<destino>` |
| `/pt-br/sobre` | `<destino>/sobre` |
| `/pt-br/acoes-impacto-social` | `<destino>/impacto-social` |
| `/pt-br/areas-linhas-de-pesquisa` | `<destino>/linhas-de-pesquisa` |
| `/pt-br/autoavaliacao` | `<destino>/autoavaliacao` |
| `/pt-br/comissoes` | `<destino>/comissoes` |
| `/pt-br/coordenacao` | `<destino>/sobre` (a coordenação e o histórico aparecem em "Sobre") |
| `/pt-br/disciplinas` | `<destino>/disciplinas` |
| `/pt-br/formularios-e-modelos` | `<destino>/documentos` |
| `/pt-br/normas-e-resolucoes`, `/normas-e-resolucoes` | `<destino>/documentos` |
| `/pt-br/infraestutura` (grafia do Drupal), `/pt-br/infraestrutura` | `<destino>/infraestrutura` |
| `/pt-br/internacionalizacao`, `/internacionalizacao` | `<destino>/internacionalizacao` |
| `/pt-br/planejamento-estrategico` | `<destino>/planejamento` |
| `/pt-br/alunos` | `<destino>/discentes` |
| `/pt-br/professores` | `<destino>/pessoas` |
| `/pt-br/egressos` | `<destino>/egressos` |
| `/pt-br/dissertacoes`, `/dissertacoes`, `/pt-br/tesis-de-doctorado`, `/teses` | `<destino>/teses` |
| `/pt-br/grupos-de-pesquisa` | `<destino>/grupos-pesquisa` |
| `/pt-br/admissao-informacoes-gerais`, `/pt-br/editais-abertos`, `/editais-abertos`, `/pt-br/editais-fechados` | `<destino>/editais` |
| `/pt-br/calendario-academico`, `/calendario` | `<portal>/calendario-academico` |
| `/sites/default/files/...` | **não redirecionar** — ver seção 6 |
| qualquer outro (`/pt-br/node/<n>`, `/pt-br/authenticated/<nome>`, `/manual-do-aluno`, páginas próprias como `/pt-br/ccd`) | `<destino>` |

Observações:

- **Notícias antigas** (`/pt-br/node/<n>`) vão para o início do programa: não há correspondência
  de endereço entre os nós do Drupal e as notícias do portal. Se a importação da Fase O guardar o
  número do nó de origem, dá para acrescentar uma regra por notícia depois.
- **Páginas próprias** de alguns programas (ex.: `/pt-br/ccd`, `/pt-br/revista-rural-urbano`,
  `/pt-br/projetos-de-pesquisa`) caem no início. Se o programa recriar a página no portal, a regra
  específica é `<caminho antigo>` → `<destino>/<slug da página>`.
- Enquanto o microsite não estiver publicado, qualquer subpágina acima leva à página pública do
  programa (seção 3). Não é preciso mudar a regra quando o programa publicar.

## 6. Arquivos (`/sites/default/files`)

Os PDFs dos sites antigos continuam sendo citados fora do site (portarias, atas, Sucupira,
currículos). Proposta (D-S2):

1. Antes de desligar o Drupal de um programa, copiar `sites/default/files` para um diretório
   estático (ex.: `/srv/arquivo/<dominio>/sites/default/files`).
2. No servidor que passa a responder pelo domínio antigo, servir esse caminho como arquivo
   estático e redirecionar todo o resto (exemplo na seção 7).
3. Os arquivos que forem importados para o portal (Fase O) ganham novo endereço em `/uploads`; o
   endereço antigo continua valendo pelo arquivo estático.

## 7. Configuração sugerida (nginx)

Um `map` com a tabela de caminhos e um bloco `server` por domínio. Usar **302** nas duas primeiras
semanas (fácil de desfazer; navegadores não guardam) e trocar para **301** depois de conferir os
logs.

```nginx
# /etc/nginx/conf.d/redirecionamentos-programas.conf
map $uri $sub_programa {
    default                                                  "";
    ~^/pt-br/sobre/?$                                         "/sobre";
    ~^/pt-br/acoes-impacto-social/?$                          "/impacto-social";
    ~^/pt-br/areas-linhas-de-pesquisa/?$                      "/linhas-de-pesquisa";
    ~^/pt-br/autoavaliacao/?$                                 "/autoavaliacao";
    ~^/pt-br/comissoes/?$                                     "/comissoes";
    ~^/pt-br/coordenacao/?$                                   "/sobre";
    ~^/pt-br/disciplinas/?$                                   "/disciplinas";
    ~^/(pt-br/)?(formularios-e-modelos|normas-e-resolucoes)/?$ "/documentos";
    ~^/pt-br/infraest(r)?utura/?$                             "/infraestrutura";
    ~^/(pt-br/)?internacionalizacao/?$                        "/internacionalizacao";
    ~^/pt-br/planejamento-estrategico/?$                      "/planejamento";
    ~^/pt-br/alunos/?$                                        "/discentes";
    ~^/pt-br/professores/?$                                   "/pessoas";
    ~^/pt-br/egressos/?$                                      "/egressos";
    ~^/(pt-br/)?(dissertacoes|teses|tesis-de-doctorado)/?$    "/teses";
    ~^/pt-br/grupos-de-pesquisa/?$                            "/grupos-pesquisa";
    ~^/(pt-br/)?(admissao-informacoes-gerais|editais-abertos|editais-fechados)/?$ "/editais";
}

server {
    listen 443 ssl;
    server_name pgb.ufrpe.br;
    # O certificado atual do domínio continua necessário: o redirecionamento
    # também é servido em HTTPS.
    ssl_certificate     /etc/ssl/ufrpe/pgb.ufrpe.br.crt;
    ssl_certificate_key /etc/ssl/ufrpe/pgb.ufrpe.br.key;

    set $destino https://prpg.ufrpe.br/pgb;   # coluna "Destino" da seção 4

    location ^~ /sites/default/files/ {       # D-S2: arquivos antigos continuam no ar
        root /srv/arquivo/pgb.ufrpe.br;
    }
    location ~ ^/(pt-br/)?calendario(-academico)?/?$ {
        return 302 https://prpg.ufrpe.br/calendario-academico;
    }
    location / {
        return 302 $destino$sub_programa;
    }
}

server {
    listen 80;
    server_name pgb.ufrpe.br;
    return 302 https://$host$request_uri;
}
```

Para Apache, o equivalente é `RewriteMap` com a mesma tabela ou uma sequência de `RewriteRule` por
caminho, com `RewriteCond %{REQUEST_URI} !^/sites/default/files/`.

## 8. Ordem de execução

1. PRPG decide D-S1, D-S2 e D-S3.
2. Se D-S1 for aceita: ajustar o slug de cada programa no painel (Programa → Slug) antes de
   divulgar qualquer endereço.
3. Portal em produção com `PUBLIC_SITE_URL` definido.
4. Por programa, quando cumprir a D-S3: copiar `sites/default/files`, ativar o redirecionamento
   com **302**, conferir (seção 9) e avisar a coordenação.
5. Depois de duas semanas sem problema nos logs: trocar para **301**.
6. Manter DNS e certificados dos domínios antigos por pelo menos **2 anos** (documentos oficiais e
   currículos continuam apontando para eles).
7. Acompanhar os 404 do portal no primeiro mês (caminhos antigos que não estão na tabela).

## 9. Como conferir

```bash
curl -sI https://pgb.ufrpe.br/pt-br/sobre | grep -i '^location'
# esperado: location: https://prpg.ufrpe.br/pgb/sobre

curl -sI https://pgb.ufrpe.br/pt-br/infraestutura | grep -i '^location'
# esperado: location: https://prpg.ufrpe.br/pgb/infraestrutura

curl -sI https://pgb.ufrpe.br/sites/default/files/algum-edital.pdf | head -1
# esperado: HTTP/1.1 200 OK (arquivo servido do diretório estático)
```

No navegador, `https://prpg.ufrpe.br/pgb/sobre` deve abrir o "Sobre" do microsite (se publicado)
ou a página pública do programa (se não).

## 10. Limites deste levantamento

- `pgcds.ufrpe.br` não respondeu em 14/09 nem em 25/09: o programa não foi identificado.
- A situação "no ar (14/09)" vem da análise de 14/09; nesses domínios não houve nova verificação
  em 25/09. Os caminhos da seção 5 foram conferidos em 4 domínios (pgb, ppgia, pgcta, pgh) e
  supõem que os demais usam a mesma instalação — é o que as análises de 14/09 indicam.
- Não foi levantado quanto conteúdo cada Drupal tem (notícias, arquivos) — isso é parte da
  importação (Fase O).
