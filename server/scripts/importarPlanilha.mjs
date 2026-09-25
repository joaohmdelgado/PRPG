// Fase O.3: importação de uma planilha pela linha de comando (a mesma que a
// tela "Planilhas" do painel faz). Simulação por padrão — nada é gravado.
//
//   npm run planilha -- <fonte> <arquivo.xlsx>              simula e mostra o relatório
//   npm run planilha -- <fonte> <arquivo.xlsx> --gravar     importa de verdade
//   ... --relatorio saida.json                               grava o relatório completo
//   ... --sem-historico                                      simulação sem registrar a execução
//   npm run planilha -- todas <pasta>                        simula as quatro em ordem, numa transação só
//
// fonte: contatos | expedientes | camara | pnpd (nessa ordem, na primeira vez).
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { pool } from '../db/pool.js';
import { executarImportacao, simularSequencia } from '../services/planilhas/nucleo.js';
import { getImportadorPlanilha, ORDEM, ARQUIVOS_PADRAO } from '../services/planilhas/index.js';

const args = process.argv.slice(2);
const [fonte, arquivo] = args.filter((a) => !a.startsWith('--'));
const flag = (f) => args.includes(f);
const valor = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

if (fonte === 'todas' && arquivo) {
  try {
    const etapas = [];
    for (const f of ORDEM) etapas.push({ importador: getImportadorPlanilha(f), buffer: await fs.readFile(path.join(arquivo, ARQUIVOS_PADRAO[f])) });
    for (const r of await simularSequencia(etapas)) {
      console.log(`\n${r.fonte}:`, JSON.stringify(r.resumo));
      for (const a of r.avisos) console.log(`  aviso: ${a}`);
    }
    console.log('\nSIMULAÇÃO da sequência completa — nada gravado.');
  } catch (e) {
    console.error('Falhou:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
  process.exit();
}

const importador = getImportadorPlanilha(fonte);
if (!importador || !arquivo) {
  console.error(`Uso: npm run planilha -- <${ORDEM.join('|')}> <arquivo.xlsx> [--gravar] [--relatorio saida.json] [--sem-historico]`);
  process.exit(2);
}

try {
  const buffer = await fs.readFile(arquivo);
  const simulacao = !flag('--gravar');
  const r = await executarImportacao({
    importador, buffer, arquivoNome: path.basename(arquivo), simulacao, registrar: !flag('--sem-historico'),
  });
  console.log(`\n${simulacao ? 'SIMULAÇÃO (nada gravado)' : 'IMPORTAÇÃO GRAVADA'} — ${fonte} — ${path.basename(arquivo)}`);
  console.log('Resumo:', JSON.stringify(r.resumo));
  const porAcao = {};
  for (const it of r.relatorio) (porAcao[it.acao] ||= []).push(it);
  for (const acao of ['conflito', 'divergente', 'erro', 'ignorado']) {
    for (const it of (porAcao[acao] || []).slice(0, 15)) {
      console.log(`  [${acao}] ${it.rotulo || it.chave}${it.motivo ? ' — ' + it.motivo : ''}${it.mudou ? ' — mudou: ' + it.mudou.map((m) => m.campo).join(', ') : ''}`);
    }
  }
  for (const a of r.avisos) console.log(`  aviso: ${a}`);
  if (valor('--relatorio')) {
    await fs.writeFile(valor('--relatorio'), JSON.stringify(r, null, 2));
    console.log(`Relatório completo: ${valor('--relatorio')}`);
  }
} catch (e) {
  console.error('Falhou:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
