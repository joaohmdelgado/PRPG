# Filtro de programa na lista administrativa de páginas

## Objetivo

Permitir que a pessoa administradora selecione um programa e veja somente as
páginas a ele vinculadas em `/admin/paginas`.

## Comportamento

- A lista terá um seletor de programa acima dos itens.
- O estado inicial será **Todos os programas**.
- Nesse estado, a lista continuará exibindo todas as páginas, inclusive as
  institucionais sem vínculo com programa.
- Ao selecionar um programa, a lista exibirá apenas itens cujo identificador de
  programa corresponda à seleção.
- O filtro será local: a página continuará carregando as páginas e os programas
  pelas APIs existentes, sem alterações no backend.

## Interface e dados

O componente administrativo reutilizará a fonte de programas já disponível no
cliente e manterá o programa selecionado em estado local. A listagem será
derivada de `pages` e do valor selecionado; criar, editar e excluir páginas não
terão seu comportamento alterado.

## Erros e estados vazios

Se o programa selecionado não possuir páginas vinculadas, a tela exibirá o
estado vazio existente para a lista. Caso os programas não possam ser
carregados, o restante da listagem continuará funcional com a opção padrão.

## Testes

Um teste de interface verificará que a lista mostra todos os itens inicialmente
e, após selecionar um programa, mostra somente as páginas vinculadas a ele.
As verificações existentes de tipos e testes do projeto serão executadas.
