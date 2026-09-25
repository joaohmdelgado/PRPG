// Fase O: as quatro planilhas que os módulos de gestão substituem, na ordem
// de importação (Contatos → Expedientes → Câmara → PNPD).
export const FONTES_PLANILHA = {
  contatos: { rotulo: 'Contatos', arquivo: 'Contatos - Coordenações de PG.xlsx', modulo: '/admin/contatos' },
  expedientes: { rotulo: 'Expedientes', arquivo: 'OFÍCIOS_EDITAIS_PORTARIAS_PRPG.xlsx', modulo: '/admin/atos' },
  camara: { rotulo: 'Câmara', arquivo: 'Processos - Câmara de Pós Graduação.xlsx', modulo: '/admin/camara' },
  pnpd: { rotulo: 'Pós-doutorado', arquivo: 'PNPD Voluntário.xlsx', modulo: '/admin/pos-doutorado' },
};

// Tela do painel onde o registro afetado por uma pendência é editado.
export const linkEntidade = (entidade, id, sugestao) => {
  if (!entidade || !id) return sugestao?.programaId ? `/admin/programas/editar/${sugestao.programaId}` : null;
  switch (entidade) {
    case 'processo': return `/admin/camara/${id}`;
    case 'ato': return `/admin/atos/${id}`;
    case 'pos_doutorado': return `/admin/pos-doutorado/${id}`;
    case 'programa': return `/admin/programas/editar/${id}`;
    case 'vinculo': return sugestao?.programaId ? `/admin/programas/editar/${sugestao.programaId}` : null;
    case 'pessoa': return '/admin/contatos';
    default: return null;
  }
};
