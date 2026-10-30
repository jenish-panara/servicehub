import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/errors.js";

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, tenantId: user.tenantId, role: user.role },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl, issuer: "servicehub" }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
    issuer: "servicehub",
  });
}

async function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.jwt.refreshSecret, { issuer: "servicehub" });
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new AppError(401, "User no longer exists");
  return user;
}

export async function register({ tenantName, email, password, name }) {
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenantName.toLowerCase().replace(/\s+/g, "-") } });
  if (existingTenant) throw new AppError(409, "Workspace name is taken");

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: tenantName, slug: tenantName.toLowerCase().replace(/\s+/g, "-") },
    });
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 10),
        name,
        role: "OWNER",
      },
    });
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    };
  });
}

export async function login({ email, password }) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    include: { tenant: true },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password");
  }
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export async function refresh(refreshToken) {
  const user = await verifyRefreshToken(refreshToken);
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}
