import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');

// Helpers for reading/writing multiple files
const readJson = async (filename) => {
  try {
    const data = await fs.readFile(path.join(dataDir, filename), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeJson = async (filename, data) => {
  await fs.writeFile(path.join(dataDir, filename), JSON.stringify(data, null, 2));
};

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
  
  // For public users, remove sensitive details
  const { cpf, siape, telefones, email_institucional, email_funcao, endereco, ...rest } = pessoa;
  return rest;
};

export const getProgramas = async (req, res) => {
  try {
    const programas = await readJson('programas.json');
    const modalidades = await readJson('modalidades.json');
    const pessoas = await readJson('pessoas.json');
    const vinculos = await readJson('vinculos.json');
    const users = await readJson('users.json');
    const portarias = await readJson('portarias.json');

    const isAdmin = checkAdmin(req);

    const result = programas.map(prog => {
      // Find modalities
      const progModalidades = modalidades.filter(m => m.programa_id === prog.id);
      
      // Find active links
      const progVinculos = vinculos.filter(v => v.programa_id === prog.id && v.ativo);
      
      let coordenador_atual = null;
      let substituto = null;
      let secretaria = null;

      progVinculos.forEach(v => {
        // Tenta buscar nos usuários do sistema
        const user = users.find(u => u.id === v.pessoa_id);
        const portariaObj = portarias.find(p => p.id === v.portaria_id);
        const resolvedPortaria = portariaObj
          ? { portaria_id: v.portaria_id, portaria: portariaObj.title, portaria_download_link: portariaObj.downloadLink }
          : { portaria_id: '', portaria: v.portaria || '', portaria_download_link: '' };

        if (user) {
          const combined = {
            pessoa_id: user.id,
            nome: user.perfil_geral?.nome || user.email,
            cpf: user.perfil_geral?.cpf || '',
            siape: user.perfil_geral?.siape || '',
            email_institucional: user.email,
            telefones: Array.isArray(user.perfil_geral?.telefones) ? user.perfil_geral.telefones.join(', ') : (user.perfil_geral?.telefones || ''),
            endereco: v.endereco || user.perfil_geral?.endereco || '',
            ...v,
            ...resolvedPortaria
          };
          if (v.papel === 'COORDENADOR_ATUAL') coordenador_atual = filterSensitivePessoa(combined, isAdmin);
          if (v.papel === 'SUBSTITUTO') substituto = filterSensitivePessoa(combined, isAdmin);
          if (v.papel === 'TAE') secretaria = filterSensitivePessoa(combined, isAdmin);
        } else {
          // Fallback para pessoas.json (legado)
          const pessoa = pessoas.find(p => p.id === v.pessoa_id);
          if (pessoa) {
            const combined = { 
              ...pessoa, 
              pessoa_id: pessoa.id, 
              ...v,
              ...resolvedPortaria
            };
            if (v.papel === 'COORDENADOR_ATUAL') coordenador_atual = filterSensitivePessoa(combined, isAdmin);
            if (v.papel === 'SUBSTITUTO') substituto = filterSensitivePessoa(combined, isAdmin);
            if (v.papel === 'TAE') secretaria = filterSensitivePessoa(combined, isAdmin);
          }
        }
      });

      return {
        ...prog,
        modalidades: progModalidades,
        coordenador_atual,
        substituto,
        secretaria
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar programas', error: error.message });
  }
};

export const getProgramaById = async (req, res) => {
  try {
    const programas = await readJson('programas.json');
    const prog = programas.find(p => p.id === req.params.id);
    
    if (!prog) return res.status(404).json({ message: 'Programa não encontrado' });

    const modalidades = await readJson('modalidades.json');
    const pessoas = await readJson('pessoas.json');
    const vinculos = await readJson('vinculos.json');
    const users = await readJson('users.json');
    const portarias = await readJson('portarias.json');

    const progModalidades = modalidades.filter(m => m.programa_id === prog.id);
    const progVinculos = vinculos.filter(v => v.programa_id === prog.id); // All links to show history

    const isAdmin = checkAdmin(req);

    let coordenador_atual = null;
    let substituto = null;
    let secretaria = null;
    let historico_coordenadores = [];

    progVinculos.forEach(v => {
      // Tenta buscar nos usuários do sistema
      const user = users.find(u => u.id === v.pessoa_id);
      const portariaObj = portarias.find(p => p.id === v.portaria_id);
      const resolvedPortaria = portariaObj
        ? { portaria_id: v.portaria_id, portaria: portariaObj.title, portaria_download_link: portariaObj.downloadLink }
        : { portaria_id: '', portaria: v.portaria || '', portaria_download_link: '' };

      if (user) {
        const combined = {
          pessoa_id: user.id,
          nome: user.perfil_geral?.nome || user.email,
          cpf: user.perfil_geral?.cpf || '',
          siape: user.perfil_geral?.siape || '',
          email_institucional: user.email,
          telefones: Array.isArray(user.perfil_geral?.telefones) ? user.perfil_geral.telefones.join(', ') : (user.perfil_geral?.telefones || ''),
          endereco: v.endereco || user.perfil_geral?.endereco || '',
          ...v,
          ...resolvedPortaria
        };
        if (v.ativo) {
          if (v.papel === 'COORDENADOR_ATUAL') coordenador_atual = filterSensitivePessoa(combined, isAdmin);
          if (v.papel === 'SUBSTITUTO') substituto = filterSensitivePessoa(combined, isAdmin);
          if (v.papel === 'TAE') secretaria = filterSensitivePessoa(combined, isAdmin);
        }
        if (v.papel === 'COORDENADOR_ANTERIOR') {
          historico_coordenadores.push(filterSensitivePessoa(combined, isAdmin));
        }
      } else {
        // Fallback para pessoas.json (legado)
        const pessoa = pessoas.find(p => p.id === v.pessoa_id);
        if (pessoa) {
          const combined = { 
            ...pessoa, 
            pessoa_id: pessoa.id, 
            ...v,
            ...resolvedPortaria
          };
          if (v.ativo) {
            if (v.papel === 'COORDENADOR_ATUAL') coordenador_atual = filterSensitivePessoa(combined, isAdmin);
            if (v.papel === 'SUBSTITUTO') substituto = filterSensitivePessoa(combined, isAdmin);
            if (v.papel === 'TAE') secretaria = filterSensitivePessoa(combined, isAdmin);
          }
          if (v.papel === 'COORDENADOR_ANTERIOR') {
            historico_coordenadores.push(filterSensitivePessoa(combined, isAdmin));
          }
        }
      }
    });

    // Sort historico by creation date descending
    historico_coordenadores.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

    res.json({
      ...prog,
      modalidades: progModalidades,
      coordenador_atual,
      substituto,
      secretaria,
      historico_coordenadores
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar programa', error: error.message });
  }
};

const handlePessoaVinculo = (payloadData, papel, programa_id, vinculos) => {
  if (!payloadData) return;

  const pessoaId = payloadData.pessoa_id;
  if (!pessoaId) return;

  // Find existing active vinculo for this papel
  const vIndex = vinculos.findIndex(v => v.programa_id === programa_id && v.papel === papel && v.ativo);
  
  // Prepare vinculo properties
  const vinculoProps = {
    portaria_id: payloadData.portaria_id || '',
    portaria: payloadData.portaria || '', // Keep legacy string if we have one
    data_vencimento: payloadData.data_vencimento || null,
    email_funcao: payloadData.email_funcao || '',
  };
  
  if (papel === 'TAE') {
    vinculoProps.endereco = payloadData.endereco || '';
  }

  // se for coordenador_atual e mudou a pessoa, inativa o antigo!
  if (vIndex !== -1 && papel === 'COORDENADOR_ATUAL' && vinculos[vIndex].pessoa_id !== pessoaId) {
    vinculos[vIndex].ativo = false;
    vinculos[vIndex].papel = 'COORDENADOR_ANTERIOR';
    
    // Create new active vinculo
    vinculos.push({
      id: crypto.randomUUID(),
      programa_id,
      pessoa_id: pessoaId,
      papel,
      ...vinculoProps,
      ativo: true,
      criado_em: new Date().toISOString()
    });
  } else if (vIndex !== -1) {
    // just update
    vinculos[vIndex] = {
      ...vinculos[vIndex],
      pessoa_id: pessoaId,
      ...vinculoProps
    };
  } else {
    // create new
    vinculos.push({
      id: crypto.randomUUID(),
      programa_id,
      pessoa_id: pessoaId,
      papel,
      ...vinculoProps,
      ativo: true,
      criado_em: new Date().toISOString()
    });
  }
};

export const createPrograma = async (req, res) => {
  try {
    const programas = await readJson('programas.json');
    const modalidades = await readJson('modalidades.json');
    const vinculos = await readJson('vinculos.json');

    const data = req.body;
    const progId = crypto.randomUUID();

    const novoPrograma = {
      id: progId,
      nome: data.nome,
      sigla: data.sigla ? data.sigla.toUpperCase() : '',
      site: data.site || '',
      codigo_capes: data.codigo_capes || '',
      campus: data.campus || 'SEDE',
      em_rede: data.em_rede || false,
      nome_rede: data.nome_rede || '',
      grande_area: data.grande_area || '',
      area_conhecimento: data.area_conhecimento || '',
      area_avaliacao: data.area_avaliacao || '',
      linhas: data.linhas || [],
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };

    programas.push(novoPrograma);

    // Modalidades
    if (data.modalidades && Array.isArray(data.modalidades)) {
      data.modalidades.forEach(m => {
        modalidades.push({
          id: crypto.randomUUID(),
          programa_id: progId,
          tipo: m.tipo,
          ano_inicio: m.ano_inicio || null,
          nota_capes: m.nota_capes || ''
        });
      });
    }

    // Vínculos
    handlePessoaVinculo(data.coordenador_atual, 'COORDENADOR_ATUAL', progId, vinculos);
    handlePessoaVinculo(data.substituto, 'SUBSTITUTO', progId, vinculos);
    handlePessoaVinculo(data.secretaria, 'TAE', progId, vinculos);

    await writeJson('programas.json', programas);
    await writeJson('modalidades.json', modalidades);
    await writeJson('vinculos.json', vinculos);

    res.status(201).json({ message: 'Programa criado com sucesso', id: progId });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar programa', error: error.message });
  }
};

export const updatePrograma = async (req, res) => {
  try {
    const programas = await readJson('programas.json');
    const pIndex = programas.findIndex(p => p.id === req.params.id);
    
    if (pIndex === -1) return res.status(404).json({ message: 'Programa não encontrado' });

    const modalidades = await readJson('modalidades.json');
    const vinculos = await readJson('vinculos.json');

    const data = req.body;
    const progId = req.params.id;

    programas[pIndex] = {
      ...programas[pIndex],
      nome: data.nome || programas[pIndex].nome,
      sigla: data.sigla ? data.sigla.toUpperCase() : programas[pIndex].sigla,
      site: data.site !== undefined ? data.site : programas[pIndex].site,
      codigo_capes: data.codigo_capes !== undefined ? data.codigo_capes : programas[pIndex].codigo_capes,
      campus: data.campus || programas[pIndex].campus,
      em_rede: data.em_rede !== undefined ? data.em_rede : programas[pIndex].em_rede,
      nome_rede: data.nome_rede !== undefined ? data.nome_rede : programas[pIndex].nome_rede,
      grande_area: data.grande_area !== undefined ? data.grande_area : programas[pIndex].grande_area,
      area_conhecimento: data.area_conhecimento !== undefined ? data.area_conhecimento : programas[pIndex].area_conhecimento,
      area_avaliacao: data.area_avaliacao !== undefined ? data.area_avaliacao : programas[pIndex].area_avaliacao,
      linhas: data.linhas !== undefined ? data.linhas : programas[pIndex].linhas,
      atualizado_em: new Date().toISOString()
    };

    // Modalidades - Clear old and insert new (simple sync approach)
    if (data.modalidades && Array.isArray(data.modalidades)) {
      const remainingModalidades = modalidades.filter(m => m.programa_id !== progId);
      data.modalidades.forEach(m => {
        remainingModalidades.push({
          id: m.id || crypto.randomUUID(),
          programa_id: progId,
          tipo: m.tipo,
          ano_inicio: m.ano_inicio || null,
          nota_capes: m.nota_capes || ''
        });
      });
      // Replace completely
      modalidades.length = 0;
      modalidades.push(...remainingModalidades);
    }

    // Vínculos
    handlePessoaVinculo(data.coordenador_atual, 'COORDENADOR_ATUAL', progId, vinculos);
    handlePessoaVinculo(data.substituto, 'SUBSTITUTO', progId, vinculos);
    handlePessoaVinculo(data.secretaria, 'TAE', progId, vinculos);

    await writeJson('programas.json', programas);
    await writeJson('modalidades.json', modalidades);
    await writeJson('vinculos.json', vinculos);

    res.json({ message: 'Programa atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar programa', error: error.message });
  }
};

export const deletePrograma = async (req, res) => {
  try {
    const programas = await readJson('programas.json');
    const pIndex = programas.findIndex(p => p.id === req.params.id);
    
    if (pIndex !== -1) {
      programas.splice(pIndex, 1);
      
      // Cascade delete modalidades and vinculos
      const modalidades = await readJson('modalidades.json');
      const filteredModalidades = modalidades.filter(m => m.programa_id !== req.params.id);
      
      const vinculos = await readJson('vinculos.json');
      const filteredVinculos = vinculos.filter(v => v.programa_id !== req.params.id);

      await writeJson('programas.json', programas);
      await writeJson('modalidades.json', filteredModalidades);
      await writeJson('vinculos.json', filteredVinculos);

      res.json({ message: 'Programa removido com sucesso' });
    } else {
      res.status(404).json({ message: 'Programa não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover programa', error: error.message });
  }
};
