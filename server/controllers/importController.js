import { getImporter, listTipos } from '../services/importers/index.js';
import { query } from '../db/pool.js';

// Lista os tipos de conteúdo disponíveis para importação (e os planejados).
export const getTiposImportacao = async (_req, res) => {
  res.json(listTipos());
};

// Processa um arquivo de importação. multipart/form-data:
//   - file: o arquivo exportado do site antigo (JSON)
//   - programaId: programa de destino (quando o tipo exige)
//   - dryRun: 'true' faz apenas a pré-visualização (não grava nada)
export const runImportacao = async (req, res) => {
  try {
    const importer = getImporter(req.params.tipo);
    if (!importer) return res.status(404).json({ message: 'Tipo de importação não suportado.' });
    if (!importer.disponivel) return res.status(400).json({ message: 'Tipo de importação ainda não disponível.' });
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });

    const programaId = req.body.programaId || null;
    if (importer.requiresPrograma) {
      if (!programaId) return res.status(400).json({ message: 'Selecione o programa de destino.' });
      const { rows } = await query('SELECT id FROM programas WHERE id = $1', [programaId]);
      if (rows.length === 0) return res.status(400).json({ message: 'Programa não encontrado.' });
    }

    const dryRun = String(req.body.dryRun) === 'true';

    let registros;
    try {
      registros = importer.parse(req.file.buffer);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    const ctx = { programaId, actor: req.user?.id, dryRun };
    const resultados = [];
    const resumo = { total: registros.length, criado: 0, atualizado: 0, inalterado: 0, erro: 0 };

    for (const raw of registros) {
      try {
        const m = importer.map(raw);
        const r = await importer.importOne(m, ctx);
        resultados.push(r);
        resumo[r.acao] = (resumo[r.acao] || 0) + 1;
      } catch (e) {
        resultados.push({ acao: 'erro', nome: '', email: '', mensagem: e.message });
        resumo.erro += 1;
      }
    }

    res.json({ dryRun, tipo: importer.id, resumo, resultados });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar importação', error: error.message });
  }
};
