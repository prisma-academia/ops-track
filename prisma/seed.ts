import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import argon2 from "argon2";
import "dotenv/config";

import { ALL_PERMISSIONS, ALL_PLATFORM_PERMISSION_KEYS, ALL_TENANT_PERMISSION_KEYS, TENANT_BUILTIN_ROLES } from "../lib/auth/permissions";

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

  // --- SAHAF SEEDING ---
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

  // Create Organizations
  const internalOrg = await prisma.organization.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "sahaf-internal" } },
    update: { type: "INTERNAL", name: "SAHAF Internal" },
    create: {
      tenantId: tenant.id,
      name: "SAHAF Internal",
      slug: "sahaf-internal",
      type: "INTERNAL",
    }
  });

  const dangoteOrg = await prisma.organization.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "dangote" } },
    update: { type: "EXTERNAL", name: "Dangote Fuel" },
    create: {
      tenantId: tenant.id,
      name: "Dangote Fuel",
      slug: "dangote",
      type: "EXTERNAL",
    }
  });

  const buaOrg = await prisma.organization.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "bua" } },
    update: { type: "EXTERNAL", name: "BUA Group" },
    create: {
      tenantId: tenant.id,
      name: "BUA Group",
      slug: "bua",
      type: "EXTERNAL",
    }
  });

  // Fleet Owner (Fleet-wide access)
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
      organizationId: null, // Fleet-wide
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
      organizationId: null, // Fleet-wide
    },
  });

  // Fleet Admin (Fleet-wide access)
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
      organizationId: null, // Fleet-wide
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
      organizationId: null, // Fleet-wide
    },
  });

  // Org-scoped Owner (Dangote)
  await prisma.tenantUser.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "dangote@gmail.com",
      },
    },
    update: {
      passwordHash: tenantPasswordHash,
      firstName: "Dangote",
      lastName: "Owner",
      isOwner: false, // Not tenant owner, just org scoped
      activeModules: ["STATION"],
      stationPermissions: ALL_TENANT_PERMISSION_KEYS,
      fleetPermissions: [],
      organizationId: dangoteOrg.id,
    },
    create: {
      tenantId: tenant.id,
      email: "dangote@gmail.com",
      passwordHash: tenantPasswordHash,
      firstName: "Dangote",
      lastName: "Owner",
      mustChangePassword: false,
      isOwner: false,
      status: "ACTIVE",
      activeModules: ["STATION"],
      stationPermissions: ALL_TENANT_PERMISSION_KEYS,
      fleetPermissions: [],
      organizationId: dangoteOrg.id,
    },
  });

  // Org-scoped Owner (BUA)
  await prisma.tenantUser.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "bua@gmail.com",
      },
    },
    update: {
      passwordHash: tenantPasswordHash,
      firstName: "BUA",
      lastName: "Owner",
      isOwner: false,
      activeModules: ["STATION"],
      stationPermissions: ALL_TENANT_PERMISSION_KEYS,
      fleetPermissions: [],
      organizationId: buaOrg.id,
    },
    create: {
      tenantId: tenant.id,
      email: "bua@gmail.com",
      passwordHash: tenantPasswordHash,
      firstName: "BUA",
      lastName: "Owner",
      mustChangePassword: false,
      isOwner: false,
      status: "ACTIVE",
      activeModules: ["STATION"],
      stationPermissions: ALL_TENANT_PERMISSION_KEYS,
      fleetPermissions: [],
      organizationId: buaOrg.id,
    },
  });

  // Seed some stations
  const stations = [
    { code: "SAHAF-01", name: "SAHAF Station Kano", orgId: internalOrg.id },
    { code: "DAN-01", name: "Dangote Station 1", orgId: dangoteOrg.id },
    { code: "BUA-01", name: "BUA Station 1", orgId: buaOrg.id }
  ];

  for (const s of stations) {
    await prisma.station.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: s.code } },
      update: { name: s.name, organizationId: s.orgId },
      create: {
        tenantId: tenant.id,
        organizationId: s.orgId,
        code: s.code,
        name: s.name,
      }
    });
  }

  console.log(`Seed complete.`);
  console.log(`Tenant User 1 (Fleet): ${tenantUserEmail} (Password: password123)`);
  console.log(`Tenant User 2 (Fleet): assunusi@gmail.com (Password: password123)`);
  console.log(`Tenant User 3 (Dangote Org): dangote@gmail.com (Password: password123)`);
  console.log(`Tenant User 4 (BUA Org): bua@gmail.com (Password: password123)`);
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
