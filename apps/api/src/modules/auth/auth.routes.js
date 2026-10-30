import { Router } from "express";
import { z } from "zod";
import { register, login, refresh } from "./auth.service.js";
import { AppError } from "../../middleware/errors.js";

const router = Router();

const registerSchema = z.object({
  tenantName: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

router.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
    res.status(201).json(await register(parsed.data));
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
    res.json(await login(parsed.data));
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
    res.json(await refresh(parsed.data.refreshToken));
  } catch (err) {
    next(err);
  }
});

export default router;
