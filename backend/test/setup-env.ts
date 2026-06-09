/**
 * Test env bootstrap — MUST be the first setupFile.
 *
 * `src/core/config/env.ts` validates `process.env` with Zod at IMPORT time and
 * throws on failure. Many service files transitively import it, so the required
 * vars have to exist before any of those imports resolve. Vitest evaluates
 * setupFiles before the test file's own imports, so setting them here wins.
 *
 * `MONGO_URI` is a placeholder that satisfies the schema; setup-db.ts overwrites
 * it with the real in-memory server URI before connectDatabase() is called.
 */

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET ??= 'test-session-secret-at-least-32-characters-long';
process.env.MONGO_URI ??= 'mongodb://127.0.0.1:27017/placeholder';
process.env.MONGO_DB_NAME ??= 'nazoratchi_test';
// Keep bcrypt fast in tests (schema allows 8..15).
process.env.BCRYPT_ROUNDS ??= '8';
// Integratsiya kalitlarini shifrlash uchun master kalit (test uchun har qanday qiymat).
process.env.SETTINGS_ENCRYPTION_KEY ??= 'test-settings-encryption-key-1234567890';
// Telegram/Gemini kalitlari endi DB orqali — test DB bo'sh, helpers silent no-op.
