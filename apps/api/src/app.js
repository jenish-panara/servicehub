import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/errors.js";
import authRoutes from "./modules/auth/auth.routes.js";
import jobRoutes from "./modules/jobs/jobs.routes.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/jobs", jobRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
