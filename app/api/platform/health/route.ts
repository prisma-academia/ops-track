import { NextResponse } from "next/server";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { checkS3Health } from "@/lib/storage/s3";
import { checkSmtpHealth } from "@/lib/email/transport";
import { checkRedisHealth } from "@/lib/auth/rate-limit";

export async function GET() {
  try {
    // Restrict this endpoint to users who have platform activity read permission.
    await requirePlatformActor(PERMISSIONS.PLATFORM_ACTIVITY_READ.key);

    const [dbResult, s3Result, smtpResult, redisResult] = await Promise.allSettled([
      prisma.tenant.findFirst({ select: { id: true } }).then(() => true).catch(() => false),
      checkS3Health(),
      checkSmtpHealth(),
      checkRedisHealth(),
    ]);

    const dbHealth = dbResult.status === "fulfilled" ? dbResult.value : false;
    const s3Health = s3Result.status === "fulfilled" ? s3Result.value : false;
    const smtpHealth = smtpResult.status === "fulfilled" ? smtpResult.value : false;
    const redisHealth = redisResult.status === "fulfilled" ? redisResult.value : false;

    return NextResponse.json({
      database: dbHealth,
      s3: s3Health, // Actually MinIO
      smtp: smtpHealth,
      redis: redisHealth,
    });
  } catch (error: any) {
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
