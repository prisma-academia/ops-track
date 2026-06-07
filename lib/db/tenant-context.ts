import { AsyncLocalStorage } from "node:async_hooks";

export type ContextMode = "platform" | "tenant-admin" | "tenant-client";

export type RequestContext = {
  mode: ContextMode;
  tenantId: string | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T> | T): Promise<T> | T {
  return storage.run(ctx, fn);
}

/**
 * Bind `ctx` for the remainder of the current async execution (and all
 * following awaited calls) without a callback. Used by auth guards / page
 * loaders so the Prisma tenant-scope guard covers the whole request handler.
 */
export function enterContext(ctx: RequestContext): void {
  storage.enterWith(ctx);
}

export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

export function requireContext(): RequestContext {
  const ctx = storage.getStore();
  if (!ctx) throw new Error("No request context. Wrap with runWithContext().");
  return ctx;
}

export function requireTenantId(): string {
  const ctx = requireContext();
  if (!ctx.tenantId) throw new Error("Tenant context required but none set.");
  return ctx.tenantId;
}
