import { Prisma } from "@/lib/generated/prisma/client";
import { resolveRequestContext } from "@/lib/db/resolve-context";
import { isScopedModel } from "@/lib/db/scoped-models";

/**
 * Tenant-scoping Prisma client extension (PRD §7.2 / §16.2).
 *
 * Defense-in-depth: every query against a tenant-scoped model is bound to the
 * tenant resolved for the request (`lib/db/resolve-context.ts`: explicit ALS →
 * session cookie → host subdomain). Manual `where: { tenantId }` filters in
 * call sites are AND-merged and remain valid.
 *
 * Platform context is trusted and passes through unfiltered (PRD: platform may
 * read across tenants). Fail-closed: a tenant-scoped query with no resolvable
 * context throws, so a misconfigured path errors loudly instead of leaking.
 */

// AND-wrap is safe: these accept arbitrary filter `where`.
const MANY_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "updateManyAndReturn",
  "deleteMany",
]);

// `update`/`delete` require a unique selector at the TOP level of `where`
// (extendedWhereUnique allows extra sibling filters, but not an AND-wrap that
// hides the unique field). Merge `tenantId` as a sibling instead.
const UNIQUE_WRITE_OPS = new Set(["update", "delete"]);

const UNIQUE_READ_OPS = new Set(["findUnique", "findUniqueOrThrow"]);
const CREATE_OPS = new Set(["create", "createMany", "createManyAndReturn"]);

class TenantScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantScopeError";
  }
}

function injectTenantIntoData(data: unknown, tenantId: string): void {
  const rows = Array.isArray(data) ? data : [data];
  for (const row of rows) {
    if (row && typeof row === "object") {
      const r = row as Record<string, unknown>;
      if (r.tenantId === undefined || r.tenantId === null) {
        r.tenantId = tenantId;
      } else if (r.tenantId !== tenantId) {
        throw new TenantScopeError(
          `Cross-tenant write blocked: data.tenantId does not match request context.`
        );
      }
    }
  }
}

export function tenantGuardExtension() {
  return Prisma.defineExtension({
    name: "tenant-scope-guard",
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: any) {
          if (!isScopedModel(model)) return query(args);

          const ctx = await resolveRequestContext();
          if (!ctx) {
            throw new TenantScopeError(
              `Query on tenant-scoped model "${model}" with no resolvable request ` +
                `context (no ALS binding, session cookie, or known tenant host).`
            );
          }

          // Platform context: trusted, query across tenants unfiltered.
          if (ctx.tenantId === null) {
            return query(args);
          }

          const tenantId = ctx.tenantId;

          if (MANY_OPS.has(operation)) {
            const a = (args ?? {}) as { where?: unknown };
            a.where = { AND: [a.where ?? {}, { tenantId }] };
            return query(a);
          }

          if (UNIQUE_WRITE_OPS.has(operation)) {
            const a = (args ?? {}) as { where?: Record<string, unknown> };
            a.where = { ...(a.where ?? {}), tenantId };
            return query(a);
          }

          if (CREATE_OPS.has(operation)) {
            const a = (args ?? {}) as { data?: unknown };
            if (a.data !== undefined) injectTenantIntoData(a.data, tenantId);
            return query(a);
          }

          if (UNIQUE_READ_OPS.has(operation)) {
            const a = (args ?? {}) as { select?: Record<string, unknown> };
            const hasSelect = !!a.select;
            const originalTenantIdSelected = a.select?.tenantId;
            let modifiedArgs = args;
            if (hasSelect && !originalTenantIdSelected) {
              modifiedArgs = {
                ...a,
                select: {
                  ...a.select,
                  tenantId: true,
                },
              };
            }

            const res = await query(modifiedArgs);
            if (res == null) return res;
            if ((res as { tenantId?: unknown }).tenantId !== tenantId) {
              if (operation === "findUniqueOrThrow") {
                throw new Prisma.PrismaClientKnownRequestError(
                  "No record found for the given criteria.",
                  { code: "P2025", clientVersion: Prisma.prismaVersion.client }
                );
              }
              return null;
            }

            if (hasSelect && !originalTenantIdSelected) {
              delete (res as { tenantId?: unknown }).tenantId;
            }
            return res;
          }

          if (operation === "upsert") {
            const a = (args ?? {}) as { create?: unknown; where?: unknown };
            if (a.create !== undefined) injectTenantIntoData(a.create, tenantId);
            const res = await query(a);
            if (res && (res as { tenantId?: unknown }).tenantId !== tenantId) {
              throw new TenantScopeError(
                `Cross-tenant upsert blocked on model "${model}".`
              );
            }
            return res;
          }

          return query(args);
        },
      },
    },
    client: {
      $queryRaw() {
        throw new TenantScopeError(
          "Raw SQL is forbidden (AGENTS.md §16.2): no tenant-scope bypass."
        );
      },
      $executeRaw() {
        throw new TenantScopeError(
          "Raw SQL is forbidden (AGENTS.md §16.2): no tenant-scope bypass."
        );
      },
      $queryRawUnsafe() {
        throw new TenantScopeError(
          "Raw SQL is forbidden (AGENTS.md §16.2): no tenant-scope bypass."
        );
      },
      $executeRawUnsafe() {
        throw new TenantScopeError(
          "Raw SQL is forbidden (AGENTS.md §16.2): no tenant-scope bypass."
        );
      },
    },
  });
}

export { TenantScopeError };
