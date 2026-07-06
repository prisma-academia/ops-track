"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

export function formatNumberWithCommas(value: string) {
  if (!value) return "";
  const parts = value.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export interface NumberInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value: string | number | null | undefined;
  onChange: (value: number | string) => void;
  maxDigits?: number;
}

export const NumberInput = ({ value, onChange, placeholder, disabled, className, maxDigits = 10, ...props }: NumberInputProps) => {
  const [displayValue, setDisplayValue] = useState(() => {
    if (value === undefined || value === null || value === "") return "";
    return formatNumberWithCommas(value.toString());
  });

  useEffect(() => {
    if (value === undefined || value === null || value === "") {
      setDisplayValue("");
    } else {
      const currentNumeric = parseFloat(displayValue.replace(/,/g, ""));
      if (currentNumeric !== Number(value)) {
        setDisplayValue(formatNumberWithCommas(value.toString()));
      }
    }
  }, [value, displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    if (parts[0].length > maxDigits) raw = parts[0].slice(0, maxDigits) + (parts.length > 1 ? "." + parts[1] : "");
    
    setDisplayValue(formatNumberWithCommas(raw));
    const num = parseFloat(raw);
    onChange(isNaN(num) ? "" : num);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = parseFloat(displayValue.replace(/,/g, ""));
    if (!isNaN(num)) {
      setDisplayValue(num.toLocaleString("en-US", { maximumFractionDigits: 2 }));
    }
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <Input
      type="text"
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      className={className}
      {...props}
    />
  );
};
