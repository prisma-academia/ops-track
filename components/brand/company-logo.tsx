import { COMPANY_LOGO, COMPANY_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";

type CompanyLogoProps = {
  variant?: "icon" | "banner";
  href?: string | null;
  className?: string;
  imgClassName?: string;
};

export function CompanyLogo({
  variant = "banner",
  href = "/",
  className,
  imgClassName,
}: CompanyLogoProps) {
  const src = variant === "icon" ? COMPANY_LOGO.icon : COMPANY_LOGO.banner;
  const img = (
    <img
      src={src}
      alt={COMPANY_NAME}
      className={cn(
        "object-contain",
        variant === "icon" ? "size-10" : "h-10 w-auto",
        imgClassName,
      )}
    />
  );

  if (!href) {
    return <span className={cn("inline-flex items-center", className)}>{img}</span>;
  }

  return (
    <a href={href} className={cn("inline-flex items-center", className)}>
      {img}
    </a>
  );
}
