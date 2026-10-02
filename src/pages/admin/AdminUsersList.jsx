import React from 'react';
import ListaAdmin, { CelulaTitulo } from '../../components/admin/ListaAdmin';
import { ORIGEM_TODAS } from '../../hooks/useListaServidor';

// Rótulo do programa: usa a sigla, salvo quando vazia/genérica, aí o nome.
const labelPrograma = (p) => (p.sigla && p.sigla !== 'S/SIGLA' ? p.sigla : p.nome);
const campoFiltro = 'px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none';

// Usuários: busca, papel e programa consultam o servidor (o painel deixou de
// baixar todas as contas — com CPF e perfis — para filtrar no navegador).
const AdminUsersList = () => (
  <ListaAdmin
    titulo="Gerenciar Usuários" rotuloNovo="Novo Usuário" rotaNovo="/admin/users/novo"
    endpoint="/api/users" rotaEditar={(u) => `/admin/users/editar/${u.id}`}
    singular="usuário" plural="usuários" artigo="o" origemPadrao={ORIGEM_TODAS}
    filtroOrigem={false} filtroStatus={false} filtros={['role', 'programa']}
    nomeItem={(u) => u.perfil_geral?.nome || u.email}
    rotuloBusca="Buscar por nome ou e-mail…"
    vazio={{ titulo: 'Nenhum usuário cadastrado.', descricao: 'Use “Novo Usuário” para criar o primeiro.' }}
    filtrosUi={(lista) => (
      <>
        <div>
          <label htmlFor="filtro-papel" className="sr-only">Papel</label>
          <select id="filtro-papel" value={lista.extras.role} onChange={(e) => lista.definir({ role: e.target.value })} className={campoFiltro}>
            <option value="">Todos os papéis</option>
            {(lista.extra.roles || []).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-programa-vinculo" className="sr-only">Programa</label>
          <select id="filtro-programa-vinculo" value={lista.extras.programa} onChange={(e) => lista.definir({ programa: e.target.value })} className={campoFiltro}>
            <option value="">Todos os programas</option>
            {(lista.extra.programas || []).map((p) => (
              <option key={p.id} value={String(p.id)}>{p.sigla && p.sigla !== 'S/SIGLA' ? `${p.sigla} — ${p.nome}` : p.nome}</option>
            ))}
          </select>
        </div>
      </>
    )}
    colunas={[
      {
        chave: 'nome', rotulo: 'Nome / E-mail', ordenar: 'nome',
        render: (u, c) => (
          <div>
            <CelulaTitulo item={{ ...u, status: null, programaId: null }} titulo={u.perfil_geral?.nome || 'Sem Nome'} {...c} />
            <div className="text-sm text-gray-500">{u.email}</div>
          </div>
        ),
      },
      {
        chave: 'papeis', rotulo: 'Papéis (Roles)', ordenar: 'papeis',
        render: (u) => (
          <div className="flex gap-1 flex-wrap">
            {u.roles.map((r) => <span key={r} className="bg-ufrpe-blue/10 text-ufrpe-blue text-xs px-2 py-1 rounded-full font-medium">{r}</span>)}
          </div>
        ),
      },
      {
        chave: 'programas', rotulo: 'Programas',
        render: (u) => (u.programas_vinculo?.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {u.programas_vinculo.map((p) => (
              <span key={p.id} title={p.nome} className="bg-green-50 text-green-800 text-xs px-2 py-1 rounded-full font-medium">{labelPrograma(p)}</span>
            ))}
          </div>
        ) : (u.roles.includes('Professor') || u.roles.includes('Aluno')) ? (
          <span className="bg-amber-50 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">Sem vínculo</span>
        ) : <span className="text-gray-400 text-sm">—</span>),
      },
    ]}
  />
);

export default AdminUsersList;
