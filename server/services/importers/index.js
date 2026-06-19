import professoresImporter from './professoresImporter.js';
import alunosImporter from './alunosImporter.js';

// Registro central dos importadores. Cada importador expõe:
//   id, label, descricao, requiresPrograma, disponivel,
//   parse(buffer) -> registros[], map(raw) -> normalizado, importOne(m, ctx).
// Tipos ainda não implementados ficam como placeholders (disponivel: false) para
// que o painel já os liste como "em breve".
const importers = {
  [professoresImporter.id]: professoresImporter,
  [alunosImporter.id]: alunosImporter,
};

// Tipos planejados, ainda sem implementação. Aparecem desabilitados no painel.
const placeholders = [
  { id: 'noticias', label: 'Notícias', descricao: 'Importa notícias do site antigo.', requiresPrograma: true, disponivel: false },
  { id: 'disciplinas', label: 'Disciplinas', descricao: 'Importa disciplinas do site antigo.', requiresPrograma: true, disponivel: false },
  { id: 'teses', label: 'Teses e Dissertações', descricao: 'Importa teses/dissertações do site antigo.', requiresPrograma: true, disponivel: false },
];

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
