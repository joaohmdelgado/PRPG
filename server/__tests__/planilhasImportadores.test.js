import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import os from 'os';
import path from 'path';
import request from 'supertest';
import XLSX from 'xlsx';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { resetDb, seedAdmin, loginAdmin } from './helpers.js';
import { executarImportacao, simularSequencia, corDaCelula } from '../services/planilhas/nucleo.js';
import { lerPeriodo, lerDataBr } from '../services/planilhas/cadastro.js';
import { garantirEstruturaPrpg } from '../db/estruturaPrpg.js';
import { lerTelefones, emailDaPessoa, lerNomePessoa } from '../services/planilhas/contatosImporter.js';
import { lerRelatores } from '../services/planilhas/camaraImporter.js';
import contatos from '../services/planilhas/contatosImporter.js';
import expedientes from '../services/planilhas/expedientesImporter.js';
import camara from '../services/planilhas/camaraImporter.js';
import pnpd from '../services/planilhas/pnpdImporter.js';

// Fase O.3: os quatro importadores, com planilhas sintéticas no formato das
// reais (nomes de colunas, sujeiras e casos-limite de requisitos-*.md) — sem
// nenhum dado pessoal real.

process.env.IMPORTACOES_DIR = path.join(os.tmpdir(), 'prpg-test-importacoes');

let adminToken;
beforeEach(async () => {
  await resetDb();
  await seedAdmin();
  adminToken = await loginAdmin();
  await pool.query(`INSERT INTO programas (id, nome, sigla) VALUES
    ('p-adm', 'Administração e Desenvolvimento', 'S/SIGLA'),
    ('p-bio', 'Biotecnologia', 'RENORBIO'),
    ('p-sol', 'Ciência do Solo', 'S/SIGLA')`);
  await pool.query(`INSERT INTO modalidades (id, programa_id, tipo, nota_capes) VALUES ('m-adm', 'p-adm', 'MESTRADO', NULL), ('m-sol', 'p-sol', 'MESTRADO', NULL)`);
});
afterAll(async () => { await pool.end(); });

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const xlsx = (abas) => {
  const wb = XLSX.utils.book_new();
  for (const [nome, linhas] of Object.entries(abas)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), nome);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
const importar = (importador, buffer, simulacao = false) => executarImportacao({ importador, buffer, simulacao, guardar: false });
const pendencias = async (fonte) => (await pool.query('SELECT * FROM importacao_pendencias WHERE fonte = $1 ORDER BY tipo, chave', [fonte])).rows;

// CPF válido (DV calculado) a partir de 9 dígitos.
const cpf = (base) => {
  const dv = (s) => { let soma = 0; let peso = s.length + 1; for (const d of s) soma += Number(d) * peso--; const r = soma % 11; return r < 2 ? 0 : 11 - r; };
  const d1 = dv(base); const d2 = dv(base + d1);
  return `${base}${d1}${d2}`;
};

describe('leitura de campos escritos à mão', () => {
  it('datas: ordinal, barra dupla, ano de 2 dígitos, sem ano e dia inexistente', () => {
    expect(lerDataBr('1º/10/2025')).toEqual({ data: '2025-10-01', ajustada: false });
    expect(lerDataBr('02/02//2024')).toEqual({ data: '2024-02-02', ajustada: false });
    expect(lerDataBr('23/02/26')).toEqual({ data: '2026-02-23', ajustada: false });
    expect(lerDataBr('06/01', 2025)).toEqual({ data: '2025-01-06', ajustada: false });
    expect(lerDataBr('31/04/2024')).toEqual({ data: '2024-04-30', ajustada: true });
    expect(lerDataBr('A Definir')).toBeNull();
    expect(lerDataBr('--')).toBeNull();
  });

  it('período do PNPD: as cinco gramáticas, e fim em aberto sem adivinhar', () => {
    expect(lerPeriodo('05/02/2019 a 05/07/2019')).toMatchObject({ inicio: '2019-02-05', fim: '2019-07-05', completo: true });
    expect(lerPeriodo('maio de 2015 a dezembro de 2018')).toMatchObject({ inicio: '2015-05-01', fim: '2018-12-31', inicioAprox: true, fimAprox: true });
    expect(lerPeriodo('11/2021 A 11/2022')).toMatchObject({ inicio: '2021-11-01', fim: '2022-11-30' });
    expect(lerPeriodo('10/03/25 a 30/06/25')).toMatchObject({ inicio: '2025-03-10', fim: '2025-06-30' });
    expect(lerPeriodo('Nov/2025 a Out/2027')).toMatchObject({ inicio: '2025-11-01', fim: '2027-10-31' });
    expect(lerPeriodo('ABRIL/2025 a MARÇO/2028')).toMatchObject({ inicio: '2025-04-01', fim: '2028-03-31' });
    expect(lerPeriodo('10 DE NOVEMBRO DE 2025 a 09 DE NOVEMBRO DE 2026')).toMatchObject({ inicio: '2025-11-10', fim: '2026-11-09', inicioAprox: false });
    expect(lerPeriodo('01/10/2019 até 31/09/2024')).toMatchObject({ fim: '2024-09-30', ajustada: true });
    expect(lerPeriodo('07/02/2025 a ')).toMatchObject({ inicio: '2025-02-07', fim: null, completo: false });
    expect(lerPeriodo('Junho a Dezembro de 2021')).toMatchObject({ inicio: null, fim: '2021-12-31', completo: false });
    expect(lerPeriodo('')).toMatchObject({ inicio: null, fim: null, completo: false });
  });

  it('telefones: vários por célula, tipo no texto, sem DDD presumido', () => {
    const t = lerTelefones('(81) 33206079 (fixo/whatsapp); 98827-0595');
    expect(t[0]).toMatchObject({ digitos: '8133206079', tipos: ['TELEFONE', 'WHATSAPP'], semDdd: false });
    expect(t[1]).toMatchObject({ digitos: '988270595', tipos: ['CELULAR'], semDdd: true });
    expect(lerTelefones('81 988079584  81 33206317').map((x) => x.digitos)).toEqual(['81988079584', '8133206317']);
    expect(lerTelefones('3320.6460 / 99611.6668').every((x) => x.semDdd)).toBe(true);
  });

  it('e-mail da pessoa: palavras e iniciais do nome, na ordem', () => {
    expect(emailDaPessoa('renataoliveira@ufrpe.br', 'Brigitte Renata Bezerra de Oliveira')).toBe(true);
    expect(emailDaPessoa('pjduarteneto@gmail.com', 'Paulo José Duarte Neto')).toBe(true);
    expect(emailDaPessoa('marcos.sobral@ufrpe.br', 'Brigitte Renata Bezerra de Oliveira')).toBe(false);
    expect(lerNomePessoa('Fulano de Tal (Pro tempore)\n')).toMatchObject({ nome: 'Fulano de Tal', carater: 'PRO_TEMPORE' });
  });

  it('relatores na Obs.: "Novo Relator", texto depois do nome, título', () => {
    expect(lerRelatores('Relatora: Ana Maria Souza - RETIRADO DE PAUTA APÓS DISCUSSÃO')).toEqual([{ nome: 'Ana Maria Souza', novo: false }]);
    expect(lerRelatores('Novo Relator: João Silva, cobrei devolução em 05/05')).toEqual([{ nome: 'João Silva', novo: true }]);
    expect(lerRelatores('Relator: Pedro Alves Lima O referido processo está no GT')).toEqual([{ nome: 'Pedro Alves Lima', novo: false }]);
    expect(lerRelatores('Relatora: Professora Maria Clara Dias.')).toEqual([{ nome: 'Maria Clara Dias', novo: false }]);
  });

  it('cor de fundo da célula (situação da Câmara)', () => {
    const ws = { A1: { v: 'x', s: { patternType: 'solid', fgColor: { rgb: 'FFB6D7A8' } } }, A2: { v: 'y' } };
    expect(corDaCelula(ws, 0, 0)).toBe('B6D7A8');
    expect(corDaCelula(ws, 1, 0)).toBeNull();
  });
});

const CAB_CONTATOS = ['PROGRAMA', 'SIGLA', 'NOTA CAPES', 'COORDENADOR(A)', 'COORD TEL', 'VICE-COORDENADOR(A)', 'VICE TEL', 'E-MAIL', 'SECRETÁRIO(A)', 'EMAIL', 'TELEFONE', 'observações'];
const planilhaContatos = () => xlsx({ Base: [
  CAB_CONTATOS,
  ['Programa de Pós-Graduação em Administração e Desenvolvimento ', 'PPAD', '4', 'Fulana Maria de Souza (Pro tempore)', '3320.1111 / 99999.1111',
    'Beltrano Alves', '81 988887777', 'fulanasouza@ufrpe.br; beltrano.alves@ufrpe.br  coordenacao.ppad@ufrpe.br', 'Ciclano Dias',
    'ciclano.dias@ufrpe.br sec.ppad@ufrpe.br', '(81) 33201234 (fixo/whatsapp)', null],
  ['Programa de Pós-Graduação em Ciência do Solo', 'PPGCS', 'A', 'Sicrano Lopes', null, null, null, 'sicrano@gmail.com', null, null, null, null],
  ['Programa de Pós-Graduação em Letras (UFAPE)', 'PROFLETRAS', '4', 'Outra Pessoa', null, null, null, null, null, null, null, null],
] });

describe('importador de contatos (G.4)', () => {
  it('importa programa por nome, preenche sigla, separa e classifica contatos, e marca o que depende de decisão', async () => {
    const r = await importar(contatos, planilhaContatos());
    expect(r.resumo).toMatchObject({ criado: 2, ignorado: 1 });

    const { rows: progs } = await pool.query("SELECT id, sigla FROM programas WHERE id IN ('p-adm','p-sol') ORDER BY id");
    expect(progs.map((p) => p.sigla)).toEqual(['PPAD', 'PPGCS']);
    const { rows: nota } = await pool.query("SELECT nota_capes FROM modalidades WHERE id = 'm-sol'");
    expect(nota[0].nota_capes).toBe('A'); // D-G3: como veio

    const { rows: vinc } = await pool.query(`SELECT v.papel, v.carater, p.nome FROM vinculos v JOIN pessoas p ON p.id = v.pessoa_id
      WHERE v.programa_id = 'p-adm' ORDER BY v.papel`);
    expect(vinc).toEqual([
      { papel: 'COORDENADOR', carater: 'PRO_TEMPORE', nome: 'Fulana Maria de Souza' },
      { papel: 'SECRETARIO', carater: 'EFETIVO', nome: 'Ciclano Dias' },
      { papel: 'VICE_COORDENADOR', carater: 'EFETIVO', nome: 'Beltrano Alves' },
    ]);

    const { rows: cont } = await pool.query(`SELECT c.entidade, c.tipo, c.valor, c.rotulo, c.publico FROM contatos c ORDER BY c.entidade, c.tipo, c.valor`);
    const programa = cont.filter((c) => c.entidade === 'programa').map((c) => `${c.tipo}:${c.valor}:${c.rotulo}`);
    expect(programa).toEqual(expect.arrayContaining([
      'EMAIL:coordenacao.ppad@ufrpe.br:coordenacao', 'EMAIL:sec.ppad@ufrpe.br:secretaria',
      'TELEFONE:8133201234:secretaria', 'WHATSAPP:8133201234:secretaria',
    ]));
    expect(cont.find((c) => c.valor === 'sicrano@gmail.com')).toMatchObject({ entidade: 'pessoa', rotulo: 'pessoal' });
    expect(cont.every((c) => c.publico === false)).toBe(true); // D-G1

    const tipos = (await pendencias('contatos')).map((p) => p.tipo);
    expect(tipos).toEqual(expect.arrayContaining(['PROGRAMA_SEM_CORRESPONDENCIA', 'PAPEL_A_CONFIRMAR', 'NOTA_CAPES_A_CONFIRMAR', 'TELEFONE_SEM_DDD', 'CONTATOS_A_CONFERIR']));
    const ufape = (await pendencias('contatos')).find((p) => p.tipo === 'PROGRAMA_SEM_CORRESPONDENCIA');
    expect(ufape.mensagem).toContain('D-G5');
    // Nenhum programa criado sozinho.
    expect((await pool.query('SELECT count(*)::int AS n FROM programas')).rows[0].n).toBe(3);
  });

  it('reimportar não duplica; responder o de-para do programa faz a linha guardada entrar', async () => {
    await importar(contatos, planilhaContatos());
    const r2 = await importar(contatos, planilhaContatos());
    expect(r2.resumo).toMatchObject({ criado: 0, inalterado: 2, ignorado: 1 });
    expect((await pool.query('SELECT count(*)::int AS n FROM vinculos')).rows[0].n).toBe(4);

    const res = await asAdmin(request(app).post('/api/importacoes/pendencias/lote'))
      .send({ fonte: 'contatos', tipo: 'PROGRAMA_SEM_CORRESPONDENCIA', valorOriginal: 'PROFLETRAS — Programa de Pós-Graduação em Letras (UFAPE)', acao: 'aplicar', destino: 'p-bio' });
    expect(res.status).toBe(200);
    const r3 = await importar(contatos, planilhaContatos());
    expect(r3.resumo.criado).toBe(1);
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM vinculos WHERE programa_id = 'p-bio'`);
    expect(rows[0].n).toBe(1);
  });

  it('D-G2 respondido em lote: todos os vices viram substituto eventual', async () => {
    await importar(contatos, planilhaContatos());
    const res = await asAdmin(request(app).post('/api/importacoes/pendencias/lote'))
      .send({ fonte: 'contatos', tipo: 'PAPEL_A_CONFIRMAR', valorOriginal: 'VICE-COORDENADOR(A)', acao: 'aplicar', destino: 'SUBSTITUTO_EVENTUAL' });
    expect(res.body.alterados).toBe(1);
    const { rows } = await pool.query("SELECT papel FROM vinculos WHERE papel LIKE '%VICE%' OR papel LIKE 'SUBSTITUTO%'");
    expect(rows.map((r) => r.papel)).toEqual(['SUBSTITUTO_EVENTUAL']);
  });

  it('pessoa diferente já no mesmo papel: pendência, sem encerrar o vínculo do cadastro', async () => {
    await pool.query("INSERT INTO pessoas (id, nome) VALUES ('pe-atual', 'Coordenador Atual')");
    await pool.query("INSERT INTO vinculos (id, programa_id, pessoa_id, papel, ativo) VALUES ('v-atual', 'p-adm', 'pe-atual', 'COORDENADOR', TRUE)");
    await importar(contatos, planilhaContatos());
    const { rows } = await pool.query("SELECT id, ativo FROM vinculos WHERE programa_id = 'p-adm' AND papel = 'COORDENADOR'");
    expect(rows).toEqual([{ id: 'v-atual', ativo: true }]);
    expect((await pendencias('contatos')).some((p) => p.tipo === 'VINCULO_DIVERGENTE' && p.entidade_id === 'v-atual')).toBe(true);
  });
});

const CAB_OFICIOS = [' ', 'Data', 'Usuário', 'Assunto/Detalhes', 'Destinatário', 'Observações'];
const planilhaExpedientes = () => xlsx({
  '2026 ofícios': [
    CAB_OFICIOS,
    ['1', '05/01/2026', 'Mari', 'Horário especial', 'Reitoria', null],
    ['2', '1º/02/2026', 'Mari ', 'Solicita publicação da Portaria nº 1/2026', 'PROTOCOLO', 'juntado ao processo 23082.000111/2026-11'],
    ['3', 'A Definir', 'CPPG', 'Assunto sem data', 'PROTOCOLO', 'CANCELADO'],
    ['4', null, null, null, null, null],
    ['5', '10/02/2026', 'Laura', 'Outro ofício', 'Progepe', null],
    ['6', null, null, null, null, null],
    ['7', null, null, null, null, null],
  ],
  '2026 - Portarias': [
    [' ', 'Data', 'Usuário', 'Assunto'],
    ['1', '23/02/26', 'Laura', 'Designa comissão'],
    ['2', '24/02/26', 'Laura', 'Tornar sem efeito a Portaria 1/2026'],
  ],
  'EDITAIS PRINT': [['Nº Edital', 'Data', 'Usuário', 'Assunto/Detalhes'], ['1', '07/02/2024', null, 'Missões']],
  'Aba estranha': [['x'], ['1']],
});

describe('importador de expedientes (E.5)', () => {
  it('números como estão; grade depois do último não entra; buraco vira pendência D-E3; datas, setores e referências', async () => {
    const r = await importar(expedientes, planilhaExpedientes());
    expect(r.resumo.criado).toBe(6);
    expect(r.avisos.join(' ')).toContain('2 número(s) pré-numerado(s) depois do último usado (5)');
    expect(r.avisos.join(' ')).toContain('Aba "Aba estranha" fora do mapa');
    expect(r.avisos.join(' ')).toContain('Série EDITAL_PRINT não cadastrada');

    const { rows } = await pool.query("SELECT sequencial, situacao, data, assunto, destinatario_unidade_id, destinatario_texto, obs_original FROM atos WHERE serie_id = 'OFICIO' ORDER BY sequencial");
    expect(rows.map((a) => a.sequencial)).toEqual([1, 2, 3, 5]);
    expect(rows[0]).toMatchObject({ situacao: 'EMITIDO', data: '2026-01-05', destinatario_unidade_id: 'reitoria' });
    expect(rows[1]).toMatchObject({ data: '2026-02-01', destinatario_unidade_id: null, destinatario_texto: 'PROTOCOLO' });
    expect(rows[2]).toMatchObject({ situacao: 'CANCELADO', data: null });
    expect(rows[3].destinatario_unidade_id).toBe('progepe');
    expect(rows[1].obs_original).toContain('aba "2026 ofícios", linha 3');

    // O próximo número do sistema continua a sequência real (não 8).
    const { rows: prox } = await pool.query("SELECT proximo_sequencial('OFICIO', 2026) AS n");
    expect(prox[0].n).toBe(6);

    const { rows: refs } = await pool.query(`SELECT r.tipo, a.sequencial AS de, s.sequencial AS para, a.serie_id FROM ato_referencias r
      JOIN atos a ON a.id = r.ato_id JOIN atos s ON s.id = r.ato_ref_id ORDER BY r.tipo`);
    expect(refs).toEqual([
      { tipo: 'PUBLICA', de: 2, para: 1, serie_id: 'OFICIO' },
      { tipo: 'TORNA_SEM_EFEITO', de: 2, para: 1, serie_id: 'PORTARIA_PRPG' },
    ]);

    const p = await pendencias('expedientes');
    const porTipo = (t) => p.filter((x) => x.tipo === t);
    expect(porTipo('RESERVAS_EM_BRANCO')[0].sugestao).toEqual({ serieId: 'OFICIO', ano: 2026, numeros: [4] });
    expect(porTipo('DATA_INVALIDA')[0].valor_original).toBe('A Definir');
    const mari = porTipo('USUARIO_SEM_PESSOA').find((x) => x.valor_original === 'Mari');
    expect(mari.sugestao.ids).toHaveLength(2); // "Mari" e "Mari " são a mesma grafia
    expect(porTipo('SETOR_SEM_UNIDADE').map((x) => x.valor_original)).toEqual(['CPPG']);
    expect(porTipo('DESTINATARIO_SEM_UNIDADE').map((x) => x.valor_original)).toEqual(['PROTOCOLO']);
  });

  it('número já usado no sistema com outro assunto é conflito, sem sobrescrever; buraco vira cancelado se a revisão mandar', async () => {
    await pool.query(`INSERT INTO atos (id, serie_id, ano, sequencial, situacao, assunto) VALUES ('a-sis', 'OFICIO', 2026, 5, 'EMITIDO', 'Feito no sistema')`);
    const r = await importar(expedientes, planilhaExpedientes());
    expect(r.resumo.conflito).toBe(1);
    const { rows } = await pool.query("SELECT assunto FROM atos WHERE id = 'a-sis'");
    expect(rows[0].assunto).toBe('Feito no sistema');

    const res = await asAdmin(request(app).post('/api/importacoes/pendencias/lote'))
      .send({ fonte: 'expedientes', tipo: 'RESERVAS_EM_BRANCO', valorOriginal: 'OFICIO 2026', acao: 'aplicar', destino: 'sim' });
    expect(res.body.alterados).toBe(1);
    const { rows: c } = await pool.query("SELECT situacao, situacao_motivo FROM atos WHERE serie_id = 'OFICIO' AND sequencial = 4");
    expect(c[0]).toEqual({ situacao: 'CANCELADO', situacao_motivo: 'reservado e não utilizado (planilha)' });
  });

  it('"Secretaria" é ambígua (Câmara × Administrativa): nunca casa sozinha, vira pendência e a resposta vale na próxima importação', async () => {
    await garantirEstruturaPrpg(); // prpg-secretaria tem sigla "Secretaria"
    const planilha = (linhas) => xlsx({ '2026 ofícios': [CAB_OFICIOS, ...linhas] });
    await importar(expedientes, planilha([['1', '05/01/2026', 'Secretaria', 'Encaminha processo', 'Secretaria', null]]));
    const { rows } = await pool.query("SELECT unidade_origem_id, destinatario_unidade_id FROM atos WHERE serie_id = 'OFICIO'");
    expect(rows).toEqual([{ unidade_origem_id: null, destinatario_unidade_id: null }]);
    const p = (await pendencias('expedientes')).filter((x) => x.valor_original === 'Secretaria');
    expect(p.map((x) => x.tipo)).toEqual(['DESTINATARIO_SEM_UNIDADE', 'SETOR_SEM_UNIDADE']);
    expect(p[0].mensagem).toContain('Grafia ambígua');

    const res = await asAdmin(request(app).post('/api/importacoes/pendencias/lote'))
      .send({ fonte: 'expedientes', tipo: 'SETOR_SEM_UNIDADE', valorOriginal: 'Secretaria', acao: 'aplicar', destino: 'prpg-secretaria-camara' });
    expect(res.body.alterados).toBe(1);
    await importar(expedientes, planilha([
      ['1', '05/01/2026', 'Secretaria', 'Encaminha processo', 'Secretaria', null],
      ['2', '06/01/2026', 'Secretaria', 'Outro', null, null],
    ]));
    const { rows: novo } = await pool.query("SELECT unidade_origem_id FROM atos WHERE serie_id = 'OFICIO' AND sequencial = 2");
    expect(novo[0].unidade_origem_id).toBe('prpg-secretaria-camara');
  });

  it('destinatário respondido na revisão liga os atos e vira apelido da unidade', async () => {
    await importar(expedientes, planilhaExpedientes());
    const res = await asAdmin(request(app).post('/api/importacoes/pendencias/lote'))
      .send({ fonte: 'expedientes', tipo: 'DESTINATARIO_SEM_UNIDADE', valorOriginal: 'PROTOCOLO', acao: 'aplicar', destino: 'arquivo' });
    expect(res.body.alterados).toBe(2);
    const { rows } = await pool.query("SELECT aliases FROM unidades WHERE id = 'arquivo'");
    expect(rows[0].aliases).toContain('PROTOCOLO');
  });
});

const tituloReuniao = (d) => [`Prováveis processos para reunião da Câmara de Pós-Graduação em ${d}      `];
const CAB_CAMARA = ['Número de processo ', 'Responsável ', 'Assunto', 'Destino', 'Obs.'];
const planilhaCamara = () => xlsx({
  'Página20': [tituloReuniao('09/07/2026'), CAB_CAMARA,
    ['23082.000111/2026-11', 'Secretaria', 'Pedido de credenciamento', 'Recebido na SEG em 01/07/2026', 'Relatora: Maria Clara Dias'],
    ['23082.000222/2026-22 (Vai para o CEPE)', 'Gabriel Qualquer', 'Outro assunto', null, null]],
  'Página21': [tituloReuniao('18/06/2026'), CAB_CAMARA,
    ['23082.000111/2026-11', 'Secretaria', 'Pedido de credenciamento', 'Enviado ao PPG em 10/06/2026', 'Relator: Pedro Alves Lima']],
  'Relatores': [['Programa', 'Sigla', 'Coordenador', 'Contatos']],
});

describe('importador da Câmara (B.8)', () => {
  it('um processo por NUP, uma pauta e um evento por aparição, situação "a classificar" pela cor (D-B1)', async () => {
    await importar(expedientes, planilhaExpedientes()); // o ofício 2 cita o processo 111
    const r = await importar(camara, planilhaCamara());
    expect(r.resumo).toMatchObject({ criado: 2, reunioesCriadas: 2, itensDePauta: 3 });

    const { rows: procs } = await pool.query('SELECT numero, status, numero_valido, unidade_responsavel_id, obs_original FROM processos ORDER BY numero');
    expect(procs.map((p) => [p.numero, p.status, p.numero_valido])).toEqual([
      ['23082.000111/2026-11', 'A_CLASSIFICAR', true], ['23082.000222/2026-22', 'A_CLASSIFICAR', true],
    ]);
    expect(procs[0].unidade_responsavel_id).toBe('prpg-secretaria-camara');
    expect(procs[0].obs_original).toContain('Relator: Pedro Alves Lima');

    const { rows: ev } = await pool.query("SELECT data, descricao FROM eventos WHERE entidade = 'processo' ORDER BY data");
    expect(ev.map((e) => e.data)).toEqual(['2026-06-18', '2026-07-09']);
    const { rows: rel } = await pool.query('SELECT relator_nome, ativa FROM camara_relatorias ORDER BY ativa');
    expect(rel).toEqual([{ relator_nome: 'Pedro Alves Lima', ativa: false }, { relator_nome: 'Maria Clara Dias', ativa: true }]);

    // O ofício que citava o NUP passou a apontar para o processo.
    const { rows: ofi } = await pool.query("SELECT p.numero FROM atos a JOIN processos p ON p.id = a.processo_id WHERE a.serie_id = 'OFICIO' AND a.sequencial = 2");
    expect(ofi[0].numero).toBe('23082.000111/2026-11');

    const tipos = (await pendencias('camara')).map((p) => p.tipo).sort();
    expect(tipos).toEqual(['ABA_NAO_IMPORTADA', 'COR_SEM_LEGENDA', 'COR_SEM_LEGENDA', 'NUP_FORA_DO_PADRAO', 'RESPONSAVEL_SEM_UNIDADE']);
  });

  it('o de-para do importador vence a sigla da estrutura: "Secretaria" é a da Câmara, não a Administrativa', async () => {
    // A estrutura da PRPG (boot do servidor e db:migrate) cria prpg-secretaria
    // com sigla "Secretaria" — que antes ganhava do RESPONSAVEIS do importador.
    await garantirEstruturaPrpg();
    const { rows: u } = await pool.query("SELECT sigla FROM unidades WHERE id = 'prpg-secretaria'");
    expect(u[0].sigla).toBe('Secretaria');
    await importar(camara, planilhaCamara());
    const { rows } = await pool.query("SELECT unidade_responsavel_id FROM processos WHERE numero = '23082.000111/2026-11'");
    expect(rows[0].unidade_responsavel_id).toBe('prpg-secretaria-camara');
  });

  it('reimportar não duplica pauta nem histórico; a cor respondida vale para o processo novo', async () => {
    await importar(camara, planilhaCamara());
    const r2 = await importar(camara, planilhaCamara());
    expect(r2.resumo.criado).toBe(0);
    expect((await pool.query('SELECT count(*)::int AS n FROM eventos')).rows[0].n).toBe(2);
    expect((await pool.query('SELECT count(*)::int AS n FROM camara_pauta_itens')).rows[0].n).toBe(3);

    await pool.query("INSERT INTO importacao_depara (fonte, dominio, valor, destino) VALUES ('camara', 'cor', 'SEM_COR', 'RESOLVIDO')");
    const nova = xlsx({ 'Página30': [tituloReuniao('10/08/2026'), CAB_CAMARA, ['23082.000333/2026-33', 'Secretaria', 'Novo', null, null]] });
    await importar(camara, nova);
    const { rows } = await pool.query("SELECT status FROM processos WHERE numero = '23082.000333/2026-33'");
    expect(rows[0].status).toBe('RESOLVIDO');
  });
});

const CAB_PNPD = ['NOME', 'CPF', ' PERÍODO', 'PROGRAMA', 'ORIENTADOR', 'PROJETO', 'PROCESSO', 'Ativo?'];
const CPF_A = cpf('052529514');
const planilhaPnpd = () => xlsx({ Plan1: [
  CAB_PNPD,
  ['PESSOA UM', CPF_A.replace(/^0/, ''), '05/02/2019 a 05/07/2019', 'Renorbio', 'Supervisor Um e Supervisor Dois', 'Projeto A', '23082.000111/2026-11', 'Sim'],
  ['PESSOA UM', CPF_A, '06/07/2019 a 05/07/2020', 'Biotecnologia', 'Supervisor Um', 'Projeto A2', null, null],
  ['Pessoa Dois', '123.456.789-00', '07/02/2025 a ', 'ECOLOGIA', 'Alguém', 'Projeto B', '701/2024', null],
  ['Pessoa Tres', null, 'maio de 2015 a dezembro de 2018', 'ECOLOGIA', 'Alguém', null, null, null],
] });

describe('importador do PNPD (C.5)', () => {
  it('estágio por linha, CPF normalizado, período interpretado ou pendente, programa por sigla, processo ligado', async () => {
    await pool.query("INSERT INTO processos (id, numero, assunto) VALUES ('proc-111', '23082.000111/2026-11', 'x')");
    await pool.query("INSERT INTO pessoas (id, nome) VALUES ('sup-1', 'Supervisor Um')");
    const r = await importar(pnpd, planilhaPnpd());
    expect(r.resumo.criado).toBe(4);

    const { rows } = await pool.query(`SELECT p.cpf, p.cpf_valido, v.programa_id, v.data_inicio_mandato AS ini, v.data_fim_mandato AS fim,
        v.situacao_manual, pd.supervisor_id, pd.cossupervisor_id, pd.supervisor_original, pd.processo_id, pd.processo_original,
        pd.programa_original, pd.data_inicio_aprox, pd.projeto_titulo
      FROM pos_doutorados pd JOIN vinculos v ON v.id = pd.vinculo_id JOIN pessoas p ON p.id = v.pessoa_id ORDER BY v.data_inicio_mandato NULLS LAST, p.nome`);
    const [tres, um, um2, dois] = rows;
    expect(um).toMatchObject({ cpf: CPF_A, cpf_valido: true, programa_id: 'p-bio', ini: '2019-02-05', supervisor_id: 'sup-1', cossupervisor_id: null, processo_id: 'proc-111' });
    expect(um.supervisor_original).toBe('Supervisor Um e Supervisor Dois');
    expect(um2.programa_id).toBe('p-bio');
    expect(dois).toMatchObject({ cpf_valido: false, programa_id: null, programa_original: 'ECOLOGIA', fim: null, situacao_manual: 'EM_ANALISE', processo_original: '701/2024' });
    expect(tres).toMatchObject({ data_inicio_aprox: true, projeto_titulo: '(sem título na planilha)' });
    // Mesma pessoa (mesmo CPF, com e sem o zero à esquerda) nos dois estágios.
    expect((await pool.query("SELECT count(*)::int AS n FROM pessoas WHERE nome = 'PESSOA UM'")).rows[0].n).toBe(1);

    const p = await pendencias('pnpd');
    const tipos = p.map((x) => x.tipo);
    expect(tipos).toEqual(expect.arrayContaining(['CPF_INVALIDO', 'CPF_AUSENTE', 'PERIODO_NAO_INTERPRETADO', 'PROGRAMA_PNPD_SEM_CORRESPONDENCIA', 'RENOVACAO_SUGERIDA']));
    const ecologia = p.find((x) => x.tipo === 'PROGRAMA_PNPD_SEM_CORRESPONDENCIA');
    expect(ecologia.sugestao.ids).toHaveLength(2);

    // Período em aberto não conta como vigente.
    const lista = await asAdmin(request(app).get('/api/pos-doutorado'));
    expect(lista.body.find((x) => x.programaOriginal === 'ECOLOGIA' && !x.dataFim).situacao).toBe('EM_ANALISE');
  });

  it('D-C3 respondido: os estágios de "ECOLOGIA" ganham o programa; renovação confirmada liga os estágios', async () => {
    await importar(pnpd, planilhaPnpd());
    const r1 = await asAdmin(request(app).post('/api/importacoes/pendencias/lote'))
      .send({ fonte: 'pnpd', tipo: 'PROGRAMA_PNPD_SEM_CORRESPONDENCIA', valorOriginal: 'ECOLOGIA', acao: 'aplicar', destino: 'p-sol' });
    expect(r1.body.alterados).toBe(2);
    const reno = (await pendencias('pnpd')).find((x) => x.tipo === 'RENOVACAO_SUGERIDA');
    const r2 = await asAdmin(request(app).post(`/api/importacoes/pendencias/${reno.id}/resolver`)).send({ acao: 'aplicar', destino: 'sim' });
    expect(r2.body.alterados).toBe(1);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM pos_doutorados WHERE renovacao_de_id IS NOT NULL');
    expect(rows[0].n).toBe(1);
  });
});

describe('planilhas pela API (O.3)', () => {
  it('simula pelo upload, lista a execução, e reexecuta o arquivo guardado', async () => {
    const sim = await asAdmin(request(app).post('/api/importacoes/planilhas/pnpd'))
      .field('simulacao', 'true').attach('file', planilhaPnpd(), 'PNPD Voluntário.xlsx');
    expect(sim.status).toBe(200);
    expect(sim.body.resumo.criado).toBe(4);
    expect((await pool.query('SELECT count(*)::int AS n FROM pos_doutorados')).rows[0].n).toBe(0);

    const lista = await asAdmin(request(app).get('/api/importacoes/planilhas'));
    expect(lista.body.map((p) => p.fonte)).toEqual(['contatos', 'expedientes', 'camara', 'pnpd']);
    expect(lista.body[3].ultimaSimulacao.resumo.criado).toBe(4);
    expect(lista.body[3].ultimaImportacao).toBeNull();

    const grava = await asAdmin(request(app).post('/api/importacoes/planilhas/pnpd/reexecutar')).send({ simulacao: false });
    expect(grava.status).toBe(200);
    expect((await pool.query('SELECT count(*)::int AS n FROM pos_doutorados')).rows[0].n).toBe(4);
  });

  it('recusa arquivo que não é .xlsx', async () => {
    const res = await asAdmin(request(app).post('/api/importacoes/planilhas/pnpd')).attach('file', Buffer.from('a,b'), 'x.csv');
    expect(res.status).toBe(400);
  });

  it('a sequência completa numa transação só não grava nada', async () => {
    const r = await simularSequencia([
      { importador: contatos, buffer: planilhaContatos() }, { importador: expedientes, buffer: planilhaExpedientes() },
      { importador: camara, buffer: planilhaCamara() }, { importador: pnpd, buffer: planilhaPnpd() },
    ]);
    expect(r.map((x) => x.fonte)).toEqual(['contatos', 'expedientes', 'camara', 'pnpd']);
    expect(r[2].avisos.join(' ')).toContain('1 ato(s)');
    expect((await pool.query('SELECT count(*)::int AS n FROM atos')).rows[0].n).toBe(0);
    expect((await pool.query('SELECT count(*)::int AS n FROM importacoes')).rows[0].n).toBe(0);
  });
});
