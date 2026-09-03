import { STORE_ICONS } from "@/lib/branding";
import { cn } from "@/lib/utils";

function StoreButton({
  href,
  iconSrc,
  iconClassName,
  caption,
  title,
}: {
  href: string;
  iconSrc: string;
  iconClassName?: string;
  caption: string;
  title: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-3 rounded-full bg-foreground text-background px-5 py-3 transition-opacity hover:opacity-80"
    >
      <img
        src={iconSrc}
        alt=""
        className={cn("size-7 object-contain", iconClassName)}
      />
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-normal uppercase tracking-wide opacity-80">{caption}</span>
        <span className="text-base font-medium">{title}</span>
      </span>
    </a>
  );
}

export function StoreButtons({ href = "/auth/login" }: { href?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StoreButton
        href={href}
        iconSrc={STORE_ICONS.appStore}
        iconClassName="invert dark:invert-0"
        caption="Download on the"
        title="App Store"
      />
      <StoreButton
        href={href}
        iconSrc={STORE_ICONS.playStore}
        caption="Get it on"
        title="Google Play"
      />
    </div>
  );
}
