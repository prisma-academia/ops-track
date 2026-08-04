import React from "react";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { formatNumberInput, parseFormattedNumber } from "@/lib/utils";

export interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (e: React.ChangeEvent<HTMLInputElement> | any) => void;
  prefixIcon?: React.ReactNode;
  prefixText?: string;
  suffixIcon?: React.ReactNode;
  suffixText?: string;
}

export const FormattedNumberInput = React.forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  ({ value, onChange, prefixIcon, prefixText, suffixIcon, suffixText, className, ...props }, ref) => {
    // Format the incoming value
    const formattedValue = formatNumberInput(value !== undefined ? (value as string | number) : "");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        // Clone the event to modify the target value to the unformatted raw value
        const rawValue = parseFormattedNumber(e.target.value);
        const clonedEvent = {
          ...e,
          target: {
            ...e.target,
            name: e.target.name,
            value: rawValue,
          }
        };
        onChange(clonedEvent as any);
      }
    };

    if (prefixIcon || prefixText || suffixIcon || suffixText) {
      return (
        <InputGroup className={className}>
          {(prefixIcon || prefixText) && (
            <InputGroupAddon>
              {prefixIcon}
              {prefixText}
            </InputGroupAddon>
          )}
          <InputGroupInput
            {...props}
            ref={ref}
            type="text"
            inputMode="decimal"
            value={formattedValue}
            onChange={handleChange}
          />
          {(suffixIcon || suffixText) && (
            <InputGroupAddon align="inline-end">
              {suffixIcon}
              {suffixText}
            </InputGroupAddon>
          )}
        </InputGroup>
      );
    }

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={formattedValue}
        onChange={handleChange}
        className={className}
      />
    );
  }
);
FormattedNumberInput.displayName = "FormattedNumberInput";
