/**
 * MongoDB backup script.
 * Ishga tushirish: `npm run backup`
 *
 * `mongodump` ni shell'da chaqiradi. `backups/<timestamp>/` ga yozadi.
 * Cron orqali kunlik ishga tushirilishi mumkin.
 */

import '../core/config/load-env.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../core/config/env.js';
import { logger } from '../core/logger/logger.js';

const execAsync = promisify(exec);

async function main(): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups', timestamp);
  await mkdir(backupDir, { recursive: true });

  logger.info({ backupDir }, 'Backup boshlandi');

  try {
    const { stdout, stderr } = await execAsync(
      `mongodump --uri="${env.MONGO_URI}" --db=${env.MONGO_DB_NAME} --out="${backupDir}"`,
    );
    if (stdout) logger.info(stdout);
    if (stderr) logger.warn(stderr);
    logger.info({ backupDir }, '✅ Backup muvaffaqiyatli');
  } catch (err) {
    logger.error({ err }, '❌ Backup xato');
    process.exit(1);
  }
}

main();
