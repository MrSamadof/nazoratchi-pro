/**
 * Loyiha root'idagi `.env` ni yuklaydi.
 *
 * Backend scriptlari `backend/` cwd dan ishga tushadi, shuning uchun standart
 * `dotenv/config` `backend/.env` ni qidirardi. Bu modul aniq yoʻl bilan
 * monorepo root'idagi yagona `.env` ni yuklaydi — har qanday entry point
 * (`api/main.ts`, `worker/main.ts`, scriptlar) shu modulni birinchi import qilishi kerak.
 */

import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Bu fayl: backend/src/core/config/load-env.ts
// Root .env: 4 papka yuqorida
const here = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(here, '../../../../.env');

config({ path: rootEnv });
