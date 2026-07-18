import express from 'express';
import { protect, authorize } from '../middleware/auth.ts';
import { uploadFile, getFileById, deleteFile } from '../controllers/upload.controller.ts';

const router = express.Router();

// ── POST /api/upload ─────────────────────────────────────────────────────────
// Unified endpoint: handles both standard uploads (< 5 MB) and chunked uploads.
// ADMIN / SUPERADMIN only.
router.post('/', protect, authorize(['ADMIN', 'SUPERADMIN']), uploadFile);

// ── GET /api/upload/:id ──────────────────────────────────────────────────────
// Public — redirects to the file URL (works natively in <img> tags, PDFs, etc.)
router.get('/:id', getFileById);

// ── DELETE /api/upload/:id ───────────────────────────────────────────────────
// Removes the DB record and the physical file from disk.
// ADMIN / SUPERADMIN only.
router.delete('/:id', protect, authorize(['ADMIN', 'SUPERADMIN']), deleteFile);

export default router;
