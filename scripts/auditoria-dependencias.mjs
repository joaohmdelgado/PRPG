// Auditoria de dependências de produção para o CI (Task 6/7 de
// docs/superpowers/plans/2026-09-09-prontidao-producao-prpg.md).
//
// Roda `npm audit --omit=dev --json` e sai com código 1 se houver vulnerabilidade
// ALTA ou CRÍTICA sem exceção válida em auditoria-excecoes.json. Exceção exige
// pacote, motivo, dono e prazo (AAAA-MM-DD); vencida, volta a bloquear — "aceito
// com motivo" não pode virar "esquecido". Exceção que não corresponde a nenhuma
// vulnerabilidade (já corrigida) é só um aviso para removê-la. moderate e low não
// bloqueiam. O baseline JSON completo vai como artefato do CI (--saida).
//
//   npm run ci:auditoria                   usa o registro npm (precisa de rede)
//   node scripts/auditoria-dependencias.mjs --saida auditoria.json
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BLOQUEIA = new Set(['high', 'critical']);

export const avaliarAuditoria = (auditoria, excecoes = [], hoje = new Date().toISOString().slice(0, 10)) => {
  const bloqueios = [];
  const avisos = [];
  const usadas = new Set();
  const porPacote = new Map(excecoes.map((e) => [e.pacote, e]));

  for (const [nome, v] of Object.entries(auditoria.vulnerabilities || {})) {
    if (!BLOQUEIA.has(v.severity)) continue;
    const e = porPacote.get(nome);
    if (!e) { bloqueios.push({ pacote: nome, severidade: v.severity, motivo: 'sem exceção em auditoria-excecoes.json' }); continue; }
    usadas.add(nome);
    if (!e.motivo || !e.dono || !e.expira) {
      bloqueios.push({ pacote: nome, severidade: v.severity, motivo: 'exceção inválida: precisa de motivo, dono e prazo (expira)' });
    } else if (e.expira < hoje) {
      bloqueios.push({ pacote: nome, severidade: v.severity, motivo: `exceção venceu em ${e.expira} (dono: ${e.dono}) — reavaliar` });
    }
  }
  for (const e of excecoes) {
    if (!usadas.has(e.pacote)) avisos.push(`exceção de "${e.pacote}" não corresponde a nenhuma vulnerabilidade alta/crítica: remover de auditoria-excecoes.json`);
  }
  return { ok: bloqueios.length === 0, bloqueios, avisos };
};

const executar = () => {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const excecoes = JSON.parse(fs.readFileSync(path.join(raiz, 'auditoria-excecoes.json'), 'utf8')).excecoes || [];
  let bruto;
  // Via `npm run`, o npm informa o próprio executável (npm_execpath): roda sem shell,
  // igual no Windows e no Linux. Fora do npm, cai no comando `npm`.
  const npm = process.env.npm_execpath;
  const [comando, args, shell] = npm
    ? [process.execPath, [npm, 'audit', '--omit=dev', '--json'], false]
    : ['npm', ['audit', '--omit=dev', '--json'], process.platform === 'win32'];
  try {
    bruto = execFileSync(comando, args, { cwd: raiz, encoding: 'utf8', shell, maxBuffer: 20 * 1024 * 1024 });
  } catch (e) {
    bruto = e.stdout; // o npm sai com código 1 quando há vulnerabilidades; o JSON vem no stdout
    if (!bruto) throw e;
  }
  const saida = process.argv.indexOf('--saida');
  if (saida > -1) fs.writeFileSync(process.argv[saida + 1], bruto);
  const r = avaliarAuditoria(JSON.parse(bruto), excecoes);
  for (const a of r.avisos) console.log(`AVISO: ${a}`);
  if (r.ok) { console.log('Auditoria de dependências de produção: nenhuma vulnerabilidade alta/crítica sem exceção válida.'); return 0; }
  for (const b of r.bloqueios) console.error(`BLOQUEIO: ${b.pacote} (${b.severidade}) — ${b.motivo}`);
  return 1;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = executar();
