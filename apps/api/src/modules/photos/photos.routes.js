import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { addPhoto, deletePhoto } from "./photos.service.js";

// Images live in memory only briefly, then stream to Cloudinary — nothing
// touches the local disk and API keys never reach the browser.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

const router = Router();
router.use(requireAuth);

const kindSchema = z.object({ kind: z.enum(["before", "after"]).default("after") });

router.post(
  "/:jobId/photos",
  requireRole("OWNER", "DISPATCHER", "TECHNICIAN"),
  upload.single("photo"),
  async (req, res, next) => {
    try {
      const parsed = kindSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
      res.status(201).json(await addPhoto(req, req.params.jobId, req.file, parsed.data.kind));
    } catch (err) {
      if (err instanceof multer.MulterError) {
        return next(
          new AppError(400, err.code === "LIMIT_FILE_SIZE" ? "Image exceeds 5MB limit" : err.message)
        );
      }
      next(err);
    }
  }
);

router.delete("/:jobId/photos/:photoId", requireRole("OWNER", "DISPATCHER"), async (req, res, next) => {
  try {
    await deletePhoto(req, req.params.jobId, req.params.photoId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
