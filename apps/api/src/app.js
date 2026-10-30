import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/errors.js";
import authRoutes from "./modules/auth/auth.routes.js";
import jobRoutes from "./modules/jobs/jobs.routes.js";
import customerRoutes from "./modules/customers/customers.routes.js";
import technicianRoutes from "./modules/technicians/technicians.routes.js";
import photoRoutes from "./modules/photos/photos.routes.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  // Photos first: its two-segment paths (/:jobId/photos) can't collide with
  // the jobs router's single-segment routes.
  app.use("/api/jobs", photoRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/technicians", technicianRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
