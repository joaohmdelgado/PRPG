import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeHtmlField, sanitizeDocsDesc, isPlainObject } from '../utils/sanitize.js';

describe('sanitizeHtml', () => {
  it('remove tags <script>', () => {
    expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
  });
  it('remove atributos de evento (onerror)', () => {
    expect(sanitizeHtml('<img src=x onerror=alert(1)>')).not.toContain('onerror');
  });
  it('preserva HTML legítimo', () => {
    expect(sanitizeHtml('<strong>negrito</strong>')).toBe('<strong>negrito</strong>');
  });
  it('repassa não-strings inalterados', () => {
    expect(sanitizeHtml(null)).toBe(null);
    expect(sanitizeHtml(123)).toBe(123);
  });
});

describe('sanitizeHtmlField', () => {
  it('sanitiza cada item de um array', () => {
    expect(sanitizeHtmlField(['<p>a</p><script>x</script>', '<b>b</b>'])).toEqual(['<p>a</p>', '<b>b</b>']);
  });
  it('sanitiza string única', () => {
    expect(sanitizeHtmlField('<i>x</i><script>y</script>')).toBe('<i>x</i>');
  });
});

describe('sanitizeDocsDesc', () => {
  it('sanitiza o campo desc de cada documento', () => {
    const r = sanitizeDocsDesc([{ title: 't', desc: '<b>ok</b><script>x</script>' }]);
    expect(r[0].desc).toBe('<b>ok</b>');
    expect(r[0].title).toBe('t');
  });
  it('repassa valores não-array', () => {
    expect(sanitizeDocsDesc(undefined)).toBe(undefined);
  });
});

describe('isPlainObject', () => {
  it('aceita apenas objetos comuns', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject('x')).toBe(false);
    expect(isPlainObject(5)).toBe(false);
  });
});
