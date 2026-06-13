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

// Obter todas as disciplinas (com docente resolvido por nome/email)
export const getDisciplinas = async (req, res) => {
  try {
    const disciplinas = await readJson('disciplinas.json');
    const users = await readJson('users.json');

    const resolved = disciplinas.map(d => {
      const u = users.find(user => user.id === d.field_docente);
      return {
        ...d,
        field_docente_resolved: u ? {
          id: u.id,
          nome: u.perfil_geral?.nome || u.email,
          email: u.email
        } : {
          id: d.field_docente,
          nome: 'Usuário Desconhecido',
          email: ''
        }
      };
    });

    res.json(resolved);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar disciplinas', error: error.message });
  }
};

// Obter disciplina por ID
export const getDisciplinaById = async (req, res) => {
  try {
    const disciplinas = await readJson('disciplinas.json');
    const disciplina = disciplinas.find(d => d.id === req.params.id);
    if (disciplina) {
      res.json(disciplina);
    } else {
      res.status(404).json({ message: 'Disciplina não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar disciplina', error: error.message });
  }
};

// Criar disciplina
export const createDisciplina = async (req, res) => {
  try {
    const disciplinas = await readJson('disciplinas.json');
    const newDisciplina = { ...req.body };

    if (!newDisciplina.id) {
      newDisciplina.id = 'disp-' + Date.now().toString();
    }

    // Converter carga horária para número se vier como string
    if (newDisciplina.field_carga_horaria !== undefined) {
      newDisciplina.field_carga_horaria = parseInt(newDisciplina.field_carga_horaria, 10) || 0;
    }

    disciplinas.unshift(newDisciplina);
    await writeJson('disciplinas.json', disciplinas);
    res.status(201).json(newDisciplina);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar disciplina', error: error.message });
  }
};

// Atualizar disciplina
export const updateDisciplina = async (req, res) => {
  try {
    const disciplinas = await readJson('disciplinas.json');
    const index = disciplinas.findIndex(d => d.id === req.params.id);

    if (index !== -1) {
      const updated = {
        ...disciplinas[index],
        ...req.body
      };

      if (updated.field_carga_horaria !== undefined) {
        updated.field_carga_horaria = parseInt(updated.field_carga_horaria, 10) || 0;
      }

      disciplinas[index] = updated;
      await writeJson('disciplinas.json', disciplinas);
      res.json(updated);
    } else {
      res.status(404).json({ message: 'Disciplina não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar disciplina', error: error.message });
  }
};

// Excluir disciplina
export const deleteDisciplina = async (req, res) => {
  try {
    const disciplinas = await readJson('disciplinas.json');
    const index = disciplinas.findIndex(d => d.id === req.params.id);

    if (index !== -1) {
      disciplinas.splice(index, 1);
      await writeJson('disciplinas.json', disciplinas);
      res.json({ message: 'Disciplina removida com sucesso' });
    } else {
      res.status(404).json({ message: 'Disciplina não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir disciplina', error: error.message });
  }
};
