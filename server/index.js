import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRoutes from './routes/adminRoutes.js';
import { IS_PRODUCTION, CORS_ORIGINS } from './config.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: em produção, libera apenas as origens da allowlist (CORS_ORIGINS).
// Em desenvolvimento, libera qualquer origem para facilitar o trabalho local.
// Requisições sem header Origin (curl, same-origin, apps) são sempre aceitas.
const corsOptions = {
  origin(origin, callback) {
    const allowed = !origin || !IS_PRODUCTION || CORS_ORIGINS.includes(origin);
    // callback(null, false) apenas omite os cabeçalhos CORS (o navegador
    // bloqueia a leitura) — evita responder 500 e poluir o log com stack.
    callback(null, allowed);
  },
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// Servir a pasta de uploads de forma estática
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota base de teste
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', service: 'PRPG UFRPE API', version: '1.0.0' });
});

// Rotas da API e Painel Admin
app.use('/api', adminRoutes);

app.listen(PORT, () => {
  console.log(`[Server] Rodando na porta ${PORT}`);
});
