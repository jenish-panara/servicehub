import { AppError } from "./errors.js";

/**
 * Multi-tenant scoping. Every tenant-owned query MUST go through helpers here
 * so tenant isolation is enforced in one place, not scattered across routes.
 */
export function tenantScope(req) {
  if (!req.user?.tenantId) {
    throw new AppError(401, "No tenant context");
  }
  return { tenantId: req.user.tenantId };
}

// Standard Prisma where-clauses, always combined with route-level filters:
export function scopedWhere(req, extra = {}) {
  return { ...tenantScope(req), ...extra };
}
