import { prisma } from "@/lib/db/client";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

export async function GET(request: Request) {
  try {
    await requirePlatformActor(PERMISSIONS.PLATFORM_ACTIVITY_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const tenantId = url.searchParams.get("tenantId");
    const action = url.searchParams.get("action");

    const rows = await prisma.activityLog.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(action ? { action } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}
