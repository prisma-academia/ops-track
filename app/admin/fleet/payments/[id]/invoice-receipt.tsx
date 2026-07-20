"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { formatHumanReadableDate } from "@/lib/utils";

interface InvoiceReceiptProps {
  transaction: any;
}

export function InvoiceReceipt({ transaction }: InvoiceReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const isOutflow = transaction.type === "OUTFLOW";
  const ref = transaction.reference || transaction.id.substring(0, 8).toUpperCase();
  const categoryFormatted = transaction.category.replace(/_/g, " ").toUpperCase();
  
  // Try to determine the counterparty name based on related entities
  let counterparty = "N/A";
  let counterpartyLabel = "Paid To/From";
  
  if (transaction.sale?.customer) {
    counterparty = transaction.sale.customer.name;
    counterpartyLabel = "Billed To";
  } else if (transaction.sale?.station) {
    counterparty = transaction.sale.station.name;
    counterpartyLabel = "Station";
  } else if (transaction.transporter) {
    counterparty = transaction.transporter.name;
    counterpartyLabel = "Transporter";
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print Receipt
        </Button>
      </div>

      {/* Invoice / Receipt Paper Design */}
      <div 
        ref={receiptRef}
        className="bg-white dark:bg-card border border-border shadow-sm p-8 sm:p-12 w-full mx-auto rounded-xl relative overflow-hidden print:shadow-none print:border-0 print:p-0"
      >
        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-primary"></div>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-3">
            {transaction.tenant?.logoUrl ? (
              <img src={transaction.tenant.logoUrl} alt={`${transaction.tenant.name} Logo`} className="h-8 w-auto object-contain" />
            ) : (
              <div className="size-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-sm">
                {transaction.tenant?.name ? transaction.tenant.name.charAt(0).toUpperCase() : 'I'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-black text-primary tracking-tight uppercase">
                {transaction.tenant?.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Fleet & Station Management</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-foreground uppercase tracking-widest">
              {isOutflow ? "Payment Voucher" : "Payment Receipt"}
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              REF: <span className="text-foreground">{ref}</span>
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{counterpartyLabel}</p>
            <p className="text-base font-semibold text-foreground">{counterparty}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Date & Time</p>
            <p className="text-base font-semibold text-foreground">{formatHumanReadableDate(transaction.createdAt)}</p>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="border border-border rounded-lg overflow-hidden mb-8">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Description</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-4 px-4">
                  <div className="font-semibold text-foreground">{categoryFormatted}</div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {transaction.description || "No additional description provided"}
                  </div>
                </td>
                <td className="py-4 px-4 text-right font-mono font-bold text-foreground">
                  ₦{Number(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-muted/10">
              <tr>
                <td className="py-4 px-4 text-right font-semibold text-muted-foreground">Total Paid</td>
                <td className={`py-4 px-4 text-right font-mono font-black text-xl ${isOutflow ? "text-red-600 dark:text-red-500" : "text-emerald-600 dark:text-emerald-500"}`}>
                  ₦{Number(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Details Footer */}
        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-dashed border-border/60">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Payment Method</p>
            <p className="text-sm font-semibold text-foreground">{transaction.paymentMethod || "N/A"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-500 uppercase">Successful</p>
          </div>
        </div>
        
        {/* Watermark/Stamp (Optional touch) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-5 pointer-events-none">
          <div className="border-4 border-foreground text-foreground text-6xl font-black uppercase tracking-widest p-4 rounded-xl">
            {isOutflow ? "PAID OUT" : "RECEIVED"}
          </div>
        </div>

      </div>
      
      {/* Print styles applied globally or in a scoped CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          /* Create a wrapper class that we can use to target specifically the receipt */
          .bg-white.dark\\:bg-card, .bg-white.dark\\:bg-card * {
            visibility: visible;
          }
          .bg-white.dark\\:bg-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
    </div>
  );
}
