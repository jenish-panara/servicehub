import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Extra demo customers + jobs across every board column, so the dispatch
// board looks alive. Safe to re-run: existing entries are skipped by name.
async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: "demo" } });
  if (!tenant) throw new Error("Run the main seed first: npm run db:seed");

  const techs = await prisma.technician.findMany({ where: { tenantId: tenant.id } });
  const techByName = Object.fromEntries(techs.map((t) => [t.name, t]));
  const pick = (name) => techByName[name]?.id ?? null;

  const customersData = [
    { name: "Vikram Mehta", phone: "+91-90000-00010", address: "45 Lake View Apartments" },
    { name: "Priya Nair", phone: "+91-90000-00011", address: "8 Rose Villa, Green Park" },
    { name: "Arjun Desai", phone: "+91-90000-00012", address: "221B Station Road" },
    { name: "Fatima Sheikh", phone: "+91-90000-00013", address: "17 Palm Grove, Sector 9" },
    { name: "Karan Malhotra", phone: "+91-90000-00014", address: "90 Hilltop Enclave" },
    { name: "Deepa Iyer", phone: "+91-90000-00015", address: "3 Marigold Street" },
  ];

  const customers = {};
  for (const data of customersData) {
    let customer = await prisma.customer.findFirst({
      where: { tenantId: tenant.id, name: data.name },
    });
    if (!customer) {
      customer = await prisma.customer.create({ data: { ...data, tenantId: tenant.id } });
      console.log(`customer: + ${data.name}`);
    }
    customers[data.name] = customer;
  }

  const scheduledFor = (daysFromNow, hour) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const jobsData = [
    // REQUESTED — waiting for dispatch
    { title: "AC not cooling", customer: "Vikram Mehta", address: customersData[0].address, status: "REQUESTED" },
    { title: "Bathroom drain blocked", customer: "Priya Nair", address: customersData[1].address, status: "REQUESTED" },
    { title: "Fan making noise", customer: "Arjun Desai", address: customersData[2].address, status: "REQUESTED" },
    // ASSIGNED — technician booked
    { title: "Kitchen tap replacement", customer: "Fatima Sheikh", address: customersData[3].address, status: "ASSIGNED", technician: "Suresh Yadav", scheduledFor: scheduledFor(1, 10) },
    { title: "Wiring check after trip", customer: "Karan Malhotra", address: customersData[4].address, status: "ASSIGNED", technician: "Rahul Mistri", scheduledFor: scheduledFor(1, 15) },
    // EN_ROUTE — technician travelling
    { title: "Geyser leaking", customer: "Deepa Iyer", address: customersData[5].address, status: "EN_ROUTE", technician: "Suresh Yadav" },
    // IN_PROGRESS — work under way
    { title: "Socket installation (3 rooms)", customer: "Vikram Mehta", address: customersData[0].address, status: "IN_PROGRESS", technician: "Rahul Mistri" },
    // COMPLETED — awaiting invoice
    { title: "Washing machine pipe fix", customer: "Priya Nair", address: customersData[1].address, status: "COMPLETED", technician: "Suresh Yadav" },
    // CANCELLED — customer changed plans
    { title: "Minor paint touch-up", customer: "Arjun Desai", address: customersData[2].address, status: "CANCELLED" },
  ];

  for (const data of jobsData) {
    const exists = await prisma.job.findFirst({
      where: { tenantId: tenant.id, title: data.title },
    });
    if (exists) {
      console.log(`job:      = ${data.title} (already exists)`);
      continue;
    }
    await prisma.job.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[data.customer].id,
        title: data.title,
        address: data.address,
        status: data.status,
        technicianId: data.technician ? pick(data.technician) : null,
        scheduledFor: data.scheduledFor ?? null,
      },
    });
    console.log(`job:      + ${data.title} [${data.status}]`);
  }

  const total = await prisma.job.count({ where: { tenantId: tenant.id } });
  console.log(`\nDone — tenant 'demo' now has ${total} jobs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
