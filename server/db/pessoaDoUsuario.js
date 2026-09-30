// B.11 / D-B11b (docs/analise-fk-vinculos-pessoa-id-b3.md §6): `pessoas` é a
// fonte dos dados da pessoa; users.perfil_*/acad_* são cópia legada até o fim
// da G1. Toda gravação de usuário passa por usersRepo, que chama isto para
// levar à `pessoas` ligada o que mudou — nunca apagando valor preenchido lá com
// vazio (a foto posta pela tela de Estrutura, por exemplo, só existe em
// `pessoas`). O e-mail de login NÃO é copiado: não é e-mail institucional.
import { query } from './pool.js';
import { criarPessoaDeUsuario } from './pessoasRepo.js';
import { normalizarCpf, cpfValido } from '../utils/cpf.js';

const vazio = (v) => v == null || String(v).trim() === '';

// Coluna de `pessoas` <- valor do usuário no formato do app (userFromRow).
const CAMPOS = {
  nome: (u) => u.perfil_geral?.nome,
  cpf: (u) => normalizarCpf(u.perfil_geral?.cpf),
  siape: (u) => u.perfil_geral?.siape,
  foto_url: (u) => u.perfil_geral?.foto_url,
  telefones: (u) => {
    const t = u.perfil_geral?.telefones;
    return Array.isArray(t) ? t.filter((x) => !vazio(x)).join(', ') : t;
  },
  lattes: (u) => u.dados_academicos?.lattes,
  orcid: (u) => u.dados_academicos?.orcid,
  google_scholar: (u) => u.dados_academicos?.google_scholar,
  publons: (u) => u.dados_academicos?.publons,
};

// Sem `antes` (usuário novo): todo campo preenchido. Com `antes`: só o que
// mudou e não ficou vazio.
export function camposAPropagar(antes, depois) {
  const out = {};
  for (const [col, ler] of Object.entries(CAMPOS)) {
    const novo = ler(depois);
    if (vazio(novo)) continue;
    if (antes && ler(antes) === novo) continue;
    out[col] = typeof novo === 'string' ? novo.trim() : novo;
  }
  return out;
}

// `soVazios`: só preenche coluna vazia em `pessoas` (pessoa já existente que
// o cadastro encontrou pelo CPF — o que veio de planilha não é sobrescrito).
async function gravar(pessoaId, campos, { soVazios = false } = {}) {
  const cols = Object.keys(campos).filter((c) => !(soVazios && c === 'cpf'));
  if (!cols.length) return;
  const params = [pessoaId, ...cols.map((c) => campos[c])];
  const sets = cols.map((c, i) => (soVazios
    ? `${c} = COALESCE(NULLIF(${c}, ''), $${i + 2})`
    : `${c} = $${i + 2}`));
  if (cols.includes('cpf')) {
    params.push(cpfValido(campos.cpf));
    sets.push(`cpf_valido = $${params.length}`);
  }
  await query(`UPDATE pessoas SET ${sets.join(', ')}, atualizado_em = now() WHERE id = $1`, params);
}

// Uma pessoa sem login com este CPF (e só uma) — para não duplicar quem veio
// de planilha e depois ganhou login.
async function pessoaSemLoginPorCpf(cpf) {
  if (!cpf || !cpfValido(cpf)) return null;
  const { rows } = await query(
    `SELECT p.id FROM pessoas p
      WHERE lpad(regexp_replace(COALESCE(p.cpf, ''), '\\D', '', 'g'), 11, '0') = $1
        AND NOT EXISTS (SELECT 1 FROM users u WHERE u.pessoa_id = p.id)
      LIMIT 2`,
    [cpf]
  );
  return rows.length === 1 ? rows[0].id : null;
}

// Chamado por usersRepo depois de gravar o usuário. Devolve o usuário com
// `pessoaId` preenchido.
export async function sincronizarPessoaDoUsuario(antes, depois) {
  if (!depois) return depois;
  if (depois.pessoaId) {
    await gravar(depois.pessoaId, camposAPropagar(antes, depois));
    return depois;
  }
  const existente = await pessoaSemLoginPorCpf(normalizarCpf(depois.perfil_geral?.cpf));
  if (existente) {
    await query('UPDATE users SET pessoa_id = $1 WHERE id = $2', [existente, depois.id]);
    await gravar(existente, camposAPropagar(null, depois), { soVazios: true });
    return { ...depois, pessoaId: existente };
  }
  // criarPessoaDeUsuario copia também sexo/nacionalidade/estrangeiro; o
  // gravar seguinte normaliza o CPF e calcula cpf_valido.
  const pessoaId = await criarPessoaDeUsuario(depois.id);
  await gravar(pessoaId, camposAPropagar(null, depois));
  return { ...depois, pessoaId };
}
