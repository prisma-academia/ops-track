import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Un-extended Prisma client. The tenant-scope guard extension is NOT applied.
 *
 * ONLY for scripts that run outside any request context and legitimately need
 * cross-tenant access: `prisma/seed.ts`, one-off migration/maintenance scripts.
 * Never import this from `app/**` or `lib/**` request code.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const rawPrisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
