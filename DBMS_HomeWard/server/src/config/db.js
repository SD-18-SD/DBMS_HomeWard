import mongoose from 'mongoose';

// Opens one connection to MongoDB that the whole app shares.
export async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGO_URI is missing. Add it to server/.env');
  }
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
