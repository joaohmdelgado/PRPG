import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');

async function migrate() {
  try {
    const rawData = await fs.readFile(path.join(DATA_DIR, 'programas_bkp.json'), 'utf-8');
    const oldProgramas = JSON.parse(rawData);

    const programas = [];
    const modalidades = [];
    const pessoas = [];
    const vinculos = [];

    for (const old of oldProgramas) {
      const progId = crypto.randomUUID();

      // Extract Sigla from name (usually "Name - SIGLA")
      let sigla = '';
      let nome = old.name;
      const parts = old.name.split(' - ');
      if (parts.length > 1) {
        sigla = parts.pop().trim().toUpperCase();
        nome = parts.join(' - ').trim();
      } else {
        const regex = /\(([^)]+)\)/;
        const match = regex.exec(old.name);
        if (match) {
          sigla = match[1].trim().toUpperCase();
          nome = old.name.replace(regex, '').trim();
        } else {
          sigla = 'S/SIGLA';
        }
      }

      // Map Campus
      let campusEnum = 'SEDE';
      if (old.campus === 'Serra Talhada') campusEnum = 'UAST';
      if (old.campus === 'Cabo de Santo Agostinho') campusEnum = 'UACSA';

      // Parse anos if possible
      // Example: "Mestrado: 2003 | Doutorado: 2013"
      const anosMap = {};
      if (old.ano) {
        const anoParts = old.ano.split('|').map(p => p.trim());
        anoParts.forEach(p => {
          const match = p.match(/(Mestrado e Doutorado|Mestrado|Doutorado):\s*(\d{4})/i);
          if (match) {
             if (match[1].toLowerCase() === 'mestrado e doutorado') {
                anosMap['M'] = parseInt(match[2]);
                anosMap['D'] = parseInt(match[2]);
             } else if (match[1].toLowerCase() === 'mestrado') {
                anosMap['M'] = parseInt(match[2]);
             } else if (match[1].toLowerCase() === 'doutorado') {
                anosMap['D'] = parseInt(match[2]);
             }
          }
        });
      }

      // Create Programa
      programas.push({
        id: progId,
        nome: nome,
        sigla: sigla,
        site: old.site || '',
        codigo_capes: old.codigo_capes || '',
        campus: campusEnum,
        em_rede: old.em_rede || false,
        nome_rede: old.nome_rede || '',
        grande_area: old.grande_area || '',
        area_conhecimento: old.areas || '',
        area_avaliacao: old.area_avaliacao || '',
        linhas: old.linhas || [], // Preserving for safety
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      });

      // Create Modalidades
      if (old.level && Array.isArray(old.level)) {
        for (const l of old.level) {
          let tipo = 'M';
          if (l.toLowerCase().includes('doutorado')) tipo = 'D';
          if (l.toLowerCase().includes('profissional') && tipo === 'M') tipo = 'P';

          modalidades.push({
            id: crypto.randomUUID(),
            programa_id: progId,
            tipo: tipo,
            ano_inicio: anosMap[tipo] || null,
            nota_capes: old.notaCapes || ''
          });
        }
      }

      // Create dummy Coordinator just to keep the structure valid if there's an email
      // We will create a Pessoa and a Vinculo
      if (old.email || old.coordenador) {
        const pessoaId = crypto.randomUUID();
        pessoas.push({
          id: pessoaId,
          nome: old.coordenador || 'A Definir',
          cpf: '',
          siape: '',
          email_institucional: '',
          telefones: '',
          endereco: '',
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        });

        vinculos.push({
          id: crypto.randomUUID(),
          programa_id: progId,
          pessoa_id: pessoaId,
          papel: 'COORDENADOR_ATUAL',
          portaria: '',
          data_vencimento: null,
          email_funcao: old.email || '',
          ativo: true,
          criado_em: new Date().toISOString()
        });
      }
    }

    await fs.writeFile(path.join(DATA_DIR, 'programas.json'), JSON.stringify(programas, null, 2));
    await fs.writeFile(path.join(DATA_DIR, 'modalidades.json'), JSON.stringify(modalidades, null, 2));
    await fs.writeFile(path.join(DATA_DIR, 'pessoas.json'), JSON.stringify(pessoas, null, 2));
    await fs.writeFile(path.join(DATA_DIR, 'vinculos.json'), JSON.stringify(vinculos, null, 2));

    console.log('Migração concluída com sucesso!');
    console.log(`Programas: ${programas.length}`);
    console.log(`Modalidades: ${modalidades.length}`);
    console.log(`Pessoas: ${pessoas.length}`);
    console.log(`Vínculos: ${vinculos.length}`);

  } catch (error) {
    console.error('Erro na migração:', error);
  }
}

migrate();
