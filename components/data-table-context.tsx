"use client";

import { createContext, useContext } from "react";

interface DataTableContextType {
  startTransition: () => void;
}

export const DataTableContext = createContext<DataTableContextType>({
  startTransition: () => {},
});

export const useDataTable = () => useContext(DataTableContext);
