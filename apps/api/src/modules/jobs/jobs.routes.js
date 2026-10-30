import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { listJobs, getJob, createJob, updateStatus, assignTechnician } from "./jobs.service.js";

const router = Router();
router.use(requireAuth);

const createJobSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  address: z.string().min(5).max(300),
  scheduledFor: z.coerce.date().optional(),
  technicianId: z.string().uuid().optional(),
});

const statusSchema = z.object({
  status: z.enum([
    "REQUESTED",
    "SCHEDULED",
    "ASSIGNED",
    "EN_ROUTE",
    "IN_PROGRESS",
    "COMPLETED",
    "INVOICED",
    "PAID",
    "CANCELLED",
  ]),
});

router.get("/", async (req, res, next) => {
  try {
    res.json(await listJobs(req, { status: req.query.status, technicianId: req.query.technicianId }));
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    res.json(await getJob(req, req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post("/", requireRole("OWNER", "DISPATCHER"), async (req, res, next) => {
  try {
    const parsed = createJobSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
    res.status(201).json(await createJob(req, parsed.data));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/status", requireRole("OWNER", "DISPATCHER", "TECHNICIAN"), async (req, res, next) => {
  try {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
    res.json(await updateStatus(req, req.params.id, parsed.data.status));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/assign", requireRole("OWNER", "DISPATCHER"), async (req, res, next) => {
  try {
    const parsed = z.object({ technicianId: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
    res.json(await assignTechnician(req, req.params.id, parsed.data.technicianId));
  } catch (err) {
    next(err);
  }
});

export default router;
