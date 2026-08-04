import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import argon2 from "argon2";
import "dotenv/config";

import { ALL_PERMISSIONS, ALL_PLATFORM_PERMISSION_KEYS, ALL_TENANT_PERMISSION_KEYS, TENANT_BUILTIN_ROLES } from "../lib/auth/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
// Platform admin removed based on user request

  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, description: p.description },
      create: p,
    });
  }

  await ensurePlatformRole("Platform Super Admin", ALL_PLATFORM_PERMISSION_KEYS);



  // --- SHAHAF SEEDING ---
  console.log("Seeding SAHAF tenant...");
  const tenantName = "SAHAF NIG LTD";
  const tenantSlug = "sahaf";
  const tenantUserEmail = "khalifamaigoro+sahaf@gmail.com";

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {
      activeModules: ["STATION", "FLEET"],
    },
    create: {
      name: tenantName,
      slug: tenantSlug,
      status: "ACTIVE",
      activeModules: ["STATION", "FLEET"],
    },
  });

  // Seed built-in roles for this tenant
  for (const r of TENANT_BUILTIN_ROLES) {
    await prisma.roleTemplate.upsert({
      where: {
        scope_tenantId_module_name: {
          scope: "TENANT",
          tenantId: tenant.id,
          module: r.module,
          name: r.name,
        },
      },
      update: {
        permissions: r.permissions,
        module: r.module,
      },
      create: {
        scope: "TENANT",
        tenantId: tenant.id,
        name: r.name,
        permissions: r.permissions,
        isSystem: true,
        module: r.module,
      },
    });
  }

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
      firstName: "Muhammad",
      lastName: "Maigoro",
      phone: "0812340000",
      isOwner: true,
      activeModules: ["STATION", "FLEET"],
      stationPermissions: ALL_TENANT_PERMISSION_KEYS,
      fleetPermissions: ALL_TENANT_PERMISSION_KEYS,
    },
    create: {
      tenantId: tenant.id,
      email: tenantUserEmail,
      passwordHash: tenantPasswordHash,
      firstName: "Muhammad",
      lastName: "Maigoro",
      phone: "0812340000",
      mustChangePassword: false,
      isOwner: true,
      status: "ACTIVE",
      activeModules: ["STATION", "FLEET"],
      stationPermissions: ALL_TENANT_PERMISSION_KEYS,
      fleetPermissions: ALL_TENANT_PERMISSION_KEYS,
    },
  });

  // Owner 2
  await prisma.tenantUser.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "assunusi@gmail.com",
      },
    },
    update: {
      passwordHash: tenantPasswordHash,
      firstName: "Chairman",
      lastName: "Sahaf",
      phone: "0000000000",
      isOwner: true,
      activeModules: ["STATION", "FLEET"],
      stationPermissions: ALL_TENANT_PERMISSION_KEYS,
      fleetPermissions: ALL_TENANT_PERMISSION_KEYS,
    },
    create: {
      tenantId: tenant.id,
      email: "assunusi@gmail.com",
      passwordHash: tenantPasswordHash,
      firstName: "Chairman",
      lastName: "Sahaf",
      phone: "0000000000",
      mustChangePassword: false,
      isOwner: true,
      status: "ACTIVE",
      activeModules: ["STATION", "FLEET"],
      stationPermissions: ALL_TENANT_PERMISSION_KEYS,
      fleetPermissions: ALL_TENANT_PERMISSION_KEYS,
    },
  });

  // Admin
  await prisma.tenantUser.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "amuhammadmusaa@gmail.com",
      },
    },
    update: {
      passwordHash: tenantPasswordHash,
      firstName: "Auwal",
      lastName: "Sahaf",
      phone: "0000000000",
      isOwner: false,
      activeModules: ["STATION", "FLEET"],
      stationPermissions: ALL_TENANT_PERMISSION_KEYS,
      fleetPermissions: ALL_TENANT_PERMISSION_KEYS,
    },
    create: {
      tenantId: tenant.id,
      email: "amuhammadmusaa@gmail.com",
      passwordHash: tenantPasswordHash,
      firstName: "Auwal",
      lastName: "Sahaf",
      phone: "0000000000",
      mustChangePassword: false,
      isOwner: false,
      status: "ACTIVE",
      activeModules: ["STATION", "FLEET"],
      stationPermissions: ALL_TENANT_PERMISSION_KEYS,
      fleetPermissions: ALL_TENANT_PERMISSION_KEYS,
    },
  });

  console.log(`Seed complete.`);
  console.log(`Tenant User 1: ${tenantUserEmail} (Password: password123)`);
  console.log(`Tenant User 2: assunusi@gmail.com (Password: password123)`);
  console.log(`Tenant User 3: amuhammadmusaa@gmail.com (Password: password123)`);
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
