// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Fase P.6: iniciarWebVitals() registra os 5 callbacks da biblioteca
// web-vitals e cada um manda um beacon com a família da rota, a métrica, o
// valor e a avaliação — sem esperar a biblioteca carregar para o resto do
// site funcionar, e sem quebrar nada se ela falhar.

const registros = { onCLS: [], onFCP: [], onINP: [], onLCP: [], onTTFB: [] };
vi.mock('web-vitals', () => ({
  onCLS: (cb) => registros.onCLS.push(cb),
  onFCP: (cb) => registros.onFCP.push(cb),
  onINP: (cb) => registros.onINP.push(cb),
  onLCP: (cb) => registros.onLCP.push(cb),
  onTTFB: (cb) => registros.onTTFB.push(cb),
}));

const metrica = (over = {}) => ({ name: 'LCP', value: 2100, rating: 'good', delta: 2100, id: 'v1-123', ...over });
const proximaVolta = () => new Promise((r) => setTimeout(r, 0)); // o import('web-vitals') resolve depois

beforeEach(() => {
  for (const k of Object.keys(registros)) registros[k] = [];
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('iniciarWebVitals', () => {
  it('registra as 5 métricas e envia por sendBeacon com a família da rota', async () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    history.pushState({}, '', '/noticia/workshop-inovacao');

    const { iniciarWebVitals } = await import('../webVitals.js');
    iniciarWebVitals();
    await proximaVolta();

    expect(Object.entries(registros).filter(([, v]) => v.length === 1)).toHaveLength(5);
    registros.onLCP[0](metrica());

    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, blob] = beacon.mock.calls[0];
    expect(String(url)).toContain('/api/web-vitals');
    expect(blob.type).toBe('application/json');
    const corpo = JSON.parse(await blob.text());
    expect(corpo).toMatchObject({ rota: '/noticia/:id', metrica: 'LCP', valor: 2100, avaliacao: 'good' });
  });

  it('chamar duas vezes não registra os callbacks duas vezes', async () => {
    vi.stubGlobal('navigator', { sendBeacon: vi.fn(() => true) });
    const { iniciarWebVitals } = await import('../webVitals.js');
    iniciarWebVitals();
    iniciarWebVitals();
    await proximaVolta();
    for (const lista of Object.values(registros)) expect(lista).toHaveLength(1);
  });

  it('sem sendBeacon, cai para fetch com keepalive', async () => {
    const fetchEspiao = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('fetch', fetchEspiao);
    history.pushState({}, '', '/');

    const { iniciarWebVitals } = await import('../webVitals.js');
    iniciarWebVitals();
    await proximaVolta();
    registros.onCLS[0](metrica({ name: 'CLS', value: 0.03, rating: 'good' }));

    expect(fetchEspiao).toHaveBeenCalledTimes(1);
    const [url, opcoes] = fetchEspiao.mock.calls[0];
    expect(String(url)).toContain('/api/web-vitals');
    expect(opcoes.method).toBe('POST');
    expect(opcoes.keepalive).toBe(true);
    expect(JSON.parse(opcoes.body)).toMatchObject({ rota: '/', metrica: 'CLS', valor: 0.03 });
  });

  it('sem matchMedia (ambiente sem essa API), o payload sai sem "dispositivo" em vez de quebrar', async () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    vi.stubGlobal('matchMedia', undefined);
    history.pushState({}, '', '/editais');

    const { iniciarWebVitals } = await import('../webVitals.js');
    iniciarWebVitals();
    await proximaVolta();
    registros.onTTFB[0](metrica({ name: 'TTFB', value: 400, rating: 'good' }));

    const corpo = JSON.parse(await beacon.mock.calls[0][1].text());
    expect(corpo).not.toHaveProperty('dispositivo');
  });
});
