"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BANK_LOGO_FALLBACK, getBankLogoUrl } from "@/lib/bank-accounts/bank-helpers";
import { cn } from "@/lib/utils";

export function BankLogo({
  slug,
  bankName,
  size = 32,
  className,
}: {
  slug?: string | null;
  bankName: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState(() => getBankLogoUrl(slug));

  useEffect(() => {
    setSrc(getBankLogoUrl(slug));
  }, [slug]);

  return (
    <Image
      src={src}
      alt={`${bankName} logo`}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md bg-white object-contain", className)}
      style={{ width: size, height: size }}
      unoptimized={src === BANK_LOGO_FALLBACK}
      onError={() => {
        setSrc((current) => (current === BANK_LOGO_FALLBACK ? current : BANK_LOGO_FALLBACK));
      }}
    />
  );
}
