/**
 * In-memory MongoDB for integration tests.
 *
 * Boots a real mongod (mongodb-memory-server) once per test process, points
 * MONGO_URI at it, and connects via the project's own connectDatabase() so
 * service logic runs completely unmodified. Collections are wiped before every
 * test for isolation; the server is stopped after the suite.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  // Overwrite the placeholder from setup-env.ts BEFORE connectDatabase reads it.
  process.env.MONGO_URI = mongod.getUri();

  // Import after the URI is set so connection.ts picks up the real value.
  const { connectDatabase } = await import('../src/core/database/connection.js');
  await connectDatabase();
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({})),
  );
});

afterAll(async () => {
  const { disconnectDatabase } = await import('../src/core/database/connection.js');
  await disconnectDatabase();
  if (mongod) await mongod.stop();
});
