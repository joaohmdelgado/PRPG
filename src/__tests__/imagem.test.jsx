// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import Imagem, { caminhoLocal, srcSetImagem, LARGURAS_IMAGEM } from '../components/Imagem';
import SafeHtml from '../components/SafeHtml';
import { API_URL } from '../api';

// Fase P.3: imagens do portal — versões WebP das enviadas pelo painel,
// carregamento tardio e prioridade só para a imagem principal.
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
  if (root) await act(async () => root.unmount());
  container?.remove();
  root = undefined;
});

describe('Imagem', () => {
  it('upload local: srcset WebP em todas as larguras, sizes e carregamento tardio', async () => {
    const c = await montar(<Imagem src="/uploads/123-foto.jpg" alt="Capa" sizes="50vw" largura={800} altura={450} />);
    const img = c.querySelector('img');
    expect(img.getAttribute('alt')).toBe('Capa');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('sizes')).toBe('50vw');
    expect(img.getAttribute('width')).toBe('800');
    expect(img.getAttribute('height')).toBe('450');
    const larguras = img.getAttribute('srcset').split(',').map((p) => p.trim().split(' ')[1]);
    expect(larguras).toEqual(LARGURAS_IMAGEM.map((w) => `${w}w`));
    expect(img.getAttribute('srcset')).toContain(`${API_URL}/uploads/123-foto.jpg?w=480 480w`);
    // src de reserva: a versão média, não o original de vários MB.
    expect(img.getAttribute('src')).toBe(`${API_URL}/uploads/123-foto.jpg?w=800`);
  });

  it('a imagem principal é baixada já e com prioridade alta', async () => {
    const c = await montar(<Imagem src="/uploads/hero.png" prioridade />);
    const img = c.querySelector('img');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('imagem de outro site e formatos que não convertemos saem como estavam, ainda com carregamento tardio', async () => {
    const c = await montar(<><Imagem src="https://images.unsplash.com/x.jpg" alt="a" /><Imagem src="/uploads/animada.gif" alt="b" /></>);
    const [externa, gif] = c.querySelectorAll('img');
    expect(externa.getAttribute('src')).toBe('https://images.unsplash.com/x.jpg');
    expect(externa.hasAttribute('srcset')).toBe(false);
    expect(externa.getAttribute('loading')).toBe('lazy');
    expect(gif.hasAttribute('srcset')).toBe(false);
    expect(gif.getAttribute('src')).toBe(`${API_URL}/uploads/animada.gif`);
  });

  it('sem endereço não desenha nada', async () => {
    const c = await montar(<Imagem src={null} alt="x" />);
    expect(c.querySelector('img')).toBeNull();
  });

  it('reconhece upload local com ou sem a base da API', () => {
    expect(caminhoLocal('/uploads/a.jpg')).toBe('/uploads/a.jpg');
    expect(caminhoLocal(`${API_URL}/uploads/a.jpg`)).toBe('/uploads/a.jpg');
    expect(caminhoLocal('https://outro.site/uploads/a.jpg')).toBeNull();
    expect(srcSetImagem('/uploads/doc.pdf')).toBeUndefined();
  });
});

describe('SafeHtml — imagens dentro do texto', () => {
  it('ganham carregamento tardio; as de /uploads ganham também srcset', async () => {
    const html = '<p>oi</p><img src="/uploads/1-a.jpg" alt="A"><img src="https://x.com/b.png" alt="B"><img src="/uploads/2-c.png" loading="eager" alt="C">';
    const c = await montar(<SafeHtml html={html} />);
    const [a, b, cc] = c.querySelectorAll('img');
    expect(a.getAttribute('loading')).toBe('lazy');
    expect(a.getAttribute('srcset')).toContain('/uploads/1-a.jpg?w=1280 1280w');
    expect(a.getAttribute('src')).toBe(`${API_URL}/uploads/1-a.jpg`);
    expect(b.getAttribute('loading')).toBe('lazy');
    expect(b.hasAttribute('srcset')).toBe(false);
    expect(cc.getAttribute('loading')).toBe('eager'); // o que o autor definiu vale
  });

  it('continua removendo o que é perigoso', async () => {
    const c = await montar(<SafeHtml html={'<img src="/uploads/x.jpg" onerror="alert(1)"><script>alert(2)</script>'} />);
    expect(c.innerHTML).not.toMatch(/onerror|<script/i);
  });
});
