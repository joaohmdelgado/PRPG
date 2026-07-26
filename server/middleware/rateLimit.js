import rateLimit from 'express-rate-limit';

// Limitadores de taxa por IP. Em ambiente de teste são desativados: a suíte
// dispara muitos logins/requisições sequenciais do mesmo IP e os limites
// causariam falhas espúrias.
const skipInTest = () => process.env.NODE_ENV === 'test';

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
};

// Limite geral, generoso: barra floods sem atrapalhar a navegação normal.
export const apiLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  max: 600,
  message: { message: 'Muitas requisições. Tente novamente em instantes.' },
});

// Login: barra ataques de força bruta de senha por IP.
export const loginLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' },
});

// Uploads (inclui o upload público da proficiência): barra abuso de
// armazenamento por envios em massa.
export const uploadLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { message: 'Muitos envios de arquivo. Aguarde alguns minutos e tente novamente.' },
});
