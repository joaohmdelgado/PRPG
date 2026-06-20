import professoresImporter from './professoresImporter.js';
import alunosImporter from './alunosImporter.js';
import disciplinasImporter from './disciplinasImporter.js';
import tesesImporter from './tesesImporter.js';
import noticiasImporter from './noticiasImporter.js';

// Registro central dos importadores. Cada importador expõe:
//   id, label, descricao, requiresPrograma, disponivel,
//   parse(buffer) -> registros[], map(raw) -> normalizado, importOne(m, ctx).
// Tipos ainda não implementados ficam como placeholders (disponivel: false) para
// que o painel já os liste como "em breve".
const importers = {
  [professoresImporter.id]: professoresImporter,
  [alunosImporter.id]: alunosImporter,
  [disciplinasImporter.id]: disciplinasImporter,
  [tesesImporter.id]: tesesImporter,
  [noticiasImporter.id]: noticiasImporter,
};

// Tipos planejados, ainda sem implementação. Aparecem desabilitados no painel.
const placeholders = [];

export const getImporter = (tipo) => importers[tipo] || null;

// Lista de tipos para o painel (implementados + planejados).
export const listTipos = () => {
  const impl = Object.values(importers).map((i) => ({
    id: i.id, label: i.label, descricao: i.descricao,
    requiresPrograma: !!i.requiresPrograma, disponivel: true,
  }));
  const ids = new Set(impl.map((i) => i.id));
  const futuros = placeholders.filter((p) => !ids.has(p.id));
  return [...impl, ...futuros];
};
