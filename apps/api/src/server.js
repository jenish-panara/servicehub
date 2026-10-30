import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/db.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`ServiceHub API listening on http://localhost:${env.port}`);
});

// Graceful shutdown
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
