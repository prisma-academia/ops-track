import type { InputHTMLAttributes, ReactNode } from "react";

export function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={htmlFor}>
      <span className="text-stone-700">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

export function TextInput(
  props: InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={`rounded border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-stone-500 ${props.className ?? ""}`}
    />
  );
}
