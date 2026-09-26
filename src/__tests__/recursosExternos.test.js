import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Fase P.5 (docs/revisao-portal-conteudo-2026-09-24.md): nada que bloqueie a
// renderização vem de terceiros — fontes e ícones são do próprio site.
const raiz = path.resolve(__dirname, '../..');
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');

describe('recursos do caminho crítico', () => {
  it('index.html e globals.css não apontam para CDN nem Google Fonts', () => {
    for (const arquivo of ['index.html', 'src/styles/globals.css']) {
      const texto = ler(arquivo);
      expect(texto, arquivo).not.toMatch(/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|use\.fontawesome/);
    }
  });

  it('as fontes declaradas existem no repositório e são pré-carregadas', () => {
    const css = ler('src/styles/globals.css');
    const html = ler('index.html');
    const arquivos = [...css.matchAll(/url\('\.\.\/assets\/fontes\/([^']+\.woff2)'\)/g)].map((m) => m[1]);
    expect(arquivos.length).toBeGreaterThanOrEqual(2);
    for (const nome of arquivos) {
      expect(fs.existsSync(path.join(raiz, 'src/assets/fontes', nome)), nome).toBe(true);
      expect(html, nome).toContain(`/src/assets/fontes/${nome}`);
    }
    // font-display: swap — o texto aparece com a fonte do sistema enquanto a nossa chega.
    expect(css.match(/font-display:\s*swap/g)?.length).toBe(arquivos.length);
  });
});
