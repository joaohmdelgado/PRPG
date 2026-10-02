// Fase O.7: painel de qualidade de dados — o que está errado ou suspeito nos
// cadastros, para corrigir na fonte (não é bloqueio: o acervo real tem dados
// que não seguem o formato ideal, ver utils/cpf.js e utils/nup.js).
//   GET  /api/painel/qualidade                 problemas por categoria
//   POST /api/painel/qualidade/links/verificar dispara o verificador de links (202)
import { query } from '../db/pool.js';
import { verificarLinks, estadoVerificacao } from '../services/verificadorLinks.js';
import { joinPessoa } from '../db/identidadeVinculo.js';

const LIMITE = 50;

// CPF só mascarado no painel: ***.123.456-** (LGPD).
export const mascararCpf = (cpf) => {
  const d = String(cpf || '').replace(/\D/g, '');
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : (d ? '***' : null);
};

const categoria = (id, titulo, itens, extra = {}) => ({ id, titulo, total: itens.length, itens: itens.slice(0, LIMITE), ...extra });

// Onde corrigir uma pessoa: o usuário, o estágio pós-doc ou nenhum lugar (ainda).
const CORRIGIR_PESSOA = `
  (SELECT '/admin/users/editar/' || u.id FROM users u WHERE u.pessoa_id = p.id LIMIT 1) AS rota_user,
  (SELECT '/admin/pos-doutorado/' || pd.id FROM pos_doutorados pd JOIN vinculos v ON v.id = pd.vinculo_id WHERE v.pessoa_id = p.id LIMIT 1) AS rota_posdoc`;
const rotaPessoa = (r) => r.rota_user || r.rota_posdoc || null;

const JSON_PESSOA = (alias) => `json_build_object('id', ${alias}.id, 'nome', ${alias}.nome, 'cpf', ${alias}.cpf, 'email', ${alias}.email_institucional,
  'vinculos', (SELECT count(*)::int FROM vinculos v WHERE v.pessoa_id = ${alias}.id),
  'login', EXISTS (SELECT 1 FROM users u WHERE u.pessoa_id = ${alias}.id))`;

export const getQualidade = async (_req, res) => {
  const categorias = [];

  // 1. CPF inválido (dígito verificador ou fora do formato)
  const { rows: cpfs } = await query(
    `SELECT p.id, p.nome, p.cpf, ${CORRIGIR_PESSOA} FROM pessoas p
      WHERE p.cpf IS NOT NULL AND p.cpf <> '' AND p.cpf_valido = FALSE ORDER BY p.nome`);
  categorias.push(categoria('cpf_invalido', 'CPF inválido', cpfs.map((r) => ({
    rotulo: r.nome || r.id, detalhe: `CPF ${mascararCpf(r.cpf)} — dígito verificador não confere`, link: rotaPessoa(r),
  }))));

  // 2. Pessoas possivelmente duplicadas: mesmo nome (sem acento/caixa/espaço) ou mesmo CPF.
  const { rows: dupNome } = await query(`
    SELECT lower(unaccent(regexp_replace(trim(p.nome), '\\s+', ' ', 'g'))) AS chave,
           json_agg(${JSON_PESSOA('p')} ORDER BY p.id) AS pessoas
      FROM pessoas p WHERE p.nome IS NOT NULL AND trim(p.nome) <> ''
     GROUP BY 1 HAVING count(*) > 1 ORDER BY 1`);
  const { rows: dupCpf } = await query(`
    SELECT regexp_replace(p.cpf, '\\D', '', 'g') AS chave,
           json_agg(${JSON_PESSOA('p')} ORDER BY p.id) AS pessoas
      FROM pessoas p WHERE p.cpf IS NOT NULL AND regexp_replace(p.cpf, '\\D', '', 'g') <> ''
     GROUP BY 1 HAVING count(*) > 1 ORDER BY 1`);
  const grupos = [
    ...dupNome.map((g) => ({ motivo: 'mesmo nome', pessoas: g.pessoas })),
    ...dupCpf.map((g) => ({ motivo: 'mesmo CPF', pessoas: g.pessoas })),
  ];
  categorias.push(categoria('pessoas_duplicadas', 'Pessoas possivelmente duplicadas', grupos.map((g) => ({
    rotulo: g.pessoas[0].nome, detalhe: `${g.motivo} — ${g.pessoas.length} cadastros`,
    pessoas: g.pessoas.map((p) => ({ id: p.id, nome: p.nome, cpf: mascararCpf(p.cpf), email: p.email, vinculos: p.vinculos, temLogin: p.login })),
  })), { ajuda: 'Não são mesclados automaticamente: confira se é a mesma pessoa e mantenha o cadastro que tem login ou mais vínculos.' }));

  // 3. Vínculos sem data
  const { rows: semData } = await query(`
    SELECT v.id, v.papel, v.programa_id, pr.sigla, pr.nome AS programa_nome, pe.nome AS pessoa
      FROM vinculos v
      LEFT JOIN programas pr ON pr.id = v.programa_id
      ${joinPessoa('v.pessoa_id', { p: 'pe' })}
     WHERE v.ativo AND v.data_inicio_mandato IS NULL AND v.data_fim_mandato IS NULL
     ORDER BY v.papel, pr.nome`);
  const MANDATO = /^(COORDENADOR|VICE_COORDENADOR|SUBSTITUTO|SECRETARIO|POS_DOUTORANDO|COMISSAO_|LIDER_GRUPO)/;
  const porPapel = {};
  for (const v of semData) porPapel[v.papel] = (porPapel[v.papel] || 0) + 1;
  categorias.push(categoria('vinculos_sem_data', 'Vínculos sem data de início nem de fim',
    semData.filter((v) => MANDATO.test(v.papel || '')).map((v) => ({
      rotulo: `${v.pessoa || '—'} — ${String(v.papel).replace(/_/g, ' ').toLowerCase()}`,
      detalhe: v.sigla && v.sigla !== 'S/SIGLA' ? v.sigla : (v.programa_nome || 'sem programa'),
      link: v.programa_id ? `/admin/programas/editar/${v.programa_id}` : null,
    })), {
      ajuda: 'Lista só os cargos com mandato (coordenação, vice, secretaria, comissões, pós-doutorado). A data vem da portaria; não é presumida.',
      resumoPorPapel: Object.entries(porPapel).map(([papel, n]) => ({ papel, n })).sort((a, b) => b.n - a.n),
      totalGeral: semData.length,
    }));

  // 4. Contatos malformados
  const { rows: contatos } = await query(`
    SELECT c.id, c.entidade, c.tipo, c.valor, c.observacao FROM contatos c
     WHERE (c.tipo = 'EMAIL' AND c.valor !~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')
        OR (c.tipo IN ('TELEFONE', 'CELULAR', 'WHATSAPP') AND length(regexp_replace(c.valor, '\\D', '', 'g')) NOT IN (10, 11))
     ORDER BY c.tipo, c.valor LIMIT 500`);
  categorias.push(categoria('contatos_invalidos', 'Contatos com e-mail malformado ou telefone sem DDD', contatos.map((c) => ({
    rotulo: c.tipo === 'EMAIL' ? c.valor : `${c.tipo.toLowerCase()} ${c.valor}`,
    detalhe: `${c.entidade}${c.observacao ? ` — ${c.observacao}` : ''}`,
    link: '/admin/contatos',
  }))));

  // 5. Links quebrados (do verificador)
  const { rows: links } = await query(
    `SELECT url, situacao, status_http, erro, usos, verificado_em, quebrado_desde FROM links_verificados
      WHERE situacao <> 'OK' ORDER BY (situacao = 'QUEBRADO') DESC, quebrado_desde NULLS LAST, url`);
  const { rows: resumoLinks } = await query(`SELECT situacao, count(*)::int AS n, max(verificado_em) AS ultima FROM links_verificados GROUP BY situacao`);
  const item = (l) => ({
    rotulo: l.url, detalhe: l.erro || (l.status_http ? `HTTP ${l.status_http}` : ''), situacao: l.situacao,
    quebradoDesde: l.quebrado_desde, usos: l.usos,
    link: l.usos?.[0]?.rota || null,
  });
  const totalLinks = resumoLinks.reduce((a, r) => a + r.n, 0);
  categorias.push(categoria('links_quebrados', 'Links quebrados', links.filter((l) => l.situacao === 'QUEBRADO').map(item), {
    verificados: totalLinks, ultimaVerificacao: resumoLinks.map((r) => r.ultima).sort().pop() || null,
    emAndamento: estadoVerificacao(),
  }));
  categorias.push(categoria('links_incertos', 'Links que não deu para confirmar', links.filter((l) => l.situacao === 'INCERTO').map(item), {
    ajuda: 'Bloqueio a robôs (403), limite de requisições (429), queda momentânea ou sem resposta. Abra o link para conferir.',
  }));

  res.json({ geradoEm: new Date().toISOString(), categorias });
};

// Dispara a verificação em segundo plano (pode levar minutos). O progresso
// aparece em `emAndamento` no GET seguinte.
export const iniciarVerificacaoLinks = async (_req, res) => {
  if (estadoVerificacao()) return res.status(409).json({ message: 'Já há uma verificação em andamento.', emAndamento: estadoVerificacao() });
  verificarLinks().catch((e) => console.error('[Links] Erro na verificação:', e.message));
  res.status(202).json({ iniciada: true });
};
