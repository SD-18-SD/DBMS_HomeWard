import dotenv from 'dotenv';
dotenv.config({ quiet: true }); // load server/.env into process.env before anything else

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and set it.');
  process.exit(1);
}

try {
  await connectDB(process.env.MONGO_URI);
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
} catch (err) {
  console.error('Could not start the server:', err.message);
  process.exit(1);
}
