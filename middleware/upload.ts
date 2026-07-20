import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

// ─── Storage Directories ───────────────────────────────────────────────────────
export const uploadDir = path.join(process.cwd(), 'uploads');
export const chunkDir = path.join(uploadDir, 'chunks');

// Auto-create directories on module load
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(chunkDir, { recursive: true });

// ─── Storage Engine ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // Route to chunks/ if chunk metadata is present, otherwise direct to uploads/
    const isChunked =
      req.body?.chunkIndex !== undefined ||
      req.headers['x-chunk-index'] !== undefined;

    cb(null, isChunked ? chunkDir : uploadDir);
  },

  filename: (req, file, cb) => {
    const chunkIndex = req.body?.chunkIndex ?? req.headers['x-chunk-index'];
    const uploadId = req.body?.uploadId ?? req.headers['x-upload-id'];
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, path.extname(file.originalname));
    const sanitized = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')   // replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, '');       // trim leading/trailing dashes

    if (chunkIndex !== undefined && uploadId) {
      // Chunk piece: <uploadId>_<chunkIndex>.tmp
      cb(null, `${uploadId}_${chunkIndex}.tmp`);
    } else {
      // Single file: <timestamp>-<sanitized-name><ext>
      const uniqueId = crypto.randomUUID();
      (req as any).generatedId = uniqueId;
      const timestamp = Date.now();
      const filename = `${timestamp}-${sanitized}${ext}`;
      (req as any).finalFilename = filename;
      cb(null, filename);
    }
  },
});

// ─── MIME Type Filter ──────────────────────────────────────────────────────────
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
  ];

  if (file.mimetype === 'image/svg+xml') {
    return cb(new Error('SVG files are blocked for security reasons.'));
  }

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDFs, standard images (JPEG, PNG, WEBP, GIF), and videos (MP4, WEBM) are allowed.'));
  }
};

// ─── Unified Upload Middleware ─────────────────────────────────────────────────
// Single field named 'file' — works for both chunk pieces and whole files.
// Hard cap: 50 MB per request (applies to each chunk as well).
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('file');
