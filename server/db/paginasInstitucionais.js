import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from './pool.js';
import { pagesRepo } from './repositories.js';

// Páginas institucionais da PRPG (Fase H.3): antes eram componentes JSX
// (Sobre.jsx, Historico.jsx...); agora são `pages` com `chave` fixa, editáveis
// no painel em "Páginas". O texto inicial foi extraído uma única vez daqueles
// componentes para server/data/paginas-institucionais.json.
//
// garantirPaginasInstitucionais() cria as que faltam (nunca sobrescreve uma
// página existente) — roda na subida do servidor e no seed de dev, então um
// banco novo ou recém-semeado já nasce com elas.

const ARQUIVO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'paginas-institucionais.json');

export const lerPaginasInstitucionais = () => JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));

export async function garantirPaginasInstitucionais() {
  const paginas = lerPaginasInstitucionais();
  const { rows } = await query('SELECT chave, slug FROM pages WHERE programa_id IS NULL');
  const chaves = new Set(rows.map((r) => r.chave).filter(Boolean));
  const slugs = new Set(rows.map((r) => r.slug));
  let criadas = 0;
  for (const p of paginas) {
    if (chaves.has(p.chave)) continue;
    if (slugs.has(p.slug)) {
      // Uma página comum já usa o endereço: não mexe nela.
      console.warn(`[páginas institucionais] /${p.slug} já existe sem chave — "${p.title}" não foi criada.`);
      continue;
    }
    await pagesRepo.create({
      id: `prpg-${p.chave}`, title: p.title, slug: p.slug, chave: p.chave,
      body: { value: p.body, summary: p.summary || null }, programaId: null, status: 'PUBLICADO',
    });
    criadas += 1;
  }
  return criadas;
}
