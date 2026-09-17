import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { audit, requestMeta } from "@/lib/auth/audit";

export async function GET(request: Request) {
  try {
    await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const status = url.searchParams.get("status") ?? undefined;
    const rows = await prisma.demoRequest.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}