import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import argon2 from "argon2";
import "dotenv/config";

import { ALL_PERMISSIONS, ALL_PLATFORM_PERMISSION_KEYS, TENANT_BUILTIN_ROLES } from "../lib/auth/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, description: p.description },
      create: p,
    });
  }

  await ensurePlatformRole("Platform Super Admin", ALL_PLATFORM_PERMISSION_KEYS);

  console.log("Seeding Platform Admin...");
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL || "admin@rafuel.com";
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || "password123";

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  await prisma.platformUser.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: passwordHash,
      isSuperAdmin: true,
      mustChangePassword: false,
      permissions: ALL_PLATFORM_PERMISSION_KEYS,
    },
    create: {
      email: adminEmail,
      passwordHash: passwordHash,
      firstName: "Super",
      lastName: "Admin",
      mustChangePassword: false,
      isSuperAdmin: true,
      status: "ACTIVE",
      permissions: ALL_PLATFORM_PERMISSION_KEYS,
    },
  });

  console.log("Seeding Demo Tenants...");

  const tenants = [
    { slug: "fleet-only", name: "Acme Logistics", modules: ["FLEET"], email: "owner@fleetonly.com" },
    { slug: "station-only", name: "Acme Retail", modules: ["STATION"], email: "owner@stationonly.com" },
    { slug: "hybrid-co", name: "Acme Energy Corp", modules: ["FLEET", "STATION"], email: "owner@hybridco.com" }
  ];

  for (const t of tenants) {
    let tenant = await prisma.tenant.findUnique({ where: { slug: t.slug } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          slug: t.slug,
          name: t.name,
          activeModules: t.modules,
          companyEmail: t.email,
        }
      });
      console.log(`Created tenant: ${t.name}`);

      const user = await prisma.tenantUser.create({
        data: {
          tenantId: tenant.id,
          email: t.email,
          passwordHash: passwordHash,
          firstName: "Demo",
          lastName: "Owner",
          isOwner: true,
          mustChangePassword: false,
        }
      });

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { ownerUserId: user.id }
      });
      
      // Ensure role templates are present
      for (const role of Object.values(TENANT_BUILTIN_ROLES)) {
        if (t.modules.includes(role.module as any)) {
          await prisma.roleTemplate.create({
             data: {
               scope: "TENANT",
               tenantId: tenant.id,
               name: role.name,
               module: role.module as any,
               permissions: role.permissions,
               isSystem: true
             }
          });
        }
      }
    } else {
      console.log(`Tenant ${t.name} already exists.`);
    }
  }
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
