import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import argon2 from "argon2";
import "dotenv/config";

import { ALL_PERMISSIONS, ALL_PLATFORM_PERMISSION_KEYS } from "../lib/auth/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL;
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD are required.");
  }

  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, description: p.description },
      create: p,
    });
  }

  await ensurePlatformRole("Platform Super Admin", ALL_PLATFORM_PERMISSION_KEYS);

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  await prisma.platformUser.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      passwordHash,
      isSuperAdmin: true,
      permissions: ALL_PLATFORM_PERMISSION_KEYS,
    },
    create: {
      email: adminEmail.toLowerCase(),
      firstName: "Super",
      lastName: "Admin",
      passwordHash,
      mustChangePassword: true,
      isSuperAdmin: true,
      permissions: ALL_PLATFORM_PERMISSION_KEYS,
    },
  });
  
  const suppliers = ["NNPC", "DANGOTE", "MARKETERS"];
  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { name: s },
      update: {},
      create: { name: s },
    });
  }

  // --- SHAHAF SEEDING ---
  console.log("Seeding SAHAF tenant...");
  const tenantName = "SAHAF NIG LTD";
  const tenantSlug = "sahaf";
  const tenantUserEmail = "khalifamaigoro+sahaf@gmail.com";

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      name: tenantName,
      slug: tenantSlug,
      status: "ACTIVE",
    },
  });

  const tenantPasswordHash = await argon2.hash("password123", {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: tenantUserEmail,
      },
    },
    update: {
      passwordHash: tenantPasswordHash,
      isOwner: true,
    },
    create: {
      tenantId: tenant.id,
      email: tenantUserEmail,
      passwordHash: tenantPasswordHash,
      firstName: "Khalifa",
      lastName: "Maigoro",
      mustChangePassword: false,
      isOwner: true,
      status: "ACTIVE",
    },
  });

  const transportersData = [
    { name: "Transporter A", phone: "08012345671" },
    { name: "Transporter B", phone: "08012345672" },
    { name: "Transporter C", phone: "08012345673" },
  ];

  for (let i = 0; i < transportersData.length; i++) {
    const tData = transportersData[i];
    let transporter = await prisma.transporter.findFirst({
      where: { tenantId: tenant.id, name: tData.name },
    });

    if (!transporter) {
      transporter = await prisma.transporter.create({
        data: {
          tenantId: tenant.id,
          name: tData.name,
          phone: tData.phone,
          status: "ACTIVE",
        },
      });

      await prisma.truck.create({
        data: {
          tenantId: tenant.id,
          transporterId: transporter.id,
          name: `TRK-00${i + 1}`,
          plateNumber: `ABJ-123X${i}`,
          capacityLiters: 45000,
          status: "ACTIVE",
        },
      });

      await prisma.driver.create({
        data: {
          tenantId: tenant.id,
          transporterId: transporter.id,
          firstName: "Driver",
          lastName: `${i + 1}`,
          phone: `0901234567${i}`,
          status: "ACTIVE",
        },
      });
    }
  }

  const stationsData = [
    { code: "ST-01", name: "Shahaf HQ Station" },
    { code: "ST-02", name: "Shahaf Branch 1" },
  ];

  for (let i = 0; i < stationsData.length; i++) {
    const sData = stationsData[i];
    const station = await prisma.station.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: sData.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        code: sData.code,
        name: sData.name,
      },
    });

    const tank = await prisma.tank.findFirst({
      where: { tenantId: tenant.id, stationId: station.id, name: "Main PMS Tank" },
    });

    if (!tank) {
      await prisma.tank.create({
        data: {
          tenantId: tenant.id,
          stationId: station.id,
          name: "Main PMS Tank",
          productType: "PMS",
          capacity: 50000,
          currentLiters: 25000,
          status: "ACTIVE",
        },
      });
    }
  }

  console.log(`Seed complete. Super admin: ${adminEmail.toLowerCase()}`);
  console.log(`Tenant User: ${tenantUserEmail} (Password: password123)`);
}

async function ensurePlatformRole(name: string, permissions: string[]) {
  const existing = await prisma.roleTemplate.findFirst({
    where: { scope: "PLATFORM", tenantId: null, name },
  });
  if (existing) {
    return prisma.roleTemplate.update({
      where: { id: existing.id },
      data: { permissions, isSystem: true },
    });
  }
  return prisma.roleTemplate.create({
    data: { scope: "PLATFORM", name, permissions, isSystem: true },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
