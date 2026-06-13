import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');

const readJson = async (filename) => {
  try {
    const data = await fs.readFile(path.join(dataDir, filename), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeJson = async (filename, data) => {
  await fs.writeFile(path.join(dataDir, filename), JSON.stringify(data, null, 2));
};

export const getUsers = async (req, res) => {
  try {
    const users = await readJson('users.json');
    // Não retornar a hash da senha
    const safeUsers = users.map(u => {
      const { password_hash, ...rest } = u;
      return rest;
    });
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const isSelf = req.user && req.user.id === req.params.id;
    const isAdmin = req.user && req.user.roles && (req.user.roles.includes('Administrator') || req.user.roles.includes('Gestor'));
    
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para visualizar este perfil.' });
    }

    const users = await readJson('users.json');
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    
    const { password_hash, ...rest } = user;
    res.json(rest);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const users = await readJson('users.json');
    const data = req.body;

    const emailExists = users.some(u => u.email === data.email);
    if (emailExists) return res.status(400).json({ message: 'E-mail já cadastrado' });

    if (data.roles && data.roles.includes('Professor')) {
      if (!data.perfil_professor || !data.perfil_professor.programas || !Array.isArray(data.perfil_professor.programas) || data.perfil_professor.programas.length === 0) {
        return res.status(400).json({ message: 'O professor deve estar relacionado a pelo menos um programa.' });
      }
    }

    const password = data.password || 'Mudar123';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = {
      id: crypto.randomUUID(),
      email: data.email,
      password_hash,
      roles: data.roles || ['Aluno'],
      privacidade: data.privacidade || {
        mostrar_email: false,
        mostrar_telefone: false,
        mostrar_lattes: true
      },
      perfil_geral: data.perfil_geral || {
        nome: data.nome || '',
        cpf: '',
        siape: '',
        foto_url: '',
        telefones: []
      },
      dados_academicos: data.dados_academicos || {
        lattes: '', orcid: '', google_scholar: '', publons: '', linhas_pesquisa: []
      },
      perfil_aluno: data.roles.includes('Aluno') ? (data.perfil_aluno || {}) : null,
      perfil_professor: data.roles.includes('Professor') ? (data.perfil_professor || {}) : null,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };

    users.push(newUser);
    await writeJson('users.json', users);

    const { password_hash: _ph, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar usuário', error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const isSelf = req.user && req.user.id === req.params.id;
    const isAdmin = req.user && req.user.roles && (req.user.roles.includes('Administrator') || req.user.roles.includes('Gestor'));
    
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para editar este perfil.' });
    }

    const users = await readJson('users.json');
    const index = users.findIndex(u => u.id === req.params.id);
    
    if (index === -1) return res.status(404).json({ message: 'Usuário não encontrado' });

    const data = req.body;
    
    const updatedRoles = data.roles || users[index].roles;
    const updatedPerfilProfessor = data.perfil_professor !== undefined ? data.perfil_professor : users[index].perfil_professor;

    if (updatedRoles.includes('Professor')) {
      if (!updatedPerfilProfessor || !updatedPerfilProfessor.programas || !Array.isArray(updatedPerfilProfessor.programas) || updatedPerfilProfessor.programas.length === 0) {
        return res.status(400).json({ message: 'O professor deve estar relacionado a pelo menos um programa.' });
      }
    }

    let password_hash = users[index].password_hash;
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      password_hash = await bcrypt.hash(data.password, salt);
    }

    users[index] = {
      ...users[index],
      email: data.email || users[index].email,
      password_hash,
      roles: data.roles || users[index].roles,
      privacidade: data.privacidade || users[index].privacidade,
      perfil_geral: data.perfil_geral || users[index].perfil_geral,
      dados_academicos: data.dados_academicos || users[index].dados_academicos,
      perfil_aluno: data.perfil_aluno !== undefined ? data.perfil_aluno : users[index].perfil_aluno,
      perfil_professor: data.perfil_professor !== undefined ? data.perfil_professor : users[index].perfil_professor,
      atualizado_em: new Date().toISOString()
    };

    await writeJson('users.json', users);

    const { password_hash: _ph, ...safeUser } = users[index];
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const users = await readJson('users.json');
    const index = users.findIndex(u => u.id === req.params.id);
    
    if (index !== -1) {
      users.splice(index, 1);
      await writeJson('users.json', users);
      res.json({ message: 'Usuário removido com sucesso' });
    } else {
      res.status(404).json({ message: 'Usuário não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover usuário', error: error.message });
  }
};
