import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import dbPool from '../config/db.ts';
import { uploadMiddleware, uploadDir, chunkDir } from '../middleware/upload.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD FILE  —  POST /api/upload
// Handles both single-file and chunked uploads in one unified endpoint.
//
// Chunked upload protocol (headers OR body fields):
//   x-upload-id     : unique session ID for this upload
//   x-chunk-index   : 0-based index of this chunk
//   x-total-chunks  : total number of chunks expected
//
// If none of those headers exist → treated as a standard single-file upload.
// ─────────────────────────────────────────────────────────────────────────────
export const uploadFile = (req: Request, res: Response) => {
  uploadMiddleware(req, res, async (err) => {
    // ── Multer errors (file size limit, filter rejection) ──
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 400, ErrorCode.BAD_REQUEST, ErrorMessage.FILE_TOO_LARGE);
      }
      return sendError(res, 400, ErrorCode.BAD_REQUEST, err.message);
    }
    if (err) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, err.message);
    }
    if (!req.file) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, ErrorMessage.NO_FILE_PROVIDED);
    }

    // ── Parse chunk metadata (header takes priority over body field) ──
    const rawChunkIndex  = req.headers['x-chunk-index']  ?? req.body?.chunkIndex;
    const rawTotalChunks = req.headers['x-total-chunks'] ?? req.body?.totalChunks;
    const uploadId       = (req.headers['x-upload-id']   ?? req.body?.uploadId) as string | undefined;

    const chunkIndex  = rawChunkIndex  !== undefined ? parseInt(rawChunkIndex  as string, 10) : null;
    const totalChunks = rawTotalChunks !== undefined ? parseInt(rawTotalChunks as string, 10) : null;
    const originalName = req.file.originalname;

    // ── Uploaded-by (optional, comes from JWT middleware) ──
    const uploadedBy: number | null = (req as any).user?.userId ?? null;

    try {
      // ════════════════════════════════════════════════════════════════════════
      // CASE A: CHUNKED UPLOAD
      // ════════════════════════════════════════════════════════════════════════
      if (chunkIndex !== null && totalChunks !== null && uploadId) {

        // ── Intermediate chunk: just acknowledge receipt ──
        if (chunkIndex < totalChunks - 1) {
          return res.status(200).json({
            success: true,
            status: 'chunk_saved',
            message: `Chunk ${chunkIndex + 1}/${totalChunks} received.`,
          });
        }

        // ── Final chunk: assemble all pieces ──
        const fileId       = crypto.randomUUID();
        const ext          = path.extname(originalName).toLowerCase();
        const finalFilename = `${fileId}${ext}`;
        const finalPath    = path.join(uploadDir, finalFilename);
        const writeStream  = fs.createWriteStream(finalPath);

        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(chunkDir, `${uploadId}_${i}.tmp`);

          if (!fs.existsSync(chunkPath)) {
            writeStream.destroy();
            fs.unlink(finalPath, () => {});
            return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.MISSING_CHUNK.replace('{{index}}', String(i)));
          }

          writeStream.write(fs.readFileSync(chunkPath));
          fs.unlinkSync(chunkPath); // clean up temp chunk immediately
        }

        await new Promise<void>((resolve, reject) => {
          writeStream.end(resolve);
          writeStream.on('error', reject);
        });

        const finalSize = fs.statSync(finalPath).size;
        const mimeType  = req.file.mimetype;
        const fileUrl   = `${req.protocol}://${req.get('host')}/uploads/${finalFilename}`;

        // Raw pg INSERT — faster than Prisma for simple writes
        const result = await dbPool.query(
          `INSERT INTO media_files (id, original_name, filename, file_url, mime_type, size, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, original_name, filename, file_url, mime_type, size, created_at`,
          [fileId, originalName, finalFilename, fileUrl, mimeType, finalSize, uploadedBy]
        );

        return res.status(201).json({
          success: true,
          status: 'completed',
          message: 'Large file assembled from chunks and saved successfully.',
          data: result.rows[0],
        });
      }

      // ════════════════════════════════════════════════════════════════════════
      // CASE B: SINGLE-FILE UPLOAD (< 5 MB or small files without chunk headers)
      // ════════════════════════════════════════════════════════════════════════
      const fileId   = (req as any).generatedId as string;
      const fileUrl  = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      const mimeType = req.file.mimetype;
      const size     = req.file.size;

      const result = await dbPool.query(
        `INSERT INTO media_files (id, original_name, filename, file_url, mime_type, size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, original_name, filename, file_url, mime_type, size, created_at`,
        [fileId, originalName, req.file.filename, fileUrl, mimeType, size, uploadedBy]
      );

      return res.status(201).json({
        success: true,
        status: 'completed',
        message: 'File uploaded successfully.',
        data: result.rows[0],
      });

    } catch (error) {
      console.error('Upload error:', error);
      return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.UPLOAD_FAILED);
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET FILE BY ID  —  GET /api/upload/:id
// Redirects the browser directly to the stored file URL.
// Works natively with <img> tags, PDF previewers, video players, etc.
// ─────────────────────────────────────────────────────────────────────────────
export const getFileById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbPool.query(
      'SELECT file_url FROM media_files WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.FILE_NOT_FOUND);
    }

    return res.redirect(result.rows[0].file_url);
  } catch (error) {
    console.error('Get file error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.FETCH_FILE_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE FILE BY ID  —  DELETE /api/upload/:id
// Removes the DB record and the physical file from disk.
// ─────────────────────────────────────────────────────────────────────────────
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Look up the filename before deleting the record
    const findResult = await dbPool.query(
      'SELECT filename FROM media_files WHERE id = $1',
      [id]
    );

    if (findResult.rows.length === 0) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.FILE_NOT_FOUND);
    }

    const { filename } = findResult.rows[0];
    const absolutePath = path.join(uploadDir, filename);

    // 2. Remove from DB
    await dbPool.query('DELETE FROM media_files WHERE id = $1', [id]);

    // 3. Remove from disk (non-blocking — log errors but don't fail the response)
    fs.unlink(absolutePath, (unlinkErr) => {
      if (unlinkErr) console.error(`Failed to remove file from disk: ${absolutePath}`, unlinkErr);
    });

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully.',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.DELETE_FAILED);
  }
};
