import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { isPlainObject } from '../utils/sanitize.js';
import { serverError } from '../utils/httpError.js';
import { usersRepo, linhasPesquisaRepo } from '../db/repositories.js';
import { isProgramaScoped } from '../middleware/authMiddleware.js';
import { responderLista, filtrarTexto } from '../utils/listagem.js';
import { PAPEIS_DISCENTE, PAPEIS_DOCENTE } from './programasController.js';
import { doUsuario, idsDaMesmaPessoa } from '../db/identidadeVinculo.js';
import { hojeISO } from '../utils/datas.js';
import {
  gravarPerfilNosVinculos, verificarPerfilAluno, temDadoDeVinculo, PerfilSemVinculo,
} from '../db/perfilVinculo.js';

// Papéis (docente + discente) que representam vínculo a um programa, para
// exibir os programas de qualquer usuário (aluno ou professor) na lista.
const PAPEIS_VINCULO_PROGRAMA = [...PAPEIS_DOCENTE, ...PAPEIS_DISCENTE];
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

// Anexa a cada usuário a lista de programas em que ele tem vínculo ATIVO
// (docente ou discente: id/sigla/nome), para a lista de Usuários exibir os
// programas ou "Sem vínculo".
const anexarProgramasVinculo = async (users) => {
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return users;
  const { rows } = await query(
    `SELECT u.id AS usuario_id, p.id AS programa_id, p.sigla, p.nome
       FROM vinculos v
       JOIN users u ON ${doUsuario('v.pessoa_id')}
       JOIN programas p ON p.id = v.programa_id
      WHERE v.ativo = TRUE AND v.papel = ANY($1::text[]) AND u.id = ANY($2::text[])`,
    [PAPEIS_VINCULO_PROGRAMA, ids]
  );
  const porPessoa = {};
  for (const r of rows) {
    (porPessoa[r.usuario_id] ||= []).push({ id: r.programa_id, sigla: r.sigla, nome: r.nome });
  }
  return users.map((u) => ({ ...u, programas_vinculo: porPessoa[u.id] || [] }));
};

// Colunas ordenáveis da lista do painel (?ordenar=&dir=) — Fase U.3.
const ORDENAVEIS_USUARIOS = {
  nome: (u) => u.perfil_geral?.nome || u.email,
  email: (u) => u.email,
  papeis: (u) => (u.roles || []).join(', '),
};

// Lista do painel: ?q= (nome ou e-mail), ?role=, ?programa=<id do vínculo>,
// ?ordenar=, ?page=&limit=. Devolve também as opções dos filtros (papéis e
// programas que existem entre os usuários visíveis, antes de filtrar).
const responderUsuarios = (res, users, q) => {
  const opcoes = {
    roles: [...new Set(users.flatMap((u) => u.roles || []))].sort(),
    programas: [...new Map(users.flatMap((u) => u.programas_vinculo || []).map((p) => [p.id, p])).values()]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  };
  let lista = filtrarTexto(users, q.q, [(u) => u.perfil_geral?.nome, 'email']);
  if (q.role) lista = lista.filter((u) => u.roles?.includes(q.role));
  if (q.programa) lista = lista.filter((u) => u.programas_vinculo?.some((p) => String(p.id) === String(q.programa)));
  return responderLista(res, lista, q, { extra: opcoes, ordenaveis: ORDENAVEIS_USUARIOS });
};

export const getUsers = async (req, res) => {
  try {
    // Gestor de Programa só enxerga usuários do seu programa (donos + vinculados,
    // incluindo egressos compartilhados). Admin/Gestor da PRPG veem todos.
    if (isProgramaScoped(req.user)) {
      if (!req.user.programaId) return res.status(403).json({ message: 'Gestor sem programa vinculado.' });
      const scoped = await usersRepo.getScopedToPrograma(req.user.programaId);
      return responderUsuarios(res, await anexarProgramasVinculo(scoped.map(stripHash)), req.query);
    }
    const users = await usersRepo.getAll();
    responderUsuarios(res, await anexarProgramasVinculo(users.map(stripHash)), req.query);
  } catch (error) {
    serverError(res, 'Erro ao buscar usuários', error);
  }
};

// Resumo para exibir "editado por" nas telas do painel (Fase R.8). Antes
// essas telas baixavam /api/users inteiro (CPF, SIAPE, telefones, perfil de
// aluno) só para achar um nome. Só quem pode escrever conteúdo aparece como
// autor (requireInstitutionalWriter), então só essas contas entram — sem
// alunos nem professores — e só id + nome.
const PAPEIS_AUTORES = ['Administrator', 'Gestor', 'GestorPrograma'];

export const getUsersResumo = async (req, res) => {
  const { rows } = await query(
    `SELECT id, COALESCE(NULLIF(btrim(perfil_nome), ''), email) AS nome
       FROM users WHERE roles && $1::text[] ORDER BY nome`,
    [PAPEIS_AUTORES]
  );
  res.json(rows);
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
    const linhas_pesquisa = await linhasPesquisaRepo.getByUser(user.id);
    res.json({ ...stripHash(user), linhas_pesquisa });
  } catch (error) {
    serverError(res, 'Erro ao buscar usuário', error);
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

    // G1 (B.13): dado de vínculo do aluno (entrada, situação, qualificação, defesa)
    // só existe com vínculo. No cadastro, o único vínculo de aluno é o criado logo
    // abaixo (papelVinculo discente); sem ele, 400 ANTES de gravar qualquer coisa.
    const criaVinculoAluno = !!(papelVinculo && ownerProgramaId && PAPEIS_DISCENTE.includes(papelVinculo));
    if (roles.includes('Aluno') && !criaVinculoAluno && temDadoDeVinculo(data.perfil_aluno || {})) {
      return res.status(400).json({ message: new PerfilSemVinculo().message });
    }

    const password = data.password || 'Mudar123';
    const password_hash = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const newUser = {
      id: crypto.randomUUID(),
      email: data.email,
      password_hash,
      // Sem senha explícita usamos o padrão 'Mudar123' → provisória: obriga a
      // troca no primeiro acesso. Senha informada pelo admin já vale como final.
      senhaTemporaria: !data.password,
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
      await vincularAoPrograma(ownerProgramaId, created.pessoaId, papelVinculo);
    }

    // G1 (B.13): o perfil de aluno/professor vai também para os vínculos (o de
    // cima já existe; a reconciliação não o duplica). O Gestor de Programa só
    // acrescenta, e só no programa dele. Um papelVinculo docente informado vence
    // o tipo do formulário (é a escolha explícita da tela de Docentes).
    const papelDocenteExplicito = papelVinculo && data.papelVinculo === papelVinculo && PAPEIS_DOCENTE.includes(papelVinculo);
    await gravarPerfilNosVinculos(
      created.pessoaId,
      {
        perfil_aluno: newUser.perfil_aluno,
        perfil_professor: newUser.perfil_professor && papelDocenteExplicito
          ? { ...newUser.perfil_professor, tipo: undefined, tipo_professor: undefined }
          : newUser.perfil_professor,
      },
      { programaId: scoped ? req.user.programaId : null, reconciliarProgramas: !scoped, podeRemover: false }
    );

    if (Array.isArray(data.linhas_pesquisa_ids) && data.linhas_pesquisa_ids.length > 0) {
      const ids = data.linhas_pesquisa_ids.map(Number).filter((n) => !isNaN(n) && n > 0);
      await linhasPesquisaRepo.setForUser(created.id, ids);
    }

    res.status(201).json(stripHash(created));
  } catch (error) {
    serverError(res, 'Erro ao criar usuário', error);
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
    // Papéis e programa-dono só podem ser alterados por Admin/Gestor da PRPG.
    // Nem o Gestor de Programa nem a auto-edição (o próprio usuário) podem mexer
    // nisso: caso contrário um Aluno faria PUT no próprio id com
    // roles:['Administrator'] (ou um programaId) e escalaria privilégios.
    const canManageRoles = isAdmin;
    const updatedRoles = canManageRoles ? (data.roles || existing.roles) : existing.roles;
    const updatedPerfilProfessor =
      data.perfil_professor !== undefined ? data.perfil_professor : existing.perfil_professor;

    if (updatedRoles.includes('Professor')) {
      const programas = updatedPerfilProfessor?.programas;
      if (!Array.isArray(programas) || programas.length === 0) {
        return res.status(400).json({ message: 'O professor deve estar relacionado a pelo menos um programa.' });
      }
    }

    const updatedProgramaId = canManageRoles
      ? (data.programaId !== undefined ? data.programaId : existing.programaId)
      : existing.programaId;
    if (updatedRoles.includes('GestorPrograma') && !updatedProgramaId) {
      return res.status(400).json({ message: 'O gestor de programa deve estar vinculado a um programa.' });
    }

    // Troca de senha pelo próprio usuário zera a flag provisória; um reset feito
    // por admin/gestor marca como provisória (força nova troca). Sem troca de
    // senha, o estado anterior é preservado.
    let senhaTemporaria = existing.senhaTemporaria ?? false;
    let password_hash = existing.password_hash;
    if (data.password) {
      password_hash = await bcrypt.hash(data.password, await bcrypt.genSalt(10));
      senhaTemporaria = isSelf ? false : true;
    }

    const merged = {
      ...existing,
      email: data.email || existing.email,
      password_hash,
      senhaTemporaria,
      roles: updatedRoles,
      programaId: updatedProgramaId,
      privacidade: data.privacidade || existing.privacidade,
      perfil_geral: data.perfil_geral || existing.perfil_geral,
      dados_academicos: data.dados_academicos || existing.dados_academicos,
      perfil_aluno: data.perfil_aluno !== undefined ? data.perfil_aluno : existing.perfil_aluno,
      perfil_professor: updatedPerfilProfessor,
      atualizado_em: new Date().toISOString(),
    };

    // G1 (B.13): quem grava dado de vínculo (papel, entrada, programas...).
    //   Admin/Gestor da PRPG: tudo, inclusive criar/encerrar vínculos docentes pelo
    //     array perfil_professor.programas.
    //   Gestor de Programa dono: só nos vínculos do programa dele; não cria nem encerra.
    //   Auto-edição: nada (o usuário não muda o próprio vínculo); sexo, nacionalidade,
    //     estrangeiro e privacidade vão para `pessoas` pelo usersRepo (pessoaDoUsuario).
    // Só o perfil que veio no payload, e do papel que o usuário tem.
    const gravaVinculos = isAdmin || gestorOwns;
    const opcoesVinculo = isAdmin
      ? { reconciliarProgramas: true, podeRemover: true }
      : { programaId: req.user.programaId, reconciliarProgramas: false, podeRemover: false };
    const perfisVinculo = {
      perfil_aluno: updatedRoles.includes('Aluno') ? data.perfil_aluno : undefined,
      perfil_professor: updatedRoles.includes('Professor') ? data.perfil_professor : undefined,
    };
    // Confere antes de gravar o usuário: o 400 não deixa a gravação pela metade.
    if (gravaVinculos) await verificarPerfilAluno(existing.pessoaId, perfisVinculo.perfil_aluno, opcoesVinculo);

    const updated = await usersRepo.update(req.params.id, merged, req.user?.id);

    if (gravaVinculos) await gravarPerfilNosVinculos(updated.pessoaId, perfisVinculo, opcoesVinculo);

    if (data.linhas_pesquisa_ids !== undefined) {
      const ids = (Array.isArray(data.linhas_pesquisa_ids) ? data.linhas_pesquisa_ids : [])
        .map(Number).filter((n) => !isNaN(n) && n > 0);
      await linhasPesquisaRepo.setForUser(req.params.id, ids);
    }

    res.json(stripHash(updated));
  } catch (error) {
    serverError(res, 'Erro ao atualizar usuário', error);
  }
};

// D-B11c: excluir o login não apaga a pessoa nem o histórico — os vínculos
// ativos são encerrados hoje (egresso já é histórico e fica como está);
// relatorias da Câmara ficam intactas. Para só tirar o acesso de quem continua
// no programa, desative o login em vez de excluir.
export const deleteUser = async (req, res) => {
  try {
    const ids = await idsDaMesmaPessoa(req.params.id);
    await query(
      `UPDATE vinculos SET ativo = FALSE, data_fim_mandato = COALESCE(data_fim_mandato, $2::date)
        WHERE pessoa_id = ANY($1::text[]) AND ativo IS NOT FALSE AND papel <> 'EGRESSO'`,
      [ids, hojeISO()]
    );
    const ok = await usersRepo.remove(req.params.id);
    if (ok) res.json({ message: 'Usuário removido com sucesso' });
    else res.status(404).json({ message: 'Usuário não encontrado' });
  } catch (error) {
    serverError(res, 'Erro ao remover usuário', error);
  }
};
