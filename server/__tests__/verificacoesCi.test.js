import { describe, it, expect } from 'vitest';
import { avaliarAuditoria } from '../../scripts/auditoria-dependencias.mjs';
import { procurarSegredos } from '../../scripts/varredura-segredos.mjs';

// Task 7 do plano de prontidão: o CI recusa dependência vulnerável sem exceção
// válida e segredo/credencial padrão no repositório.
const auditoria = (vulns) => ({ vulnerabilities: Object.fromEntries(vulns.map(([nome, severity]) => [nome, { name: nome, severity }])) });
const excecao = (pacote, expira = '2027-01-31') => ({ pacote, motivo: 'x', dono: 'equipe', expira });

describe('auditoria de dependências', () => {
  it('passa sem vulnerabilidade alta/crítica; moderate e low não bloqueiam', () => {
    const r = avaliarAuditoria(auditoria([['a', 'moderate'], ['b', 'low']]), [], '2026-10-06');
    expect(r.ok).toBe(true);
    expect(r.bloqueios).toEqual([]);
  });

  it('high/critical sem exceção bloqueiam', () => {
    const r = avaliarAuditoria(auditoria([['multer', 'high'], ['x', 'critical'], ['y', 'moderate']]), [], '2026-10-06');
    expect(r.ok).toBe(false);
    expect(r.bloqueios.map((b) => b.pacote).sort()).toEqual(['multer', 'x']);
  });

  it('exceção válida libera; vencida volta a bloquear, dizendo que venceu', () => {
    const v = auditoria([['nodemailer', 'high']]);
    expect(avaliarAuditoria(v, [excecao('nodemailer')], '2026-10-06').ok).toBe(true);
    const vencida = avaliarAuditoria(v, [excecao('nodemailer', '2026-10-05')], '2026-10-06');
    expect(vencida.ok).toBe(false);
    expect(vencida.bloqueios[0].motivo).toMatch(/venceu/i);
  });

  it('exceção sem dono, motivo ou prazo é inválida', () => {
    const v = auditoria([['nodemailer', 'high']]);
    for (const ruim of [{ pacote: 'nodemailer', motivo: 'x', dono: '', expira: '2027-01-31' },
      { pacote: 'nodemailer', motivo: '', dono: 'a', expira: '2027-01-31' },
      { pacote: 'nodemailer', motivo: 'x', dono: 'a' }]) {
      expect(avaliarAuditoria(v, [ruim], '2026-10-06').ok).toBe(false);
    }
  });

  it('exceção que não corresponde a nada (pacote já corrigido) vira aviso para remover', () => {
    const r = avaliarAuditoria(auditoria([]), [excecao('xlsx')], '2026-10-06');
    expect(r.ok).toBe(true);
    expect(r.avisos.join(' ')).toMatch(/xlsx/);
  });
});

describe('varredura de segredos', () => {
  const achar = (conteudo, arquivo = 'server/x.js', permissoes = []) => procurarSegredos([{ arquivo, conteudo }], permissoes);

  it('acha chave privada, token de provedor e senha padrão', () => {
    expect(achar('-----BEGIN RSA PRIVATE KEY-----\nabc').map((a) => a.tipo)).toContain('chave privada');
    expect(achar('const k = "AKIAABCDEFGHIJKLMNOP"').map((a) => a.tipo)).toContain('chave AWS');
    expect(achar('token = ghp_abcdefghijklmnopqrstuvwxyz0123456789').map((a) => a.tipo)).toContain('token do GitHub');
    expect(achar("const senha = 'Mudar123';").map((a) => a.tipo)).toContain('senha padrão Mudar123');
  });

  it('acha hash bcrypt e URL de banco com senha em host que não é local', () => {
    const hash = '$2b$10$' + 'a'.repeat(53);
    expect(achar(`"password_hash": "${hash}"`).map((a) => a.tipo)).toContain('hash bcrypt');
    expect(achar('DATABASE_URL=postgres://app:SenhaReal9@db.prod.exemplo.br:5432/prpg').map((a) => a.tipo)).toContain('URL de banco com senha');
    expect(achar('DATABASE_URL=postgres://prpg:prpg@localhost:5433/prpg')).toEqual([]);
  });

  it('arquivo na lista de permissões (com motivo) não é acusado; o resto continua', () => {
    const permissoes = [{ caminho: 'server/data/users.json', tipo: 'hash bcrypt', motivo: 'seed de dev' }];
    const hash = '$2b$10$' + 'b'.repeat(53);
    expect(achar(`"h": "${hash}"`, 'server/data/users.json', permissoes)).toEqual([]);
    expect(achar(`"h": "${hash}"`, 'server/outro.json', permissoes).length).toBe(1);
  });

  it('nunca devolve o valor do segredo, só arquivo, linha e tipo', () => {
    const [a] = achar('linha 1\nconst k = "AKIAABCDEFGHIJKLMNOP"');
    expect(a).toEqual({ arquivo: 'server/x.js', linha: 2, tipo: 'chave AWS' });
  });
});
