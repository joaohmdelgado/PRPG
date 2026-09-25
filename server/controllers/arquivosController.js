// Biblioteca de mídia (Fase F.5 de docs/revisao-portal-conteudo-2026-09-24.md).
// Antes cada upload virava uma URL solta: sem reuso, sem saber onde um PDF
// era usado, sem como trocá-lo em todos os lugares, e arquivos repetidos em
// disco. Os comprovantes sigilosos (/private-uploads) ficam fora da biblioteca.
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from '../db/pool.js';
import { arquivosRepo, sha256Arquivo } from '../db/anexosRepo.js';
import { contarUsos, listarUsos, substituirReferencias } from '../db/arquivosUsos.js';
import { responderLista, filtrarTexto } from '../utils/listagem.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA_UPLOADS = path.join(__dirname, '../uploads');
const caminhoDe = (url) => path.join(PASTA_UPLOADS, path.basename(url));

const tipoDe = (mime = '') => (mime.startsWith('image/') ? 'imagem' : mime === 'application/pdf' ? 'pdf' : 'outro');

const publico = (a) => !a.sigiloso && String(a.url).startsWith('/uploads/');

const dto = (a, usos) => ({
  id: a.id, url: a.url, nome: a.nome_original, mime: a.mime, tipo: tipoDe(a.mime),
  tamanhoBytes: a.tamanho_bytes != null ? Number(a.tamanho_bytes) : null,
  enviadoEm: a.enviado_em, enviadoPor: a.enviado_por, usos,
});

// Registra um upload público; se já existe arquivo com o mesmo conteúdo
// (SHA-256), descarta a cópia nova e devolve o existente.
export async function registrarUploadPublico(file, enviadoPor) {
  const sha256 = await sha256Arquivo(file.path);
  const existente = await arquivosRepo.findPublicoPorSha(sha256);
  if (existente) {
    const aindaExiste = await fs.access(caminhoDe(existente.url)).then(() => true, () => false);
    if (aindaExiste) {
      await fs.unlink(file.path).catch(() => {});
      return { arquivo: existente, reaproveitado: true };
    }
  }
  const arquivo = await arquivosRepo.create({
    url: `/uploads/${file.filename}`, nomeOriginal: file.originalname, mime: file.mimetype,
    tamanhoBytes: file.size, enviadoPor, sha256,
  });
  return { arquivo, reaproveitado: false };
}

// GET /arquivos?q=&tipo=imagem|pdf&semUso=1&page=&limit=
export const getArquivos = async (req, res) => {
  const q = req.query;
  const { rows } = await query('SELECT * FROM arquivos ORDER BY enviado_em DESC');
  const usos = await contarUsos();
  let itens = rows.filter(publico).map((a) => dto(a, usos.get(a.id) || 0));
  if (q.tipo) itens = itens.filter((a) => a.tipo === q.tipo);
  if (q.semUso === '1') itens = itens.filter((a) => a.usos === 0);
  itens = filtrarTexto(itens, q.q, ['nome', 'url']);
  responderLista(res, itens, q);
};

export const getUsosArquivo = async (req, res) => {
  const a = await arquivosRepo.getById(req.params.id);
  if (!a || !publico(a)) return res.status(404).json({ message: 'Arquivo não encontrado.' });
  res.json(await listarUsos(a));
};

// POST /arquivos/:id/substituir (multipart, campo "file"): troca o arquivo em
// todos os lugares que o usam. O id continua o mesmo; a URL muda (nome novo
// em disco — /uploads tem cache longo, então nunca se sobrescreve um arquivo).
// O arquivo antigo fica em disco: erratas/resultados (eventos) são imutáveis
// e continuam apontando para ele.
export const substituirArquivo = async (req, res) => {
  const a = await arquivosRepo.getById(req.params.id);
  if (!a || !publico(a)) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    return res.status(404).json({ message: 'Arquivo não encontrado.' });
  }
  if (!req.file) return res.status(400).json({ message: 'Envie o arquivo novo.' });
  if (tipoDe(req.file.mimetype) !== tipoDe(a.mime)) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ message: 'O arquivo novo precisa ser do mesmo tipo (imagem por imagem, PDF por PDF).' });
  }

  const urlNova = `/uploads/${req.file.filename}`;
  const sha256 = await sha256Arquivo(req.file.path);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const alteradas = await substituirReferencias(client, a.url, urlNova);
    const { rows } = await client.query(
      `UPDATE arquivos SET url = $1, nome_original = $2, mime = $3, tamanho_bytes = $4, sha256 = $5,
         enviado_em = now(), enviado_por = $6 WHERE id = $7 RETURNING *`,
      [urlNova, req.file.originalname, req.file.mimetype, req.file.size, sha256, req.user?.id || null, a.id]
    );
    await client.query('COMMIT');
    res.json({ arquivo: dto(rows[0], null), referenciasAtualizadas: alteradas, urlAnterior: a.url });
  } catch (e) {
    await client.query('ROLLBACK');
    await fs.unlink(req.file.path).catch(() => {});
    throw e;
  } finally {
    client.release();
  }
};

// Exclui só arquivo sem uso (senão o site ficaria com link quebrado).
export const deleteArquivo = async (req, res) => {
  const a = await arquivosRepo.getById(req.params.id);
  if (!a || !publico(a)) return res.status(404).json({ message: 'Arquivo não encontrado.' });
  const usos = await listarUsos(a);
  if (usos.length > 0) {
    return res.status(409).json({ message: `Arquivo em uso em ${usos.length} lugar(es); troque ou remova as referências antes.`, usos });
  }
  await query('DELETE FROM arquivos WHERE id = $1', [a.id]);
  const { rows } = await query('SELECT 1 FROM arquivos WHERE url = $1 LIMIT 1', [a.url]);
  if (rows.length === 0) await fs.unlink(caminhoDe(a.url)).catch(() => {});
  res.json({ excluido: true });
};
