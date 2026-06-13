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

// Obter todos os grupos de pesquisa (com líderes resolvidos por nome)
export const getGruposPesquisa = async (req, res) => {
  try {
    const grupos = await readJson('grupos_pesquisa.json');
    const users = await readJson('users.json');

    const resolved = grupos.map(g => {
      const resolvedLeaders = (g.field_lideres || []).map(leaderId => {
        const u = users.find(user => user.id === leaderId);
        return u ? { id: u.id, nome: u.perfil_geral?.nome || u.email } : { id: leaderId, nome: 'Usuário Desconhecido' };
      });
      return { ...g, field_lideres_resolved: resolvedLeaders };
    });

    res.json(resolved);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar grupos de pesquisa', error: error.message });
  }
};

// Obter grupo de pesquisa por ID
export const getGrupoPesquisaById = async (req, res) => {
  try {
    const grupos = await readJson('grupos_pesquisa.json');
    const grupo = grupos.find(g => g.id === req.params.id);
    if (grupo) {
      res.json(grupo);
    } else {
      res.status(404).json({ message: 'Grupo de pesquisa não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar grupo de pesquisa', error: error.message });
  }
};

// Criar grupo de pesquisa
export const createGrupoPesquisa = async (req, res) => {
  try {
    const grupos = await readJson('grupos_pesquisa.json');
    const newGrupo = { ...req.body };

    if (!newGrupo.id) {
      newGrupo.id = 'grupo-' + Date.now().toString();
    }

    // Garante estrutura padrão do body e field_lideres
    newGrupo.body = newGrupo.body || { value: '', summary: '' };
    newGrupo.field_lideres = newGrupo.field_lideres || [];

    grupos.unshift(newGrupo);
    await writeJson('grupos_pesquisa.json', grupos);
    res.status(201).json(newGrupo);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar grupo de pesquisa', error: error.message });
  }
};

// Atualizar grupo de pesquisa
export const updateGrupoPesquisa = async (req, res) => {
  try {
    const grupos = await readJson('grupos_pesquisa.json');
    const index = grupos.findIndex(g => g.id === req.params.id);

    if (index !== -1) {
      const updated = {
        ...grupos[index],
        ...req.body,
        body: {
          ...grupos[index].body,
          ...(req.body.body || {})
        },
        field_lideres: req.body.field_lideres !== undefined ? req.body.field_lideres : grupos[index].field_lideres
      };

      grupos[index] = updated;
      await writeJson('grupos_pesquisa.json', grupos);
      res.json(updated);
    } else {
      res.status(404).json({ message: 'Grupo de pesquisa não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar grupo de pesquisa', error: error.message });
  }
};

// Excluir grupo de pesquisa
export const deleteGrupoPesquisa = async (req, res) => {
  try {
    const grupos = await readJson('grupos_pesquisa.json');
    const index = grupos.findIndex(g => g.id === req.params.id);

    if (index !== -1) {
      grupos.splice(index, 1);
      await writeJson('grupos_pesquisa.json', grupos);
      res.json({ message: 'Grupo de pesquisa removido com sucesso' });
    } else {
      res.status(404).json({ message: 'Grupo de pesquisa não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir grupo de pesquisa', error: error.message });
  }
};
