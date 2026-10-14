import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { handleError, DomainError } from "@/lib/api/errors";
import { createDatabaseBackupStream } from "@/lib/db/backup";

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(
      PERMISSIONS.PLATFORM_SETTINGS_WRITE.key,
    );
    const meta = requestMeta(request);

    let backup: ReturnType<typeof createDatabaseBackupStream>;
    try {
      backup = createDatabaseBackupStream();
    } catch (e) {
      throw new DomainError(
        503,
        "backup_unavailable",
        "Could not start database backup. Ensure PostgreSQL client tools (pg_dump) are installed on the server.",
      );
    }

    await audit({
      actorType: "PLATFORM_USER",
      actorId: actor.userId,
      action: "platform.database.backup",
      tenantId: null,
      targetType: "Database",
      targetId: "postgresql",
      after: { filename: backup.filename } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return new Response(backup.stream, {
      status: 200,
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${backup.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
