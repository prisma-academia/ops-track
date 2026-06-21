import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    await requireTenantActor(PERMISSIONS.TENANT_OPERATIONS_READ.key);

    const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
    const depots = await prisma.depot.findMany({ orderBy: { name: "asc" } });
    const transportCompanies = await prisma.transportCompany.findMany({ orderBy: { name: "asc" } });

    return NextResponse.json({ suppliers, depots, transportCompanies });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireTenantActor(PERMISSIONS.TENANT_OPERATIONS_WRITE.key);

    const body = await req.json();
    const { type, name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (type === "supplier") {
      const created = await prisma.supplier.upsert({
        where: { name: name.trim() },
        update: {},
        create: { name: name.trim() }
      });
      return NextResponse.json({ data: created });
    } else if (type === "depot") {
      const created = await prisma.depot.upsert({
        where: { name: name.trim() },
        update: {},
        create: { name: name.trim() }
      });
      return NextResponse.json({ data: created });
    } else if (type === "transportCompany") {
      const created = await prisma.transportCompany.upsert({
        where: { name: name.trim() },
        update: {},
        create: { name: name.trim() }
      });
      return NextResponse.json({ data: created });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
