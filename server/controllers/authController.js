import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { usersRepo } from '../db/repositories.js';
import { query } from '../db/pool.js';

export const login = async (req, res) => {
  const { username, password } = req.body || {};
  const email = username; // username é o e-mail na nossa modelagem

  try {
    const user = await usersRepo.findByEmail(email);

    if (user && (await bcrypt.compare(password || '', user.password_hash))) {
      // Gestor de Programa: anexa o programa ao token e à resposta para que o
      // painel possa escopar tudo automaticamente.
      let gestorPrograma = null;
      if (user.programaId) {
        const { rows } = await query(
          'SELECT id, nome, sigla, slug FROM programas WHERE id = $1',
          [user.programaId]
        );
        if (rows[0]) gestorPrograma = rows[0];
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, roles: user.roles, programaId: user.programaId || null },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      res.json({
        token,
        username: user.email,
        roles: user.roles,
        nome: user.perfil_geral?.nome || user.email,
        programaId: user.programaId || null,
        gestorPrograma,
      });
    } else {
      res.status(401).json({ message: 'E-mail ou senha inválidos' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor durante login' });
  }
};
