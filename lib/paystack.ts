import { env } from "@/lib/env";

const PAYSTACK_SECRET_KEY = env.PAYSTACK_SECRET_KEY || "";

export interface PaystackBank {
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string | null;
  pay_with_bank: boolean;
  active: boolean;
  is_deleted: boolean;
  country: string;
  currency: string;
  type: string;
  id: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchBanks(): Promise<PaystackBank[]> {
  if (!PAYSTACK_SECRET_KEY) {
    console.warn("PAYSTACK_SECRET_KEY is missing. Unable to fetch banks.");
    return [];
  }

  const response = await fetch("https://api.paystack.co/bank?country=nigeria", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    next: {
      revalidate: 86400, // Cache for 24 hours
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch banks from Paystack", await response.text());
    return [];
  }

  const json = await response.json();
  return json.data || [];
}

export interface PaystackResolveAccountResponse {
  account_number: string;
  account_name: string;
  bank_id: number;
}

export async function verifyAccountNumber(accountNumber: string, bankCode: string): Promise<PaystackResolveAccountResponse | null> {
  if (!PAYSTACK_SECRET_KEY) {
    console.warn("PAYSTACK_SECRET_KEY is missing. Unable to verify account.");
    return null;
  }

  const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return null; // Invalid account number or bank code
  }

  const json = await response.json();
  if (json.status && json.data) {
    return json.data;
  }

  return null;
}
