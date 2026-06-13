import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');

export const login = async (req, res) => {
  const { username, password } = req.body;
  // Na nossa modelagem, username é o email
  const email = username;

  try {
    const data = await fs.readFile(path.join(dataDir, 'users.json'), 'utf-8');
    const users = JSON.parse(data);
    
    const user = users.find(u => u.email === email);
    
    if (user && await bcrypt.compare(password, user.password_hash)) {
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          roles: user.roles 
        }, 
        process.env.JWT_SECRET || 'fallback_secret', 
        { expiresIn: '30d' }
      );
      
      res.json({ 
        token, 
        username: user.email, 
        roles: user.roles,
        nome: user.perfil_geral?.nome || user.email
      });
    } else {
      res.status(401).json({ message: 'E-mail ou senha inválidos' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor durante login' });
  }
};
