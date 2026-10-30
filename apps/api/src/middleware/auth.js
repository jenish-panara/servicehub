import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./errors.js";

/**
 * Requires a valid Bearer access token. Attaches req.user = { id, tenantId, role }.
 */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return next(new AppError(401, "Missing access token"));
  }
  try {
    req.user = jwt.verify(token, env.jwt.accessSecret, {
      issuer: "servicehub",
    });
    next();
  } catch {
    next(new AppError(401, "Invalid or expired access token"));
  }
}

/**
 * Role-based access control. Usage: router.post('/', requireAuth, requireRole('OWNER'), ...)
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, "Insufficient permissions"));
    }
    next();
  };
}
