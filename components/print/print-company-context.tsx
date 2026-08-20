"use client";

import * as React from "react";

export type PrintCompanyInfo = {
  name: string;
  slug: string | null;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

const PrintCompanyContext = React.createContext<PrintCompanyInfo | null>(null);

export function PrintCompanyProvider({
  value,
  children,
}: {
  value: PrintCompanyInfo | null;
  children: React.ReactNode;
}) {
  return <PrintCompanyContext.Provider value={value}>{children}</PrintCompanyContext.Provider>;
}

export function usePrintCompany() {
  return React.useContext(PrintCompanyContext);
}
