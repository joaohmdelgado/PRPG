// PRIV-01 (docs/analise-prontidao-producao-2026-09-09.md): até 10/09/2026 os
// comprovantes da inscrição de proficiência (residência e vínculo — documentos
// pessoais) eram gravados em server/uploads, servido publicamente em /uploads.
// O upload novo já vai para server/private-uploads; este serviço move os
// antigos: copia para a pasta privada, troca o endereço na inscrição e em
// `arquivos` (marcado sigiloso) numa transação e só então apaga o público e as
// versões WebP. Sem isso, além de públicos, eles não abrem pelo painel (o
// download autenticado só serve /private-uploads).
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/pool.js';
import { PASTA_UPLOADS, apagarVariantes } from './imagens.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PASTA_PRIVADA = path.join(__dirname, '../private-uploads');
const CAMPOS = ['comprovante_residencia_url', 'comprovante_vinculo_url'];

const existe = (caminho) => fs.access(caminho).then(() => true, () => false);

// Endereços /uploads/<arquivo> ainda usados como comprovante, com as inscrições que os citam.
export const localizarComprovantesPublicos = async () => {
  const { rows } = await pool.query(`
    SELECT url, array_agg(DISTINCT id ORDER BY id) AS inscricoes FROM (
      ${CAMPOS.map((c) => `SELECT id, ${c} AS url FROM inscricoes_proficiencia WHERE ${c} LIKE '/uploads/%'`).join(' UNION ALL ')}
    ) x GROUP BY url ORDER BY url`);
  const achados = [];
  for (const r of rows) {
    const nome = r.url.slice('/uploads/'.length);
    const valido = !!nome && path.basename(nome) === nome;
    achados.push({
      url: r.url, nome, inscricoes: r.inscricoes, valido,
      noDisco: valido && await existe(path.join(PASTA_UPLOADS, nome)),
      jaNaPastaPrivada: valido && await existe(path.join(PASTA_PRIVADA, nome)),
    });
  }
  return achados;
};

// Move um comprovante. Devolve { url, novoUrl, resultado } — resultado:
// 'movido' | 'sem-arquivo' (o endereço muda mesmo assim: o público não pode
// voltar a valer) | 'conflito' (já existe arquivo com o nome na pasta privada).
export const moverComprovante = async (achado) => {
  const { url, nome } = achado;
  const novoUrl = `/private-uploads/${nome}`;
  if (!achado.valido) return { url, novoUrl: null, resultado: 'invalido' };
  const origem = path.join(PASTA_UPLOADS, nome);
  const destino = path.join(PASTA_PRIVADA, nome);
  if (await existe(destino)) return { url, novoUrl, resultado: 'conflito' };

  const temArquivo = await existe(origem);
  if (temArquivo) {
    await fs.mkdir(PASTA_PRIVADA, { recursive: true });
    await fs.copyFile(origem, destino);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of CAMPOS) {
      await client.query(`UPDATE inscricoes_proficiencia SET ${c} = $2 WHERE ${c} = $1`, [url, novoUrl]);
    }
    await client.query('UPDATE arquivos SET url = $2, sigiloso = TRUE WHERE url = $1', [url, novoUrl]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    if (temArquivo) await fs.unlink(destino).catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  if (temArquivo) await fs.unlink(origem);
  await apagarVariantes(nome);
  return { url, novoUrl, resultado: temArquivo ? 'movido' : 'sem-arquivo' };
};
