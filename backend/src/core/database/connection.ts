import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';

/**
 * Next.js dev rejimida modullar qayta yuklanadi — ulanishlar saqlanmaslik uchun
 * `global` ga cache qilamiz.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  _mongooseCache?: MongooseCache;
};

const cache: MongooseCache =
  globalForMongoose._mongooseCache ?? { conn: null, promise: null };

if (!globalForMongoose._mongooseCache) {
  globalForMongoose._mongooseCache = cache;

  mongoose.set('strictQuery', true);
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB ulandi');
  });
  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB xato');
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB uzildi');
  });
}

/**
 * Singleton ulanish. Bir necha marta chaqirsa ham bitta ulanish saqlanadi.
 * Next.js API route lari, worker va skriptlar shu funksiyani chaqiradi.
 */
export async function connectDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(env.MONGO_URI, {
      dbName: env.MONGO_DB_NAME,
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDatabase(): Promise<void> {
  if (cache.conn) {
    await mongoose.disconnect();
    cache.conn = null;
    cache.promise = null;
    logger.info('MongoDB uzildi (toza)');
  }
}
