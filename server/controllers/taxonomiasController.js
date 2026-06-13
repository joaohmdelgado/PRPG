import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');

const readJson = async (filename) => {
  try {
    const data = await fs.readFile(path.join(dataDir, filename), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { entradas: [], linhas_pesquisa: [] };
  }
};

const writeJson = async (filename, data) => {
  await fs.writeFile(path.join(dataDir, filename), JSON.stringify(data, null, 2));
};

export const getTaxonomias = async (req, res) => {
  try {
    const taxonomias = await readJson('taxonomias.json');
    res.json(taxonomias);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar taxonomias' });
  }
};

export const updateTaxonomias = async (req, res) => {
  try {
    const data = req.body;
    await writeJson('taxonomias.json', data);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar taxonomias' });
  }
};
