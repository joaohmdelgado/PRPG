import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
