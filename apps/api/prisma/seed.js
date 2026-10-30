import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Services Co.", slug: "demo" },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "owner@demo.test" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "owner@demo.test",
      passwordHash,
      name: "Demo Owner",
      role: "OWNER",
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "dispatcher@demo.test" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "dispatcher@demo.test",
      passwordHash,
      name: "Demo Dispatcher",
      role: "DISPATCHER",
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "tech@demo.test" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "tech@demo.test",
      passwordHash,
      name: "Demo Technician",
      role: "TECHNICIAN",
    },
  });

  const tech = await prisma.technician.create({
    data: {
      tenantId: tenant.id,
      name: "Ravi Kumar",
      phone: "+91-90000-00001",
      skills: ["plumbing", "electrical"],
      zone: "north",
    },
  });

  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: "Asha Sharma",
      phone: "+91-90000-00002",
      address: "12 MG Road",
    },
  });

  await prisma.job.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      title: "Leaking kitchen tap",
      address: "12 MG Road",
      status: "REQUESTED",
    },
  });

  console.log("Seeded tenant 'demo'. Logins (password: password123):");
  console.log("  owner@demo.test / dispatcher@demo.test / tech@demo.test");
  console.log(`Seeded 1 technician (${tech.name}) and 1 job.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
