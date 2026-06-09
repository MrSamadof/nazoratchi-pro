import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // setup-env.ts MUST run before any module that transitively imports
    // src/core/config/env.ts (which throws at import time on missing env vars).
    // setup-db.ts boots an in-memory MongoDB and wires connect/clear/teardown.
    setupFiles: ['./test/setup-env.ts', './test/setup-db.ts'],
    // In-memory mongo binary download + bcrypt hashing can be slow on first run.
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Run test files sequentially in one process so they share the single
    // in-memory mongo instance and never collide on the same collections.
    fileParallelism: false,
  },
});
