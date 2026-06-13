import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET;

// Falha rápido: sem um segredo forte, qualquer um poderia forjar tokens JWT.
// Não há fallback inseguro — defina JWT_SECRET no arquivo .env.
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error(
    '[Fatal] JWT_SECRET ausente ou muito curto. Defina uma string longa e aleatória ' +
    'em JWT_SECRET no arquivo .env (mínimo 16 caracteres) antes de iniciar o servidor.'
  );
  process.exit(1);
}
