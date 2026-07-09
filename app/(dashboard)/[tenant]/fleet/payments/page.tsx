"use client";

import { useState } from "react";
import IncomingPaymentForm from "@/components/fleet/payments/IncomingPaymentForm";
import OutgoingPaymentForm from "@/components/fleet/payments/OutgoingPaymentForm";

export default function PaymentsPage({ params }: { params: { tenant: string } }) {
  const [activeTab, setActiveTab] = useState<"INCOMING" | "OUTGOING">("INCOMING");

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payments Module</h1>
      </div>

      <div className="flex gap-4 border-b pb-2">
        <button
          onClick={() => setActiveTab("INCOMING")}
          className={`px-4 py-2 font-medium rounded-t-md ${activeTab === "INCOMING" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          Incoming Payments
        </button>
        <button
          onClick={() => setActiveTab("OUTGOING")}
          className={`px-4 py-2 font-medium rounded-t-md ${activeTab === "OUTGOING" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          Outgoing Payments
        </button>
      </div>

      <div className="mt-6">
        {activeTab === "INCOMING" && <IncomingPaymentForm />}
        {activeTab === "OUTGOING" && <OutgoingPaymentForm />}
      </div>
    </div>
  );
}
