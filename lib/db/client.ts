import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { env } from "@/lib/env";
import { tenantGuardExtension } from "@/lib/db/extension";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

function makeClient() {
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  }).$extends(tenantGuardExtension());
}

type ExtendedPrisma = ReturnType<typeof makeClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrisma;
};

export const prisma: ExtendedPrisma = globalForPrisma.prisma ?? makeClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
