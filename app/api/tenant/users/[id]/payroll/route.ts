import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enterContext } from "@/lib/db/tenant-context";
import { prisma as db } from "@/lib/db/client";

const profileSchema = z.object({
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR"]),
  salaryType: z.enum(["MONTHLY", "WEEKLY", "HOURLY"]),
  baseSalary: z.number().min(0),
  paymentDay: z.number().min(1).max(31).optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await enterContext(req);
    // Add appropriate role check
    const json = await req.json();
    const data = profileSchema.parse(json);

    const profile = await db.payrollProfile.upsert({
      where: {
        userId: params.id,
      },
      update: {
        employmentType: data.employmentType,
        salaryType: data.salaryType,
        baseSalary: data.baseSalary,
        paymentDay: data.paymentDay,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
      },
      create: {
        tenantId: user.tenantId,
        userId: params.id,
        employmentType: data.employmentType,
        salaryType: data.salaryType,
        baseSalary: data.baseSalary,
        paymentDay: data.paymentDay,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
      },
    });

    return NextResponse.json({ data: profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await enterContext(req);
    const profile = await db.payrollProfile.findUnique({
      where: { userId: params.id },
    });
    
    return NextResponse.json({ data: profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
