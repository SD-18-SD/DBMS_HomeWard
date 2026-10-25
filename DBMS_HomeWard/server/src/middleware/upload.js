import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import AppError from '../utils/AppError.js';

export const UPLOAD_DIR = path.resolve('uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Where and with what name Multer saves each file.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30);
    const random = Math.round(Math.random() * 1e6);
    cb(null, `${Date.now()}-${random}-${safeBase}${ext}`);
  },
});

// Reject anything that is not a JPG, PNG or WEBP image.
function fileFilter(_req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
  else cb(new AppError('Only JPG, PNG or WEBP images are allowed', 400));
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 5 }, // 2 MB each, 5 files max
});

// Turns Multer's saved files into public paths: ["/uploads/123-buddy.jpg"]
export function filesToPaths(files = []) {
  return files.map((f) => `/uploads/${f.filename}`);
}

// Deletes a photo from disk, for example when a pet is deleted.
export function removeUpload(publicPath) {
  if (!publicPath) return;
  const filePath = path.join(UPLOAD_DIR, path.basename(publicPath));
  fs.unlink(filePath, () => {}); // ignore errors if the file is already gone
}

export function removeUploads(paths = []) {
  paths.forEach(removeUpload);
}

// Works out the final photo list when editing.
// keep:    photos the user did not remove (undefined means "keep all")
// current: photos already saved on the document
// added:   new files from this request
// Returns { photos, removed } or throws if there would be too many.
export function mergePhotos({ current = [], keep, added = [], max = 5 }) {
  const kept = keep === undefined ? current : current.filter((p) => keep.includes(p));
  const photos = [...kept, ...added];
  if (photos.length > max) {
    throw new AppError(`You can have at most ${max} photos. Remove some first.`, 400);
  }
  const removed = current.filter((p) => !kept.includes(p));
  return { photos, removed };
}
