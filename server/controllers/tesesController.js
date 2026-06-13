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

// Obter todas as teses/dissertações (com autor resolvido por nome/email)
export const getTeses = async (req, res) => {
  try {
    const teses = await readJson('teses_dissertacoes.json');
    const users = await readJson('users.json');

    const resolved = teses.map(t => {
      const u = users.find(user => user.id === t.field_autor);
      return {
        ...t,
        field_autor_resolved: u ? {
          id: u.id,
          nome: u.perfil_geral?.nome || u.email,
          email: u.email
        } : {
          id: t.field_autor,
          nome: 'Usuário Desconhecido',
          email: ''
        }
      };
    });

    res.json(resolved);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar teses e dissertações', error: error.message });
  }
};

// Obter tese/dissertação por ID
export const getTeseById = async (req, res) => {
  try {
    const teses = await readJson('teses_dissertacoes.json');
    const tese = teses.find(t => t.id === req.params.id);
    if (tese) {
      res.json(tese);
    } else {
      res.status(404).json({ message: 'Tese/Dissertação não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar tese/dissertação', error: error.message });
  }
};

// Criar tese/dissertação
export const createTese = async (req, res) => {
  try {
    const teses = await readJson('teses_dissertacoes.json');
    const newTese = { ...req.body };

    if (!newTese.id) {
      newTese.id = 'td-' + Date.now().toString();
    }

    teses.unshift(newTese);
    await writeJson('teses_dissertacoes.json', teses);
    res.status(201).json(newTese);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar tese/dissertação', error: error.message });
  }
};

// Atualizar tese/dissertação
export const updateTese = async (req, res) => {
  try {
    const teses = await readJson('teses_dissertacoes.json');
    const index = teses.findIndex(t => t.id === req.params.id);

    if (index !== -1) {
      const updated = {
        ...teses[index],
        ...req.body
      };

      teses[index] = updated;
      await writeJson('teses_dissertacoes.json', teses);
      res.json(updated);
    } else {
      res.status(404).json({ message: 'Tese/Dissertação não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar tese/dissertação', error: error.message });
  }
};

// Excluir tese/dissertação
export const deleteTese = async (req, res) => {
  try {
    const teses = await readJson('teses_dissertacoes.json');
    const index = teses.findIndex(t => t.id === req.params.id);

    if (index !== -1) {
      teses.splice(index, 1);
      await writeJson('teses_dissertacoes.json', teses);
      res.json({ message: 'Tese/Dissertação removida com sucesso' });
    } else {
      res.status(404).json({ message: 'Tese/Dissertação não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir tese/dissertação', error: error.message });
  }
};
