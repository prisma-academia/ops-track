import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import argon2 from "argon2";
import "dotenv/config";
import { ALL_TENANT_PERMISSION_KEYS } from "../lib/auth/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenantName = "Fleet Testing Tenant";
  const userEmail = "fleet@test.com";
  const userPassword = "password123";

  // Check if tenant already exists
  let tenant = await prisma.tenant.findFirst({
    where: { name: tenantName }
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug: "fleet-testing-tenant",
        status: "ACTIVE",
        settingsJson: "{}",
        activeModules: ["FLEET", "STATIONS"],
      }
    });
    console.log(`Created tenant: ${tenantName} (ID: ${tenant.id})`);
  } else {
    // Ensure FLEET module is active
    if (!tenant.activeModules.includes("FLEET")) {
      tenant = await prisma.tenant.update({
        where: { id: tenant.id },
        data: { activeModules: { push: "FLEET" } }
      });
      console.log(`Enabled FLEET module for tenant: ${tenantName}`);
    } else {
      console.log(`Tenant ${tenantName} already exists and has FLEET enabled.`);
    }
  }

  // Ensure role template
  const roleName = "Tenant Super Admin";
  let role = await prisma.roleTemplate.findFirst({
    where: { tenantId: tenant.id, name: roleName }
  });

  if (!role) {
    role = await prisma.roleTemplate.create({
      data: {
        tenantId: tenant.id,
        scope: "TENANT",
        name: roleName,
        permissions: ALL_TENANT_PERMISSION_KEYS,
        isSystem: true,
      }
    });
  } else {
    // Ensure the role has all permissions including fleet
    await prisma.roleTemplate.update({
      where: { id: role.id },
      data: { permissions: ALL_TENANT_PERMISSION_KEYS }
    });
  }

  // Create or update user
  const passwordHash = await argon2.hash(userPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  await prisma.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: userEmail } },
    update: {
      passwordHash,
      permissions: ALL_TENANT_PERMISSION_KEYS,
    },
    create: {
      tenantId: tenant.id,
      email: userEmail,
      firstName: "Fleet",
      lastName: "Admin",
      passwordHash,
      permissions: ALL_TENANT_PERMISSION_KEYS,
    }
  });

  console.log(`\n======================================`);
  console.log(`Test Tenant & User configured!`);
  console.log(`Login URL: http://localhost:3000/admin/auth/login`);
  console.log(`Email:     ${userEmail}`);
  console.log(`Password:  ${userPassword}`);
  console.log(`Dashboard: http://localhost:3000/admin/fleet`);
  console.log(`======================================\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
