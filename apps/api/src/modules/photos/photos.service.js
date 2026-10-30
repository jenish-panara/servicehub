import { prisma } from "../../config/db.js";
import { AppError } from "../../middleware/errors.js";
import { scopedWhere } from "../../middleware/tenant.js";
import { cloudinary, cloudinaryConfigured } from "../../config/cloudinary.js";

/**
 * Uploads an image buffer to Cloudinary (keys never leave the server) and
 * records the photo against the job. Tenant isolation comes from fetching
 * the job through scopedWhere first.
 */
export async function addPhoto(req, jobId, file, kind) {
  if (!cloudinaryConfigured) {
    throw new AppError(
      503,
      "Photo uploads are not configured — set the Cloudinary env vars (see .env.example)"
    );
  }
  if (!file) throw new AppError(400, "Photo file is required");

  const job = await prisma.job.findFirst({ where: scopedWhere(req, { id: jobId }) });
  if (!job) throw new AppError(404, "Job not found");

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `servicehub/${job.tenantId}/${job.id}`, resource_type: "image" },
      (err, res) => (err ? reject(new AppError(502, "Image upload failed")) : resolve(res))
    );
    stream.end(file.buffer);
  });

  return prisma.jobPhoto.create({
    data: {
      jobId: job.id,
      url: result.secure_url,
      publicId: result.public_id,
      kind,
    },
  });
}

export async function deletePhoto(req, jobId, photoId) {
  const photo = await prisma.jobPhoto.findFirst({
    where: { id: photoId, job: scopedWhere(req, { id: jobId }) },
  });
  if (!photo) throw new AppError(404, "Photo not found");

  if (photo.publicId && cloudinaryConfigured) {
    await cloudinary.uploader.destroy(photo.publicId);
  }
  await prisma.jobPhoto.delete({ where: { id: photo.id } });
}
