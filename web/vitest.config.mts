import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': import.meta.dirname,
      // 'server-only' throws outside the React server build; tests run server code directly.
      'server-only': path.resolve(import.meta.dirname, 'tests/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'lib/**/*.test.ts'],
    env: { LLM_PROVIDER: 'mock', BDS_DB_MEMORY: '1', DATABASE_URL: '', TZ: 'America/New_York' },
  },
});
