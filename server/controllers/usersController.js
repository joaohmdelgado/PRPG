import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { isPlainObject } from '../utils/sanitize.js';
import { usersRepo } from '../db/repositories.js';
import { isProgramaScoped } from '../middleware/authMiddleware.js';
import { PAPEIS_DISCENTE, PAPEIS_DOCENTE } from './programasController.js';
import { query } from '../db/pool.js';

const stripHash = (u) => {
  if (!u) return u;
  const { password_hash, ...rest } = u;
  return rest;
};

// Papéis que um Gestor de Programa pode atribuir aos usuários que cadastra:
// só alunos e professores do seu próprio programa (nunca papéis com poder).
const GESTOR_ROLES_PERMITIDOS = ['Aluno', 'Professor'];

// Cria o vínculo da pessoa recém-cadastrada com o programa do gestor, no papel
// escolhido (mestrando, docente permanente, etc.), espelhando addDiscente/addDocente.
const vincularAoPrograma = async (programaId, pessoaId, papel) => {
  await query(
    `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo, criado_em)
     VALUES ($1,$2,$3,$4,TRUE,$5)`,
    [crypto.randomUUID(), programaId, pessoaId, papel, new Date().toISOString()]
  );
};

export const getUsers = async (req, res) => {
  try {
    // Gestor de Programa só enxerga usuários do seu programa (donos + vinculados,
    // incluindo egressos compartilhados). Admin/Gestor da PRPG veem todos.
    if (isProgramaScoped(req.user)) {
      if (!req.user.programaId) return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
      const scoped = await usersRepo.getScopedToPrograma(req.user.programaId);
      return res.json(scoped.map(stripHash));
    }
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
    const user = await usersRepo.getById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

    // Gestor de Programa pode ver usuários do seu programa (dono ou vinculado).
    let gestorPodeVer = false;
    if (isProgramaScoped(req.user) && req.user.programaId) {
      gestorPodeVer = (user.programaId === req.user.programaId) ||
        (await usersRepo.isLinkedToPrograma(user.id, req.user.programaId));
    }

    if (!isSelf && !isAdmin && !gestorPodeVer) {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para visualizar este perfil.' });
    }
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

    const scoped = isProgramaScoped(req.user);

    // ── Checagem de duplicidade (e-mail ou CPF) ──────────────────────────────
    // Em vez de só recusar, identificamos o cadastro existente e devolvemos o
    // mínimo (id + nome) para o painel oferecer o vínculo ao programa — sem
    // criar conta duplicada nem transferir a posse. 409 = conflito. Para o
    // Gestor de Programa, jaVinculado indica se a pessoa já é do seu programa.
    const porEmail = await usersRepo.findByEmail(data.email);
    const cpfInformado = data.perfil_geral?.cpf;
    const porCpf = !porEmail && cpfInformado ? await usersRepo.findByCpf(cpfInformado) : null;
    const duplicado = porEmail || porCpf;
    if (duplicado) {
      const programaGestor = scoped ? req.user.programaId : null;
      const jaVinculado = programaGestor
        ? (duplicado.programaId === programaGestor ||
           await usersRepo.isLinkedToPrograma(duplicado.id, programaGestor))
        : false;
      return res.status(409).json({
        message: porEmail
          ? 'Já existe um cadastro com este e-mail.'
          : 'Já existe um cadastro com este CPF.',
        conflict: porEmail ? 'email' : 'cpf',
        existing: { id: duplicado.id, nome: duplicado.perfil_geral?.nome || '', jaVinculado },
      });
    }

    const roles = data.roles || ['Aluno'];

    // ── Cadastro feito por um Gestor de Programa ──────────────────────────────
    // Só pode criar alunos/professores e tudo fica vinculado ao SEU programa.
    let papelVinculo = null;
    if (scoped) {
      if (!req.user.programaId) return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
      const naoPermitido = roles.find((r) => !GESTOR_ROLES_PERMITIDOS.includes(r));
      if (naoPermitido || roles.length === 0) {
        return res.status(403).json({ message: 'Gestor de programa só pode cadastrar alunos e professores.' });
      }
      const papeisValidos = roles.includes('Professor') ? PAPEIS_DOCENTE : PAPEIS_DISCENTE;
      papelVinculo = papeisValidos.includes(data.papelVinculo) ? data.papelVinculo : papeisValidos[0];
      // Força o programa do gestor: professor passa a constar no seu programa.
      if (roles.includes('Professor')) {
        data.perfil_professor = { ...(data.perfil_professor || {}), programas: [req.user.programaId] };
      }
    }

    if (roles.includes('Professor')) {
      const programas = data.perfil_professor?.programas;
      if (!Array.isArray(programas) || programas.length === 0) {
        return res.status(400).json({ message: 'O professor deve estar relacionado a pelo menos um programa.' });
      }
    }
    if (roles.includes('GestorPrograma') && !data.programaId) {
      return res.status(400).json({ message: 'O gestor de programa deve estar vinculado a um programa.' });
    }

    // Admin/Gestor também pode cadastrar aluno/professor já vinculado a um
    // programa (pelas páginas de Discentes/Docentes), informando papelVinculo.
    if (!scoped && data.papelVinculo && (roles.includes('Aluno') || roles.includes('Professor'))) {
      const papeisValidos = roles.includes('Professor') ? PAPEIS_DOCENTE : PAPEIS_DISCENTE;
      if (papeisValidos.includes(data.papelVinculo)) papelVinculo = data.papelVinculo;
    }

    // Programa "dono" do usuário: o do gestor (forçado), o do GestorPrograma
    // criado, ou o programa informado para alunos/professores.
    const ownerProgramaId = scoped
      ? req.user.programaId
      : (roles.includes('GestorPrograma') ? data.programaId : (data.programaId || null));

    const password = data.password || 'Mudar123';
    const password_hash = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const newUser = {
      id: crypto.randomUUID(),
      email: data.email,
      password_hash,
      roles,
      programaId: ownerProgramaId,
      privacidade: data.privacidade || { mostrar_email: false, mostrar_telefone: false },
      perfil_geral: data.perfil_geral || { nome: data.nome || '', cpf: '', siape: '', foto_url: '', telefones: [] },
      dados_academicos: data.dados_academicos || { lattes: '', orcid: '', google_scholar: '', publons: '', linhas_pesquisa: [] },
      perfil_aluno: roles.includes('Aluno') ? (data.perfil_aluno || {}) : null,
      perfil_professor: roles.includes('Professor') ? (data.perfil_professor || {}) : null,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };

    const created = await usersRepo.create(newUser, req.user?.id);

    // Vincula automaticamente o aluno/professor ao programa no papel escolhido.
    if (papelVinculo && ownerProgramaId && (roles.includes('Aluno') || roles.includes('Professor'))) {
      await vincularAoPrograma(ownerProgramaId, created.id, papelVinculo);
    }

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

    const existing = await usersRepo.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });

    // Gestor de Programa só edita usuários que o seu programa possui. Egressos
    // de outro programa (vinculados, mas ativos alhures) são somente leitura.
    const scoped = isProgramaScoped(req.user);
    const gestorOwns = scoped && req.user.programaId && existing.programaId === req.user.programaId;
    if (scoped && !gestorOwns) {
      return res.status(403).json({ message: 'Você só pode editar alunos/professores do seu programa.' });
    }
    if (!isSelf && !isAdmin && !gestorOwns) {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para editar este perfil.' });
    }

    const data = req.body || {};
    // Gestor não pode trocar papéis nem o programa-dono (evita escalonamento).
    const updatedRoles = scoped ? existing.roles : (data.roles || existing.roles);
    const updatedPerfilProfessor =
      data.perfil_professor !== undefined ? data.perfil_professor : existing.perfil_professor;

    if (updatedRoles.includes('Professor')) {
      const programas = updatedPerfilProfessor?.programas;
      if (!Array.isArray(programas) || programas.length === 0) {
        return res.status(400).json({ message: 'O professor deve estar relacionado a pelo menos um programa.' });
      }
    }

    const updatedProgramaId =
      data.programaId !== undefined ? data.programaId : existing.programaId;
    if (updatedRoles.includes('GestorPrograma') && !updatedProgramaId) {
      return res.status(400).json({ message: 'O gestor de programa deve estar vinculado a um programa.' });
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
      programaId: scoped
        ? existing.programaId
        : (updatedRoles.includes('GestorPrograma') ? updatedProgramaId
            : (data.programaId !== undefined ? data.programaId : existing.programaId)),
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
