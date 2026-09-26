import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Testes de componentes do front (Fase U): jsdom, sem banco e sem API. Os
// arquivos declaram `// @vitest-environment jsdom`. O jsdom já está no
// node_modules como dependência do isomorphic-dompurify; declará-lo em
// devDependencies exige atualizar o package-lock.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
  },
});
