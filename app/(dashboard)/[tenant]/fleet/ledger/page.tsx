"use client";

import { useState, useEffect } from "react";

export default function LedgerPage({ params }: { params: { tenant: string } }) {
  const [activeTab, setActiveTab] = useState<"SALES" | "TRANSPORTATION" | "EXPENSES">("SALES");
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setData([]);
      try {
        let endpoint = "";
        if (activeTab === "SALES") endpoint = `/api/tenant/fleet/ledger/sales`;
        else if (activeTab === "TRANSPORTATION") endpoint = `/api/tenant/fleet/ledger/transports`;
        else if (activeTab === "EXPENSES") endpoint = `/api/tenant/fleet/ledger/expenses`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const json = await res.json();
          setData(json.data || json);
        }
      } catch (e) {
        console.error("Failed to fetch ledger data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, params.tenant]);

  const handleExport = () => {
    if (data.length === 0) return;
    
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === "SALES") {
      headers = ["Client Name", "Date", "Payment Type", "Amount Received", "Payment Method", "Sales ID"];
      rows = data.map((d: any) => [
        d.sale?.customer?.name || "N/A",
        new Date(d.createdAt).toLocaleDateString(),
        d.paymentType || "N/A",
        d.amount,
        d.paymentMethod || "N/A",
        d.saleId || "N/A"
      ]);
    } else if (activeTab === "TRANSPORTATION") {
      headers = ["Date", "Transporter Name", "Driver Name", "Order ID", "Total Deductions", "Maintenance Incurred", "Net Paid"];
      rows = data.map((d: any) => [
        new Date(d.createdAt).toLocaleDateString(),
        d.transporter?.name || "N/A",
        d.driver ? `${d.driver.firstName} ${d.driver.lastName}` : "N/A",
        d.orderId || "N/A",
        d.totalDeduction,
        d.maintenanceCost,
        d.netTransportFeePaid
      ]);
    } else if (activeTab === "EXPENSES") {
      headers = ["Date", "Expense Category", "Description", "Amount", "Payment Method", "Associated Entity"];
      rows = data.map((d: any) => [
        new Date(d.createdAt).toLocaleDateString(),
        d.category,
        d.description || "N/A",
        d.amount,
        d.paymentMethod || "N/A",
        d.transporter?.name || d.truck?.name || "N/A"
      ]);
    }

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${activeTab.toLowerCase()}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Ledger Module</h1>
        <button 
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 transition"
        >
          Export to CSV
        </button>
      </div>

      <div className="flex gap-4 border-b pb-2">
        {["SALES", "TRANSPORTATION", "EXPENSES"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 font-medium rounded-t-md ${activeTab === tab ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()} Ledger
          </button>
        ))}
      </div>

      <div className="mt-6 bg-white border rounded shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading records...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No records found.</div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b">
              {activeTab === "SALES" && (
                <tr>
                  <th className="p-4 font-semibold">Client Name</th>
                  <th className="p-4 font-semibold">Date Payment</th>
                  <th className="p-4 font-semibold">Payment Type</th>
                  <th className="p-4 font-semibold">Amount Received</th>
                  <th className="p-4 font-semibold">Payment Method</th>
                  <th className="p-4 font-semibold">Linked Sales ID</th>
                </tr>
              )}
              {activeTab === "TRANSPORTATION" && (
                <tr>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Transporter Name</th>
                  <th className="p-4 font-semibold">Driver Name</th>
                  <th className="p-4 font-semibold">Order ID</th>
                  <th className="p-4 font-semibold">Total Deductions</th>
                  <th className="p-4 font-semibold">Maintenance Incurred</th>
                  <th className="p-4 font-semibold">Net Paid</th>
                </tr>
              )}
              {activeTab === "EXPENSES" && (
                <tr>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Expense Category</th>
                  <th className="p-4 font-semibold">Description</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">Payment Method</th>
                  <th className="p-4 font-semibold">Associated Entity</th>
                </tr>
              )}
            </thead>
            <tbody>
              {data.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-b last:border-0 hover:bg-gray-50">
                  {activeTab === "SALES" && (
                    <>
                      <td className="p-4">{row.sale?.customer?.name || "-"}</td>
                      <td className="p-4">{new Date(row.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">{row.paymentType || "-"}</td>
                      <td className="p-4 font-medium text-green-600">₦{Number(row.amount).toLocaleString()}</td>
                      <td className="p-4">{row.paymentMethod}</td>
                      <td className="p-4 text-gray-500">{row.saleId || "-"}</td>
                    </>
                  )}
                  {activeTab === "TRANSPORTATION" && (
                    <>
                      <td className="p-4">{new Date(row.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">{row.transporter?.name || "-"}</td>
                      <td className="p-4">{row.driver ? `${row.driver.firstName} ${row.driver.lastName}` : "-"}</td>
                      <td className="p-4 text-gray-500">{row.orderId || "-"}</td>
                      <td className="p-4 text-red-600">₦{Number(row.totalDeduction).toLocaleString()}</td>
                      <td className="p-4 text-red-600">₦{Number(row.maintenanceCost).toLocaleString()}</td>
                      <td className="p-4 font-medium text-blue-600">₦{Number(row.netTransportFeePaid).toLocaleString()}</td>
                    </>
                  )}
                  {activeTab === "EXPENSES" && (
                    <>
                      <td className="p-4">{new Date(row.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">{row.category}</td>
                      <td className="p-4 max-w-xs truncate" title={row.description}>{row.description || "-"}</td>
                      <td className="p-4 text-red-600">₦{Number(row.amount).toLocaleString()}</td>
                      <td className="p-4">{row.paymentMethod}</td>
                      <td className="p-4">{row.transporter?.name || row.truck?.name || "-"}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
