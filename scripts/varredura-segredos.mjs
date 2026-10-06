// Varredura de segredos e credenciais padrão para o CI (Task 2/7 de
// docs/superpowers/plans/2026-09-09-prontidao-producao-prpg.md: "secret scan que
// detecte strings/hash/defaults proibidos").
//
// Lê os arquivos versionados (git ls-files) e sai com código 1 se achar chave
// privada, token de provedor, hash bcrypt, a senha padrão `Mudar123` ou URL de
// banco com senha em host que não seja local — fora da lista de permissões em
// varredura-segredos-permissoes.json (cada entrada com caminho, tipo e motivo).
// NUNCA imprime o valor achado: só arquivo, linha e tipo.
//
//   npm run ci:segredos
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REGRAS = [
  { tipo: 'chave privada', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { tipo: 'chave AWS', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { tipo: 'token do GitHub', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { tipo: 'token Slack', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { tipo: 'hash bcrypt', re: /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/ },
  // A documentação cita a senha para explicar por que ela não vale: .md não conta.
  { tipo: 'senha padrão Mudar123', re: /Mudar123/, ignorar: /\.md$/ },
  {
    tipo: 'URL de banco com senha',
    // Hosts locais (e o nome de serviço do compose) são exatos: `db.prod.exemplo.br` não passa.
    re: /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@(?!(?:localhost|127\.0\.0\.1|db|postgres)(?:[:/\s]|$)|\[::1\])[^\s/]+/i,
  },
];

const BINARIO = /\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|eot|zip|gz|tgz|xlsx?|docx?|lock)$/i;

export const procurarSegredos = (arquivos, permissoes = []) => {
  const achados = [];
  // Permissão: caminho exato ou, terminando em '/', uma pasta inteira.
  const permitido = (arquivo, tipo) => permissoes.some((p) => p.tipo === tipo
    && (p.caminho === arquivo || (p.caminho.endsWith('/') && arquivo.startsWith(p.caminho))));
  for (const { arquivo, conteudo } of arquivos) {
    const linhas = conteudo.split(/\r?\n/);
    for (const { tipo, re, ignorar } of REGRAS) {
      if ((ignorar && ignorar.test(arquivo)) || permitido(arquivo, tipo)) continue;
      linhas.forEach((linha, i) => { if (re.test(linha)) achados.push({ arquivo, linha: i + 1, tipo }); });
    }
  }
  return achados;
};

const executar = () => {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const permissoes = JSON.parse(fs.readFileSync(path.join(raiz, 'varredura-segredos-permissoes.json'), 'utf8')).permissoes || [];
  const invalidas = permissoes.filter((p) => !p.caminho || !p.tipo || !p.motivo);
  if (invalidas.length) { console.error('Permissão sem caminho, tipo ou motivo em varredura-segredos-permissoes.json.'); return 1; }

  const caminhos = execFileSync('git', ['ls-files', '-z'], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0').filter((f) => f && !BINARIO.test(f) && f !== 'package-lock.json');
  const arquivos = [];
  for (const f of caminhos) {
    try {
      const completo = path.join(raiz, f);
      if (fs.statSync(completo).size > 2 * 1024 * 1024) continue;
      arquivos.push({ arquivo: f.replace(/\\/g, '/'), conteudo: fs.readFileSync(completo, 'utf8') });
    } catch { /* arquivo removido no working tree: ignora */ }
  }
  const achados = procurarSegredos(arquivos, permissoes);
  if (!achados.length) { console.log(`Varredura de segredos: ${arquivos.length} arquivos, nada acusado.`); return 0; }
  for (const a of achados) console.error(`ACHADO: ${a.tipo} em ${a.arquivo}:${a.linha}`);
  console.error('Remova o valor do repositório (e rotacione-o se for real) ou, se for intencional, registre em varredura-segredos-permissoes.json com o motivo.');
  return 1;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = executar();
