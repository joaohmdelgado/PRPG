import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { getSeedAdminCredentials } from './seedAdminPolicy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');

async function seedAdmin() {
  try {
    const { email, password } = getSeedAdminCredentials();
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const adminUser = {
      id: crypto.randomUUID(),
      email,
      password_hash,
      roles: ['Administrator'],
      privacidade: {
        mostrar_email: false,
        mostrar_telefone: false
      },
      perfil_geral: {
        nome: 'Administrador do Sistema',
        cpf: '',
        siape: '',
        foto_url: '',
        telefones: []
      },
      dados_academicos: {
        lattes: '', orcid: '', google_scholar: '', publons: '', linhas_pesquisa: []
      },
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };

    await fs.writeFile(path.join(dataDir, 'users.json'), JSON.stringify([adminUser], null, 2));
    console.log(`Seed: usuário administrador criado para ${email}.`);
  } catch (error) {
    console.error('Erro ao criar admin:', error);
    process.exitCode = 1;
  }
}

seedAdmin();
