// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Field, Input, Select, FileField, Checkbox } from '../components/ui/Field';
import Dialog from '../components/ui/Dialog';
import Icone, { chaveDoIcone, iconeExiste } from '../components/Icone';
import { useToast } from '../components/admin/Toast';
import { useConfirm } from '../components/admin/ConfirmModal';
import { associarRotulos } from '../hooks/useAssociarRotulos';
import { gruposDoPainel, destinosDoPainel } from '../components/admin/menuPainel';
import { destinoPadrao, destinoPermitido } from '../auth';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;
const montar = async (el) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(el); });
  return container;
};

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  container?.remove();
  root = null;
  container = null;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('Field — rótulo, ajuda e erro ligados ao campo', () => {
  it('liga <label for> ao controle e marca obrigatório', async () => {
    const c = await montar(<Field label="Título" required><Input defaultValue="x" /></Field>);
    const input = c.querySelector('input');
    const label = c.querySelector('label');
    expect(label.htmlFor).toBe(input.id);
    expect(input.id).toBeTruthy();
    expect(input.required).toBe(true);
    expect(label.textContent).toContain('obrigatório');
  });

  it('aponta aria-describedby para a ajuda e o erro, e marca aria-invalid', async () => {
    const c = await montar(<Field label="CPF" hint="Só números" error="CPF inválido"><Input /></Field>);
    const input = c.querySelector('input');
    const ids = input.getAttribute('aria-describedby').split(' ');
    expect(ids).toHaveLength(2);
    expect(c.querySelector(`#${ids[0]}`).textContent).toBe('Só números');
    const erro = c.querySelector(`#${ids[1]}`);
    expect(erro.textContent).toBe('CPF inválido');
    expect(erro.getAttribute('role')).toBe('alert');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('dois campos na mesma tela têm ids diferentes', async () => {
    const c = await montar(<><Field label="A"><Input /></Field><Field label="B"><Select opcoes={['1', '2']} /></Field></>);
    const ids = [...c.querySelectorAll('input,select')].map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
    expect(c.querySelectorAll('label')[1].htmlFor).toBe(ids[1]);
  });

  it('aceita a forma função para componentes próprios', async () => {
    const c = await montar(<Field label="Data">{(p) => <input type="date" {...p} />}</Field>);
    const input = c.querySelector('input');
    expect(c.querySelector('label').htmlFor).toBe(input.id);
  });

  it('Checkbox tem o texto dentro do <label> ligado ao campo', async () => {
    const c = await montar(<Checkbox label="Sou estrangeiro" />);
    expect(c.querySelector('label').htmlFor).toBe(c.querySelector('input').id);
  });
});

describe('FileField', () => {
  it('nomeia o campo de arquivo, anuncia o estado e oferece remover', async () => {
    const onRemover = vi.fn();
    const c = await montar(<FileField label="Comprovante" required atual="/uploads/a.pdf" atualRotulo="a.pdf" onEscolher={() => {}} onRemover={onRemover} />);
    const input = c.querySelector('input[type=file]');
    expect(c.querySelector(`label[for="${input.id}"]`)).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toContain(`${input.id}-status`);
    expect(c.querySelector(`#${input.id}-status`).getAttribute('aria-live')).toBe('polite');
    const remover = [...c.querySelectorAll('button')].find((b) => /Remover/.test(b.textContent));
    expect(remover.textContent).toContain('Comprovante');
    await act(async () => { remover.click(); });
    expect(onRemover).toHaveBeenCalled();
  });

  it('sem arquivo, diz que nenhum foi escolhido', async () => {
    const c = await montar(<FileField label="Anexo" onEscolher={() => {}} />);
    expect(c.textContent).toContain('Nenhum arquivo escolhido');
  });
});

describe('Dialog — foco, Escape e retorno de foco', () => {
  function Exemplo({ onFechar }) {
    const [aberto, setAberto] = React.useState(false);
    return (
      <>
        <button id="abre" onClick={() => setAberto(true)}>Abrir</button>
        <Dialog aberto={aberto} onFechar={() => { onFechar(); setAberto(false); }} titulo="Título do diálogo" descricao="Descrição">
          <input id="dentro" />
          <button id="ultimo">Último</button>
        </Dialog>
      </>
    );
  }

  it('tem nome e aria-modal, prende o foco, fecha com Escape e devolve o foco', async () => {
    const onFechar = vi.fn();
    const c = await montar(<Exemplo onFechar={onFechar} />);
    const abre = c.querySelector('#abre');
    abre.focus();
    await act(async () => { abre.click(); });

    const d = document.querySelector('[role=dialog]');
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(d.getAttribute('aria-labelledby')).textContent).toBe('Título do diálogo');
    expect(d.contains(document.activeElement)).toBe(true);

    // Tab no último elemento volta ao primeiro (não escapa do diálogo).
    document.getElementById('ultimo').focus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    });
    expect(d.contains(document.activeElement)).toBe(true);
    expect(document.activeElement.id).not.toBe('ultimo');

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onFechar).toHaveBeenCalled();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(abre);
  });

  it('confirmação usa alertdialog e o foco inicial fica em Cancelar', async () => {
    let resultado;
    function C() {
      const { confirm, ConfirmModal } = useConfirm();
      return (<><button id="x" onClick={async () => { resultado = await confirm('Excluir isto?'); }}>x</button>{ConfirmModal}</>);
    }
    const c = await montar(<C />);
    await act(async () => { c.querySelector('#x').click(); });
    const d = document.querySelector('[role=alertdialog]');
    expect(d).toBeTruthy();
    expect(document.activeElement.textContent).toBe('Cancelar');
    await act(async () => {
      [...d.querySelectorAll('button')].find((b) => b.textContent === 'Confirmar').click();
    });
    expect(resultado).toBe(true);
  });
});

describe('Toast — regiões vivas', () => {
  it('as regiões existem antes de qualquer aviso; erro fica na região assertiva e não some sozinho', async () => {
    vi.useFakeTimers();
    let api;
    function T() { const { toast, Toasts } = useToast(); api = toast; return Toasts; }
    await montar(<T />);
    const polite = document.querySelector('[role=status]');
    const alerta = document.querySelector('[role=alert]');
    expect(polite).toBeTruthy();
    expect(alerta).toBeTruthy();
    expect(polite.textContent).toBe('');

    await act(async () => { api.success('Salvo!'); api.error('Falhou'); });
    expect(polite.textContent).toContain('Salvo!');
    expect(alerta.textContent).toContain('Falhou');

    await act(async () => { vi.advanceTimersByTime(20000); });
    expect(polite.textContent).not.toContain('Salvo!');
    expect(alerta.textContent).toContain('Falhou');

    const dispensar = alerta.querySelector('button');
    expect(dispensar.getAttribute('aria-label')).toBeTruthy();
    await act(async () => { dispensar.click(); });
    expect(alerta.textContent).not.toContain('Falhou');
  });
});

describe('associarRotulos (rede de segurança)', () => {
  const html = (s) => { const d = document.createElement('div'); d.innerHTML = s; document.body.appendChild(d); return d; };

  it('liga o rótulo ao campo seguinte, ao dentro de um invólucro e ao único do pai', () => {
    const r = html('<div><label>A</label><input></div><div><label>B</label><div><select></select></div></div><div><label>C</label><span>x</span><textarea></textarea></div>');
    expect(associarRotulos(r)).toBe(3);
    r.querySelectorAll('label').forEach((l) => {
      expect(document.getElementById(l.htmlFor)).toBeTruthy();
    });
  });

  it('não mexe em rótulo ambíguo, que já envolve o campo ou que já tem for', () => {
    const r = html('<div><label>Grupo</label><div><input type="radio"><input type="radio"></div></div><label>X <input></label><label for="k">K</label><input id="k">');
    expect(associarRotulos(r)).toBe(0);
    expect(r.querySelector('label').hasAttribute('for')).toBe(false);
  });

  it('reaproveita o id que o campo já tem', () => {
    const r = html('<div><label>A</label><input id="meu"></div>');
    associarRotulos(r);
    expect(r.querySelector('label').htmlFor).toBe('meu');
  });
});

describe('Icone — um só sistema (lucide) aceitando o valor antigo do banco', () => {
  it('normaliza classes do Font Awesome e nomes curtos', () => {
    expect(chaveDoIcone('fa-solid fa-gavel')).toBe('gavel');
    expect(chaveDoIcone('fa-brands fa-whatsapp')).toBe('whatsapp');
    expect(chaveDoIcone('fa-house')).toBe('house');
    expect(chaveDoIcone('gavel')).toBe('gavel');
    expect(chaveDoIcone('fa-solid fa-circle-notch fa-spin')).toBe('circle-notch');
    expect(iconeExiste('fa-solid fa-graduation-cap')).toBe(true);
    expect(iconeExiste('fa-solid fa-nao-existe')).toBe(false);
  });

  it('renderiza um svg decorativo dimensionado pela fonte, e com nome quando pedido', async () => {
    const c = await montar(<><Icone nome="fa-solid fa-gavel" className="text-xl" /><Icone nome="gavel" titulo="Martelo" /><Icone nome="fa-solid fa-inexistente" /></>);
    const [a, b, d] = c.querySelectorAll('svg');
    expect(a.getAttribute('aria-hidden')).toBe('true');
    expect(a.getAttribute('width')).toBe('1em');
    expect(a.getAttribute('class')).toContain('text-xl');
    expect(b.getAttribute('aria-label')).toBe('Martelo');
    expect(b.getAttribute('aria-hidden')).toBeNull();
    expect(d).toBeTruthy(); // ícone desconhecido cai no padrão (link), não quebra a tela
  });
});

describe('menu do painel por tarefa (U.2)', () => {
  const nomes = (g) => g.map((x) => x.rotulo);

  it('a PRPG vê os 5 grupos por tarefa, com as telas da Fase O e a Câmara em Secretaria', () => {
    const g = gruposDoPainel({ superAdmin: true, gestorPrograma: false, roles: ['Administrator'] });
    expect(nomes(g)).toEqual(['Site', 'Programas', 'Secretaria', 'Pessoas e Contatos', 'Configuração']);
    const itens = (id) => g.find((x) => x.id === id).itens.map((i) => i.label);
    expect(itens('secretaria')).toEqual(expect.arrayContaining(['Câmara de Pós-Graduação', 'Expedientes', 'Pós-Doutorado', 'Proficiência', 'Portarias']));
    expect(itens('config')).toEqual(expect.arrayContaining(['Planilhas (importação)', 'Qualidade dos dados', 'Classificações']));
    expect(itens('pessoas')).toEqual(['Usuários', 'Agenda de Contatos']);
  });

  it('Notificações e agendador só para Administrator', () => {
    const tem = (roles) => gruposDoPainel({ superAdmin: true, roles }).flatMap((x) => x.itens).some((i) => i.to === '/admin/notificacoes');
    expect(tem(['Administrator'])).toBe(true);
    expect(tem(['Gestor'])).toBe(false);
  });

  it('Gestor de Programa vê só o do programa dele, com Site do Programa', () => {
    const g = gruposDoPainel({ superAdmin: false, gestorPrograma: true, programaId: 'p1', roles: ['GestorPrograma'] });
    const todos = g.flatMap((x) => x.itens.map((i) => i.to));
    expect(todos).toContain('/admin/programas/p1/site');
    expect(todos).toContain('/admin/programas/editar/p1');
    expect(todos).not.toContain('/admin/users');
    expect(todos).not.toContain('/admin/planilhas');
  });

  it('todo destino tem rótulo, ícone e grupo (para a busca Ctrl+K)', () => {
    const d = destinosDoPainel({ superAdmin: true, roles: ['Administrator'] });
    expect(d[0].to).toBe('/admin');
    d.forEach((x) => { expect(x.label).toBeTruthy(); expect(x.icon).toBeTruthy(); expect(x.grupo).toBeTruthy(); });
    expect(new Set(d.map((x) => x.to)).size).toBe(d.length);
  });
});

describe('login leva cada papel ao seu lugar (U.1)', () => {
  it('equipe vai ao painel; aluno e professor, a /minha-conta', () => {
    expect(destinoPadrao(['Administrator'])).toBe('/admin');
    expect(destinoPadrao(['Gestor'])).toBe('/admin');
    expect(destinoPadrao(['GestorPrograma'])).toBe('/admin');
    expect(destinoPadrao(['Professor', 'GestorPrograma'])).toBe('/admin');
    expect(destinoPadrao(['Aluno'])).toBe('/minha-conta');
    expect(destinoPadrao(['Professor'])).toBe('/minha-conta');
    expect(destinoPadrao([])).toBe('/minha-conta');
  });

  it('o destino pedido só vale se o perfil pode abri-lo', () => {
    expect(destinoPermitido('/admin/editais', ['Administrator'])).toBe('/admin/editais');
    expect(destinoPermitido('/admin/editais', ['Aluno'])).toBe('/minha-conta');
    expect(destinoPermitido('/minha-conta/inscricoes', ['Aluno'])).toBe('/minha-conta/inscricoes');
    expect(destinoPermitido(undefined, ['Aluno'])).toBe('/minha-conta');
    expect(destinoPermitido('//evil.com', ['Administrator'])).toBe('/admin');
    expect(destinoPermitido('https://evil.com', ['Administrator'])).toBe('/admin');
  });
});
