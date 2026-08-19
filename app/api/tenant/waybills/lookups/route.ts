import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    const actor = await requireTenantActor(undefined, "STATION");
    if (!hasPermission(actor, PERMISSIONS.TENANT_WAYBILLS_READ.key) && !hasPermission(actor, PERMISSIONS.TENANT_FLEET_READ.key)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
    const depots = await prisma.depot.findMany({ orderBy: { name: "asc" } });
    const transportCompanies = await prisma.transporter.findMany({ orderBy: { name: "asc" } });

    return NextResponse.json({ suppliers, depots, transportCompanies });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireTenantActor(undefined, "STATION");
    if (!hasPermission(actor, PERMISSIONS.TENANT_WAYBILLS_WRITE.key) && !hasPermission(actor, PERMISSIONS.TENANT_FLEET_WRITE.key)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { type, name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const normalizedName = name.trim().toUpperCase();
    if (!normalizedName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (type === "supplier") {
      const created = await prisma.supplier.upsert({
        where: { name: normalizedName },
        update: {},
        create: { name: normalizedName }
      });
      return NextResponse.json({ data: created });
    } else if (type === "depot") {
      let created = await prisma.depot.findFirst({
        where: { name: normalizedName }
      });
      if (!created) {
        created = await prisma.depot.create({
          data: { name: normalizedName, tenantId: actor.tenantId }
        });
      }
      return NextResponse.json({ data: created });
    } else if (type === "transportCompany") {
      let created = await prisma.transporter.findFirst({
        where: { name: name.trim() }
      });
      if (!created) {
        created = await prisma.transporter.create({
          data: { name: name.trim(), tenantId: actor.tenantId }
        });
      }
      return NextResponse.json({ data: created });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
