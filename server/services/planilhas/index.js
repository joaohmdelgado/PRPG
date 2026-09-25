// Fase O.3: os importadores das quatro planilhas, na ordem em que devem rodar
// (Contatos → Expedientes → Câmara → PNPD): contatos criam as pessoas que os
// outros encontram; expedientes citam processos que a Câmara cadastra (a
// ligação se completa ao fim de cada importação — ver religarProcessos); o
// PNPD cita processos da Câmara.
import contatos from './contatosImporter.js';
import expedientes from './expedientesImporter.js';
import camara from './camaraImporter.js';
import pnpd from './pnpdImporter.js';

export const IMPORTADORES = { contatos, expedientes, camara, pnpd };
export const ORDEM = ['contatos', 'expedientes', 'camara', 'pnpd'];

// Nome do arquivo de cada planilha como circula hoje (usado por `todas <pasta>`).
export const ARQUIVOS_PADRAO = {
  contatos: 'Contatos - Coordenações de PG.xlsx',
  expedientes: 'OFÍCIOS_EDITAIS_PORTARIAS_PRPG.xlsx',
  camara: 'Processos - Câmara de Pós Graduação.xlsx',
  pnpd: 'PNPD Voluntário.xlsx',
};

export const getImportadorPlanilha = (fonte) => IMPORTADORES[fonte] || null;
