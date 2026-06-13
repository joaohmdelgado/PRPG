import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { query } from '../db/pool.js';
import { usersRepo, portariasRepo } from '../db/repositories.js';

const intOrNull = (v) => (v === '' || v == null ? null : parseInt(v, 10));

const checkAdmin = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded.roles && (decoded.roles.includes('Administrator') || decoded.roles.includes('Gestor'));
    } catch (e) {
      return false;
    }
  }
  return false;
};

const filterSensitivePessoa = (pessoa, isAdmin) => {
  if (!pessoa) return null;
  if (isAdmin) return pessoa;
  const { cpf, siape, telefones, email_institucional, email_funcao, endereco, ...rest } = pessoa;
  return rest;
};

// Carrega os dados relacionados a programas (todos como arrays simples).
const loadRelated = async () => {
  const [modalidades, vinculos, pessoas, users, portarias] = await Promise.all([
    query('SELECT * FROM modalidades').then((r) => r.rows),
    query('SELECT * FROM vinculos').then((r) => r.rows),
    query('SELECT * FROM pessoas').then((r) => r.rows),
    usersRepo.getAll(),
    portariasRepo.getAll(),
  ]);
  return { modalidades, vinculos, pessoas, users, portarias };
};

// Resolve um vínculo numa pessoa "combinada" (dados + portaria), reaproveitada
// tanto na listagem quanto no detalhe.
const buildCombined = (v, { users, pessoas, portarias }) => {
  const user = users.find((u) => u.id === v.pessoa_id);
  const portariaObj = portarias.find((p) => p.id === v.portaria_id);
  const resolvedPortaria = portariaObj
    ? { portaria_id: v.portaria_id, portaria: portariaObj.title, portaria_download_link: portariaObj.downloadLink }
    : { portaria_id: '', portaria: v.portaria || '', portaria_download_link: '' };

  if (user) {
    return {
      pessoa_id: user.id,
      nome: user.perfil_geral?.nome || user.email,
      cpf: user.perfil_geral?.cpf || '',
      siape: user.perfil_geral?.siape || '',
      email_institucional: user.email,
      telefones: Array.isArray(user.perfil_geral?.telefones)
        ? user.perfil_geral.telefones.join(', ')
        : (user.perfil_geral?.telefones || ''),
      endereco: v.endereco || user.perfil_geral?.endereco || '',
      ...v,
      ...resolvedPortaria,
    };
  }
  const pessoa = pessoas.find((p) => p.id === v.pessoa_id);
  if (pessoa) {
    return { ...pessoa, pessoa_id: pessoa.id, ...v, ...resolvedPortaria };
  }
  return null;
};

export const getProgramas = async (req, res) => {
  try {
    const programas = (await query('SELECT * FROM programas ORDER BY nome')).rows;
    const related = await loadRelated();
    const isAdmin = checkAdmin(req);

    const result = programas.map((prog) => {
      const progModalidades = related.modalidades.filter((m) => m.programa_id === prog.id);
      const progVinculos = related.vinculos.filter((v) => v.programa_id === prog.id && v.ativo);

      let coordenador_atual = null, substituto = null, secretaria = null;
      progVinculos.forEach((v) => {
        const combined = buildCombined(v, related);
        if (!combined) return;
        if (v.papel === 'COORDENADOR_ATUAL') coordenador_atual = filterSensitivePessoa(combined, isAdmin);
        if (v.papel === 'SUBSTITUTO') substituto = filterSensitivePessoa(combined, isAdmin);
        if (v.papel === 'TAE') secretaria = filterSensitivePessoa(combined, isAdmin);
      });

      return { ...prog, modalidades: progModalidades, coordenador_atual, substituto, secretaria };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar programas', error: error.message });
  }
};

export const getProgramaById = async (req, res) => {
  try {
    const prog = (await query('SELECT * FROM programas WHERE id = $1', [req.params.id])).rows[0];
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });

    const related = await loadRelated();
    const isAdmin = checkAdmin(req);

    const progModalidades = related.modalidades.filter((m) => m.programa_id === prog.id);
    const progVinculos = related.vinculos.filter((v) => v.programa_id === prog.id);

    let coordenador_atual = null, substituto = null, secretaria = null;
    const historico_coordenadores = [];

    progVinculos.forEach((v) => {
      const combined = buildCombined(v, related);
      if (!combined) return;
      if (v.ativo) {
        if (v.papel === 'COORDENADOR_ATUAL') coordenador_atual = filterSensitivePessoa(combined, isAdmin);
        if (v.papel === 'SUBSTITUTO') substituto = filterSensitivePessoa(combined, isAdmin);
        if (v.papel === 'TAE') secretaria = filterSensitivePessoa(combined, isAdmin);
      }
      if (v.papel === 'COORDENADOR_ANTERIOR') {
        historico_coordenadores.push(filterSensitivePessoa(combined, isAdmin));
      }
    });

    historico_coordenadores.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

    res.json({ ...prog, modalidades: progModalidades, coordenador_atual, substituto, secretaria, historico_coordenadores });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar programa', error: error.message });
  }
};

// Cria/atualiza/inativa o vínculo de uma pessoa num papel (regra de negócio
// preservada da versão em JSON).
const handlePessoaVinculo = async (payloadData, papel, programa_id) => {
  if (!payloadData || !payloadData.pessoa_id) return;
  const pessoaId = payloadData.pessoa_id;

  const existing = (
    await query('SELECT * FROM vinculos WHERE programa_id = $1 AND papel = $2 AND ativo = TRUE LIMIT 1', [programa_id, papel])
  ).rows[0];

  const props = {
    portaria_id: payloadData.portaria_id || '',
    portaria: payloadData.portaria || '',
    data_vencimento: payloadData.data_vencimento || null,
    email_funcao: payloadData.email_funcao || '',
    endereco: papel === 'TAE' ? (payloadData.endereco || '') : null,
  };

  if (existing && papel === 'COORDENADOR_ATUAL' && existing.pessoa_id !== pessoaId) {
    await query("UPDATE vinculos SET ativo = FALSE, papel = 'COORDENADOR_ANTERIOR' WHERE id = $1", [existing.id]);
    await insertVinculo(programa_id, pessoaId, papel, props);
  } else if (existing) {
    await query(
      `UPDATE vinculos SET pessoa_id=$1, portaria_id=$2, portaria=$3, data_vencimento=$4, email_funcao=$5, endereco=$6 WHERE id=$7`,
      [pessoaId, props.portaria_id, props.portaria, props.data_vencimento, props.email_funcao, props.endereco, existing.id]
    );
  } else {
    await insertVinculo(programa_id, pessoaId, papel, props);
  }
};

const insertVinculo = (programa_id, pessoaId, papel, props) =>
  query(
    `INSERT INTO vinculos (id, programa_id, pessoa_id, papel, portaria_id, portaria, data_vencimento, email_funcao, endereco, ativo, criado_em)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10)`,
    [crypto.randomUUID(), programa_id, pessoaId, papel, props.portaria_id, props.portaria,
     props.data_vencimento, props.email_funcao, props.endereco, new Date().toISOString()]
  );

const replaceModalidades = async (programa_id, modalidades) => {
  if (!Array.isArray(modalidades)) return;
  await query('DELETE FROM modalidades WHERE programa_id = $1', [programa_id]);
  for (const m of modalidades) {
    await query(
      'INSERT INTO modalidades (id, programa_id, tipo, ano_inicio, nota_capes) VALUES ($1,$2,$3,$4,$5)',
      [m.id || crypto.randomUUID(), programa_id, m.tipo, intOrNull(m.ano_inicio), m.nota_capes || '']
    );
  }
};

export const createPrograma = async (req, res) => {
  try {
    const data = req.body || {};
    const progId = crypto.randomUUID();
    const now = new Date().toISOString();

    await query(
      `INSERT INTO programas
        (id,nome,sigla,site,codigo_capes,campus,em_rede,nome_rede,grande_area,
         area_conhecimento,area_avaliacao,linhas,criado_em,atualizado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [progId, data.nome, data.sigla ? data.sigla.toUpperCase() : '', data.site || '',
       data.codigo_capes || '', data.campus || 'SEDE', data.em_rede || false, data.nome_rede || '',
       data.grande_area || '', data.area_conhecimento || '', data.area_avaliacao || '',
       Array.isArray(data.linhas) ? data.linhas : [], now, now]
    );

    await replaceModalidades(progId, data.modalidades);
    await handlePessoaVinculo(data.coordenador_atual, 'COORDENADOR_ATUAL', progId);
    await handlePessoaVinculo(data.substituto, 'SUBSTITUTO', progId);
    await handlePessoaVinculo(data.secretaria, 'TAE', progId);

    res.status(201).json({ message: 'Programa criado com sucesso', id: progId });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar programa', error: error.message });
  }
};

export const updatePrograma = async (req, res) => {
  try {
    const progId = req.params.id;
    const existing = (await query('SELECT * FROM programas WHERE id = $1', [progId])).rows[0];
    if (!existing) return res.status(404).json({ message: 'Programa não encontrado' });

    const data = req.body || {};
    const pick = (val, fallback) => (val !== undefined ? val : fallback);

    await query(
      `UPDATE programas SET nome=$1, sigla=$2, site=$3, codigo_capes=$4, campus=$5, em_rede=$6,
        nome_rede=$7, grande_area=$8, area_conhecimento=$9, area_avaliacao=$10, linhas=$11, atualizado_em=$12
       WHERE id=$13`,
      [
        data.nome || existing.nome,
        data.sigla ? data.sigla.toUpperCase() : existing.sigla,
        pick(data.site, existing.site), pick(data.codigo_capes, existing.codigo_capes),
        data.campus || existing.campus, pick(data.em_rede, existing.em_rede),
        pick(data.nome_rede, existing.nome_rede), pick(data.grande_area, existing.grande_area),
        pick(data.area_conhecimento, existing.area_conhecimento),
        pick(data.area_avaliacao, existing.area_avaliacao),
        Array.isArray(data.linhas) ? data.linhas : existing.linhas,
        new Date().toISOString(), progId,
      ]
    );

    if (data.modalidades !== undefined) await replaceModalidades(progId, data.modalidades);
    await handlePessoaVinculo(data.coordenador_atual, 'COORDENADOR_ATUAL', progId);
    await handlePessoaVinculo(data.substituto, 'SUBSTITUTO', progId);
    await handlePessoaVinculo(data.secretaria, 'TAE', progId);

    res.json({ message: 'Programa atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar programa', error: error.message });
  }
};

export const deletePrograma = async (req, res) => {
  try {
    // Modalidades e vínculos saem em cascata (FK ON DELETE CASCADE).
    const { rowCount } = await query('DELETE FROM programas WHERE id = $1', [req.params.id]);
    if (rowCount > 0) res.json({ message: 'Programa removido com sucesso' });
    else res.status(404).json({ message: 'Programa não encontrado' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover programa', error: error.message });
  }
};
