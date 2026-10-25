import multer from 'multer';
import { removeUpload } from './upload.js';

// Runs when no route matched the URL.
export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Every error thrown in the app ends up here and becomes a clean JSON reply.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  // If the request failed after Multer saved photos, delete them so no junk files stay on disk.
  if (req.file) removeUpload(req.file.filename);
  if (Array.isArray(req.files)) req.files.forEach((f) => removeUpload(f.filename));

  // Mongoose: bad id like /api/pets/123
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  }
  // Mongoose: a field broke a schema rule
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)[0].message;
  }
  // MongoDB: unique index broken (email already used, applied twice)
  if (err.code === 11000) {
    status = 409;
    message = err.keyPattern?.email
      ? 'An account with this email already exists'
      : 'You already applied for this pet';
  }
  // Multer: file too large, too many files
  if (err instanceof multer.MulterError) {
    status = 400;
    const messages = {
      LIMIT_FILE_SIZE: 'Each image must be 2 MB or smaller',
      LIMIT_FILE_COUNT: 'You can upload up to 5 photos',
      LIMIT_UNEXPECTED_FILE: 'You can upload up to 5 photos',
    };
    message = messages[err.code] || err.message;
  }

  if (status === 500) console.error(err);
  res.status(status).json({ message });
}
