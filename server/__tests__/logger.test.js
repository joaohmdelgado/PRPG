import { describe, it, expect } from 'vitest';
import { formatErrorLog } from '../utils/logger.js';

describe('formatErrorLog', () => {
  it('preserva correlação técnica sem registrar a mensagem potencialmente sensível', () => {
    const error = Object.assign(new Error('CPF 111.222.333-44; senha=segredo; token=abc'), { code: '23505' });
    const log = formatErrorLog({ requestId: '7ee2d687-01e1-4046-b26d-b1ee93b1b08a', error });

    expect(log).toContain('7ee2d687-01e1-4046-b26d-b1ee93b1b08a');
    expect(log).toContain('23505');
    expect(log).not.toContain('111.222.333-44');
    expect(log).not.toContain('segredo');
    expect(log).not.toContain('token=abc');
  });
});
