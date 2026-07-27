// Fase A.6 (G2, PLANO.md): lista fechada de entidades que podem ser donas de
// `eventos`/`anexos`/`declaracoes`/`contatos` (polimorfismo deliberado — ver
// arquitetura-dados.md §5.10). Mantida em JS para validar na aplicação antes
// de bater no CHECK do banco (mensagem de erro melhor), e como fonte única
// para o CHECK espelhado em schema.sql.
export const ENTIDADES = [
  'processo', 'pos_doutorado', 'inscricao_proficiencia', 'edital', 'programa',
  'pessoa', 'unidade', 'vinculo', 'ato',
];

export const isEntidadeValida = (entidade) => ENTIDADES.includes(entidade);
