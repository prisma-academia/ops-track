import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import argon2 from "argon2";
import "dotenv/config";

import {
  ALL_PERMISSIONS,
  ALL_PLATFORM_PERMISSION_KEYS,
  ALL_TENANT_PERMISSION_KEYS,
  TENANT_BUILTIN_ROLES,
} from "../lib/auth/permissions";

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

  await ensurePlatformRole(
    "Platform Super Admin",
    ALL_PLATFORM_PERMISSION_KEYS,
  );

  console.log("Seeding Platform Admin...");
  const adminEmail = "amuhmammadmusaa@gmail.com";
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || "password123";

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  const adminData = {
    email: adminEmail,
    passwordHash,
    firstName: "Auwal",
    lastName: "Muhammad",
    mustChangePassword: false,
    isSuperAdmin: true,
    status: "ACTIVE" as const,
    permissions: ALL_PLATFORM_PERMISSION_KEYS,
  };

  const existingAdmin =
    (await prisma.platformUser.findUnique({ where: { email: adminEmail } })) ??
    (await prisma.platformUser.findFirst({
      where: {
        email: {
          in: ["admin@rafuel.com", "admin@prismaforge.ng"],
        },
      },
    }));

  if (existingAdmin) {
    await prisma.platformUser.update({
      where: { id: existingAdmin.id },
      data: adminData,
    });
  } else {
    await prisma.platformUser.create({ data: adminData });
  }

  console.log("Platform admin seeded.");

  const tenantPasswordHash = await argon2.hash("password123", {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  console.log("Seeding tenant SAHAF NIG LTD...");
  const tenant = await prisma.tenant.upsert({
    where: { slug: "sahaf" },
    update: {
      name: "SAHAF NIG LTD",
      status: "ACTIVE",
      companyEmail: "assunusi@gmail.com",
      city: "Kano",
      region: "Kano",
      country: "NG",
      activeModules: ["FLEET", "STATION"],
    },
    create: {
      slug: "sahaf",
      name: "SAHAF NIG LTD",
      status: "ACTIVE",
      companyEmail: "assunusi@gmail.com",
      city: "Kano",
      region: "Kano",
      country: "NG",
      activeModules: ["FLEET", "STATION"],
    },
  });

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
      update: { permissions: [...r.permissions], isSystem: true },
      create: {
        scope: "TENANT",
        tenantId: tenant.id,
        name: r.name,
        permissions: [...r.permissions],
        isSystem: true,
        module: r.module,
      },
    });
  }

  const ownerEmail = "assunusi@gmail.com";
  const ownerData = {
    email: ownerEmail,
    passwordHash: tenantPasswordHash,
    firstName: "Chairman",
    lastName: "SAHAF",
    mustChangePassword: false,
    isOwner: true,
    status: "ACTIVE" as const,
    stationPermissions: [...ALL_TENANT_PERMISSION_KEYS],
    fleetPermissions: [...ALL_TENANT_PERMISSION_KEYS],
    activeModules: ["STATION", "FLEET"],
  };

  const existingOwner =
    (await prisma.tenantUser.findUnique({
      where: {
        tenantId_email: { tenantId: tenant.id, email: ownerEmail },
      },
    })) ??
    (await prisma.tenantUser.findFirst({
      where: {
        tenantId: tenant.id,
        email: "khalifamaigoro+sahaf@gmail.com",
      },
    }));

  const owner = existingOwner
    ? await prisma.tenantUser.update({
        where: { id: existingOwner.id },
        data: ownerData,
      })
    : await prisma.tenantUser.create({
        data: { tenantId: tenant.id, ...ownerData },
      });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { ownerUserId: owner.id },
  });

  const organization = await prisma.organization.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: "asa-oil-nig-ltd",
      },
    },
    update: {
      name: "A.S.A OIL NIG LTD",
      type: "INTERNAL",
      state: "Kano",
      lga: "Takai",
      ownerId: owner.id,
    },
    create: {
      tenantId: tenant.id,
      name: "A.S.A OIL NIG LTD",
      slug: "asa-oil-nig-ltd",
      type: "INTERNAL",
      state: "Kano",
      lga: "Takai",
      ownerId: owner.id,
    },
  });

  const stationsSeed = [
    { code: "ASA-TAK-01", place: "TAKAI", location: "Takai, Kano", state: "Kano", lga: "Takai" },
    {
      code: "ASA-KHU-01",
      place: "KWANAR HUGUMA",
      location: "Kwanar Huguma, Kano",
      state: "Kano",
      lga: "Kwanar Huguma",
    },
    {
      code: "ASA-BKD-01",
      place: "BIRNIN KUDU",
      location: "Birnin Kudu, Jigawa",
      state: "Jigawa",
      lga: "Birnin Kudu",
    },
    { code: "ASA-BYP-01", place: "BYPASS", location: "Bypass, Kano", state: "Kano", lga: "Kano Municipal" },
    { code: "ASA-FAN-01", place: "FANISAU", location: "Fanisau, Kano", state: "Kano", lga: "Ungogo" },
    { code: "ASA-NIN-01", place: "NINGI", location: "Ningi, Bauchi", state: "Bauchi", lga: "Ningi" },
  ];

  const stationIds: string[] = [];

  for (const s of stationsSeed) {
    const name = `A.S.A OIL ${s.place}`;
    const station = await prisma.station.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: s.code,
        },
      },
      update: {
        name,
        location: s.location,
        state: s.state,
        lga: s.lga,
        organizationId: organization.id,
      },
      create: {
        tenantId: tenant.id,
        organizationId: organization.id,
        code: s.code,
        name,
        location: s.location,
        state: s.state,
        lga: s.lga,
      },
    });

    stationIds.push(station.id);

    const existingTank = await prisma.tank.findFirst({
      where: { stationId: station.id, productType: "PMS" },
    });
    if (existingTank) {
      await prisma.tank.update({
        where: { id: existingTank.id },
        data: {
          name: "PMS Tank 1",
          productType: "PMS",
          capacity: 60000,
          status: "ACTIVE",
        },
      });
    } else {
      await prisma.tank.create({
        data: {
          tenantId: tenant.id,
          stationId: station.id,
          name: "PMS Tank 1",
          productType: "PMS",
          capacity: 60000,
          currentLiters: 0,
          status: "ACTIVE",
        },
      });
    }
  }

  await prisma.tenantUser.update({
    where: { id: owner.id },
    data: {
      stations: { connect: stationIds.map((id) => ({ id })) },
    },
  });

  const transporter =
    (await prisma.transporter.findFirst({
      where: { tenantId: tenant.id, name: "ATLAS TRANSPORT NIG LTD" },
    })) ??
    (await prisma.transporter.create({
      data: {
        tenantId: tenant.id,
        name: "ATLAS TRANSPORT NIG LTD",
        email: "ops@atlastransport.ng",
        phone: "08012345678",
        registrationNumber: "RC-ATL-001",
        businessType: "Fuel Haulage",
        contactPerson: "Ibrahim Atlas",
        contactPhone: "08012345678",
        contactPosition: "Operations Manager",
        state: "Kano",
        lga: "Takai",
        address: "Takai, Kano",
        ownership: "EXTERNAL",
        status: "ACTIVE",
        isActive: true,
      },
    }));

  const trucksSeed = [
    {
      name: "ATL-001",
      truckNumber: "ATL-001",
      plateNumber: "KN 451 ATL",
      truckBrand: "MAN",
      model: "TGS 33.480",
      truckType: "Articulated Tanker",
      fuelType: "Diesel",
      capacityLiters: 45000,
    },
    {
      name: "ATL-002",
      truckNumber: "ATL-002",
      plateNumber: "KN 452 ATL",
      truckBrand: "Mercedes-Benz",
      model: "Actros 2645",
      truckType: "Articulated Tanker",
      fuelType: "Diesel",
      capacityLiters: 45000,
    },
    {
      name: "ATL-003",
      truckNumber: "ATL-003",
      plateNumber: "KN 453 ATL",
      truckBrand: "Scania",
      model: "R450",
      truckType: "Bridger",
      fuelType: "Diesel",
      capacityLiters: 50000,
    },
  ];

  for (const truck of trucksSeed) {
    const existingTruck = await prisma.truck.findFirst({
      where: {
        tenantId: tenant.id,
        transporterId: transporter.id,
        plateNumber: truck.plateNumber,
      },
    });
    if (!existingTruck) {
      await prisma.truck.create({
        data: {
          tenantId: tenant.id,
          transporterId: transporter.id,
          ...truck,
          status: "ACTIVE",
          isActive: true,
        },
      });
    }
  }

  const existingDriver = await prisma.driver.findFirst({
    where: {
      tenantId: tenant.id,
      transporterId: transporter.id,
      firstName: "Musa",
      lastName: "Abdullahi",
    },
  });
  if (!existingDriver) {
    await prisma.driver.create({
      data: {
        tenantId: tenant.id,
        transporterId: transporter.id,
        firstName: "Musa",
        lastName: "Abdullahi",
        phone: "08098765432",
        licenseNumber: "KN-DL-88421",
        licenseExpiryDate: new Date("2028-12-31"),
        address: "Takai, Kano",
        status: "ACTIVE",
        isActive: true,
      },
    });
  }

  console.log(
    `Tenant ${tenant.slug} seeded with org ${organization.name}, ${stationIds.length} stations (60,000 L PMS each), transporter ${transporter.name} (3 trucks, 1 driver).`,
  );
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
