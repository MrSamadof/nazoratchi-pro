/**
 * DB ni toʻliq tozalab, faqat bitta CEO foydalanuvchisini yaratadi.
 * Ishga tushirish: `npm run seed`
 *
 * DIQQAT: barcha kolleksiyalar oʻchiriladi! Doʻkonlar, jarima qoidalari va
 * boshqa foydalanuvchilar CEO tomonidan web ilova orqali yaratiladi.
 */

import '../core/config/load-env.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../core/database/connection.js';
import { User } from '../modules/users/users.model.js';
import { env } from '../core/config/env.js';
import { logger } from '../core/logger/logger.js';
import { normalizePhone } from '../core/utils/format.js';

async function wipeDatabase(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('DB ulanmagan');
  }
  const collections = await db.listCollections().toArray();
  if (collections.length === 0) {
    logger.info('DB allaqachon boʻsh');
    return;
  }
  for (const c of collections) {
    await db.collection(c.name).drop().catch(() => {
      /* allaqachon yoʻq */
    });
    logger.info({ collection: c.name }, 'Kolleksiya oʻchirildi');
  }
  logger.info({ count: collections.length }, '🧹 DB toʻliq tozalandi');
}

async function seedCEO(): Promise<void> {
  const phoneEnv = process.env.CEO_PHONE;
  const passwordEnv = process.env.CEO_PASSWORD;
  const firstName = process.env.CEO_FIRST_NAME ?? 'CEO';
  const lastName = process.env.CEO_LAST_NAME ?? '';
  const telegramIdEnv = process.env.CEO_TELEGRAM_ID;

  if (!phoneEnv || !passwordEnv) {
    logger.error(
      ".env da CEO_PHONE va CEO_PASSWORD koʻrsatilishi shart. Seed toʻxtatildi.",
    );
    process.exit(1);
  }

  const phone = normalizePhone(phoneEnv);
  const passwordHash = await bcrypt.hash(passwordEnv, env.BCRYPT_ROUNDS);
  const telegramId = telegramIdEnv ? Number(telegramIdEnv) : null;

  await User.create({
    phone,
    telegramId,
    firstName,
    lastName,
    passwordHash,
    role: 'ceo',
    isApproved: true,
    isActive: true,
  });
  logger.info({ phone }, "CEO yaratildi — telefon va PIN bilan kiring");
}

async function main(): Promise<void> {
  await connectDatabase();
  try {
    await wipeDatabase();
    await seedCEO();
    logger.info('✅ Seed tugadi — DB toza, faqat CEO bor');
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  logger.fatal({ err }, 'Seed xato bilan tugadi');
  process.exit(1);
});
