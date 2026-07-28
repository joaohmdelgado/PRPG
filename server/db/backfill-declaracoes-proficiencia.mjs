// Fase B.2 do PLANO.md: cria em `declaracoes` uma linha para cada
// `inscricoes_proficiencia` que já tinha `codigo_verificacao`/`emitida_em`
// preenchidos antes da migração para o serviço genérico (services/declaracoes.js)
// — preserva os valores já emitidos (os QR codes já impressos continuam
// resolvendo). Idempotente: só age sobre inscrições sem declaração correspondente.
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pool, query } from './pool.js';

const RESULTADO_LABEL = { SUFICIENCIA: 'SUFICIÊNCIA', PROFICIENCIA: 'PROFICIÊNCIA' };

const somarAnos = (iso, anos) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  const [, ano, mes, dia] = m;
  return `${Number(ano) + anos}-${mes}-${dia}`;
};

export async function backfillDeclaracoesProficiencia() {
  const { rows } = await query(
    `SELECT i.* FROM inscricoes_proficiencia i
     WHERE i.codigo_verificacao IS NOT NULL AND i.emitida_em IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM declaracoes d
         WHERE d.entidade = 'inscricao_proficiencia' AND d.entidade_id = i.id
       )`
  );

  let criadas = 0;
  for (const r of rows) {
    const edital = r.periodo_id
      ? (await query('SELECT proficiencia_data_prova FROM editais WHERE id = $1', [r.periodo_id])).rows[0]
      : null;
    // declaracoes.pessoa_id tem FK real para pessoas(id); r.aluno_id é users.id.
    const alunoPessoa = r.aluno_id
      ? (await query('SELECT pessoa_id FROM users WHERE id = $1', [r.aluno_id])).rows[0]
      : null;
    const emissaoIso = new Date(r.emitida_em).toISOString().slice(0, 10);
    const dados = {
      nome: r.nome, cpf: r.cpf, nivel: r.nivel, linguas: r.linguas ?? [],
      nota: r.nota != null ? Number(r.nota) : null, resultado: r.resultado,
      resultadoLabel: RESULTADO_LABEL[r.resultado] || r.resultado,
      dataProva: edital?.proficiencia_data_prova || null,
    };
    await query(
      `INSERT INTO declaracoes
         (id, codigo, tipo, entidade, entidade_id, pessoa_id, dados, emitida_em, valida_ate)
       VALUES ($1,$2,'proficiencia','inscricao_proficiencia',$3,$4,$5,$6,$7)`,
      [crypto.randomUUID(), r.codigo_verificacao, r.id, alunoPessoa?.pessoa_id || null,
       JSON.stringify(dados), r.emitida_em, somarAnos(emissaoIso, 4)]
    );
    criadas++;
  }
  return { criadas, total: rows.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  backfillDeclaracoesProficiencia()
    .then(({ criadas, total }) => {
      console.log(`declaracoes de proficiencia retroativas criadas: ${criadas}/${total}`);
      return pool.end();
    })
    .catch(async (e) => {
      console.error('Falha no backfill de declaracoes de proficiencia:', e);
      await pool.end();
      process.exit(1);
    });
}
