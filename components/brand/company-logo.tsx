import { COMPANY_LOGO, COMPANY_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";

type CompanyLogoProps = {
  variant?: "icon" | "banner";
  href?: string | null;
  className?: string;
  imgClassName?: string;
  /** Sticky/white headers: show the filled lockup in light mode. */
  onLightSurface?: boolean;
};

function BannerMark({
  src,
  alt,
  imgClassName,
  visibilityClass,
}: {
  src: string;
  alt: string;
  imgClassName?: string;
  visibilityClass?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("object-contain h-10 w-auto", visibilityClass, imgClassName)}
    />
  );
}

export function CompanyLogo({
  variant = "banner",
  href = "/",
  className,
  imgClassName,
  onLightSurface = false,
}: CompanyLogoProps) {
  const img =
    variant === "icon" ? (
      <img
        src={COMPANY_LOGO.icon}
        alt={COMPANY_NAME}
        className={cn("object-contain size-10", imgClassName)}
      />
    ) : onLightSurface ? (
      <>
        <BannerMark
          src={COMPANY_LOGO.icon}
          alt={COMPANY_NAME}
          imgClassName={imgClassName}
          visibilityClass="rounded-md dark:hidden"
        />
        <BannerMark
          src={COMPANY_LOGO.banner}
          alt=""
          imgClassName={imgClassName}
          visibilityClass="hidden dark:block"
        />
      </>
    ) : (
      <BannerMark src={COMPANY_LOGO.banner} alt={COMPANY_NAME} imgClassName={imgClassName} />
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
