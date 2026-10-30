import { prisma } from "../../config/db.js";
import { AppError } from "../../middleware/errors.js";
import { scopedWhere } from "../../middleware/tenant.js";
import { canTransition } from "./job.transitions.js";

const JOB_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true, address: true } },
  technician: { select: { id: true, name: true, phone: true, skills: true } },
  photos: true,
  invoice: true,
};

export async function listJobs(req, { status, technicianId } = {}) {
  const where = scopedWhere(req);
  if (status) where.status = status;
  if (technicianId) where.technicianId = technicianId;
  return prisma.job.findMany({ where, include: JOB_INCLUDE, orderBy: { createdAt: "desc" } });
}

export async function getJob(req, id) {
  const job = await prisma.job.findFirst({
    where: scopedWhere(req, { id }),
    include: JOB_INCLUDE,
  });
  if (!job) throw new AppError(404, "Job not found");
  return job;
}

export async function createJob(req, data) {
  return prisma.job.create({
    data: {
      ...scopedWhere(req),
      customerId: data.customerId,
      title: data.title,
      description: data.description,
      address: data.address,
      scheduledFor: data.scheduledFor,
      technicianId: data.technicianId,
      status: data.technicianId ? "ASSIGNED" : "REQUESTED",
    },
    include: JOB_INCLUDE,
  });
}

export async function updateStatus(req, id, nextStatus) {
  // Serialize the read + transition check + write so two concurrent updates
  // can't both "win". Interactive transactions run on the DB; the status check
  // inside re-reads the row within the same transaction.
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({ where: scopedWhere(req, { id }) });
    if (!job) throw new AppError(404, "Job not found");
    if (!canTransition(job.status, nextStatus)) {
      throw new AppError(
        409,
        `Cannot move job from ${job.status} to ${nextStatus}`
      );
    }
    return tx.job.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        ...(nextStatus === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
      include: JOB_INCLUDE,
    });
  });
}

export async function assignTechnician(req, id, technicianId) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({ where: scopedWhere(req, { id }) });
    if (!job) throw new AppError(404, "Job not found");
    if (job.status === "PAID" || job.status === "CANCELLED") {
      throw new AppError(409, `Cannot assign a ${job.status.toLowerCase()} job`);
    }
    const tech = await tx.technician.findFirst({
      where: scopedWhere(req, { id: technicianId, isActive: true }),
    });
    if (!tech) throw new AppError(404, "Technician not found");

    return tx.job.update({
      where: { id: job.id },
      data: {
        technicianId,
        // Jump to ASSIGNED if we're still pre-dispatch; otherwise leave as-is
        status: job.status === "REQUESTED" || job.status === "SCHEDULED" ? "ASSIGNED" : job.status,
      },
      include: JOB_INCLUDE,
    });
  });
}
