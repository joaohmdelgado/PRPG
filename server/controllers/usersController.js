import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { isPlainObject } from '../utils/sanitize.js';
import { usersRepo } from '../db/repositories.js';

const stripHash = (u) => {
  if (!u) return u;
  const { password_hash, ...rest } = u;
  return rest;
};

export const getUsers = async (req, res) => {
  try {
    const users = await usersRepo.getAll();
    res.json(users.map(stripHash));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const isSelf = req.user && req.user.id === req.params.id;
    const isAdmin = req.user && req.user.roles &&
      (req.user.roles.includes('Administrator') || req.user.roles.includes('Gestor'));
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para visualizar este perfil.' });
    }
    const user = await usersRepo.getById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(stripHash(user));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
    const data = req.body;

    if (!data.email) return res.status(400).json({ message: 'E-mail é obrigatório' });
    if (await usersRepo.findByEmail(data.email)) {
      return res.status(400).json({ message: 'E-mail já cadastrado' });
    }

    const roles = data.roles || ['Aluno'];
    if (roles.includes('Professor')) {
      const programas = data.perfil_professor?.programas;
      if (!Array.isArray(programas) || programas.length === 0) {
        return res.status(400).json({ message: 'O professor deve estar relacionado a pelo menos um programa.' });
      }
    }

    const password = data.password || 'Mudar123';
    const password_hash = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const newUser = {
      id: crypto.randomUUID(),
      email: data.email,
      password_hash,
      roles,
      privacidade: data.privacidade || { mostrar_email: false, mostrar_telefone: false },
      perfil_geral: data.perfil_geral || { nome: data.nome || '', cpf: '', siape: '', foto_url: '', telefones: [] },
      dados_academicos: data.dados_academicos || { lattes: '', orcid: '', google_scholar: '', publons: '', linhas_pesquisa: [] },
      perfil_aluno: roles.includes('Aluno') ? (data.perfil_aluno || {}) : null,
      perfil_professor: roles.includes('Professor') ? (data.perfil_professor || {}) : null,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };

    const created = await usersRepo.create(newUser, req.user?.id);
    res.status(201).json(stripHash(created));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar usuário', error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const isSelf = req.user && req.user.id === req.params.id;
    const isAdmin = req.user && req.user.roles &&
      (req.user.roles.includes('Administrator') || req.user.roles.includes('Gestor'));
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para editar este perfil.' });
    }

    const existing = await usersRepo.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });

    const data = req.body || {};
    const updatedRoles = data.roles || existing.roles;
    const updatedPerfilProfessor =
      data.perfil_professor !== undefined ? data.perfil_professor : existing.perfil_professor;

    if (updatedRoles.includes('Professor')) {
      const programas = updatedPerfilProfessor?.programas;
      if (!Array.isArray(programas) || programas.length === 0) {
        return res.status(400).json({ message: 'O professor deve estar relacionado a pelo menos um programa.' });
      }
    }

    let password_hash = existing.password_hash;
    if (data.password) {
      password_hash = await bcrypt.hash(data.password, await bcrypt.genSalt(10));
    }

    const merged = {
      ...existing,
      email: data.email || existing.email,
      password_hash,
      roles: updatedRoles,
      privacidade: data.privacidade || existing.privacidade,
      perfil_geral: data.perfil_geral || existing.perfil_geral,
      dados_academicos: data.dados_academicos || existing.dados_academicos,
      perfil_aluno: data.perfil_aluno !== undefined ? data.perfil_aluno : existing.perfil_aluno,
      perfil_professor: updatedPerfilProfessor,
      atualizado_em: new Date().toISOString(),
    };

    const updated = await usersRepo.update(req.params.id, merged, req.user?.id);
    res.json(stripHash(updated));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const ok = await usersRepo.remove(req.params.id);
    if (ok) res.json({ message: 'Usuário removido com sucesso' });
    else res.status(404).json({ message: 'Usuário não encontrado' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover usuário', error: error.message });
  }
};
