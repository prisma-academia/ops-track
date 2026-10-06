import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enterContext } from "@/lib/db/tenant-context";
import { prisma as db } from "@/lib/db/client";

const generateSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await enterContext(req);
    const stationId = params.id;

    if (!user.stationPermissions.includes("VIEW_ALL_STATIONS") && !user.stationPermissions.includes("MANAGE_STATION")) {
        // Simple permission check (can refine later based on app's actual role)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const json = await req.json();
    const { periodStart, periodEnd } = generateSchema.parse(json);

    // 1. Get all active staff at the station with a payroll profile
    const station = await db.station.findUniqueOrThrow({
      where: { id: stationId },
      include: {
        staff: {
          include: {
            payrollProfile: true,
          }
        }
      }
    });

    const staffWithProfiles = station.staff.filter(s => s.payrollProfile);

    if (staffWithProfiles.length === 0) {
      return NextResponse.json({ error: "No staff with configured payroll profiles found at this station." }, { status: 400 });
    }

    // 2. Create the PayrollRun and draft Payslips in a transaction
    const payrollRun = await db.$transaction(async (tx) => {
      let runTotalAmount = 0;

      // Calculate initial base amounts (draft)
      const payslipCreates = staffWithProfiles.map(staff => {
        const base = Number(staff.payrollProfile!.baseSalary);
        // For a full system, you would pro-rate based on time & attendance here.
        // For phase 1, we generate the fixed base salary draft.
        runTotalAmount += base;
        
        return {
          tenantId: user.tenantId,
          userId: staff.id,
          baseAmount: base,
          totalAllowances: 0,
          totalDeductions: 0,
          netPay: base,
        };
      });

      const newRun = await tx.payrollRun.create({
        data: {
          tenantId: user.tenantId,
          stationId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          status: "DRAFT",
          totalAmount: runTotalAmount,
          payslips: {
            create: payslipCreates,
          }
        },
        include: {
          payslips: true
        }
      });

      return newRun;
    });

    return NextResponse.json({ data: payrollRun });
  } catch (error: any) {
    console.error("Generate Payroll Run Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate payroll run" },
      { status: 400 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await enterContext(req);
    const runs = await db.payrollRun.findMany({
      where: { stationId: params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { payslips: true }
        }
      }
    });
    return NextResponse.json({ data: runs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
