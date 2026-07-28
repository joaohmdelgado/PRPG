// Fase B.5 (G10, PLANO.md): endpoint público de leitura do vocabulário.
import { vocabulariosRepo } from '../db/vocabulariosRepo.js';

export const getVocabularios = async (req, res) => {
  const { dominio, programa } = req.query;
  if (!dominio) return res.status(400).json({ message: 'Informe o domínio.' });
  res.json(await vocabulariosRepo.getByDominio(dominio, programa));
};
