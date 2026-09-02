"use client";

import type { ReactNode } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/components/tickets/ticket-badges";
import type { PrintCompanyInfo } from "@/components/print/print-company-context";

const ORIGIN_LABELS: Record<string, string> = {
  SYSTEM: "System",
  MOBILE: "Mobile",
  ADMIN: "Admin",
};

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  FUEL_FOR_GEN: "Generator fuel",
  MAINTENANCE: "Maintenance",
  UTILITIES: "Utilities",
  STATIONERY: "Stationery",
  OTHER: "Other",
};

function personName(
  person?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null,
) {
  if (!person) return "—";
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.email || "—";
}

function money(value: unknown) {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DetailRow({
  label,
  value,
  strong,
  compact,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 border-b border-dashed border-gray-200 last:border-b-0",
        compact ? "py-1 text-[11px]" : "py-2 text-xs",
      )}
    >
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className={cn("truncate text-right text-gray-900", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

export function TicketPrintView({
  ticket,
  company,
}: {
  ticket: any;
  company: PrintCompanyInfo;
}) {
  const ref = ticket.id.substring(0, 8).toUpperCase();
  const children: any[] = Array.isArray(ticket.children) ? ticket.children : [];
  const revisions: any[] = Array.isArray(ticket.spendRevisions) ? ticket.spendRevisions : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Print ticket
        </Button>
      </div>

      <div
        id="ticket-note"
        className="mx-auto w-full max-w-3xl rounded-lg border border-border bg-white text-gray-900 print:rounded-none print:border-0 print:shadow-none"
      >
        <div className="p-6 sm:p-10">
          <div className="mb-6 flex items-start justify-between gap-6 border-b-2 border-gray-100 pb-5">
            <div className="w-36 shrink-0">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logoUrl} alt={`${company.name} logo`} className="max-h-16 max-w-full object-contain" />
              ) : (
                <p className="text-lg font-bold text-gray-900">{company.name}</p>
              )}
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
              {company.address && <p className="mt-1 text-xs text-gray-500">{company.address}</p>}
              <p className="text-xs text-gray-500">
                {[company.email, company.phone].filter(Boolean).join(" • ")}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-900">Ticket</h2>
            <p className="mt-1 text-sm text-gray-500">
              Ref: <span className="font-semibold text-gray-900">{ref}</span>
              &nbsp;•&nbsp; {formatHumanReadableDate(ticket.createdAt)}
            </p>
          </div>

          <div className="mb-4 rounded-lg border border-gray-200 p-4">
            <h3 className="mb-1 border-b border-gray-100 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Ticket details
            </h3>
            <DetailRow label="Title" value={ticket.title} strong compact />
            <DetailRow label="Station" value={ticket.station?.name || "—"} compact />
            <DetailRow
              label="Type"
              value={CATEGORY_LABELS[ticket.category] || ticket.category?.replaceAll("_", " ")}
              compact
            />
            <DetailRow
              label="Status"
              value={STATUS_LABELS[ticket.status] || ticket.status?.replaceAll("_", " ")}
              compact
            />
            <DetailRow label="Raised by" value={personName(ticket.raisedBy)} compact />
            <DetailRow label="Origin" value={ORIGIN_LABELS[ticket.origin] || ticket.origin} compact />
            {ticket.pump?.name && <DetailRow label="Pump" value={ticket.pump.name} compact />}
            {ticket.nozzle?.name && <DetailRow label="Nozzle" value={ticket.nozzle.name} compact />}
          </div>

          {(ticket.requestedAmount != null || ticket.approvedAmount != null || ticket.paidAmount != null) && (
            <div className="mb-4 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-1 border-b border-gray-100 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Spend
              </h3>
              {ticket.requestedAmount != null && (
                <DetailRow label="Requested" value={money(ticket.requestedAmount)} strong compact />
              )}
              {ticket.requestedCategory && (
                <DetailRow
                  label="Category"
                  value={EXPENSE_CATEGORY_LABELS[ticket.requestedCategory] || ticket.requestedCategory}
                  compact
                />
              )}
              {ticket.spendIntent && ticket.spendIntent !== "NONE" && (
                <DetailRow
                  label="Intent"
                  value={ticket.spendIntent === "ALREADY_PAID" ? "Already paid" : "Request"}
                  compact
                />
              )}
              {ticket.approvedAmount != null && (
                <DetailRow label="Approved" value={money(ticket.approvedAmount)} compact />
              )}
              {ticket.paidAmount != null && <DetailRow label="Paid" value={money(ticket.paidAmount)} compact />}
            </div>
          )}

          {ticket.description && (
            <div className="mb-4 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-2 border-b border-gray-100 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-xs leading-5 text-gray-800">{ticket.description}</p>
            </div>
          )}

          {ticket.varianceLog && (
            <div className="mb-4 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-1 border-b border-gray-100 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Volume
              </h3>
              <DetailRow
                label="Expected"
                value={`${Number(ticket.varianceLog.expectedVolume).toLocaleString()} L`}
                compact
              />
              <DetailRow
                label="Actual"
                value={`${Number(ticket.varianceLog.actualVolume).toLocaleString()} L`}
                compact
              />
              <DetailRow
                label="Variance"
                value={`${
                  Number(ticket.varianceLog.actualVolume) - Number(ticket.varianceLog.expectedVolume) > 0 ? "+" : ""
                }${(
                  Number(ticket.varianceLog.actualVolume) - Number(ticket.varianceLog.expectedVolume)
                ).toLocaleString()} L`}
                strong
                compact
              />
            </div>
          )}

          {children.length > 0 && (
            <div className="mb-4 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-1 border-b border-gray-100 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Linked spend
              </h3>
              {children.map((child) => (
                <DetailRow
                  key={child.id}
                  label={child.title}
                  value={`${money(child.requestedAmount)} · ${STATUS_LABELS[child.status] || child.status}`}
                  compact
                />
              ))}
            </div>
          )}

          {revisions.length > 0 && (
            <div className="mb-4 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-1 border-b border-gray-100 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Amount history
              </h3>
              {revisions.map((rev) => (
                <DetailRow
                  key={rev.id}
                  label={formatHumanReadableDate(rev.createdAt)}
                  value={`${money(rev.newRequested)}${rev.newApproved != null ? ` → ${money(rev.newApproved)}` : ""}`}
                  compact
                />
              ))}
            </div>
          )}

          {ticket.remark && (
            <div className="mb-4 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-2 border-b border-gray-100 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Remark
              </h3>
              <p className="text-xs leading-5 text-gray-800">{ticket.remark}</p>
              {ticket.approvedBy && (
                <p className="mt-2 text-[11px] text-gray-500">By {personName(ticket.approvedBy)}</p>
              )}
            </div>
          )}

          <div className="mt-10 flex items-end justify-between gap-6 border-t border-gray-100 pt-6">
            <div className="max-w-[220px] flex-1">
              <div className="border-t border-gray-900 pt-2 text-center text-xs font-medium text-gray-700">
                Raised by
              </div>
              <p className="mt-1 text-center text-[9px] text-gray-400">{personName(ticket.raisedBy)}</p>
            </div>
            <div className="max-w-[220px] flex-1">
              <div className="border-t border-gray-900 pt-2 text-center text-xs font-medium text-gray-700">
                Reviewed by
              </div>
              <p className="mt-1 text-center text-[9px] text-gray-400">
                {ticket.approvedBy ? personName(ticket.approvedBy) : "Signature"}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-dashed border-gray-200 pt-4 text-center text-[11px] text-gray-400">
            <p>
              Generated by {company.name} • Document ID: {ticket.id}
            </p>
            <p className="mt-1">*** Keep this document for your records ***</p>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { margin: 12mm; }
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #ticket-note, #ticket-note * {
            visibility: visible;
          }
          #ticket-note {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `,
        }}
      />
    </div>
  );
}
