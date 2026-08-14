import mongoose from 'mongoose';

// Never fall back to DB_CONNECTION_URI — that may point to a remote Azure host
// and cause TCP timeouts that contaminate subsequent tests.
export const getTestMongoUri = (): string =>
  process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017';

// Each Jest worker gets its own database to avoid cross-worker data collisions.
export const getTestDbName = (): string =>
  `batch_test_${process.env.JEST_WORKER_ID || '1'}`;

export const connectTestMongo = async (): Promise<void> => {
  // Disable command buffering so mongoose operations fail immediately rather
  // than waiting bufferTimeoutMS (default 10 s) when no connection is available.
  mongoose.set('bufferCommands', false);
  await mongoose.connect(getTestMongoUri(), {
    dbName: getTestDbName(),
    serverSelectionTimeoutMS: 2000,
  });
};

export const disconnectTestMongo = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
  mongoose.connection.removeAllListeners();
};
