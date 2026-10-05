// PRIV-01: move os comprovantes de proficiência antigos de /uploads (público)
// para server/private-uploads e troca o endereço nas inscrições (ver
// server/services/comprovantesPrivados.js e docs/operations/comprovantes-privados.md).
//
//   npm run comprovantes:privados             simulação: lista o que seria movido
//   npm run comprovantes:privados -- --gravar move de verdade
//
// Rodar no checkout/servidor onde está o server/uploads de verdade: se algum
// arquivo não estiver no disco, o --gravar para sem mover nada (rodar de outro
// lugar trocaria os endereços e deixaria o PDF público, órfão). Endereço que de
// fato não tem arquivo só é trocado com --incluir-sem-arquivo.
// Idempotente: comprovante já em /private-uploads não entra.
import 'dotenv/config';
import { pool } from '../db/pool.js';
import { localizarComprovantesPublicos, moverComprovante } from '../services/comprovantesPrivados.js';

const gravar = process.argv.includes('--gravar');
const incluirSemArquivo = process.argv.includes('--incluir-sem-arquivo');

try {
  const achados = await localizarComprovantesPublicos();
  console.log(`[Comprovantes] ${achados.length} comprovante(s) ainda em /uploads (público).`);
  for (const a of achados) {
    const situacao = !a.valido ? 'endereço inválido — ver à mão'
      : a.jaNaPastaPrivada ? 'CONFLITO: já existe com esse nome na pasta privada'
        : a.noDisco ? 'arquivo no disco' : 'arquivo NÃO está no disco (só o endereço muda)';
    console.log(`  ${a.url} — inscrição(ões) ${a.inscricoes.join(', ')} — ${situacao}`);
  }
  const semArquivo = achados.filter((a) => a.valido && !a.noDisco).length;
  if (!gravar) {
    console.log('SIMULAÇÃO — nada movido. Use --gravar para mover.');
  } else if (semArquivo && !incluirSemArquivo) {
    console.log(`[Comprovantes] ${semArquivo} arquivo(s) não estão em server/uploads deste checkout — nada movido.`);
    console.log('  Rode onde estão os uploads de verdade; se os arquivos de fato não existem, use --incluir-sem-arquivo.');
    process.exitCode = 1;
  } else {
    const contagem = {};
    for (const a of achados) {
      const { resultado } = await moverComprovante(a);
      contagem[resultado] = (contagem[resultado] || 0) + 1;
    }
    console.log('[Comprovantes] resultado:', JSON.stringify(contagem));
    if (contagem.conflito || contagem.invalido) process.exitCode = 1;
  }
} catch (e) {
  console.error('[Comprovantes] falhou:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
