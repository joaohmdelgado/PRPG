import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');

// Helpers para ler os arquivos
const readJson = async (filename) => {
  try {
    const data = await fs.readFile(path.join(dataDir, filename), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeJson = async (filename, data) => {
  try {
    await fs.writeFile(path.join(dataDir, filename), JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Erro ao salvar ${filename}:`, error);
    throw new Error(`Erro ao salvar ${filename}`);
  }
};

// Obter todos os FAQs
export const getFaqs = async (req, res) => {
  try {
    const faqs = await readJson('faq.json');
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar FAQs', error: error.message });
  }
};

// Obter FAQ por ID
export const getFaqById = async (req, res) => {
  try {
    const faqs = await readJson('faq.json');
    const faq = faqs.find(f => f.id === req.params.id);
    if (faq) {
      res.json(faq);
    } else {
      res.status(404).json({ message: 'FAQ não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar FAQ', error: error.message });
  }
};

// Criar FAQ
export const createFaq = async (req, res) => {
  try {
    const faqs = await readJson('faq.json');
    const newFaq = { ...req.body };

    if (!newFaq.id) {
      newFaq.id = 'faq-' + Date.now().toString();
    }

    faqs.unshift(newFaq);
    await writeJson('faq.json', faqs);
    res.status(201).json(newFaq);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar FAQ', error: error.message });
  }
};

// Atualizar FAQ
export const updateFaq = async (req, res) => {
  try {
    const faqs = await readJson('faq.json');
    const index = faqs.findIndex(f => f.id === req.params.id);

    if (index !== -1) {
      const updated = {
        ...faqs[index],
        ...req.body
      };

      faqs[index] = updated;
      await writeJson('faq.json', faqs);
      res.json(updated);
    } else {
      res.status(404).json({ message: 'FAQ não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar FAQ', error: error.message });
  }
};

// Excluir FAQ
export const deleteFaq = async (req, res) => {
  try {
    const faqs = await readJson('faq.json');
    const index = faqs.findIndex(f => f.id === req.params.id);

    if (index !== -1) {
      faqs.splice(index, 1);
      await writeJson('faq.json', faqs);
      res.json({ message: 'FAQ removido com sucesso' });
    } else {
      res.status(404).json({ message: 'FAQ não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir FAQ', error: error.message });
  }
};
