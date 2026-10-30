import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { listCustomers, createCustomer, updateCustomer } from "./customers.service.js";

const router = Router();
router.use(requireAuth);

const customerSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(5).max(300),
});

router.get("/", async (req, res, next) => {
  try {
    res.json(await listCustomers(req, { search: req.query.search }));
  } catch (err) {
    next(err);
  }
});

router.post("/", requireRole("OWNER", "DISPATCHER"), async (req, res, next) => {
  try {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
    res.status(201).json(await createCustomer(req, parsed.data));
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireRole("OWNER", "DISPATCHER"), async (req, res, next) => {
  try {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid input", parsed.error.flatten());
    res.json(await updateCustomer(req, req.params.id, parsed.data));
  } catch (err) {
    next(err);
  }
});

export default router;
