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

// Obter todas as bolsas (com aluno resolvido por nome/email)
export const getBolsas = async (req, res) => {
  try {
    const bolsas = await readJson('bolsas.json');
    const users = await readJson('users.json');

    const resolved = bolsas.map(b => {
      const u = users.find(user => user.id === b.field_aluno);
      return {
        ...b,
        field_aluno_resolved: u ? {
          id: u.id,
          nome: u.perfil_geral?.nome || u.email,
          email: u.email
        } : {
          id: b.field_aluno,
          nome: 'Usuário Desconhecido',
          email: ''
        }
      };
    });

    res.json(resolved);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar bolsas', error: error.message });
  }
};

// Obter bolsa por ID
export const getBolsaById = async (req, res) => {
  try {
    const bolsas = await readJson('bolsas.json');
    const bolsa = bolsas.find(b => b.id === req.params.id);
    if (bolsa) {
      res.json(bolsa);
    } else {
      res.status(404).json({ message: 'Bolsa não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar bolsa', error: error.message });
  }
};

// Criar bolsa
export const createBolsa = async (req, res) => {
  try {
    const bolsas = await readJson('bolsas.json');
    const newBolsa = { ...req.body };

    if (!newBolsa.id) {
      newBolsa.id = 'bolsa-' + Date.now().toString();
    }

    bolsas.unshift(newBolsa);
    await writeJson('bolsas.json', bolsas);
    res.status(201).json(newBolsa);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar bolsa', error: error.message });
  }
};

// Atualizar bolsa
export const updateBolsa = async (req, res) => {
  try {
    const bolsas = await readJson('bolsas.json');
    const index = bolsas.findIndex(b => b.id === req.params.id);

    if (index !== -1) {
      const updated = {
        ...bolsas[index],
        ...req.body
      };

      bolsas[index] = updated;
      await writeJson('bolsas.json', bolsas);
      res.json(updated);
    } else {
      res.status(404).json({ message: 'Bolsa não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar bolsa', error: error.message });
  }
};

// Excluir bolsa
export const deleteBolsa = async (req, res) => {
  try {
    const bolsas = await readJson('bolsas.json');
    const index = bolsas.findIndex(b => b.id === req.params.id);

    if (index !== -1) {
      bolsas.splice(index, 1);
      await writeJson('bolsas.json', bolsas);
      res.json({ message: 'Bolsa removida com sucesso' });
    } else {
      res.status(404).json({ message: 'Bolsa não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir bolsa', error: error.message });
  }
};
