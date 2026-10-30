import { prisma } from "../../config/db.js";
import { AppError } from "../../middleware/errors.js";
import { scopedWhere } from "../../middleware/tenant.js";

export async function listTechnicians(req, { active } = {}) {
  const where = scopedWhere(req);
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;
  return prisma.technician.findMany({ where, orderBy: { createdAt: "desc" } });
}

export async function createTechnician(req, data) {
  return prisma.technician.create({
    data: { ...scopedWhere(req), ...data },
  });
}

export async function updateTechnician(req, id, data) {
  const existing = await prisma.technician.findFirst({
    where: scopedWhere(req, { id }),
  });
  if (!existing) throw new AppError(404, "Technician not found");

  return prisma.technician.update({ where: { id: existing.id }, data });
}

export async function setTechnicianActive(req, id, isActive) {
  const existing = await prisma.technician.findFirst({
    where: scopedWhere(req, { id }),
  });
  if (!existing) throw new AppError(404, "Technician not found");

  return prisma.technician.update({ where: { id: existing.id }, data: { isActive } });
}
