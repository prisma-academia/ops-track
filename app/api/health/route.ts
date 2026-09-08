import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();

  try {
    // Ping database with lightweight query
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "healthy",
        uptimeSeconds: process.uptime(),
        database: {
          connected: true,
          latencyMs,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Database connection failed";

    return NextResponse.json(
      {
        status: "unhealthy",
        uptimeSeconds: process.uptime(),
        database: {
          connected: false,
          latencyMs,
          error: message,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
