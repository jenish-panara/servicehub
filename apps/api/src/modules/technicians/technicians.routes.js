import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import {
  listTechnicians,
  createTechnician,
  updateTechnician,
  setTechnicianActive,
} from "./technicians.service.js";

const router = Router();
router.use(requireAuth);

const technicianSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(6).max(20),
  skills: z.array(z.string().min(1).max(30)).max(10).default([]),
  zone: z.string().max(40).optional().or(z.literal("")),
});

router.get("/", async (req, res, next) => {
  try {
    res.json(await listTechnicians(req, { active: req.query.active }));
  } catch (err) {
    next(err);
  }
});

router.post("/", requireRole("OWNER", "DISPATCHER"), async (req, res, next) => {
  try {
    const parsed = technicianSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
    res.status(201).json(await createTechnician(req, parsed.data));
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireRole("OWNER", "DISPATCHER"), async (req, res, next) => {
  try {
    const parsed = technicianSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
    res.json(await updateTechnician(req, req.params.id, parsed.data));
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/:id/active",
  requireRole("OWNER"),
  async (req, res, next) => {
    try {
      const parsed = z.object({ isActive: z.boolean() }).safeParse(req.body);
      if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
      res.json(await setTechnicianActive(req, req.params.id, parsed.data.isActive));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
