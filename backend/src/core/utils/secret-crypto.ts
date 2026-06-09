/**
 * Maxfiy qiymatlarni (API kalit, bot token) DB da shifrlab saqlash.
 *
 * AES-256-GCM — master kalit `env.SETTINGS_ENCRYPTION_KEY` dan SHA-256 orqali
 * 32 baytga keltiriladi. Format: `v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>`.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

const ALGO = 'aes-256-gcm';
const PREFIX = 'v1';

function masterKey(): Buffer {
  // SHA-256 — har qanday uzunlikdagi master kalitni 32 baytga keltiradi.
  return createHash('sha256').update(env.SETTINGS_ENCRYPTION_KEY).digest();
}

/** Ochiq matnni shifrlab, saqlash uchun yagona satr qaytaradi. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/** Shifrlangan satrni ochadi. Format/auth buzilgan bo'lsa xato tashlaydi. */
export function decryptSecret(enc: string): string {
  const parts = enc.split(':');
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error('Shifrlangan qiymat formati noto‘g‘ri');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64!, 'base64');
  const authTag = Buffer.from(tagB64!, 'base64');
  const data = Buffer.from(dataB64!, 'base64');
  const decipher = createDecipheriv(ALGO, masterKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** UI uchun maxfiy qiymatni niqoblaydi (oxirgi 4 belgi ko'rinadi). */
export function maskSecret(plain: string | null | undefined): string | null {
  if (!plain) return null;
  if (plain.length <= 4) return '••••';
  return `••••${plain.slice(-4)}`;
}
