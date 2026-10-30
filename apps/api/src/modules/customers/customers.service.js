import { prisma } from "../../config/db.js";
import { AppError } from "../../middleware/errors.js";
import { scopedWhere } from "../../middleware/tenant.js";

export async function listCustomers(req, { search } = {}) {
  const where = scopedWhere(req);
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }
  return prisma.customer.findMany({ where, orderBy: { createdAt: "desc" } });
}

export async function createCustomer(req, data) {
  return prisma.customer.create({
    data: { ...scopedWhere(req), ...data },
  });
}

export async function updateCustomer(req, id, data) {
  const existing = await prisma.customer.findFirst({
    where: scopedWhere(req, { id }),
  });
  if (!existing) throw new AppError(404, "Customer not found");

  return prisma.customer.update({ where: { id: existing.id }, data });
}
