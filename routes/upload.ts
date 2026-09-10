import express from 'express';
import { protect, authorize } from '../middleware/auth.ts';
import { uploadFile, getFileById, deleteFile, listFiles, searchFiles } from '../controllers/upload.controller.ts';

const router = express.Router();

// ── GET /api/upload — List all media files (paginated, public) ───────────────
// ?page=1&limit=20
router.get('/', listFiles);

// ── GET /api/upload/search — Search by filename (public) ────────────────────
// ?q=<search_term>&page=1&limit=20
// NOTE: must be registered BEFORE /:id to avoid route conflict
router.get('/search', searchFiles);

// ── POST /api/upload — Upload file (single or chunked) ──────────────────────
// ADMIN / SUPERADMIN only.
router.post('/', protect, authorize(['ADMIN', 'SUPERADMIN']), uploadFile);

// ── GET /api/upload/:id — Redirect to file URL (public) ─────────────────────
router.get('/:id', getFileById);

// ── DELETE /api/upload/:id — Delete file from DB and disk ───────────────────
// ADMIN / SUPERADMIN only.
router.delete('/:id', protect, authorize(['ADMIN', 'SUPERADMIN']), deleteFile);

export default router;
