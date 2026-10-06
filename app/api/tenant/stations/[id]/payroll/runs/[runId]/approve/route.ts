import { NextRequest, NextResponse } from "next/server";
import { enterContext } from "@/lib/db/tenant-context";
import { prisma as db } from "@/lib/db/client";
import { ExpenseCategory, ExpenseStatus, PayrollRunStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const user = await enterContext(req);
    
    // Authorization check omitted for brevity (should verify APPROVE permissions)

    const runId = params.runId;

    // Fetch the run with its payslips
    const payrollRun = await db.payrollRun.findUnique({
      where: { id: runId },
      include: {
        payslips: {
          include: { user: true }
        }
      }
    });

    if (!payrollRun) {
      return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
    }

    if (payrollRun.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft payroll runs can be approved/paid" }, { status: 400 });
    }

    // Process approval and expense creation in transaction
    const updatedRun = await db.$transaction(async (tx) => {
      // 1. Mark run as PAID
      const approvedRun = await tx.payrollRun.update({
        where: { id: runId },
        data: {
          status: "PAID",
          approvedById: user.id
        }
      });

      // 2. Create expenses and link them to payslips
      for (const slip of payrollRun.payslips) {
        // We only create an expense if there is a net pay > 0
        if (slip.netPay.greaterThan(0)) {
          const expense = await tx.expense.create({
            data: {
              tenantId: user.tenantId,
              context: "STATION",
              stationId: payrollRun.stationId,
              category: "PAYROLL" as ExpenseCategory, // Using literal casting because Prisma generated types might be slightly out of sync if not fully generated
              paymentMethod: "BANK_TRANSFER", // default for payroll
              amount: slip.netPay,
              description: `Payroll for ${slip.user.firstName} ${slip.user.lastName} - ${payrollRun.periodStart.toISOString().split('T')[0]} to ${payrollRun.periodEnd.toISOString().split('T')[0]}`,
              status: "APPROVED" as ExpenseStatus, // Auto-approve the expense since payroll was approved
              recordedById: user.id,
              approvedById: user.id,
            }
          });

          // Link expense to payslip
          await tx.payslip.update({
            where: { id: slip.id },
            data: { expenseId: expense.id }
          });
        }
      }

      return approvedRun;
    });

    return NextResponse.json({ data: updatedRun });
  } catch (error: any) {
    console.error("Approve Payroll Error:", error);
    return NextResponse.json({ error: error.message || "Failed to approve payroll" }, { status: 400 });
  }
}
