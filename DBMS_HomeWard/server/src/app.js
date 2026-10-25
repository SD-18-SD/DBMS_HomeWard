import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import petRoutes from './routes/petRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import { UPLOAD_DIR } from './middleware/upload.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// 1. Security headers. "cross-origin" lets the React app show our uploaded images.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// 2. Allow the React app to call the API and send cookies.
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));

// 3. Read JSON bodies and cookies.
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// 4. General rate limit for every API route: 300 requests per 15 minutes per IP.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many requests. Please slow down.' },
  })
);

// 5. Serve uploaded pet photos as normal files: /uploads/<filename>
app.use('/uploads', express.static(UPLOAD_DIR));

// 6. API routes
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/campaigns', campaignRoutes);

// 7. 404 and error handling (always last)
app.use(notFound);
app.use(errorHandler);

export default app;
