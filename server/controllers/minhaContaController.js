// Fase U.1 (docs/revisao-portal-conteudo-2026-09-24.md): área /minha-conta para
// aluno e professor, separada do /admin. Uma resposta só com o que a pessoa
// precisa ver de si: dados, vínculos, inscrições, declarações e relatorias.
// Tudo é lido do PRÓPRIO login (req.user.id) — não há id na URL, então não há
// como olhar a conta de outra pessoa.
import bcrypt from 'bcryptjs';
import { isPlainObject } from '../utils/sanitize.js';
import { query } from '../db/pool.js';
import { usersRepo } from '../db/repositories.js';
import { PAPEIS_DISCENTE, PAPEIS_DOCENTE } from './programasController.js';
import { gerarDeclaracao } from './proficienciaController.js';

const mascararCpf = (cpf) => {
  const d = String(cpf || '').replace(/\D/g, '');
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : null;
};

// O que a pessoa lê na lista de declarações. Tipos novos entram aqui.
const ROTULO_DECLARACAO = {
  proficiencia: 'Proficiência em língua estrangeira',
  PROFICIENCIA: 'Proficiência em língua estrangeira',
  VINCULO_DISCENTE: 'Vínculo discente',
  VINCULO_POSDOC: 'Vínculo de pós-doutorado',
  CONCLUSAO_POSDOC: 'Conclusão de pós-doutorado',
  ESPELHO_PROCESSO: 'Espelho de processo',
};

const dataIso = (v) => (v ? new Date(v).toISOString().slice(0, 10) : null);

export const getMinhaConta = async (req, res) => {
  const user = req.user?.id ? await usersRepo.getById(req.user.id) : null;
  if (!user) return res.status(404).json({ message: 'Conta não encontrada.' });

  // Identidade em dois lugares (users.id e pessoas.id): vínculos, relatorias e
  // declarações antigos podem apontar para qualquer um dos dois.
  const ids = [user.id, user.pessoaId].filter(Boolean);

  const [vinculos, inscricoes, declaracoes, relatorias] = await Promise.all([
    query(
      `SELECT v.papel, v.ativo, v.data_inicio_mandato, v.data_fim_mandato,
              p.id AS programa_id, p.sigla, p.nome, p.slug
         FROM vinculos v JOIN programas p ON p.id = v.programa_id
        WHERE v.pessoa_id = ANY($1::text[]) AND v.papel = ANY($2::text[])
        ORDER BY v.ativo DESC NULLS LAST, p.sigla`,
      [ids, [...PAPEIS_DISCENTE, ...PAPEIS_DOCENTE]]
    ),
    // Sem os comprovantes: são documentos pessoais em área privada e a tela
    // não precisa deles.
    query(
      `SELECT i.id, i.nivel, i.linguas, i.status, i.nota, i.resultado, i.criado_em,
              e.title AS periodo_titulo,
              EXISTS (SELECT 1 FROM declaracoes d WHERE d.entidade = 'inscricao_proficiencia'
                       AND d.entidade_id = i.id AND d.revogada_em IS NULL) AS declaracao_emitida
         FROM inscricoes_proficiencia i LEFT JOIN editais e ON e.id = i.periodo_id
        WHERE i.aluno_id = ANY($1::text[]) ORDER BY i.criado_em DESC`,
      [ids]
    ),
    query(
      `SELECT d.id, d.codigo, d.tipo, d.entidade, d.entidade_id, d.dados, d.emitida_em,
              d.valida_ate, d.revogada_em
         FROM declaracoes d
        WHERE d.pessoa_id = ANY($1::text[])
           OR (d.entidade = 'inscricao_proficiencia' AND d.entidade_id IN
               (SELECT id FROM inscricoes_proficiencia WHERE aluno_id = ANY($1::text[])))
        ORDER BY d.emitida_em DESC`,
      [ids]
    ),
    query(
      `SELECT p.id, p.numero, p.assunto, p.status, r.prazo_devolucao, r.data_designacao
         FROM camara_relatorias r JOIN processos p ON p.id = r.processo_id
        WHERE r.relator_id = ANY($1::text[]) AND r.ativa = TRUE
        ORDER BY r.prazo_devolucao ASC NULLS LAST`,
      [ids]
    ),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);
  res.json({
    conta: {
      id: user.id,
      email: user.email,
      roles: user.roles,
      nome: user.perfil_geral?.nome || user.email,
      cpfMascarado: mascararCpf(user.perfil_geral?.cpf),
      siape: user.perfil_geral?.siape || null,
      telefones: Array.isArray(user.perfil_geral?.telefones) ? user.perfil_geral.telefones : [],
      lattes: user.dados_academicos?.lattes || '',
      orcid: user.dados_academicos?.orcid || '',
      googleScholar: user.dados_academicos?.google_scholar || '',
      privacidade: {
        mostrarEmail: !!user.privacidade?.mostrar_email,
        mostrarTelefone: !!user.privacidade?.mostrar_telefone,
      },
      senhaTemporaria: !!user.senhaTemporaria,
    },
    vinculos: vinculos.rows.map((v) => ({
      papel: v.papel, ativo: v.ativo !== false,
      inicio: dataIso(v.data_inicio_mandato), fim: dataIso(v.data_fim_mandato),
      programa: { id: v.programa_id, sigla: v.sigla, nome: v.nome, slug: v.slug },
    })),
    inscricoes: inscricoes.rows.map((i) => ({
      id: i.id, periodo: i.periodo_titulo || null, nivel: i.nivel, linguas: i.linguas || [],
      status: i.status, nota: i.nota != null ? Number(i.nota) : null, resultado: i.resultado,
      criadaEm: dataIso(i.criado_em), declaracaoEmitida: !!i.declaracao_emitida,
    })),
    declaracoes: declaracoes.rows.map((d) => ({
      codigo: d.codigo, tipo: d.tipo, rotulo: ROTULO_DECLARACAO[d.tipo] || d.tipo,
      emitidaEm: dataIso(d.emitida_em), validaAte: dataIso(d.valida_ate),
      revogada: !!d.revogada_em,
      resumo: d.dados ? { linguas: d.dados.linguas || null, resultado: d.dados.resultadoLabel || null } : null,
      // O PDF só existe para a proficiência (o gerador é o da própria inscrição).
      inscricaoId: d.entidade === 'inscricao_proficiencia' ? d.entidade_id : null,
    })),
    relatorias: relatorias.rows.map((r) => ({
      id: r.id, numero: r.numero, assunto: r.assunto, status: r.status,
      designadaEm: dataIso(r.data_designacao), prazo: dataIso(r.prazo_devolucao),
      atrasada: !!r.prazo_devolucao && dataIso(r.prazo_devolucao) < hoje,
    })),
  });
};

const URL_HTTP = /^https?:\/\/[^\s]{3,300}$/i;

// A pessoa edita só o que é dela para manter: contato e privacidade. Nome, CPF,
// e-mail e papéis são identidade institucional (o cadastro confere o nome com a
// matrícula), e ficam com a secretaria.
export const updateMinhaConta = async (req, res) => {
  if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Dados inválidos.' });
  const user = req.user?.id ? await usersRepo.getById(req.user.id) : null;
  if (!user) return res.status(404).json({ message: 'Conta não encontrada.' });
  const b = req.body;

  let telefones = user.perfil_geral?.telefones ?? [];
  if (b.telefones !== undefined) {
    if (!Array.isArray(b.telefones) || b.telefones.length > 5) {
      return res.status(400).json({ message: 'Informe até 5 telefones.' });
    }
    telefones = b.telefones.map((t) => String(t ?? '').trim()).filter(Boolean);
    if (telefones.some((t) => t.length > 30)) return res.status(400).json({ message: 'Telefone longo demais.' });
  }

  const dados = { ...(user.dados_academicos || {}) };
  for (const [campo, chave] of [['lattes', 'lattes'], ['orcid', 'orcid'], ['googleScholar', 'google_scholar']]) {
    if (b[campo] === undefined) continue;
    const v = String(b[campo] ?? '').trim();
    if (v && !URL_HTTP.test(v)) return res.status(400).json({ message: `Endereço inválido em "${campo}": use um link http(s).` });
    dados[chave] = v || null;
  }

  const privacidade = { ...(user.privacidade || {}) };
  if (isPlainObject(b.privacidade)) {
    if (b.privacidade.mostrarEmail !== undefined) privacidade.mostrar_email = !!b.privacidade.mostrarEmail;
    if (b.privacidade.mostrarTelefone !== undefined) privacidade.mostrar_telefone = !!b.privacidade.mostrarTelefone;
  }

  await usersRepo.update(user.id, {
    ...user,
    perfil_geral: { ...(user.perfil_geral || {}), telefones },
    dados_academicos: dados,
    privacidade,
    atualizado_em: new Date().toISOString(),
  }, user.id);
  return getMinhaConta(req, res);
};

// Troca de senha pelo próprio usuário, exigindo a senha atual (o PUT genérico de
// /users/:id não exige — serve à troca forçada da senha provisória).
export const updateMinhaSenha = async (req, res) => {
  const { senhaAtual, novaSenha } = req.body || {};
  if (typeof senhaAtual !== 'string' || typeof novaSenha !== 'string') {
    return res.status(400).json({ message: 'Informe a senha atual e a nova senha.' });
  }
  if (novaSenha.length < 8) return res.status(400).json({ message: 'A nova senha deve ter pelo menos 8 caracteres.' });
  if (novaSenha === senhaAtual) return res.status(400).json({ message: 'A nova senha deve ser diferente da atual.' });
  const user = req.user?.id ? await usersRepo.getById(req.user.id) : null;
  if (!user) return res.status(404).json({ message: 'Conta não encontrada.' });
  if (!(await bcrypt.compare(senhaAtual, user.password_hash))) {
    return res.status(403).json({ message: 'A senha atual não confere.' });
  }
  await usersRepo.update(user.id, {
    ...user,
    password_hash: await bcrypt.hash(novaSenha, await bcrypt.genSalt(10)),
    senhaTemporaria: false,
    atualizado_em: new Date().toISOString(),
  }, user.id);
  res.json({ message: 'Senha atualizada.' });
};

// PDF da declaração de proficiência da própria pessoa. Só entrega o que a
// secretaria já emitiu (existe em `declaracoes` e não foi revogado): quem pede
// não consegue provocar a emissão de nada.
export const baixarMinhaDeclaracao = async (req, res) => {
  const user = req.user?.id ? await usersRepo.getById(req.user.id) : null;
  if (!user) return res.status(404).json({ message: 'Conta não encontrada.' });
  const ids = [user.id, user.pessoaId].filter(Boolean);
  const { rows } = await query(
    `SELECT d.id FROM declaracoes d JOIN inscricoes_proficiencia i ON i.id = d.entidade_id
      WHERE d.entidade = 'inscricao_proficiencia' AND d.entidade_id = $1
        AND d.revogada_em IS NULL AND i.aluno_id = ANY($2::text[])`,
    [req.params.id, ids]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Declaração não encontrada.' });
  return gerarDeclaracao(req, res);
};
