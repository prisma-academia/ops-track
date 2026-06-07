import { prisma } from "@/lib/db/client";
import { isValidSlug, RESERVED_SLUGS } from "@/lib/auth/context";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";

const QUARANTINE_DAYS = 90;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = (url.searchParams.get("slug") ?? "").trim().toLowerCase();
    if (!slug) return ok({ slug, available: false, reason: "missing" });
    if (RESERVED_SLUGS.has(slug)) return ok({ slug, available: false, reason: "reserved" });
    if (!isValidSlug(slug)) return ok({ slug, available: false, reason: "invalid" });
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (!existing) return ok({ slug, available: true });
    if (existing.status === "ARCHIVED" && existing.archivedAt) {
      const cutoff = new Date(existing.archivedAt.getTime() + QUARANTINE_DAYS * 24 * 60 * 60 * 1000);
      if (Date.now() < cutoff.getTime()) {
        return ok({ slug, available: false, reason: "quarantined" });
      }
      return ok({ slug, available: true });
    }
    return ok({ slug, available: false, reason: "taken" });
  } catch (e) {
    return handleError(e);
  }
}
